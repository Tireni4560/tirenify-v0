import { describe, it, expect, beforeEach } from "vitest";
import {
  parseEnvelope,
  makeEnvelope,
  validateImport,
  exportAll,
  importAll,
  getItem,
  setItem,
  removeItem,
  clearAll,
  clearCategory,
  sizeReport,
  storageStatus,
  __resetForTests,
} from "../src/lib/storage.js";

beforeEach(() => {
  __resetForTests(); // node env: no localStorage -> memory fallback
});

describe("parseEnvelope", () => {
  it("reads new envelopes", () => {
    expect(parseEnvelope(makeEnvelope({ a: 1 }))).toEqual({ ok: true, data: { a: 1 } });
  });
  it("accepts legacy bare values additively", () => {
    expect(parseEnvelope("[1,2]")).toMatchObject({ ok: true, data: [1, 2], legacy: true });
  });
  it("rejects corrupt text and null", () => {
    expect(parseEnvelope("{nope").ok).toBe(false);
    expect(parseEnvelope(null).ok).toBe(false);
  });
});

describe("memory fallback (private-mode behavior)", () => {
  it("round-trips without localStorage and never throws", () => {
    expect(storageStatus()).toBe("memory");
    setItem("favorites", ["x"]);
    expect(getItem("favorites", [])).toEqual(["x"]);
    expect(getItem("missing-key", "fb")).toBe("fb");
    removeItem("favorites");
    expect(getItem("favorites", null)).toBe(null);
  });
  it("clearCategory and clearAll wipe owned keys", () => {
    setItem("favorites", ["x"]);
    setItem("checkup", { score: 1 });
    clearCategory("prefs");
    expect(getItem("favorites", null)).toBe(null);
    expect(getItem("checkup", null)).toEqual({ score: 1 });
    clearAll();
    expect(getItem("checkup", null)).toBe(null);
  });
  it("sizeReport counts bytes and totals", () => {
    setItem("favorites", ["abcdef"]);
    const r = sizeReport();
    expect(r.total).toBeGreaterThan(0);
    expect(r.rows.find((x) => x.key === "favorites")?.bytes).toBeGreaterThan(0);
  });
});

describe("export/import validation", () => {
  it("round-trips through exportAll", () => {
    setItem("recents", ["/a"]);
    const text = exportAll();
    clearAll();
    const back = importAll(JSON.parse(text));
    expect(back).toMatchObject({ ok: true });
    expect(getItem("recents", [])).toEqual(["/a"]);
  });
  it("rejects non-exports and strips unknown keys", () => {
    expect(importAll(null).ok).toBe(false);
    expect(importAll({ app: "other", data: {} }).ok).toBe(false);
    const r = importAll({ app: "safeyard-export", data: { favorites: ["x"], evil: 1 } });
    expect(r.ok).toBe(true);
    expect(getItem("evil", "absent")).toBe("absent");
  });
});
