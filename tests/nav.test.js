import { describe, it, expect } from "vitest";
import { ROUTES } from "../src/config/routes.js";
import { buildSidebarNav, buildMobileNav, sidebarLeaves, isNavActive } from "../src/config/nav.js";
import { liveGroups, getGroup } from "../src/content/tool-groups.js";

const live = new Set(ROUTES.filter((r) => r.status === "live").map((r) => r.path.split("?")[0]));

/** Every nav leaf must resolve to a live route (pattern groups excluded —
 * those all resolve through /tools itself, which is checked separately). */
function checkLive(leaves) {
  for (const leaf of leaves) {
    const base = leaf.to.split("?")[0];
    expect(live.has(base), `${leaf.label} → ${leaf.to} is live`).toBe(true);
  }
}

describe("primary nav", () => {
  it("covers the required platform entries", () => {
    const labels = sidebarLeaves().map((l) => l.label);
    for (const required of ["Dashboard", "Breach Guard", "Security Report", "Account", "QR Code Generator"]) {
      expect(labels, required).toContain(required);
    }
  });

  it("links every section entry only to live destinations", () => {
    checkLive(sidebarLeaves());
  });

  it("keeps mobile primary + rest covering the same destinations", () => {
    const { primary, rest } = buildMobileNav(4);
    expect(primary).toHaveLength(4);
    const mobile = [...primary, ...rest].map((l) => l.to).sort();
    expect(mobile).toEqual(sidebarLeaves().map((l) => l.to).sort());
    checkLive([...primary, ...rest]);
  });

  it("marks active routes (prefix for nested pages)", () => {
    const tools = sidebarLeaves().find((l) => l.to === "/tools");
    expect(isNavActive(tools, "/tools/password-generator")).toBe(true);
    expect(isNavActive(tools, "/breach-guard")).toBe(false);
    const dash = sidebarLeaves().find((l) => l.to === "/");
    expect(isNavActive(dash, "/")).toBe(true);
    expect(isNavActive(dash, "/tools")).toBe(false);
  });

  it("drops sections with zero live destinations", () => {
    const sections = buildSidebarNav();
    expect(sections.length).toBeGreaterThan(0);
    for (const s of sections) expect(s.items.length).toBeGreaterThan(0);
  });
});

describe("tool groups", () => {
  it("includes every live registry tool exactly once", async () => {
    const { TOOLS } = await import("../src/content/tools.js");
    const seen = liveGroups().flatMap((g) => g.items.map((i) => i.slug).filter((s) => s !== "__breach-guard__"));
    expect(seen.sort()).toEqual(TOOLS.map((t) => t.slug).sort());
  });

  it("resolves unknown groups to null", () => {
    expect(getGroup("nope")).toBeNull();
  });
});
