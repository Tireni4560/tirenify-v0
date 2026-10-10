import { describe, it, expect } from "vitest";
import { normalizeAnalytics, parseBreach, splitList, yearOf } from "../lib/breach.js";

describe("splitList", () => {
  it("splits on semicolons and trims, dropping empties", () => {
    expect(splitList("a ; b;;c ")).toEqual(["a", "b", "c"]);
  });
  it("returns [] for non-strings", () => {
    expect(splitList(null)).toEqual([]);
    expect(splitList(42)).toEqual([]);
  });
});

describe("yearOf", () => {
  it("pulls the year from a year-only date", () => {
    expect(yearOf("2026")).toBe("2026");
  });
  it("pulls the year from a full date", () => {
    expect(yearOf("Tue, 01 Apr 2014 00:00:00 GMT")).toBe("2014");
  });
  it("returns null when there is no year", () => {
    expect(yearOf(null)).toBe(null);
    expect(yearOf("unknown")).toBe(null);
  });
});

describe("parseBreach", () => {
  it("normalizes a full detail entry", () => {
    const b = parseBreach({
      breach: "McKesson",
      details: "desc",
      domain: "mckesson.com",
      industry: "Pharmaceutical",
      password_risk: "Unknown",
      references: "",
      verified: "Yes",
      xposed_data: "Email addresses;Names;Phone numbers",
      xposed_date: "2026",
      xposed_records: 6832822,
    });
    expect(b).toMatchObject({
      name: "McKesson",
      domain: "mckesson.com",
      industry: "Pharmaceutical",
      date: "2026",
      records: 6832822,
      verified: true,
      passwordRisk: "unknown",
    });
    expect(b.dataTypes).toEqual(["Email addresses", "Names", "Phone numbers"]);
  });

  it("keeps only http(s) references", () => {
    const b = parseBreach({
      breach: "X",
      references: "https://ok.com;notaurl;http://ok2.com",
    });
    expect(b.references).toEqual(["https://ok.com", "http://ok2.com"]);
  });

  it("returns null when there is no usable name", () => {
    expect(parseBreach({ breach: "" })).toBe(null);
    expect(parseBreach(null)).toBe(null);
  });
});

describe("normalizeAnalytics", () => {
  it("reads breaches_details, names-only summary, pastes and risk", () => {
    const data = {
      ExposedBreaches: {
        breaches_details: [
          { breach: "Alpha", xposed_date: "2012", xposed_records: 100, xposed_data: "Passwords", password_risk: "plaintext" },
          { breach: "Beta", xposed_date: "2020", xposed_records: 50, xposed_data: "Email addresses" },
        ],
      },
      BreachesSummary: { site: "Gamma;Alpha" }, // Alpha deduped, Gamma names-only
      ExposedPastes: { exposed_pastes: [{ paste_title: "Paste 1", source: "s", date: "2021", exposed_count: 5 }] },
      BreachMetrics: { risk: [{ risk_label: "High", risk_score: 80 }] },
    };
    const out = normalizeAnalytics(data, { checkedAt: "2026-01-01T00:00:00.000Z" });
    expect(out.found).toBe(true);
    expect(out.breaches.map((b) => b.name)).toEqual(["Alpha", "Beta", "Gamma"]);
    expect(out.pastes).toHaveLength(1);
    expect(out.risk).toEqual({ label: "High", score: 80 });
    expect(out.years).toEqual({ "2012": 1, "2020": 1 });
    expect(out.source).toBe("XposedOrNot");
  });

  it("treats a null/empty body as no breaches", () => {
    expect(normalizeAnalytics(null).found).toBe(false);
    expect(normalizeAnalytics({}).found).toBe(false);
  });

  it("never throws on malformed entries", () => {
    const out = normalizeAnalytics({
      ExposedBreaches: { breaches_details: [null, {}, { breach: "OK" }] },
    });
    expect(out.breaches.map((b) => b.name)).toEqual(["OK"]);
  });
});
