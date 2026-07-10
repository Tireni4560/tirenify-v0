function baseLayout(bodyHtml) {
  return `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; background: #f9f9f9; padding: 32px; margin: 0;">
      <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px;">
        <div style="font-size: 20px; font-weight: 800; color: #1d4ed8; margin-bottom: 24px;">Tirenify</div>
        ${bodyHtml}
      </div>
    </body>
    </html>
  `;
}

function button(url, label) {
  return `
    <a href="${url}"
       style="display: inline-block; margin-top: 20px; padding: 12px 24px;
              background: #1d4ed8; color: #ffffff; border-radius: 8px;
              text-decoration: none; font-weight: 700;">
      ${label}
    </a>
  `;
}

function buildWelcomeEmail({ confirmUrl, checkAnotherUrl }) {
  return baseLayout(`
    <h2 style="color: #0f172a; margin-bottom: 8px;">Welcome to Tirenify</h2>
    <p style="color: #475569; line-height: 1.6;">
      Thanks for joining. You're now part of a growing community of African internet users
      taking control of their digital security.
    </p>
    <p style="color: #475569; line-height: 1.6;">
      Please confirm your subscription so we know it's really you. This keeps our list
      clean and your inbox spam-free.
    </p>
    ${button(confirmUrl, "Confirm my subscription")}
    <p style="color: #475569; line-height: 1.6; margin-top: 24px;">
      Tirenify helps you discover if your data has been exposed in known breaches —
      before attackers use it against you.
    </p>
    ${button(checkAnotherUrl, "Check another email")}
    <p style="margin-top: 32px; font-size: 13px; color: #94a3b8;">
      You're receiving this because you signed up at tirenify.app.<br/>
      If this wasn't you, you can safely ignore this email.
    </p>
  `);
}

function buildConfirmedEmail({ checkerUrl }) {
  return baseLayout(`
    <div style="font-size: 40px; color: #22c55e;">✓</div>
    <h2 style="color: #0f172a; margin-bottom: 8px;">You're all set!</h2>
    <p style="color: #475569; line-height: 1.6;">
      Your email has been confirmed. You'll now receive security insights and
      updates from Tirenify.
    </p>
    <p style="color: #475569; line-height: 1.6;">
      In the meantime, you can run a breach check anytime.
    </p>
    ${button(checkerUrl, "Run a breach check")}
    <p style="margin-top: 32px; font-size: 13px; color: #94a3b8;">
      You're receiving this because you confirmed your subscription to Tirenify.<br/>
      You can unsubscribe anytime using the link at the bottom of any email from us.
    </p>
  `);
}

function buildNewsletterEmail({ title, bodyText, ctaUrl, ctaText, unsubscribeUrl }) {
  return baseLayout(`
    <h2 style="color: #0f172a; margin-bottom: 8px;">${title}</h2>
    <p style="color: #475569; line-height: 1.6; white-space: pre-line;">${bodyText}</p>
    ${ctaUrl ? button(ctaUrl, ctaText || "Learn more") : ""}
    <p style="margin-top: 32px; font-size: 13px; color: #94a3b8;">
      You're receiving this because you're subscribed to Tirenify updates.<br/>
      <a href="${unsubscribeUrl}" style="color: #94a3b8;">Unsubscribe</a> at any time.
    </p>
  `);
}

module.exports = { buildWelcomeEmail, buildConfirmedEmail, buildNewsletterEmail };
