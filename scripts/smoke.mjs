// scripts/smoke.mjs — dev-only smoke test (Node built-in fetch, zero deps).
//
// Usage:
//   node scripts/smoke.mjs <baseUrl>
//   node scripts/smoke.mjs <baseUrl> --live
//   node scripts/smoke.mjs <baseUrl> --bypass <secret>
//
// Prints a PASS/FAIL table and exits non-zero on any failure. It never touches
// subscription endpoints with a real address (--live only does one breach
// check with test@example.com). Vercel Authentication is off, so no bypass
// header is needed by default; pass the automation bypass secret to send the
// x-vercel-protection-bypass header in case protection is turned on.

const BASE_URL = process.argv[2] || "http://localhost:3000";
const LIVE = process.argv.includes("--live");
// Optional protection-bypass header (in case Vercel Authentication is turned on):
// from the --bypass <secret> flag or the VERCEL_AUTOMATION_BYPASS_SECRET env var.
const bypassIdx = process.argv.indexOf("--bypass");
const BYPASS_SECRET =
  (bypassIdx !== -1 ? process.argv[bypassIdx + 1] : null) ||
  process.env.VERCEL_AUTOMATION_BYPASS_SECRET ||
  "";
const BYPASS = BYPASS_SECRET ? new Map([["x-vercel-protection-bypass", BYPASS_SECRET]]) : new Map();

const results = [];
let failures = 0;

function check(name, ok, detail) {
  results.push({ name, ok, detail });
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  -- " + detail : ""}`);
}

async function request(path, { method = "GET", body } = {}) {
  const headers = new Map(BYPASS);
  if (body !== undefined) headers.set("Content-Type", "application/json");
  const res = await fetch(BASE_URL + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const contentType = res.headers.get("content-type") || "";
  let textBody = "";
  try {
    textBody = await res.text();
  } catch {
    /* ignore */
  }
  return { status: res.status, contentType, body: textBody, headers: res.headers };
}

function hasType(ct, ...wanted) {
  return wanted.some((w) => ct.includes(w));
}

function titleOf(html) {
  const m = html.match(/<title>([\s\S]*?)<\/title>/i);
  // Unescape HTML entities so expected titles compare equal (e.g. "&amp;").
  return m
    ? m[1]
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .trim()
    : "";
}

// The SPA shell (root index.html): identifies a fallback response.
function isAppShell(html) {
  return html.includes('<div id="root">');
}

// ── ROUTE TABLE (all LIVE routes from src/config/routes.js) ──────────────
const ROUTES = [
  { path: "/", title: "Safeyard by Tirenify" },
  { path: "/breach-guard", title: "Breach Guard" },
  { path: "/report", title: "Security Report" },
  { path: "/account", title: "Account" },
  { path: "/tools", title: "Tools" },
  { path: "/tools/password-generator", title: "Password Generator" },
  { path: "/tools/password-strength", title: "Password Strength" },
  { path: "/tools/username-generator", title: "Username Generator" },
  { path: "/tools/email-alias-generator", title: "Email Alias Generator" },
  { path: "/tools/security-answer-generator", title: "Security Answer Generator" },
  { path: "/tools/pin-generator", title: "PIN Generator" },
  { path: "/tools/passphrase-generator", title: "Passphrase Generator" },
  { path: "/tools/entropy-calculator", title: "Entropy Calculator" },
  { path: "/tools/password-reuse-checker", title: "Password Reuse" },
  { path: "/tools/leak-safety-guide", title: "What to Do After a Data Leak" },
  { path: "/tools/qr-code-generator", title: "QR Code Generator" },
  { path: "/learn", title: "Security Center" },
  { path: "/learn/in-a-breach", title: "I Was in a Breach" },
  { path: "/learn/unique-passwords", title: "Why Unique Passwords" },
  { path: "/learn/setup-2fa", title: "Setting Up 2FA" },
  { path: "/learn/spotting-phishing", title: "Spotting Phishing" },
  { path: "/learn/what-is-a-data-breach", title: "What Is a Data Breach" },
  { path: "/learn/whatsapp-takeover", title: "WhatsApp Takeover" },
  { path: "/learn/sim-swap", title: "SIM-Swap Protection" },
  { path: "/learn/mobile-money-safety", title: "Mobile Money & Banking Safety" },
  { path: "/help", title: "Help" },
  { path: "/privacy", title: "Privacy" },
  { path: "/terms", title: "Terms" },
  { path: "/about", title: "About" },
];

// Planned (non-prerendered) routes: the SPA fallback must serve index.html.
const SPA_FALLBACK = [
  "/my-data",
  "/checkup",
  "/privacy-check",
  "/recover",
  "/recover/hacked-account",
  "/recover/stolen-phone",
  "/learn/scams",
  "/learn/scam-quiz",
  "/tools/link-checker",
  "/tools/scam-checker",
  "/tools/qr-code",
  "/tools/wifi-safety",
  "/tools/warning-card",
];

// Unknown path: SPA fallback must serve index.html (client shows the 404 view).
const SPA_404 = "/_does-not-exist-404";

// Key static assets + expected content-type groups. Hashed assets are
// discovered from the served root HTML (hash-agnostic), not hard-coded.
const STATIC_FILES = [
  { path: "/robots.txt", types: ["text"] },
  { path: "/sitemap.xml", types: ["xml"] },
  { path: "/manifest.webmanifest", types: ["json"] },
  { path: "/sw.js", types: ["javascript"] },
  { path: "/favicon.png", types: ["png"] },
  { path: "/og-preview.png", types: ["png"] },
];

// Required security headers (identical to the values in vercel.json headers).
const SECURITY_HEADERS = [
  "Content-Security-Policy",
  "X-Content-Type-Options",
  "X-Frame-Options",
  "Referrer-Policy",
  "Strict-Transport-Security",
  "Cross-Origin-Opener-Policy",
  "Permissions-Policy",
];

// ── ROUTE TABLE ───────────────────────────────────────────────────────────
for (const { path, title } of ROUTES) {
  const res = await request(path);
  const ok = res.status === 200 && titleOf(res.body).includes(title);
  check(`route ${path} -> 200 + title "${title}"`, ok, `got ${res.status}`);
}

// ── SPA FALLBACK (planned routes) ─────────────────────────────────────────
for (const path of SPA_FALLBACK) {
  const res = await request(path);
  const ok = res.status === 200 && isAppShell(res.body);
  check(`spa fallback ${path} -> index.html`, ok, `got ${res.status}`);
}

// Unknown path -> SPA fallback serves index.html (client renders the 404 view).
const res404 = await request(SPA_404);
const ok404 = res404.status === 200 && isAppShell(res404.body);
check(`spa 404 ${SPA_404} -> index.html`, ok404, `got ${res404.status}`);

// API 404 -> JSON 404, not the SPA shell.
const resApi404 = await request("/api/does-not-exist");
check(
  "api 404 /api/does-not-exist -> 404 json",
  resApi404.status === 404 && resApi404.body.includes("not-found"),
  `got ${resApi404.status}`,
);

// ── KEY STATIC FILES ──────────────────────────────────────────────────────
for (const { path, types } of STATIC_FILES) {
  const res = await request(path);
  check(
    `static ${path}`,
    res.status === 200 && hasType(res.contentType, ...types),
    `got ${res.status} + type "${res.contentType}"`,
  );
}

// ── HASHED ASSETS (discovered from the served root HTML) ──────────────────
const s = [...new Set(((await request("/")).body.match(/\/assets\/[A-Za-z0-9._-]+\.(?:js|css)/g) || []))];
check("hashed assets discovered from /", s.length > 0, s.join(", "));
let jsAsset = "/assets/index-Dt9yppwb.js"; // fallback if discovery fails
for (const p of s) {
  const res = await request(p);
  const want = p.endsWith(".css") ? ["css"] : ["javascript"];
  check(`hashed ${p}`, res.status === 200 && hasType(res.contentType, ...want), `got ${res.status} + type "${res.contentType}"`);
  if (p.endsWith(".js") && jsAsset.startsWith("/assets/index-Dt9yppwb")) jsAsset = p;
}

// ── SECURITY HEADERS (root + a hashed asset) ──────────────────────────────
for (const p of ["/", jsAsset]) {
  const res = await request(p);
  for (const h of SECURITY_HEADERS) {
    const value = res.headers.get(h);
    check(`headers ${p} ${h}`, value != null, value || "missing");
  }
}

// ── BREACH CHECK ──────────────────────────────────────────────────────────
const invalid = await request("/api/breach-check", { method: "POST", body: { email: "not-an-email" } });
check(
  "/api/breach-check invalid email -> 400",
  invalid.status === 400 && invalid.body.includes("invalid_email"),
  `got ${invalid.status}`,
);

// One live check with a throwaway address. Never a subscription endpoint.
if (LIVE) {
  const live = await request("/api/breach-check", { method: "POST", body: { email: "test@example.com" } });
  check("/api/breach-check test@example.com (live, --live)", live.status === 200, `got ${live.status}`);
}

// ── SUMMARY ───────────────────────────────────────────────────────────────
console.log(`\n${results.length - failures}/${results.length} passed`);
if (failures > 0) {
  console.log("FAILED:");
  for (const r of results) {
    if (!r.ok) console.log(`  FAIL ${r.name}`);
  }
  process.exit(1);
}
console.log("ALL PASSED");
