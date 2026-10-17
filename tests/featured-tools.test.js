import { describe, it, expect } from "vitest";
import { selectFeaturedTools, selectRelatedTools } from "../src/content/tools.js";
import { LIVE_ROUTES } from "../src/config/routes.js";

// Featured-tools selector (Dashboard "Explore tools" + Breach Guard "Explore
// more tools"). Selection rule: ONLY tools whose /tools/<slug> route is live,
// ordered by the additive `featured` field, capped at `limit`.

const tool = (slug, extra = {}) => ({
  slug,
  name: slug,
  purpose: `Purpose of ${slug}.`,
  category: "passwords",
  keywords: [],
  icon: "Key",
  priority: 99,
  related: [],
  limits: "Local only.",
  ...extra,
});

describe("selectFeaturedTools", () => {
  it("keeps only tools whose /tools/<slug> route is live", () => {
    const tools = [
      tool("live-one", { featured: 1 }),
      tool("ghost-tool", { featured: 2 }), // no live route
    ];
    const out = selectFeaturedTools({ tools, live: ["/tools/live-one"], limit: 10 });
    expect(out.map((t) => t.slug)).toEqual(["live-one"]);
    expect(out[0].to).toBe("/tools/live-one");
  });

  it("orders by featured (priority breaks ties) and respects the count limit", () => {
    const tools = [
      tool("c", { featured: 3 }),
      tool("a", { featured: 1 }),
      tool("b2", { featured: 2, priority: 2 }),
      tool("b1", { featured: 2, priority: 1 }),
      tool("d", { featured: 4 }),
    ];
    const live = tools.map((t) => `/tools/${t.slug}`);
    expect(selectFeaturedTools({ tools, live, limit: 3 }).map((t) => t.slug)).toEqual([
      "a",
      "b1",
      "b2",
    ]);
    expect(selectFeaturedTools({ tools, live, limit: 0 })).toEqual([]);
    // Tools without a featured field are never selected.
    expect(
      selectFeaturedTools({ tools: [tool("x")], live: ["/tools/x"], limit: 5 }),
    ).toEqual([]);
  });

  it("caps the real registry at 5 (mobile) / 6 (desktop) with short descriptions", () => {
    const mobile = selectFeaturedTools({ limit: 5 });
    const desktop = selectFeaturedTools({ limit: 6 });
    expect(mobile).toHaveLength(5);
    expect(desktop).toHaveLength(6);
    // The real registry: password tools first, then QR, then the guide.
    expect(mobile.map((t) => t.slug)).toEqual([
      "password-generator",
      "password-strength",
      "password-reuse-checker",
      "qr-code-generator",
      "leak-safety-guide",
    ]);
    for (const t of desktop) {
      expect(LIVE_ROUTES.some((r) => r.path === t.to)).toBe(true);
      expect(t.description.length).toBeLessThanOrEqual(70);
      expect(t.description.length).toBeGreaterThan(0);
    }
  });
});

describe("selectRelatedTools", () => {
  it("ranks password-relevant tools first for password exposure", () => {
    const out = selectRelatedTools({ types: ["Passwords", "Email addresses"], limit: 3 });
    expect(out).toHaveLength(3);
    // Relevance beats featured order: strength/reuse tools mention "password".
    expect(out.map((t) => t.slug)).toContain("password-generator");
    for (const t of out) {
      expect(LIVE_ROUTES.some((r) => r.path === t.to)).toBe(true);
    }
  });

  it("falls back to featured order when nothing matches", () => {
    const out = selectRelatedTools({ types: [], limit: 3 });
    expect(out.map((t) => t.slug)).toEqual([
      "password-generator",
      "password-strength",
      "password-reuse-checker",
    ]);
  });

  it("honours the limit and never links to non-live routes", () => {
    const out = selectRelatedTools({
      types: ["Passwords"],
      tools: [tool("ghost", { featured: 1, keywords: ["password"] })],
      live: [],
      limit: 3,
    });
    expect(out).toEqual([]);
    expect(selectRelatedTools({ types: ["Passwords"], limit: 1 })).toHaveLength(1);
  });
});
