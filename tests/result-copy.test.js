import { describe, it, expect } from "vitest";
import {
  getResultStatus,
  getResultFacts,
  getPasswordStorageFacts,
  getTopExposure,
  countBreaches,
  countPastes,
  firstAndLatest,
} from "../src/lib/result-copy.js";

// Result copy — the ONE source of truth for hit/no-hit wording.
//
// The two rules under test:
//   1. A clean check is never described as proof of safety.
//   2. Every fact shown must be API-confirmed (never inferred).

describe("countBreaches", () => {
  it("reads the count from a full result, a masked summary or a number", () => {
    expect(countBreaches({ breaches: [{}, {}] })).toBe(2);
    expect(countBreaches({ count: 3 })).toBe(3);
    expect(countBreaches(4)).toBe(4);
  });

  it("returns 0 for missing or malformed input", () => {
    expect(countBreaches(null)).toBe(0);
    expect(countBreaches(undefined)).toBe(0);
    expect(countBreaches({})).toBe(0);
    expect(countBreaches({ breaches: "nope" })).toBe(0);
    expect(countBreaches(NaN)).toBe(0);
  });
});

describe("getResultStatus", () => {
  it("reports a hit plainly", () => {
    const s = getResultStatus({ breaches: [{ name: "A" }, { name: "B" }] });
    expect(s.tone).toBe("hit");
    expect(s.chip).toBe("Exposed");
    expect(s.headline).toBe("Found in 2 breaches");
    expect(s.subhead).toMatch(/appears in the records/i);
  });

  it("uses the singular for one breach", () => {
    expect(getResultStatus({ breaches: [{ name: "A" }] }).headline).toBe("Found in 1 breach");
  });

  it("never calls a clean check proof of safety", () => {
    const s = getResultStatus({ breaches: [] });
    expect(s.tone).toBe("clear");
    expect(s.chip).toBe("No known breaches");
    expect(s.headline).toBe("No breaches found for this email");
    // The word "safe"/"secure" must not appear anywhere in the no-hit copy.
    const all = `${s.headline} ${s.subhead} ${s.qualifier}`;
    expect(all).not.toMatch(/\bsafe\b|\bsecure\b|\bprotected\b|\bguarantee/i);
  });

  it("qualifies the no-hit result instead of ending the story", () => {
    const s = getResultStatus({ breaches: [] });
    expect(s.qualifier).toMatch(/not proof/i);
    expect(s.qualifier).toMatch(/never reported or never made public/i);
  });

  it("works from a masked summary count (homepage) and a bare number", () => {
    expect(getResultStatus({ count: 2 }).tone).toBe("hit");
    expect(getResultStatus({ count: 0 }).tone).toBe("clear");
    expect(getResultStatus(1).headline).toBe("Found in 1 breach");
  });

  it("treats a missing result as no hit rather than throwing", () => {
    expect(getResultStatus(null).tone).toBe("clear");
    expect(getResultStatus(undefined).tone).toBe("clear");
  });

  it("qualifies a hit too — a hit is only about known breaches", () => {
    const s = getResultStatus({ breaches: [{ name: "A" }] });
    expect(s.qualifier).toMatch(/publicly known/i);
    expect(s.qualifier).toMatch(/not a complete picture/i);
  });

  it("describes a paste-only result as a paste exposure, not a breach", () => {
    const s = getResultStatus({ breaches: [], pasteCount: 2 });
    expect(s.tone).toBe("paste");
    expect(s.chip).toBe("Found in pastes");
    expect(s.headline).toBe("Found in 2 public pastes");
    expect(s.subhead).toMatch(/not found in a known breach/i);
    expect(s.subhead).toMatch(/paste/i);
    expect(s.qualifier).toMatch(/not a breach/i);
  });

  it("falls back to the paste list length when the counter is missing", () => {
    const s = getResultStatus({ breaches: [], pastes: [{ title: "a" }, { title: "b" }] });
    expect(s.tone).toBe("paste");
    expect(s.headline).toBe("Found in 2 public pastes");
  });

  it("does not claim a breach when there are only pastes", () => {
    const s = getResultStatus({ breaches: [], pasteCount: 1 });
    const all = `${s.headline} ${s.subhead} ${s.qualifier}`;
    expect(all).not.toMatch(/found in \d+ breach/i);
    expect(all).not.toMatch(/\bsafe\b|\bsecure\b|\bguarantee/i);
  });

  it("keeps the breach headline when there are breaches AND pastes", () => {
    const s = getResultStatus({ breaches: [{ name: "A" }], pasteCount: 2 });
    expect(s.tone).toBe("hit");
    expect(s.headline).toBe("Found in 1 breach");
  });

  it("describes a no-hit result honestly even with no paste data", () => {
    const s = getResultStatus({ breaches: [], pasteCount: null, pastes: [] });
    expect(s.tone).toBe("clear");
    expect(s.headline).toBe("No breaches found for this email");
  });
});

describe("countPastes", () => {
  it("prefers the API counter and falls back to the paste list", () => {
    expect(countPastes({ pasteCount: 3, pastes: [{ title: "a" }] })).toBe(3);
    expect(countPastes({ pastes: [{ title: "a" }] })).toBe(1);
  });

  it("does not read a missing or invalid API counter as zero exposures", () => {
    // A missing/invalid counter means "the API did not report one" — the
    // paste list it DID return is the fallback.
    expect(countPastes({ pasteCount: null, pastes: [{ title: "a" }, { title: "b" }] })).toBe(2);
    expect(countPastes({ pasteCount: undefined, pastes: [{ title: "a" }] })).toBe(1);
    expect(countPastes({ pasteCount: "", pastes: [{ title: "a" }] })).toBe(1);
    expect(countPastes({ pasteCount: "nope", pastes: [{ title: "a" }] })).toBe(1);
    expect(countPastes({ pasteCount: NaN, pastes: [{ title: "a" }] })).toBe(1);
    expect(countPastes({ pasteCount: Infinity, pastes: [{ title: "a" }] })).toBe(1);
    expect(countPastes({ pasteCount: -3, pastes: [{ title: "a" }] })).toBe(1);
  });

  it("uses an explicit zero counter as zero, even with a paste list", () => {
    expect(countPastes({ pasteCount: 0, pastes: [{ title: "a" }] })).toBe(0);
  });

  it("returns 0 for missing or malformed input", () => {
    expect(countPastes(null)).toBe(0);
    expect(countPastes(undefined)).toBe(0);
    expect(countPastes({})).toBe(0);
    expect(countPastes({ pastes: "nope" })).toBe(0);
  });
});


describe("firstAndLatest", () => {
  it("returns the earliest and latest breach dates as given", () => {
    expect(
      firstAndLatest([{ date: "2020" }, { date: "2012" }, { date: "2024" }]),
    ).toEqual({ first: "2012", latest: "2024" });
  });

  it("returns nulls when there are no dates", () => {
    expect(firstAndLatest([])).toEqual({ first: null, latest: null });
    expect(firstAndLatest([{ date: null }])).toEqual({ first: null, latest: null });
    expect(firstAndLatest(null)).toEqual({ first: null, latest: null });
  });
});

describe("getPasswordStorageFacts", () => {
  it("returns only the buckets the API actually reported", () => {
    const rows = getPasswordStorageFacts({ plaintext: 2, easyToCrack: 1, strongHash: 0, unknown: 0 });
    expect(rows.map((r) => r.key)).toEqual(["plaintext", "easyToCrack"]);
    expect(rows[0].severity).toBe("critical");
    expect(rows[1].severity).toBe("high");
  });

  it("returns nothing for missing or malformed input", () => {
    expect(getPasswordStorageFacts(null)).toEqual([]);
    expect(getPasswordStorageFacts(undefined)).toEqual([]);
    expect(getPasswordStorageFacts("nope")).toEqual([]);
    expect(getPasswordStorageFacts({})).toEqual([]);
  });
});

describe("getResultFacts", () => {
  it("shows the exposure window when breaches have dates", () => {
    const rows = getResultFacts({
      breaches: [{ date: "2012" }, { date: "2024" }],
      pastes: [],
    });
    const window = rows.find((r) => r.label === "Exposure window");
    expect(window.value).toBe("2012 to 2024");
  });

  it("shows a single breach date when there is only one", () => {
    const rows = getResultFacts({ breaches: [{ date: "2019" }], pastes: [] });
    expect(rows.find((r) => r.label === "Breach date").value).toBe("2019");
  });

  it("only reports data-type counts the API actually returned", () => {
    const rows = getResultFacts({
      breaches: [{ date: "2020" }],
      pastes: [],
      dataTypeCounts: { Passwords: 3, "Email addresses": 2 },
    });
    const row = rows.find((r) => r.label === "Most common exposure");
    expect(row.value).toBe("Passwords (3), Email addresses (2)");
  });

  it("omits the data-type row when the API sent no counts", () => {
    const rows = getResultFacts({ breaches: [{ date: "2020" }], pastes: [] });
    expect(rows.find((r) => r.label === "Most common exposure")).toBeUndefined();
  });

  it("reports the password-storage breakdown with a risk hint", () => {
    const rows = getResultFacts({
      breaches: [{ date: "2020" }],
      pastes: [],
      passwordStrength: { plaintext: 1, easyToCrack: 0, strongHash: 2, unknown: 0 },
    });
    const row = rows.find((r) => r.label === "How passwords were stored");
    expect(row.value).toContain("Stored as plain text: 1");
    expect(row.value).toContain("Strongly hashed: 2");
    expect(row.hint).toMatch(/easy to crack/i);
  });

  it("reports the paste count confirmed by the API", () => {
    const rows = getResultFacts({ breaches: [{ date: "2020" }], pastes: [], pasteCount: 4 });
    const row = rows.find((r) => r.label === "Public paste sites");
    expect(row.value).toBe("4 pastes");
  });

  it("omits the paste row when there are no pastes", () => {
    const rows = getResultFacts({ breaches: [{ date: "2020" }], pastes: [] });
    expect(rows.find((r) => r.label === "Public paste sites")).toBeUndefined();
  });

  it("returns no facts for a missing result", () => {
    expect(getResultFacts(null)).toEqual([]);
    expect(getResultFacts(undefined)).toEqual([]);
  });

  it("never invents an exposure when the API returned no data types", () => {
    const rows = getResultFacts({ breaches: [{ name: "A" }], pastes: [] });
    expect(rows).toEqual([]);
  });
});

describe("getTopExposure", () => {
  it("picks the most severe exposure and reuses its explanation", () => {
    const top = getTopExposure([
      { severity: "low", name: "Email addresses", explain: "low explain" },
      { severity: "critical", name: "Passwords", explain: "critical explain" },
      { severity: "high", name: "Phone numbers", explain: "high explain" },
    ]);
    expect(top.name).toBe("Passwords");
    expect(top.explain).toBe("critical explain");
  });

  it("returns null when nothing was classified", () => {
    expect(getTopExposure([])).toBe(null);
    expect(getTopExposure(null)).toBe(null);
  });
});

