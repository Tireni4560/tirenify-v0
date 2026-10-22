// "Do this first" — pure, unit-tested derivation of up to 3 next-step actions
// from a breach result (or the masked summary after a reload). Each action is a
// short verb phrase + one-line reason + a link to an EXISTING live route.
// The full action-plan checklist (breach-guard ActionPlan) stays untouched;
// this is only its top slice. No dead links: every `to` is filtered against
// the live route table inside this function.
import { LIVE_ROUTES } from "../config/routes.js";
import { HABIT_2FA_INDEX } from "./habits-store.js";

const LIVE = new Set(LIVE_ROUTES.map((r) => r.path));

const route = (to) => (LIVE.has(to) ? to : null);

/** Does any exposed data type match the pattern? */
function hasType(types, re) {
  return types.some((t) => re.test(String(t)));
}

/**
 * @param {{types?: string[], count?: number|null, pasteCount?: number|null,
 *          doneHabits?: number[]}} input
 *   types  — exposed data-type labels (from the full result or the masked
 *            summary); matched case-insensitively.
 *   count  — number of breaches found (0 = "none found", null = unknown).
 *   pasteCount — number of public paste exposures the API confirmed
 *            (0 = none, null = the API did not report a counter). A paste
 *            exposure is NOT a breach, so it gets its own remediation.
 *   doneHabits — ticked habit indexes from the shared habits store; the
 *            "2fa" row is skipped when HABIT_2FA_INDEX is ticked so a
 *            completed habit never shows as a pending action.
 * @returns {Array<{id:string, title:string, reason:string, to:string}>}
 *   Up to 3 actions, every `to` a live route.
 */
export function getDoThisFirst({ types = [], count = null, pasteCount = null, doneHabits = [] } = {}) {
  const actions = [];
  const skipped = [];
  const push = (id, title, reason, to, habitIndex = null) => {
    if (habitIndex !== null && doneHabits.includes(habitIndex)) {
      skipped.push(id);
      return;
    }
    const live = route(to);
    if (live && !actions.some((a) => a.id === id)) {
      actions.push({ id, title, reason, to: live });
    }
  };

  const noneFound = count === 0;
  const breaches = count === null ? types.length > 0 : count > 0;
  // The API's paste counter is authoritative; a missing/invalid counter means
  // "unknown", never "zero exposures".
  const pastes = Number.isFinite(Number(pasteCount)) && Number(pasteCount) > 0 ? Number(pasteCount) : 0;

  // Paste-only result: the email was not in a breach, but it is public on
  // paste sites. Remediation must talk about pastes, not breaches.
  if (noneFound && pastes > 0) {
    push(
      "paste-remove",
      "Remove the public paste if you can",
      `${pastes} public paste${pastes === 1 ? "" : "s"} exposed this email — the text is public and may still be indexed.`,
      "/tools/leak-safety-guide",
    );
    push(
      "paste-pw-gen",
      "Change any password that appeared in the paste",
      "Text posted publicly can be copied — replace every password that was in it.",
      "/tools/password-generator",
    );
    push(
      "paste-2fa",
      "Turn on two-factor authentication",
      "A second step protects accounts even if a pasted password is reused.",
      "/learn/setup-2fa",
      HABIT_2FA_INDEX,
    );
    return actions.slice(0, 3);
  }

  if (noneFound) {
    // Good news — but "no breaches found" is not proof of safety, so finish
    // the score and add a second lock anyway.
    push(
      "habits",
      "Finish the safety habits checklist",
      "A clean check doesn't prove you were never exposed — the habits complete your score.",
      "/",
    );
    push(
      "2fa",
      "Turn on two-factor authentication",
      "A second step protects your accounts even if a password leaks.",
      "/learn/setup-2fa",
      HABIT_2FA_INDEX,
    );
    return actions.slice(0, 3);
  }

  if (breaches) {
    const pw = hasType(types, /password/i);
    const bank = hasType(types, /bank|card|financial|credit|iban|routing/i);
    const phone = hasType(types, /phone|mobile|sms/i);

    if (pw) {
      push(
        "pw-gen",
        "Create a strong password",
        "Exposed passwords can be cracked — replace any you reused.",
        "/tools/password-generator",
      );
      push(
        "pw-strength",
        "Check your other passwords",
        "Make sure the passwords you keep are hard to guess.",
        "/tools/password-strength",
      );
      push(
        "2fa",
        "Turn on two-factor authentication",
        "A second step protects accounts when a password leaks.",
        "/learn/setup-2fa",
        HABIT_2FA_INDEX,
      );
    }
    if (bank) {
      push(
        "bank",
        "Review mobile money and banking safety",
        "Financial data in a breach can fuel fraudulent transactions.",
        "/learn/mobile-money-safety",
      );
    }
    if (phone) {
      push(
        "sim",
        "Protect your phone number",
        "Phone numbers in breaches can fuel SIM-swap attacks on SMS codes.",
        "/learn/sim-swap",
      );
      push(
        "scam",
        "Learn to spot scam messages",
        "Scam texts often quote details from real breaches.",
        "/learn/spotting-phishing",
      );
    }
    if (actions.length === 0) {
      // Breaches found but no recognisable data types — calm general guidance.
      push(
        "guide",
        "Follow the calm after-leak guide",
        "An ordered plan for what to do when your email appears in a breach.",
        "/learn/in-a-breach",
      );
      push(
        "checklist",
        "Open the after-leak checklist",
        "A short checklist you can work through at your own pace.",
        "/tools/leak-safety-guide",
      );
    }
  }

  return actions.slice(0, 3);
}
