// Build step: emits SEO/per-route artifacts into public/ (what Express & Vercel
// serve statically). For every LIVE route we write a per-route HTML snapshot
// with the correct <title>/description/canonical/og:url so crawlers and direct
// loads get real meta; the SPA hydrates the same shell. Also writes sitemap.xml
// and robots.txt. Root ("/") keeps its hand-authored index.html.
//
// Pure Node + the route table only — no network, no extra deps.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { LIVE_ROUTES } from "../src/config/routes.js";
import {
  SITE_URL as BRAND_SITE_URL,
  PRODUCT_NAME,
  PRODUCT_FULL,
  TAGLINE,
} from "../src/config/brand.js";

// Honor the server-side APP_URL override at build time so sitemap/canonical
// and the manifest all use the SAME single setting the server uses. Falls back
// to the value baked into brand.js (VITE_APP_URL, else the default host).
const SITE_URL = (process.env.APP_URL || process.env.VITE_APP_URL || BRAND_SITE_URL).replace(/\/$/, "");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");

function swapMeta(baseHtml, route) {
  let html = baseHtml;
  const title = route.title;
  const desc = route.description || "";
  const canonical = route.path === "/" ? `${SITE_URL}/` : `${SITE_URL}${route.path}`;

  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);
  html = html.replace(
    /<meta\s+name="description"\s+content="[\s\S]*?"\s*\/>/i,
    `<meta name="description" content="${escapeHtml(desc)}" />`,
  );
  html = html.replace(/<link\s+rel="canonical"\s+href="[\s\S]*?"\s*\/>/i, `<link rel="canonical" href="${canonical}" />`);
  html = html.replace(/<meta\s+property="og:url"\s+content="[\s\S]*?"\s*\/>/i, `<meta property="og:url" content="${canonical}" />`);
  html = html.replace(/<meta\s+property="og:title"\s+content="[\s\S]*?"\s*\/>/i, `<meta property="og:title" content="${escapeHtml(title)}" />`);
  html = html.replace(/<meta\s+property="og:description"\s+content="[\s\S]*?"\s*\/>/i, `<meta property="og:description" content="${escapeHtml(desc)}" />`);
  html = html.replace(/<meta\s+name="twitter:title"\s+content="[\s\S]*?"\s*\/>/i, `<meta name="twitter:title" content="${escapeHtml(title)}" />`);
  html = html.replace(/<meta\s+name="twitter:description"\s+content="[\s\S]*?"\s*\/>/i, `<meta name="twitter:description" content="${escapeHtml(desc)}" />`);
  return html;
}

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

async function main() {
  const baseHtml = await readFile(path.join(publicDir, "index.html"), "utf8");

  // Per-route HTML snapshots for live routes other than root. Pattern routes
  // ("/tools/:slug") are skipped — every concrete slug is its own live entry.
  for (const route of LIVE_ROUTES) {
    if (route.path === "/" || route.path.includes(":")) continue;
    const dir = path.join(publicDir, route.path.replace(/^\//, ""));
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "index.html"), swapMeta(baseHtml, route));
  }

  // sitemap.xml (live routes only; planned routes and :param patterns excluded).
  const urls = LIVE_ROUTES.filter((r) => !r.path.includes(":")).map((r) => {
    const loc = r.path === "/" ? `${SITE_URL}/` : `${SITE_URL}${r.path}`;
    return `  <url>\n    <loc>${loc}</loc>\n    <changefreq>monthly</changefreq>\n  </url>`;
  }).join("\n");
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemap.google.com/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  await writeFile(path.join(publicDir, "sitemap.xml"), sitemap);

  // robots.txt
  const robots = `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;
  await writeFile(path.join(publicDir, "robots.txt"), robots);

  // Web app manifest — names from brand.js, icons/start from our own origin.
  const manifest = {
    name: PRODUCT_FULL,
    short_name: PRODUCT_NAME,
    description: `${TAGLINE}. Free, no-account digital safety tools with Breach Guard at the front door.`,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#060b18",
    theme_color: "#060b18",
    icons: [
      { src: "/brand/favicon-16.png", sizes: "16x16", type: "image/png" },
      { src: "/brand/favicon-32.png", sizes: "32x32", type: "image/png" },
      { src: "/brand/favicon-48.png", sizes: "48x48", type: "image/png" },
      { src: "/brand/favicon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/favicon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/brand/tirenify-avatar-dark.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
  await writeFile(path.join(publicDir, "manifest.webmanifest"), JSON.stringify(manifest, null, 2));

  console.log(
    `gen-meta: wrote ${LIVE_ROUTES.filter((r) => r.path !== "/" && !r.path.includes(":")).length} route snapshots + sitemap.xml + robots.txt + manifest.webmanifest`,
  );
}

main().catch((err) => {
  console.error("gen-meta failed:", err);
  process.exit(1);
});
