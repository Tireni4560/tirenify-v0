// Static content for the four public legal/help pages. Kept in one place so the
// legal wording can be reviewed together. These are the real Privacy Policy and
// Terms, reflecting the zero-dependency design.
// PRODUCT_ATTRIBUTION ("Safeyard by Tirenify") is used exactly once per
// phrase — never compose it again with `by ${COMPANY}`.
import { PRODUCT_NAME, PRODUCT_ATTRIBUTION, COMPANY, DATA_SOURCE, LAST_UPDATED } from "../config/brand.js";

export const STATIC_CONTENT = {
  "/privacy": {
    title: "Privacy",
    body: [
      `What leaves your device. ${PRODUCT_NAME} makes exactly one kind of outside request: when you
        run Breach Guard, your email is sent by POST to our own server, which asks ${DATA_SOURCE.name}
        to look it up. The email is sent to them to run the check. It is used only for that, never
        stored by us, and never written to logs or URLs.`,
      `Everything else stays on your device. The tools — password generator, strength checker,
        link and scam checkers, QR scanner, and every other page — make zero network requests. The
        text you paste and any password you type are never sent anywhere.`,
      `What is stored on your device. After a Breach Guard check we save a small summary in your
        browser: a masked email (like d***@gmail.com), the date, how many breaches were found, the
        list of exposed data types and the risk level. We never save your real email or the full
        results. Your safety-habit checkboxes and checkup answers are stored the same way. You can
        clear all of it at any time with "Clear data stored on this device".`,
      `What is never stored or logged. Your real email address and any password are never stored,
        never logged, and never placed in a URL. We do not use cookies for tracking, analytics, or
        advertising, and we do not build a profile of you.`,
      `Attribution. ${DATA_SOURCE.attribution}.`,
      `Questions. ${COMPANY} — see Help & Support.`,
    ],
  },
  "/terms": {
    title: "Terms",
    body: [
      `${PRODUCT_NAME} is provided by ${COMPANY} free of charge, with no account and no signup.`,
      `No guarantee. Breach results come from a third-party database and may be incomplete or out of
        date. Finding no breaches is not proof you were never exposed. Link, scam and Wi-Fi tools are
        heuristic guides, not guarantees — no tool can guarantee safety. Always use your judgement.`,
      `Use at your own discretion. You are responsible for how you use the tools and for the safety
        of your own accounts. We are not liable for any loss arising from use of this site.`,
      `Changes. These terms and the tools may change over time. Continued use means you accept the
        current version.`,
    ],
  },
  "/about": {
    title: `About ${PRODUCT_NAME}`,
    body: [
      `${PRODUCT_NAME}. Our promise: "Know Before They Do."`,
      `${PRODUCT_NAME} is a free hub for everyday digital safety. The tools run in your
        browser and nothing you type is sent to us. The only
        outside request is the Breach Guard check, which asks ${DATA_SOURCE.name} whether an email
        appears in known breaches.`,
      `Built for Africa first. The advice, scam examples and recovery guides are written with African
        context in mind — mobile money, bank and telco impersonation, BVN/NIN requests and more.`,
      `Data source. ${DATA_SOURCE.attribution}.`,
      `No accounts, no tracking, no ads. We don't ask you to sign up, and we don't track you.`,
      `Last updated ${LAST_UPDATED}.`,
      `${PRODUCT_NAME} is a product of ${COMPANY}.`,
    ],
  },
  "/help": {
    title: "Help & Support",
    body: [
      `What is Breach Guard? It checks whether your email appears in known data breaches. Enter your
        email, and we show which breaches included it, when, and what data was exposed.`,
      `Is anything stored? No. We don't ask for an account, and we never store your email or
        password. After a check we save only a small masked summary on your own device, which you
        can clear at any time.`,
      `Why does it say "no breaches found"? That means the email wasn't in the breaches we can see.
        It isn't proof you were never exposed — some leaks never become public.`,
      `A tool isn't working. Most tools run in your browser. If a page won't load, try
        reloading it.`,
      `Something looks wrong or you have feedback? Reach out to ${COMPANY}. We read every message.`,
    ],
  },
};
