// Shared breach-check core — used by BOTH:
//   - server.js (local Express: POST /api/breach-check)
//   - api/breach-check.js (Vercel serverless function)
// CommonJS because server.js is CommonJS (root package has no "type":"module")
// and Vercel Node functions accept CommonJS. Keep ALL check logic here so the
// two entry points cannot drift. The email is never logged — only in POST body.
//
// Distinct error codes (client maps each to a friendly message):
//   invalid_email | rate_limited | upstream_unavailable | timeout | parse_error
const crypto = require("crypto");
const { normalizeAnalytics } = require("./breach.js");

const INVALID_EMAIL_MESSAGE = "This email doesn't appear to be valid. Please check and try again.";
const breachEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX = 8;
const CACHE_TTL_MS = 10 * 60 * 1000;
const rateBuckets = new Map();
const responseCache = new Map();

// Dev-only diagnostics. In development we log the error TYPE only — NEVER the
// email or the response body. In production this logs nothing.
const IS_DEV = process.env.NODE_ENV !== "production";
function devLog(...args) {
  if (IS_DEV) console.log("[breach-check]", ...args);
}

// Fetches from the breach API with retries: transient network failures are
// retried with a short backoff. HTTP error responses are returned as-is — only
// thrown network errors trigger a retry. Timeouts throw and are tagged so the
// caller can return the distinct "timeout" code.
async function fetchBreachApiWithRetry(url, options, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(15000),
      });
    } catch (err) {
      lastError = err;
      if (err && (err.name === "TimeoutError" || err.name === "AbortError")) {
        err.__timeout = true;
      }
      // Never log the URL (it contains the email) — only the failure reason.
      devLog(`attempt ${attempt}/${attempts} failed:`, err.cause?.message || err.message);
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
  throw lastError;
}

function rateLimited(ip) {
  const now = Date.now();
  let bucket = rateBuckets.get(ip);
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + RATE_WINDOW_MS };
    rateBuckets.set(ip, bucket);
  }
  bucket.count += 1;
  if (rateBuckets.size > 5000) {
    for (const [k, v] of rateBuckets) if (now >= v.resetAt) rateBuckets.delete(k);
  }
  return bucket.count > RATE_MAX;
}

function hashEmail(email) {
  return crypto.createHash("sha256").update(email.toLowerCase()).digest("hex");
}

/**
 * Run the breach check. Framework-free: returns { status, body } and never
 * touches req/res, so Express and Vercel adapters stay one line each.
 */
async function runBreachCheck({ email, ip }) {
  if (typeof email !== "string" || !email.trim()) {
    devLog("invalid_email: missing/empty email");
    return { status: 400, body: { ok: false, error: "invalid_email", message: "Email is required." } };
  }
  const normalized = email.trim().toLowerCase();
  if (normalized.length > 255 || !breachEmailRegex.test(normalized)) {
    devLog("invalid_email: failed format/length check");
    return { status: 400, body: { ok: false, error: "invalid_email", message: INVALID_EMAIL_MESSAGE } };
  }

  // Per-IP rate limit (in-memory only; XposedOrNot free tier is ~1 req/sec).
  if (rateLimited(ip || "unknown")) {
    devLog("rate_limited: per-IP limit exceeded");
    return {
      status: 429,
      body: {
        ok: false,
        error: "rate_limited",
        message: "We're busy right now - please wait a few seconds and try again.",
      },
    };
  }

  // In-memory cache keyed by a hash of the email (never the email itself).
  // ~10 min TTL. Never persisted; cleared on deploy/restart.
  const key = hashEmail(normalized);
  const cached = responseCache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return { status: 200, body: { ok: true, result: cached.result } };
  }

  try {
    const apiUrl = `https://api.xposedornot.com/v1/breach-analytics?email=${encodeURIComponent(normalized)}`;
    const headers = process.env.EXPOSED_ORKNOT_API_KEY
      ? { "api-key": process.env.EXPOSED_ORKNOT_API_KEY, Accept: "application/json" }
      : { Accept: "application/json" };

    const response = await fetchBreachApiWithRetry(apiUrl, { headers });

    // Upstream rate-limited us (429) — surface it as our own rate-limited state.
    if (response.status === 429) {
      devLog("rate_limited: upstream returned 429");
      return {
        status: 429,
        body: {
          ok: false,
          error: "rate_limited",
          message: "We're busy right now - please wait a few seconds and try again.",
        },
      };
    }

    // Other non-2xx (5xx from XposedOrNot, etc.) — the database is unavailable.
    if (!response.ok) {
      devLog(`upstream_unavailable: upstream status ${response.status}`);
      return {
        status: 502,
        body: {
          ok: false,
          error: "upstream_unavailable",
          message: "The breach database is temporarily unavailable. Please try again shortly.",
        },
      };
    }

    const data = await response.json().catch(() => null);
    if (!data || typeof data !== "object") {
      devLog(`parse_error: empty/unparseable body (status ${response.status})`);
      return {
        status: 502,
        body: {
          ok: false,
          error: "parse_error",
          message: "We couldn't read the breach data just now. Please try again shortly.",
        },
      };
    }

    // 200 with no breaches for unknown addresses is a valid "not found" and is
    // normalized to found:false (the UI shows the "Good news" state).
    const result = normalizeAnalytics(data);
    if (responseCache.size > 2000) responseCache.clear();
    responseCache.set(key, { at: Date.now(), result });
    return { status: 200, body: { ok: true, result } };
  } catch (error) {
    if (error && error.__timeout) {
      devLog("timeout: upstream did not respond within 15s (all retries exhausted)");
      return {
        status: 504,
        body: {
          ok: false,
          error: "timeout",
          message: "The check took too long. Please try again in a moment.",
        },
      };
    }
    devLog("upstream_unavailable: network error contacting breach API");
    return {
      status: 502,
      body: {
        ok: false,
        error: "upstream_unavailable",
        message: "The breach service is temporarily unreachable. Please try again in a moment.",
      },
    };
  }
}

module.exports = { runBreachCheck, INVALID_EMAIL_MESSAGE };
