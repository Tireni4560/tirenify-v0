import { describe, it, expect } from "vitest";
import { scoreDashboard, WEIGHTS } from "../src/lib/score.js";

describe("scoreDashboard", () => {
  it("weights sum to 100", () => {
    expect(WEIGHTS.breach + WEIGHTS.habits + WEIGHTS.checkup).toBe(100);
  });

  it("is complete and Strong when all inputs are perfect", () => {
    const r = scoreDashboard({
      breachResult: { breaches: [], pastes: [], years: {}, risk: null, found: false },
      habitsScore: 100,
      checkupScore: 100,
    });
    expect(r.complete).toBe(true);
    expect(r.level).toBe("Strong");
    expect(r.score).toBe(100);
  });

  it("is At risk with a bad full picture", () => {
    const r = scoreDashboard({
      breachResult: {
        breaches: Array.from({ length: 10 }, () => ({ dataTypes: ["Passwords"], passwordRisk: "plaintext" })),
        pastes: [],
        years: {},
        risk: null,
        found: true,
      },
      habitsScore: 0,
      checkupScore: 0,
    });
    expect(r.complete).toBe(true);
    expect(r.level).toBe("At risk");
    expect(r.score).toBeLessThan(30);
  });

  it("marks Partial and scales when a component is missing", () => {
    const r = scoreDashboard({ breachesFound: 0, habitsScore: null, checkupScore: null });
    expect(r.complete).toBe(false);
    expect(r.level).toBe("Partial");
    expect(r.missing).toContain("habits");
    expect(r.missing).toContain("checkup");
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });

  it("uses the breach-count fallback when no full result is stored", () => {
    // Safety score: fewer breaches scores higher (safer).
    const none = scoreDashboard({ breachesFound: 0 });
    const many = scoreDashboard({ breachesFound: 20 });
    expect(none.score).toBeGreaterThan(many.score);
  });

  it("clamps out-of-range habit percentages", () => {
    const r = scoreDashboard({ breachesFound: 0, habitsScore: 999, checkupScore: -50 });
    for (const p of r.parts) {
      if (p.value !== null) expect(p.value).toBeLessThanOrEqual(100);
    }
  });

  it("returns three labelled parts", () => {
    const r = scoreDashboard({});
    expect(r.parts.map((p) => p.label)).toEqual([
      "Breach exposure",
      "Safety habits",
      "Security checkup",
    ]);
  });
});
