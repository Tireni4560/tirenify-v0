// Central route table. Data only (no JSX) so `scripts/gen-meta.mjs` can
// import it in plain Node. The React app maps `path` patterns to lazy
// components. Titles follow "<Page> | Safeyard by Tirenify" (from brand.js).
import { pageTitle, PRODUCT_FULL, TAGLINE } from "./brand.js";

/**
 * status:
 *  "live"    — implemented now
 *  "planned" — reserved route (Phase 5+); NOT linked anywhere until live.
 */
export const ROUTES = [
  // Core
  { path: "/", title: pageTitle(null), description: `${PRODUCT_FULL} — ${TAGLINE}. Free digital safety tools and a breach checker. No account needed.`, group: "core", status: "live" },
  { path: "/breach-guard", title: pageTitle("Breach Guard"), description: "Check if your email appeared in known data breaches — which breaches, when, and what was exposed.", group: "core", status: "live" },
  { path: "/report", title: pageTitle("Security Report"), description: "Your local security report, built from checks you run on this device.", group: "core", status: "live" },
  { path: "/account", title: pageTitle("Account"), description: "Your local profile — name and email saved on this device only.", group: "core", status: "live" },
  { path: "/my-data", title: pageTitle("My data"), description: "Everything Safeyard stores on this device, and how to clear it.", group: "core", status: "planned" },
  { path: "/checkup", title: pageTitle("Security Checkup"), description: "A short quiz that scores your digital safety habits and gives you a prioritized plan.", group: "core", status: "planned" },
  { path: "/privacy-check", title: pageTitle("Privacy Check"), description: "See what any website can read about your browser — checked locally, nothing leaves your device.", group: "core", status: "planned" },

  // Tools
  { path: "/tools", title: pageTitle("Tools"), description: "Free digital safety tools. No account needed — nothing you type is uploaded.", group: "tools", status: "live" },
  { path: "/tools/:slug", title: pageTitle("Tool"), description: "A Safeyard tool — private by design, nothing you type is uploaded.", group: "tools", status: "live" },
  { path: "/tools/password-generator", title: pageTitle("Password Generator"), description: "Generate strong random passwords and passphrases with cryptographic randomness.", group: "tools", status: "live" },
  { path: "/tools/password-strength", title: pageTitle("Password Strength Checker"), description: "Check how strong a password is and how long it would resist an attack — analysed in your browser, never uploaded.", group: "tools", status: "live" },
  { path: "/tools/username-generator", title: pageTitle("Username Generator"), description: "Invent memorable usernames for professional, creative or gaming use.", group: "tools", status: "live" },
  { path: "/tools/email-alias-generator", title: pageTitle("Email Alias Generator"), description: "Build plus-aliases and dot variants for your email address to track who leaks it.", group: "tools", status: "live" },
  { path: "/tools/security-answer-generator", title: pageTitle("Security Answer Generator"), description: "Generate random fake answers for security questions — store them in a password manager.", group: "tools", status: "live" },
  { path: "/tools/pin-generator", title: pageTitle("PIN Generator"), description: "Generate PINs that avoid repeats, sequences, years and other easy guesses.", group: "tools", status: "live" },
  { path: "/tools/passphrase-generator", title: pageTitle("Passphrase Generator"), description: "Generate long, memorable passphrases for things that need a long secret — a master password or a phone backup.", group: "tools", status: "live" },
  { path: "/tools/entropy-calculator", title: pageTitle("Password Entropy Calculator"), description: "See the approximate entropy of a password and how long it would take to guess at a few speeds. Signals only.", group: "tools", status: "live" },
  { path: "/tools/password-reuse-checker", title: pageTitle("Password Reuse Checker"), description: "Paste a few passwords here and see which ones repeat — compared in your browser, never stored or sent.", group: "tools", status: "live" },
  { path: "/tools/leak-safety-guide", title: pageTitle("What to Do After a Data Leak"), description: "A calm, ordered checklist of the first steps to take when a breach check shows your email was exposed.", group: "tools", status: "live" },
  { path: "/tools/qr-code-generator", title: pageTitle("QR Code Generator"), description: "Turn any text or URL into a QR code and download it as PNG or SVG — encoded in your browser.", group: "tools", status: "live" },

  { path: "/tools/link-checker", title: pageTitle("Link Checker"), description: "Heuristic checks for suspicious links. Runs entirely on your device.", group: "tools", status: "planned" },
  { path: "/tools/scam-checker", title: pageTitle("Scam Checker"), description: "Paste a suspicious SMS, WhatsApp message or email and get red flags with explanations.", group: "tools", status: "planned" },
  { path: "/tools/qr-code", title: pageTitle("QR Code Tools"), description: "Create QR codes and scan QR codes with your camera. Scanned links are checked locally.", group: "tools", status: "planned" },
  { path: "/tools/wifi-safety", title: pageTitle("Wi-Fi Safety Check"), description: "An honest checklist for using public Wi-Fi safely and securing your home router.", group: "tools", status: "planned" },
  { path: "/tools/warning-card", title: pageTitle("Warning Card Maker"), description: "Make shareable safety cards (like never share your OTP) for family WhatsApp groups.", group: "tools", status: "planned" },
  // Learn
  { path: "/learn", title: pageTitle("Security Center"), description: "Clear, practical guidance — no jargon. Plain-language security guides for everyday digital life.", group: "learn", status: "live" },
  { path: "/learn/:slug", title: pageTitle("Guide"), description: "A plain-language security guide, free to read with no account.", group: "learn", status: "live" },
  { path: "/learn/scams", title: pageTitle("Scam Library"), description: "Real examples of common scams and how to spot each one.", group: "learn", status: "planned" },
  { path: "/learn/scam-quiz", title: pageTitle("Scam Quiz"), description: "Ten real-looking messages: can you tell which are scams?", group: "learn", status: "planned" },
  { path: "/learn/what-is-a-data-breach", title: pageTitle("What Is a Data Breach"), description: "What a data breach is and what it means for you.", group: "learn", status: "live" },
  { path: "/learn/unique-passwords", title: pageTitle("Why Unique Passwords Matter"), description: "Why one password per site keeps a single leak from becoming total compromise.", group: "learn", status: "live" },
  { path: "/learn/setup-2fa", title: pageTitle("Setting Up 2FA"), description: "General steps to turn on two-factor authentication on any major provider.", group: "learn", status: "live" },
  { path: "/learn/spotting-phishing", title: pageTitle("Spotting Phishing"), description: "How to recognise phishing messages before you click.", group: "learn", status: "live" },
  { path: "/learn/in-a-breach", title: pageTitle("I Was in a Breach — What Now"), description: "A calm, ordered plan for what to do after a breach check finds your email.", group: "learn", status: "live" },
  { path: "/learn/sim-swap", title: pageTitle("SIM-Swap Protection"), description: "How SIM swaps work and how to protect your phone number and SMS codes.", group: "learn", status: "live" },
  { path: "/learn/mobile-money-safety", title: pageTitle("Mobile Money & Banking Safety"), description: "Practical safety habits for mobile money and banking apps.", group: "learn", status: "live" },
  { path: "/learn/whatsapp-takeover", title: pageTitle("WhatsApp Takeover Protection"), description: "Lock down WhatsApp before someone else registers your number.", group: "learn", status: "live" },
  { path: "/learn/safe-public-wifi", title: pageTitle("Safe Public Wi-Fi"), description: "What is risky about public Wi-Fi and how to use it more safely.", group: "learn", status: "planned" },
  { path: "/learn/safe-online-shopping", title: pageTitle("Safe Online Shopping"), description: "How to shop online without handing your card to a scammer.", group: "learn", status: "planned" },
  { path: "/learn/loan-app-privacy", title: pageTitle("Loan-App Privacy"), description: "What loan apps access on your phone and how to protect yourself.", group: "learn", status: "planned" },
  { path: "/learn/breach-data-types", title: pageTitle("Understanding Breach Data Types"), description: "What passwords, BVNs, phone numbers and other exposed data types actually mean.", group: "learn", status: "planned" },

  // Recover
  { path: "/recover", title: pageTitle("Account Recovery"), description: "Step-by-step recovery help for hacked accounts and stolen phones.", group: "recover", status: "planned" },
  { path: "/recover/hacked-account", title: pageTitle("Recover a Hacked Account"), description: "Official recovery steps for Gmail, Facebook, Instagram, WhatsApp, TikTok, X and banking apps.", group: "recover", status: "planned" },
  { path: "/recover/stolen-phone", title: pageTitle("Stolen Phone Checklist"), description: "Ordered steps to take in the first hour after your phone is stolen.", group: "recover", status: "planned" },

  // Static pages
  { path: "/help", title: pageTitle("Help"), description: `Frequently asked questions about ${PRODUCT_FULL} and Breach Guard.`, group: "static", status: "live" },
  { path: "/privacy", title: pageTitle("Privacy"), description: "What we send, what we never store, and what stays on your device.", group: "static", status: "live" },
  { path: "/terms", title: pageTitle("Terms"), description: `Terms of use for ${PRODUCT_FULL}.`, group: "static", status: "live" },
  { path: "/about", title: pageTitle("About"), description: `About ${PRODUCT_FULL} — an African-first digital safety product.`, group: "static", status: "live" },
];

export const LIVE_ROUTES = ROUTES.filter((r) => r.status === "live");

