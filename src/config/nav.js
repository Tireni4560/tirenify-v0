// Primary navigation — ONE data structure drives the desktop sidebar, the
// mobile bar and the mobile "More" sheet. An entry renders only when its
// destination resolves to a live route (or, for tool-group sections, at least
// one live tool); zero-live entries are dropped, so the nav can never 404.
//
// Entry shapes:
//   { kind: "link", to, label }                                  — route entry
//   { kind: "group", sectionId, label }                         — /tools?section=<id>
//   { kind: "section", label, items: [...same shapes...] }       — sidebar heading
import { MODULES } from "./brand.js";
import { LIVE_ROUTES } from "./routes.js";
import { getTool } from "../content/tools.js";
import { getGroup, resolveGroup } from "../content/tool-groups.js";

const LIVE = new Set(LIVE_ROUTES.map((r) => r.path));

const liveRoute = (path) => (LIVE.has(path) ? path : null);

/** Resolve a group section to its nav destination (or null when empty). */
function groupEntry(sectionId, label) {
  const group = getGroup(sectionId);
  if (!group) return null;
  if (resolveGroup(group).items.length === 0) return null;
  return { kind: "group", sectionId, label, to: `/tools?section=${sectionId}` };
}

/** Resolve a single tool to a nav link (or null when not live). */
function toolEntry(slug, label) {
  if (!liveRoute(`/tools/${slug}`)) return null;
  const tool = getTool(slug);
  if (!tool) return null;
  return { kind: "tool", slug, to: `/tools/${slug}`, label: label || tool.name };
}

function routeEntry(path, label) {
  const to = liveRoute(path);
  return to ? { kind: "link", to, label } : null;
}

function pick(...entries) {
  return entries.filter(Boolean);
}

/**
 * Desktop sidebar structure: [{ kind: "section", label, items }] plus bare
 * items. Every leaf has a live `to`.
 */
export function buildSidebarNav() {
  return [
    {
      kind: "section",
      label: "Overview",
      items: pick(
        routeEntry("/", MODULES.dashboard),
        routeEntry("/report", MODULES.securityReport),
        routeEntry("/account", MODULES.account),
      ),
    },
    {
      kind: "section",
      label: "Checks",
      items: pick(routeEntry("/breach-guard", MODULES.breachGuard)),
    },
    {
      kind: "section",
      label: "Tools",
      items: pick(
        routeEntry("/tools", `${MODULES.tools} — all`),
        groupEntry("generators", "Generators"),
        groupEntry("password-security", "Password Security"),
        groupEntry("breach-checks", "Breach Checks"),
        toolEntry("qr-code-generator", "QR Code Generator"),
      ),
    },
    {
      kind: "section",
      label: "Learn",
      items: pick(routeEntry("/learn", MODULES.securityCenter)),
    },
  ].filter((s) => s.items.length > 0);
}

/** All sidebar leaves, in order (convenience for tests + the More sheet). */
export function sidebarLeaves() {
  return buildSidebarNav().flatMap((s) => s.items);
}

/**
 * Mobile bar: the first N destinations, rest go to the "More" sheet.
 * Default: Dashboard, Breach Guard, Tools, Learn + More.
 */
export function buildMobileNav(maxPrimary = 4) {
  const leaves = sidebarLeaves();
  const pickFirst = (matchers) => {
    const out = [];
    for (const m of matchers) {
      const hit = leaves.find((l) => m(l) && !out.includes(l));
      if (hit) out.push(hit);
    }
    return out;
  };
  const primary = pickFirst([
    (l) => l.to === "/",
    (l) => l.to === "/breach-guard",
    (l) => l.to === "/tools",
    (l) => l.to === "/learn",
  ]);
  const rest = leaves.filter((l) => !primary.includes(l));
  return { primary: primary.slice(0, maxPrimary), rest };
}

/** True when the nav leaf is the current route (prefix for nested pages). */
export function isNavActive(item, path) {
  const to = item.to || "";
  const [base, query] = to.split("?");
  if (base === "/") return path === "/";
  if (query) {
    const params = new URLSearchParams(query);
    const section = params.get("section");
    if (section && path === "/tools") {
      const current = new URLSearchParams(window.location.search).get("section");
      return current === section;
    }
    return false;
  }
  return path === base || path.startsWith(`${base}/`);
}
