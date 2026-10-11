import { describe, it, expect } from "vitest";
import { GUIDES, LEARN_CATEGORIES, getGuide, listGuides, guidesByCategory, validateGuides } from "../src/content/learn.js";
import { ROUTES } from "../src/config/routes.js";
import { getTool } from "../src/content/tools.js";

describe("learn content", () => {
  it("validates every guide", () => {
    expect(validateGuides()).toEqual([]);
    expect(GUIDES.length).toBeGreaterThanOrEqual(5);
  });

  it("looks guides up by slug and category", () => {
    expect(getGuide("setup-2fa")?.title).toMatch(/2FA/i);
    expect(getGuide("nope")).toBeNull();
    expect(listGuides()).toBe(GUIDES);
    const protect = guidesByCategory("protect");
    expect(protect.length).toBeGreaterThanOrEqual(3);
    expect(protect.every((g) => g.category === "protect")).toBe(true);
    expect(guidesByCategory("missing-cat")).toEqual([]);
  });

  it("ships the five core articles", () => {
    for (const slug of ["what-is-a-data-breach", "unique-passwords", "setup-2fa", "spotting-phishing", "in-a-breach"]) {
      expect(getGuide(slug), slug).not.toBeNull();
    }
  });
});

describe("learn content ↔ route table (honesty)", () => {
  const live = new Set(ROUTES.filter((r) => r.status === "live").map((r) => r.path));

  it("every guide has a live route", () => {
    for (const g of GUIDES) {
      expect(live.has(`/learn/${g.slug}`), `live route for ${g.slug}`).toBe(true);
    }
    expect(live.has("/learn")).toBe(true);
    expect(live.has("/learn/:slug")).toBe(true);
  });

  it("no live article route lacks a written guide", () => {
    for (const r of ROUTES) {
      if (r.status !== "live") continue;
      if (!r.path.startsWith("/learn/") || r.path.includes(":")) continue;
      expect(getGuide(r.path.slice("/learn/".length)), `${r.path} has content`).not.toBeNull();
    }
  });

  it("related tools on guides exist in the registry", () => {
    for (const g of GUIDES) {
      for (const t of g.tools || []) {
        expect(getTool(t), `tool ${t} for ${g.slug}`).not.toBeNull();
      }
    }
  });

  it("every learn category is known", () => {
    const keys = new Set(LEARN_CATEGORIES.map((c) => c.key));
    expect(GUIDES.every((g) => keys.has(g.category))).toBe(true);
  });
});
