require("dotenv").config();

const express = require("express");
const fetch = global.fetch; // Node v18+ has fetch built-in
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const { Resend } = require("resend");

const app = express();
const PORT = 3000;

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
      .from("subscribers")
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

// Route to check breaches
app.post("/check-breach", async (req, res) => {
  const { email } = req.body;

  if (!email || typeof email !== "string") {
    return res.status(400).json({ message: "Invalid email provided." });
  }

  try {
    console.log("Checking email:", email);

    const apiUrl = `https://api.xposedornot.com/v1/check-email/${encodeURIComponent(email)}`;
    console.log("Calling API:", apiUrl);

    const response = await fetch(apiUrl);
    const data = await response.json();

    

    console.log("Response status:", response.status);
    console.log("API data received:", data);

    if (!response.ok) {
      return res.status(response.status).json({ message: data.message || "API error occurred." });
    }

    // Forward the API response to the frontend
    res.json(data);

  } catch (error) {
    console.error("Error contacting API:", error);
    res.status(500).json({ message: "Connection error. Could not reach breach API." });
  }
});

app.post("/api/subscribe", async (req, res) => {
  const { email } = req.body;

  console.log("\n✉️  SUBSCRIPTION REQUEST RECEIVED");
  console.log("─" + "─".repeat(50));
  console.log("Email:", email);
  console.log("─" + "─".repeat(50));

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    console.warn("❌ Email validation failed");
    return res.status(400).json({ message: "Invalid email address." });
  }

  try {
    console.log("📝 Attempting to insert email into subscribers table...");

    // Attempt to insert the email directly
    const { error: dbError } = await supabase
      .from("subscribers")
      .insert([{ email }]);

    console.log("✓ Insert attempt completed. Checking for errors...");

    // Handle database errors
    if (dbError) {
      // ─────────────────────────────────────────────────────────────
      // LOG: Full error details for debugging
      // ─────────────────────────────────────────────────────────────
      console.error("\n❌ SUBSCRIPTION ERROR for email:", email);
      console.error("─" + "─".repeat(50));
      console.error("Error code:", dbError.code);
      console.error("Error message:", dbError.message);
      if (dbError.details) console.error("Error details:", dbError.details);
      if (dbError.hint) console.error("Error hint:", dbError.hint);
      console.error("Error status:", dbError.status);
      console.error("\nFull error object:");
      console.error(JSON.stringify(dbError, null, 2));
      console.error("─" + "─".repeat(50) + "\n");

      // Check if it's a unique constraint violation (duplicate email)
      if (
        dbError.code === "23505" ||
        dbError.message?.includes("duplicate") ||
        dbError.message?.includes("already exists")
      ) {
        return res.status(200).json({ message: "You're already subscribed." });
      }

      // Return generic error for other database issues
      return res
        .status(500)
        .json({ message: "Could not save subscription." });
    }

    // Send welcome email via Resend
    await resend.emails.send({
      from: "onboarding@resend.dev",
      to: email,
      subject: "Welcome to Tirenify",
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; background: #f9f9f9; padding: 32px;">
          <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px;">
            <h2 style="color: #0f172a; margin-bottom: 8px;">Welcome to Tirenify</h2>
            <p style="color: #475569; line-height: 1.6;">
              Thanks for joining. You're now part of a growing community of African internet users
              taking control of their digital security.
            </p>
            <p style="color: #475569; line-height: 1.6;">
              Tirenify helps you discover if your data has been exposed in known breaches —
              before attackers use it against you.
            </p>
            <a href="https://breachchecker-rho.vercel.app/"
               style="display: inline-block; margin-top: 20px; padding: 12px 24px;
                      background: #1d4ed8; color: #ffffff; border-radius: 8px;
                      text-decoration: none; font-weight: 700;">
              Check another email
            </a>
            <p style="margin-top: 32px; font-size: 13px; color: #94a3b8;">
              You're receiving this because you signed up at breachchecker-rho.vercel.app.<br/>
              If this wasn't you, you can safely ignore this email.
            </p>
          </div>
        </body>
        </html>
      `,
    });

    return res.status(200).json({ message: "Subscribed successfully." });

  } catch (err) {
    // ─────────────────────────────────────────────────────────────
    // LOG: Full exception details (uncaught errors)
    // ─────────────────────────────────────────────────────────────
    console.error(
      "\n⚠️  UNCAUGHT EXCEPTION in /api/subscribe for email:",
      email
    );
    console.error("─" + "─".repeat(50));
    console.error("Error type:", err.constructor.name);
    console.error("Error message:", err.message);
    console.error("Error code:", err.code);
    if (err.cause) {
      console.error("\nCaused by:");
      console.error("  Message:", err.cause.message);
      console.error("  Code:", err.cause.code);
      if (err.cause.cause) {
        console.error("  Nested cause:", err.cause.cause);
      }
    }
    console.error("\nStack trace:");
    console.error(err.stack);
    console.error("\nFull error object:");
    console.error(JSON.stringify(err, null, 2));
    console.error("─" + "─".repeat(50) + "\n");

    return res
      .status(500)
      .json({ message: "Server error. Please try again." });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
