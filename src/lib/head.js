// Per-route document head updates on client-side navigation. The server
// injects the same tags for direct loads (see scripts/gen-meta.mjs + server.js).
import { pageTitle, PRODUCT_FULL, OG_IMAGE, SITE_URL } from "../config/brand.js";

function setMeta(selector, create, apply) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  apply(el);
}

export function applyHead({ title, description, path }) {
  document.title = title || pageTitle(null);
  const full = `${SITE_URL}${path || "/"}`;

  setMeta(
    'meta[name="description"]',
    () => Object.assign(document.createElement("meta"), { name: "description" }),
    (el) => (el.content = description || ""),
  );
  setMeta(
    'link[rel="canonical"]',
    () => Object.assign(document.createElement("link"), { rel: "canonical" }),
    (el) => (el.href = full),
  );
  const ogTags = {
    "og:url": full,
    "og:title": document.title,
    "og:description": description || "",
    "og:image": OG_IMAGE,
    "og:site_name": PRODUCT_FULL,
    "twitter:title": document.title,
    "twitter:description": description || "",
    "twitter:image": OG_IMAGE,
  };
  for (const [property, content] of Object.entries(ogTags)) {
    setMeta(
      `meta[property="${property}"],meta[name="${property}"]`,
      () =>
        Object.assign(document.createElement("meta"), {
          [property.startsWith("twitter") ? "name" : "property"]: property,
        }),
      (el) => (el.content = content),
    );
  }
}
