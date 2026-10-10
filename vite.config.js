import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { PRODUCT_FULL, TAGLINE, SITE_URL, OG_IMAGE } from "./src/config/brand.js";

// Injects brand values from src/config/brand.js into index.html at build/dev
// time, so the product name and domain are never hard-coded in metadata.
// Tokens in index.html: __PRODUCT_FULL__, __TAGLINE__, __SITE_URL__, __OG_IMAGE__.
function brandHtml() {
  const replacements = {
    __PRODUCT_FULL__: PRODUCT_FULL,
    __TAGLINE__: TAGLINE,
    __SITE_URL__: SITE_URL,
    __OG_IMAGE__: OG_IMAGE,
  };
  return {
    name: "brand-html",
    transformIndexHtml(html) {
      let out = html;
      for (const [token, value] of Object.entries(replacements)) {
        out = out.split(token).join(value);
      }
      return out;
    },
  };
}

// Source lives at the repo root; static assets (fonts, favicon, og image) are
// copied verbatim from `static/`; the build output goes to `public/`, which is
// what Express serves and what Vercel already serves statically. Output is
// committed so deploys work with or without a build step on the host.
export default defineConfig({
  base: "/",
  plugins: [react(), tailwindcss(), brandHtml()],
  publicDir: "static",
  build: {
    outDir: "public",
    emptyOutDir: true,
    sourcemap: false,
    target: "es2019",
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // Route-level code splitting happens via React.lazy; vendor code is
        // split so app changes don't invalidate the React cache entry.
        manualChunks(id) {
          if (id.includes("node_modules/react") || id.includes("node_modules/scheduler")) return "vendor-react";
          if (id.includes("node_modules/lucide-react")) return "vendor-icons";
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3000",
      "/confirm-email": "http://localhost:3000",
    },
  },
});
