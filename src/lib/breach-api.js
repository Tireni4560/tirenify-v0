/**
 * Client for POST /api/breach-check — the ONLY network call the app makes
 * (plus the email-subscription endpoints). Email travels only in the JSON
 * body of a POST; never in a URL, never logged by us.
 *
 * The server returns distinct error codes; we map each to a friendly message
 * so the UI can show a specific state for each:
 *   invalid_email | rate_limited | upstream_unavailable | timeout | parse_error
 */
import { isValidEmail } from "./loading-messages.js";

const FRIENDLY = {
  invalid_email: {
    title: "Check the email",
    message: "That email doesn't look right. Please check it and try again.",
  },
  rate_limited: {
    title: "We're busy",
    message: "Too many checks in a short time. Please wait a few seconds and try again.",
  },
  upstream_unavailable: {
    title: "Breach database unavailable",
    message: "The breach database is temporarily unavailable. Please try again shortly.",
  },
  timeout: {
    title: "That took too long",
    message: "The check timed out. Please try again in a moment.",
  },
  parse_error: {
    title: "Couldn't read the results",
    message: "We couldn't read the breach data just now. Please try again shortly.",
  },
  offline: {
    title: "You're offline",
    message: "The breach check needs an internet connection. Please try again when you're connected.",
  },
  bad_response: {
    title: "Something went wrong",
    message: "We got an unexpected response from the server. Please try again.",
  },
};

/**
 * @returns {Promise<{ok:true, result:object} | {ok:false, error:string, title:string, message:string}>}
 */
export async function checkBreach(email) {
  if (!isValidEmail(email)) {
    const f = FRIENDLY.invalid_email;
    return { ok: false, error: "invalid_email", title: f.title, message: f.message };
  }
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    const f = FRIENDLY.offline;
    return { ok: false, error: "offline", title: f.title, message: f.message };
  }
  let res;
  try {
    res = await fetch("/api/breach-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
    });
  } catch {
    // The browser never talks to api.xposedornot.com directly — only to our
    // own route. A thrown fetch means our route/server is unreachable.
    const f = FRIENDLY.upstream_unavailable;
    return { ok: false, error: "upstream_unavailable", title: f.title, message: f.message };
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (res.status === 429) {
    const f = FRIENDLY.rate_limited;
    return { ok: false, error: "rate_limited", title: f.title, message: f.message };
  }
  if (res.status === 400) {
    const f = FRIENDLY.invalid_email;
    return { ok: false, error: "invalid_email", title: f.title, message: f.message };
  }
  if (!res.ok) {
    // Prefer the server's structured error code; fall back by status.
    const code = data && FRIENDLY[data.error] ? data.error : "upstream_unavailable";
    const f = FRIENDLY[code] || FRIENDLY.upstream_unavailable;
    return { ok: false, error: code, title: f.title, message: f.message };
  }
  if (!data || data.ok !== true || !data.result) {
    const f = FRIENDLY.bad_response;
    return { ok: false, error: "bad_response", title: f.title, message: f.message };
  }
  return { ok: true, result: data.result };
}
