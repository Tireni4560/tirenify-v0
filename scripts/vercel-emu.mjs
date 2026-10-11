// scripts/vercel-emu.mjs — dev-only emulation of Vercel's request precedence:
//   1. a static file in public/ wins (served directly, rewrites do not apply)
//   2. otherwise vercel.json rewrites are evaluated (source regex match)
//   3. otherwise the request is forwarded to the Express function (server.js)
//
// Proves: deep links / refreshes for non-prerendered routes resolve to
// index.html, and server.js routes (/api/*) are NOT swallowed by the fallback.
//
// Usage: node scripts/vercel-emu.mjs [baseUrl]   (default http://localhost:3000)
// Requires the local Express server to be running (for the function stage).

import { readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");
const BASE_URL = process.argv[2] || "http://localhost:3000";

const vercel = JSON.parse(readFileSync(path.join(root, "vercel.json"), "utf8"));
const rewrites = (vercel.rewrites || []).map((r) => ({
  src: new RegExp("^" + r.source + "$"),
  dest: r.destination,
}));

let failures = 0;
function report(ok, label, detail) {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  -- " + detail : ""}`);
}

// Vercel static resolution: exact file, or directory index.
function staticTarget(urlPath) {
  const clean = urlPath.split("?")[0];
  const direct = path.join(publicDir, clean);
  if (existsSync(direct) && statSync(direct).isFile()) return clean;
  const asIndex = path.join(publicDir, clean, "index.html");
  if (existsSync(asIndex) && statSync(asIndex).isFile()) return path.posix.join(clean, "index.html");
  if (clean === "/") return "/index.html";
  return null;
}

function route(urlPath) {
  const staticHit = staticTarget(urlPath);
  if (staticHit) return { stage: "static", target: staticHit };
  for (const r of rewrites) {
    if (r.src.test(urlPath)) return { stage: "rewrite", target: r.dest };
  }
  return { stage: "function", target: urlPath };
}

// Non-prerendered (planned) routes — must fall through to the SPA shell.
const NON_PRERENDERED = ["/my-data", "/checkup", "/recover", "/tools/qr-code", "/learn/scams"];
// Prerendered routes — must be served as static files.
const PRERENDERED = ["/breach-guard", "/report", "/account", "/tools/password-generator", "/learn/setup-2fa"];
// server.js routes — must reach the Express function, never the fallback.
const FUNCTION_ROUTES = ["/api/breach-check", "/api/email/subscribe", "/api/email/confirm", "/api/email/unsubscribe"];

console.log("--- non-prerendered routes (SPA fallback) ---");
for (const p of NON_PRERENDERED) {
  const r = route(p);
  const resolvesToShell = r.stage === "rewrite" && r.target === "/index.html" && staticTarget("/index.html");
  report(resolvesToShell, `${p} -> ${r.stage} -> ${r.target}`, r.stage);
}

console.log("--- prerendered routes (static) ---");
for (const p of PRERENDERED) {
  const r = route(p);
  report(r.stage === "static" && r.target, `${p} -> static ${r.target}`, r.stage);
}

console.log("--- server.js routes (must reach the function) ---");
for (const p of FUNCTION_ROUTES) {
  const r = route(p);
  report(r.stage === "function", `${p} -> function (routing decision)`, r.stage === "function" ? "" : "swallowed by fallback!");
}
// Prove the function responds (not the static shell) for the safe breach-check
// route only. Subscription endpoints are NEVER fetched (they write to the
// production database when given an address; routing decisions above suffice).
{
  const res = await fetch(BASE_URL + "/api/breach-check", { method: "GET" });
  const text = await res.text().catch(() => "");
  const swallowed = res.status === 200 && text.includes('<div id="root">');
  report(!swallowed, "/api/breach-check -> function responds " + res.status, swallowed ? "swallowed!" : "");
}

// Root and key statics resolve to real files. The hashed entry JS is discovered
// from the built root HTML (hash-agnostic) rather than hard-coded.
console.log("--- root + key statics ---");
const builtIndex = readFileSync(path.join(publicDir, "index.html"), "utf8");
const hashedEntry = [...new Set(builtIndex.match(/\/assets\/[A-Za-z0-9._-]+\.(?:js|css)/g) || [])];
for (const p of ["/", "/robots.txt", "/sw.js", "/manifest.webmanifest", ...hashedEntry]) {
  const r = route(p);
  report(r.stage === "static" && r.target, `${p} -> static ${r.target}`, r.stage);
}

console.log(`\n${failures === 0 ? "ALL PASSED" : failures + " FAILURE(S)"}`);
process.exit(failures === 0 ? 0 : 1);
