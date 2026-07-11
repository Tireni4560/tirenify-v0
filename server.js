require("dotenv").config();

const express = require("express");
const crypto = require("crypto");
const fetch = global.fetch; // Node v18+ has fetch built-in
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const { Resend } = require("resend");
const { buildWelcomeEmail, buildConfirmedEmail } = require("./lib/emailTemplates");

const app = express();
const PORT = 3000;

const FRONTEND_URL = process.env.FRONTEND_URL || "https://check.tirenify.app";
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
// VALIDATION: Check required environment variables
// ─────────────────────────────────────────────────────────────
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.error(
    "❌ FATAL: Missing Supabase credentials. Check .env file in:",
    path.resolve(__dirname, ".env")
  );
  console.error("Required variables: SUPABASE_URL, SUPABASE_ANON_KEY");
  process.exit(1);
}

// Validate URL format
const urlRegex = /^https:\/\/[\w-]+\.supabase\.co$/;
if (!urlRegex.test(process.env.SUPABASE_URL)) {
  console.error(
    "❌ FATAL: Invalid SUPABASE_URL format. Expected: https://<project-id>.supabase.co"
  );
  console.error("Got:", process.env.SUPABASE_URL);
  process.exit(1);
}

console.log("✅ Configuration validated successfully.\n");

// ─────────────────────────────────────────────────────────────
// INITIALIZE: Supabase and Resend clients
// ─────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

// ─────────────────────────────────────────────────────────────
// CONNECTIVITY TEST: Test Supabase connection on startup
// ─────────────────────────────────────────────────────────────
async function testSupabaseConnection() {
  console.log("🔍 Testing Supabase connectivity...");
  try {
    const { data, error } = await supabase
      .from("subscriptions")
      .select("id")
      .limit(1);

    if (error) {
      console.error("❌ CONNECTIVITY TEST FAILED");
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      if (error.details) console.error("Error details:", error.details);
      if (error.hint) console.error("Error hint:", error.hint);
      console.error("\nFull error object:");
      console.error(JSON.stringify(error, null, 2));
      return false;
    }

    console.log("✅ Supabase connection successful!");
    console.log(`   Found ${data?.length || 0} subscriber(s) in test query.\n`);
    return true;
  } catch (err) {
    console.error("❌ CONNECTIVITY TEST FAILED (Exception)");
    console.error("Error message:", err.message);
    console.error("Error code:", err.code);
    console.error("Error type:", err.constructor.name);
    if (err.cause) {
      console.error("Caused by:", err.cause);
    }
    console.error("\nStack trace:");
    console.error(err.stack);
    console.error("\nFull error object:");
    console.error(JSON.stringify(err, null, 2));
    return false;
  }
}

// Run connectivity test and store result
let supabaseConnected = false;
testSupabaseConnection().then((result) => {
  supabaseConnected = result;
  console.log(
    "\n" + (result ? "✅" : "❌") + " Supabase ready for requests.\n"
  );
});

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const INVALID_EMAIL_MESSAGE = "This email doesn't appear to be valid. Please check and try again.";

// Basic shape check for subscriptions; Resend does the real deliverability
// work when it sends the confirmation email.
const emailShapeRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Fetches from the breach API with retries: transient network failures
// (connect timeouts, DNS hiccups) are retried with a short backoff before
// giving up. HTTP error responses are returned as-is — only thrown network
// errors trigger a retry.
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
      console.error(`⚠️  Breach API attempt ${attempt}/${attempts} failed:`, err.cause?.message || err.message);
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
  throw lastError;
}

// POST /api/email/check-breach — no validation step; the email goes straight
// to XposedOrNot, which handles malformed input itself.
async function handleCheckBreach(req, res) {
  const { email } = req.body;

  if (!email || typeof email !== "string") {
    return res.status(400).json({ message: "Email is required." });
  }

  try {
    console.log("Checking email:", email);

    const apiUrl = `https://api.xposedornot.com/v1/check-email/${encodeURIComponent(email)}`;
    const headers = process.env.EXPOSED_ORKNOT_API_KEY
      ? { "api-key": process.env.EXPOSED_ORKNOT_API_KEY }
      : undefined;

    const response = await fetchBreachApiWithRetry(apiUrl, { headers });
    const data = await response.json();

    console.log("Response status:", response.status);

    if (!response.ok) {
      return res.status(response.status).json({ message: data.message || "API error occurred." });
    }

    res.json(data);
  } catch (error) {
    console.error("Error contacting breach API (all retries exhausted):", error);
    res.status(504).json({
      message: "The breach database is temporarily unreachable. Please try again in a moment.",
    });
  }
}

app.post("/api/email/check-breach", handleCheckBreach);
app.post("/check-breach", handleCheckBreach); // legacy alias for existing frontend

// POST /api/email/subscribe — validates the email, upserts a user + pending
// subscription, and sends a welcome/confirmation email via Resend.
async function handleSubscribe(req, res) {
  const { email, preferences = {} } = req.body;

  console.log("\n✉️  SUBSCRIPTION REQUEST RECEIVED");
  console.log("Email:", email);

  if (!email || typeof email !== "string" || !emailShapeRegex.test(email)) {
    return res.status(400).json({ message: INVALID_EMAIL_MESSAGE });
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
    console.error("⚠️  UNCAUGHT EXCEPTION in subscribe for email:", email, err);
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
        console.log("✅ Confirmation email sent to:", user.email);
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
