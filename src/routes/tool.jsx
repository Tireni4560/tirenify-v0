// Dynamic tool route: /tools/:slug resolves against the registry. Unknown
// slugs (or registry entries without a page component) render the 404 view —
// there are no placeholder pages. Per-tool <head> tags are applied here since
// the route table can only know the generic pattern title.
import { useEffect } from "react";
import NotFound from "./not-found.jsx";
import { getTool } from "../content/tools.js";
import { TOOL_PAGES } from "../components/password-tools.jsx";
import { QR_PAGES } from "../components/qr-tool.jsx";
import { applyHead } from "../lib/head.js";
import { pageTitle } from "../config/brand.js";
import { getItem, setItem } from "../lib/storage.js";

// Every tool page component lives in its category module; the route merges
// their slug→page maps here (tests assert the merge covers the whole registry).
const PAGES = { ...TOOL_PAGES, ...QR_PAGES };

/** Record a visit: tool SLUG only (allow-listed prefs key, capped at 6). */
function rememberVisit(slug) {
  const seen = (getItem("recents") || []).filter((s) => typeof s === "string" && s !== slug);
  setItem("recents", [slug, ...seen].slice(0, 6));
}

export default function ToolRoute({ slug }) {
  const tool = getTool(slug);
  const ToolPageComponent = tool ? PAGES[slug] : null;

  useEffect(() => {
    if (tool) {
      applyHead({
        title: pageTitle(tool.name),
        description: tool.purpose,
        path: `/tools/${slug}`,
      });
      rememberVisit(slug);
    }
  }, [slug, tool]);

  if (!tool || !ToolPageComponent) return <NotFound />;
  return <ToolPageComponent />;
}
