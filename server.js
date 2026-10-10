require("dotenv").config();

const express = require("express");
const crypto = require("crypto");
const fetch = global.fetch; // Node v18+ has fetch built-in
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const { Resend } = require("resend");
const { buildWelcomeEmail, buildConfirmedEmail } = require("./lib/emailTemplates");
const { normalizeAnalytics } = require("./lib/breach.js");

const app = express();
const PORT = 3000;

// ─────────────────────────────────────────────────────────────
// APP_URL — the ONE source for every absolute URL (canonical, og:*, email
// links, redirect target). Defaults to the current host; set APP_URL to move
// the product later. A permanent 301 from the legacy host check.tirenify.app
// to APP_URL is active ONLY when APP_URL points at a different host, and it
// preserves the full path + query so existing confirm/unsubscribe links work.
// ─────────────────────────────────────────────────────────────
const APP_URL = (process.env.APP_URL || "https://check.tirenify.app").replace(/\/$/, "");
const LEGACY_HOST = "check.tirenify.app";
let APP_URL_HOST = LEGACY_HOST;
try {
  APP_URL_HOST = new URL(APP_URL).host;
} catch {
  /* keep default host if APP_URL is malformed */
}
if (APP_URL_HOST && APP_URL_HOST !== LEGACY_HOST) {
  app.use((req, res, next) => {
    const host = String(req.headers.host || "").toLowerCase();
    if (host === LEGACY_HOST) {
      // req.originalUrl keeps the path AND the full query string.
      return res.redirect(301, `${APP_URL}${req.originalUrl}`);
    }
    next();
  });
}

// ─────────────────────────────────────────────────────────────
// SECURITY HEADERS (Phase 8 hardening). The CSP enforces the
// zero-dependency rule: no external scripts, fonts, images or APIs.
// Both the breach check and the email subscription POST to our own
// origin, so connect-src 'self' covers them.
// ─────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  // Camera only on the QR scanner route (added in a later phase); everywhere
  // else it is denied. Everything else is locked down.
  const isQr = req.path.startsWith("/tools/qr-code");
  const camera = isQr ? "(self)" : "()";
  res.setHeader("Permissions-Policy", `camera=${camera}, microphone=(), geolocation=(), payment=(), usb=()`);
  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "img-src 'self' data: blob:",
    "connect-src 'self'",
    "manifest-src 'self'",
  ].join("; ");
  res.setHeader("Content-Security-Policy", csp);
  next();
});


const FRONTEND_URL = (process.env.FRONTEND_URL || APP_URL).replace(/\/$/, "");
const SENDER_EMAIL = "hello@tirenify.app";

// ─────────────────────────────────────────────────────────────
// DIAGNOSTICS: Log environment variables on startup
// ─────────────────────────────────────────────────────────────
console.log("\n📋 ENVIRONMENT VARIABLES CHECK:");
console.log("─" + "─".repeat(50));
console.log("SUPABASE_URL:", process.env.SUPABASE_URL || "❌ MISSING");
console.log(
  "SUPABASE_ANON_KEY exists:",
  process.env.SUPABASE_ANON_KEY ? "✅ YES" : "❌ NO"
);
console.log(
  "RESEND_API_KEY exists:",
  process.env.RESEND_API_KEY ? "✅ YES" : "❌ NO"
);
console.log(
  "EXPOSED_ORKNOT_API_KEY exists:",
  process.env.EXPOSED_ORKNOT_API_KEY ? "✅ YES" : "❌ NO (using free tier)"
);
console.log("─" + "─".repeat(50) + "\n");

// ─────────────────────────────────────────────────────────────
// OPTIONAL SERVICES: Supabase + Resend back the email-subscription flow only.
// The breach check needs NEITHER, so the server must start without them.
// When env is missing we keep the clients null and the subscription routes
// reply with a friendly, human message instead of crashing the process.
// ─────────────────────────────────────────────────────────────
const supabaseConfigured = Boolean(
  process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY
);

let supabase = null;
let resend = null;
if (supabaseConfigured) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  resend = new Resend(process.env.RESEND_API_KEY);
  console.log("✅ Supabase + Resend configured (email subscription enabled).\n");
} else {
  console.warn(
    "⚠️  Supabase/Resend not configured — the breach check still works, but the " +
      "email subscription is disabled. Set SUPABASE_URL, SUPABASE_ANON_KEY and " +
      "RESEND_API_KEY (see .env.example) to enable it.\n"
  );
}

// ─────────────────────────────────────────────────────────────
// CONNECTIVITY TEST (subscription only) — skipped when not configured.
// ─────────────────────────────────────────────────────────────
if (supabaseConfigured) {
  supabase
    .from("subscriptions")
    .select("id")
    .limit(1)
    .then(({ error }) => {
      if (error) {
        console.error("⚠️  Supabase connectivity test failed:", error.message);
      } else {
        console.log("✅ Supabase connectivity OK.");
      }
    })
    .catch((err) => {
      console.error("⚠️  Supabase connectivity test threw:", err?.message || err);
    });
}

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public"), { index: "index.html" }));

// Always serve the app shell at the site root instead of exposing the directory.
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Deep links: express.static above already serves the per-route index.html
// snapshots produced by scripts/gen-meta.mjs for known paths. This is the SPA
// fallback for any other GET that isn't a file and isn't an API route — it
// serves the root shell so client-side routing takes over.
app.use((req, res, next) => {
  if (req.method !== "GET" || req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const INVALID_EMAIL_MESSAGE = "This email doesn't appear to be valid. Please check and try again.";

// Basic shape check for subscriptions; Resend does the real deliverability
// work when it sends the confirmation email.
const emailShapeRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Dev-only diagnostics. In development we print the error TYPE and the
// upstream HTTP status to the terminal so the route is easy to debug. We NEVER
// log the email or the response body — here or anywhere. In production this
// logs nothing (the caller stays silent too).
const IS_DEV = process.env.NODE_ENV !== "production";
function devLog(...args) {
  if (IS_DEV) console.log("[breach-check]", ...args);
}

// Fetches from the breach API with retries: transient network failures
// (connect timeouts, DNS hiccups) are retried with a short backoff before
// giving up. HTTP error responses are returned as-is — only thrown network
// errors trigger a retry. Timeouts (AbortSignal) throw a TimeoutError which we
// tag so the handler can distinguish it from a generic upstream failure.
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

// POST /api/breach-check — validates the email, applies a per-IP rate limit and
// in-memory cache, calls XposedOrNot /v1/breach-analytics, and returns a
// normalized result. The email is never logged (only ever in the POST body).
//
// Distinct error codes so the UI can show a specific, friendly message each:
//   invalid_email | rate_limited | upstream_unavailable | timeout | parse_error
async function handleBreachCheck(req, res) {
  const { email } = req.body || {};

  if (typeof email !== "string" || !email.trim()) {
    devLog("invalid_email: missing/empty email");
    return res.status(400).json({ ok: false, error: "invalid_email", message: "Email is required." });
  }
  const normalized = email.trim().toLowerCase();
  if (normalized.length > 255 || !breachEmailRegex.test(normalized)) {
    devLog("invalid_email: failed format/length check");
    return res.status(400).json({ ok: false, error: "invalid_email", message: INVALID_EMAIL_MESSAGE });
  }

  // Per-IP rate limit (in-memory only; XposedOrNot free tier is ~1 req/sec).
  const ip =
    (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    "unknown";
  if (rateLimit(ip)) {
    devLog("rate_limited: per-IP limit exceeded");
    return res.status(429).json({
      ok: false,
      error: "rate_limited",
      message: "We're busy right now - please wait a few seconds and try again.",
    });
  }

  // Optional in-memory cache keyed by a hash of the email (never the email
  // itself). ~10 min TTL. Never persisted; cleared on deploy/restart.
  const key = hashEmail(normalized);
  const cached = responseCache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return res.json({ ok: true, result: cached.result });
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
      return res.status(429).json({
        ok: false,
        error: "rate_limited",
        message: "We're busy right now - please wait a few seconds and try again.",
      });
    }

    // Other non-2xx (5xx from XposedOrNot, etc.) — the database is unavailable.
    if (!response.ok) {
      devLog(`upstream_unavailable: upstream status ${response.status}`);
      return res.status(502).json({
        ok: false,
        error: "upstream_unavailable",
        message: "The breach database is temporarily unavailable. Please try again shortly.",
      });
    }

    const data = await response.json().catch(() => null);
    if (!data || typeof data !== "object") {
      devLog(`parse_error: empty/unparseable body (status ${response.status})`);
      return res.status(502).json({
        ok: false,
        error: "parse_error",
        message: "We couldn't read the breach data just now. Please try again shortly.",
      });
    }

    // 200 with no breaches for unknown addresses is a valid "not found" and is
    // normalized to found:false (the UI shows the "Good news" state).
    const result = normalizeAnalytics(data);
    if (responseCache.size > 2000) responseCache.clear();
    responseCache.set(key, { at: Date.now(), result });
    return res.json({ ok: true, result });
  } catch (error) {
    if (error && error.__timeout) {
      devLog("timeout: upstream did not respond within 15s (all retries exhausted)");
      return res.status(504).json({
        ok: false,
        error: "timeout",
        message: "The check took too long. Please try again in a moment.",
      });
    }
    devLog("upstream_unavailable: network error contacting breach API");
    return res.status(502).json({
      ok: false,
      error: "upstream_unavailable",
      message: "The breach service is temporarily unreachable. Please try again in a moment.",
    });
  }
}

// Rate limit + cache state for /api/breach-check.
const breachEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX = 8;
const CACHE_TTL_MS = 10 * 60 * 1000;
const rateBuckets = new Map();
const responseCache = new Map();

function rateLimit(ip) {
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

app.post("/api/breach-check", handleBreachCheck);

// POST /api/email/subscribe — validates the email, upserts a user + pending
// subscription, and sends a welcome/confirmation email via Resend.
async function handleSubscribe(req, res) {
  const { email, preferences = {} } = req.body;

  console.log("\nSubscription request received.");
  // The email is intentionally NOT logged (privacy by design).

  if (!email || typeof email !== "string" || !emailShapeRegex.test(email)) {
    return res.status(400).json({ message: INVALID_EMAIL_MESSAGE });
  }

  if (!supabaseConfigured || !supabase) {
    return res.status(503).json({
      message:
        "Email updates are not available right now. The breach check still works — your results are above.",
    });
  }

  try {
    const now = new Date().toISOString();

    const { data: existingUser } = await supabase
      .from("users")
      .select("id, confirmed_at")
      .eq("email", email)
      .maybeSingle();

    // Duplicate guards — exit before any writes or sends.
    let existingSub = null;
    if (existingUser) {
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("id, status")
        .eq("user_id", existingUser.id)
        .maybeSingle();
      existingSub = sub;

      if (existingSub?.status === "active") {
        return res.status(200).json({
          message: "This email is already subscribed. Check your inbox for updates.",
        });
      }

      if (existingSub?.status === "pending" && !existingUser.confirmed_at) {
        return res.status(200).json({
          message: "Confirmation email already sent. Check your inbox to confirm your subscription.",
        });
      }
      // Anything else (unsubscribed, or user without a subscription row)
      // falls through to a fresh resubscribe below.
    }

    const confirmationToken = crypto.randomBytes(32).toString("hex");

    let userId;
    if (existingUser) {
      userId = existingUser.id;
      await supabase
        .from("users")
        .update({
          confirmation_token: confirmationToken,
          date_subscribed: now,
        })
        .eq("id", userId);
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from("users")
        .insert([{
          email,
          confirmation_token: confirmationToken,
          date_subscribed: now,
        }])
        .select("id")
        .single();

      if (insertError) {
        console.error("❌ Failed to insert user:", insertError.message);
        return res.status(500).json({ message: "Could not save subscription." });
      }
      userId = inserted.id;
    }

    if (existingSub) {
      await supabase
        .from("subscriptions")
        .update({
          breach_alerts: preferences.breach_alerts ?? true,
          product_updates: preferences.product_updates ?? true,
          security_tips: preferences.security_tips ?? true,
          status: "pending",
        })
        .eq("id", existingSub.id);
    } else {
      await supabase.from("subscriptions").insert([{
        user_id: userId,
        breach_alerts: preferences.breach_alerts ?? true,
        product_updates: preferences.product_updates ?? true,
        security_tips: preferences.security_tips ?? true,
        status: "pending",
      }]);
    }

    // Link to the homepage with ?token= — the frontend JS detects the param
    // and shows the confirmation page. (Works on static hosting too, unlike
    // a dedicated /confirm-email route.)
    const confirmUrl = `${FRONTEND_URL.replace(/\/$/, "")}/?token=${confirmationToken}`;
    const html = buildWelcomeEmail({ confirmUrl, checkAnotherUrl: FRONTEND_URL });

    let sendStatus = "failed";
    let resendMessageId = null;
    let errorMessage = null;

    try {
      const resendResult = await resend.emails.send({
        from: SENDER_EMAIL,
        to: email,
        subject: "Welcome to Tirenify — confirm your subscription",
        html,
      });
      resendMessageId = resendResult?.data?.id || resendResult?.id || null;
      sendStatus = resendResult?.error ? "failed" : "sent";
      if (resendResult?.error) errorMessage = resendResult.error.message;
    } catch (sendError) {
      console.error("❌ Resend send threw an exception:", sendError.message);
      errorMessage = sendError.message;
    }

    await supabase.from("email_logs").insert([{
      user_id: userId,
      recipient_email: email,
      email_type: "welcome",
      subject: "Welcome to Tirenify — confirm your subscription",
      sent_date: now,
      status: sendStatus,
      resend_message_id: resendMessageId,
      error_message: errorMessage,
    }]);

    return res.status(200).json({
      message: "Subscribed successfully.",
      info: "Check your inbox for a confirmation email to complete your subscription.",
    });
  } catch (err) {
    console.error("⚠️  UNCAUGHT EXCEPTION in subscribe (email redacted):", err);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
}

app.post("/api/email/subscribe", handleSubscribe);
app.post("/api/subscribe", handleSubscribe); // legacy alias for existing frontend

// GET /confirm-email — the page the welcome email links to. Serves the
// frontend; the page's JS reads ?token= and calls /api/email/confirm.
app.get("/confirm-email", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// GET /api/email/confirm — completes double opt-in. Always returns JSON
// ({ success, message }); the frontend handles display and redirecting.
async function handleConfirmEmail(req, res) {
  const { token } = req.query;

  // Old welcome emails linked a browser directly here — hand those off to
  // the confirmation page instead of showing raw JSON.
  if ((req.get("accept") || "").includes("text/html")) {
    return res.redirect(`/confirm-email?token=${encodeURIComponent(token || "")}`);
  }

  if (!token || typeof token !== "string") {
    return res.status(400).json({ success: false, message: "Confirmation token missing." });
  }

  if (!supabaseConfigured || !supabase) {
    return res.status(503).json({
      success: false,
      message: "Email confirmation is not available right now.",
    });
  }

  const { data: user } = await supabase
    .from("users")
    .select("id, email, confirmed_at")
    .eq("confirmation_token", token)
    .maybeSingle();

  if (!user) {
    return res.status(404).json({ success: false, message: "This confirmation link is invalid or has expired." });
  }

  const alreadyConfirmed = Boolean(user.confirmed_at);
  const now = new Date().toISOString();
  await supabase.from("users").update({ confirmed_at: now }).eq("id", user.id);

  // Activate the subscription; create it if the row is somehow missing so a
  // valid confirmation link always results in an active subscription.
  const { data: updatedSubs } = await supabase
    .from("subscriptions")
    .update({ status: "active", subscribed_at: now })
    .eq("user_id", user.id)
    .select("id");

  if (!updatedSubs || updatedSubs.length === 0) {
    await supabase.from("subscriptions").insert([{
      user_id: user.id,
      status: "active",
      subscribed_at: now,
    }]);
  }

  // Send the "you're confirmed" email once; a failure here must not block
  // the confirmation itself.
  if (!alreadyConfirmed) {
    const subject = "You're confirmed! Welcome to Tirenify";
    let sendStatus = "failed";
    let resendMessageId = null;
    let errorMessage = null;

    try {
      const resendResult = await resend.emails.send({
        from: SENDER_EMAIL,
        to: user.email,
        subject,
        html: buildConfirmedEmail({ checkerUrl: FRONTEND_URL }),
      });
      resendMessageId = resendResult?.data?.id || resendResult?.id || null;
      sendStatus = resendResult?.error ? "failed" : "sent";
      if (resendResult?.error) errorMessage = resendResult.error.message;
      if (sendStatus === "sent") {
        console.log("Confirmation email sent.");
      }
    } catch (sendError) {
      console.error("❌ Confirmed email send failed:", sendError.message);
      errorMessage = sendError.message;
    }

    await supabase.from("email_logs").insert([{
      user_id: user.id,
      recipient_email: user.email,
      email_type: "confirmation",
      subject,
      sent_date: now,
      status: sendStatus,
      resend_message_id: resendMessageId,
      error_message: errorMessage,
    }]);
  }

  return res.status(200).json({
    success: true,
    message: "Email confirmed successfully! Welcome to Tirenify.",
  });
}

app.get("/api/email/confirm", handleConfirmEmail);

// Marks the subscription for an email as unsubscribed. Returns true if a
// matching user existed (idempotent — repeat calls are harmless).
async function unsubscribeEmail(email) {
  if (!supabaseConfigured || !supabase) return false;
  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (!user) return false;

  await supabase
    .from("subscriptions")
    .update({ status: "unsubscribed", unsubscribed_date: new Date().toISOString() })
    .eq("user_id", user.id);

  return true;
}

// POST /api/email/unsubscribe
app.post("/api/email/unsubscribe", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: "Email is required." });
  }

  const found = await unsubscribeEmail(email);
  res.status(200).json({ message: found ? "You've been unsubscribed." : "You're not subscribed." });
});

// GET /api/email/unsubscribe — one-click unsubscribe from newsletter links.
app.get("/api/email/unsubscribe", async (req, res) => {
  const { email } = req.query;
  if (!email || typeof email !== "string") {
    return res.status(400).send("Missing email.");
  }

  await unsubscribeEmail(email);
  res.redirect("/?unsubscribed=1");
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

// 404 for anything unmatched (e.g. unknown API paths). HTML routes are caught
// by the SPA fallback above, so this mainly serves JSON API misses.
app.use((req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ ok: false, error: "not-found", message: "Not found." });
  }
  res.status(404).sendFile(path.join(__dirname, "public", "index.html"));
});

// Central error handler — never leak internals to the client.
app.use((err, req, res, next) => {
  console.error("Unhandled server error:", err?.message || err);
  if (res.headersSent) return next(err);
  res.status(500).json({ ok: false, error: "server", message: "Something went wrong. Please try again." });
});
