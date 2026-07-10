#!/usr/bin/env node

// CLI: send a newsletter to every active subscriber.
// Usage: node send-newsletter.js "<subject>" "<body>" ["<cta text>" "<cta link>"]

require("dotenv").config();

const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");
const { Resend } = require("resend");
const { buildNewsletterEmail } = require("./lib/emailTemplates");

const FRONTEND_URL = (process.env.FRONTEND_URL || "https://breachchecker-rho.vercel.app").replace(/\/$/, "");
const SENDER_EMAIL = "hello@tirenify.app";

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}
if (!process.env.RESEND_API_KEY) {
  console.error("❌ Missing RESEND_API_KEY in .env");
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendNewsletter() {
  const [subject, body, ctaText, ctaLink] = process.argv.slice(2);

  if (!subject || !body) {
    console.log('Usage: node send-newsletter.js "<subject>" "<body>" ["<cta text>" "<cta link>"]');
    console.log('Example: node send-newsletter.js "New Feature" "We just launched something cool" "Check it out" "https://tirenify.netlify.app"');
    process.exit(1);
  }

  console.log(`\n📧 Sending newsletter\nSubject: ${subject}\n`);

  const { data: subscribers, error: fetchError } = await supabase
    .from("subscriptions")
    .select("user_id, users ( email )")
    .eq("status", "active");

  if (fetchError) {
    console.error("❌ Failed to fetch subscribers:", fetchError.message);
    process.exit(1);
  }

  const recipients = (subscribers || [])
    .map((sub) => ({ userId: sub.user_id, email: sub.users?.email }))
    .filter((r) => r.email);

  if (recipients.length === 0) {
    console.log("No active subscribers found. Nothing to send.");
    process.exit(0);
  }

  const campaignId = crypto.randomBytes(8).toString("hex");
  console.log(`Found ${recipients.length} active subscriber(s). Campaign ID: ${campaignId}\n`);

  let successCount = 0;
  let failureCount = 0;

  for (const { userId, email } of recipients) {
    const unsubscribeUrl = `${FRONTEND_URL}/api/email/unsubscribe?email=${encodeURIComponent(email)}`;
    const html = buildNewsletterEmail({
      title: subject,
      bodyText: body,
      ctaUrl: ctaLink || null,
      ctaText: ctaText || null,
      unsubscribeUrl,
    });

    let sendStatus = "failed";
    let resendMessageId = null;
    let errorMessage = null;

    try {
      const result = await resend.emails.send({
        from: SENDER_EMAIL,
        to: email,
        subject,
        html,
      });
      resendMessageId = result?.data?.id || result?.id || null;
      sendStatus = result?.error ? "failed" : "sent";
      if (result?.error) errorMessage = result.error.message;
    } catch (err) {
      errorMessage = err.message;
    }

    if (sendStatus === "sent") {
      successCount++;
      console.log(`  ✅ ${email}`);
    } else {
      failureCount++;
      console.error(`  ❌ ${email}: ${errorMessage}`);
    }

    await supabase.from("email_logs").insert([{
      user_id: userId,
      recipient_email: email,
      email_type: "newsletter",
      subject,
      sent_date: new Date().toISOString(),
      status: sendStatus,
      resend_message_id: resendMessageId,
      error_message: errorMessage,
      campaign_id: campaignId,
    }]);
  }

  console.log(`\n✅ Complete. Sent: ${successCount}, Failed: ${failureCount}`);
  console.log(`Campaign ID: ${campaignId} (query email_logs by campaign_id to review this send)`);
}

sendNewsletter().catch((err) => {
  console.error("Newsletter error:", err);
  process.exit(1);
});
