import { describe, it, expect, beforeEach } from "vitest";
import {
  saveBreachSummary,
  getBreachHistory,
  maskEmail,
} from "../src/lib/device-storage.js";
import { __resetForTests } from "../src/lib/storage.js";

// The masked summary row is the ONLY breach artifact that reaches device
// storage. It now carries the API's paste counter (additively) so a reload
// can still describe a paste-only result honestly.

beforeEach(() => {
  __resetForTests(); // node env: no localStorage -> memory fallback
});

describe("saveBreachSummary", () => {
  it("stores the API paste counter alongside the breach count", () => {
    saveBreachSummary({
      email: "jo@example.com",
      breachCount: 0,
      dataTypes: [],
      riskLevel: "Low",
      checkedAt: "2026-10-20T00:00:00.000Z",
      pasteCount: 3,
    });
    const row = getBreachHistory()[0];
    expect(row.count).toBe(0);
    expect(row.pasteCount).toBe(3);
    expect(row.masked).toBe(maskEmail("jo@example.com"));
  });

  it("stores an explicit zero paste counter", () => {
    saveBreachSummary({
      email: "jo@example.com",
      breachCount: 2,
      dataTypes: ["Passwords"],
      riskLevel: "High",
      checkedAt: "2026-10-20T00:00:00.000Z",
      pasteCount: 0,
    });
    expect(getBreachHistory()[0].pasteCount).toBe(0);
  });

  it("omits the counter when the API did not report one (older rows stay valid)", () => {
    saveBreachSummary({
      email: "jo@example.com",
      breachCount: 1,
      dataTypes: [],
      riskLevel: "Low",
      checkedAt: "2026-10-20T00:00:00.000Z",
    });
    const row = getBreachHistory()[0];
    expect(row.pasteCount).toBeUndefined();
    expect("pasteCount" in row).toBe(false);
  });

  it("ignores a malformed paste counter", () => {
    saveBreachSummary({
      email: "jo@example.com",
      breachCount: 1,
      dataTypes: [],
      riskLevel: "Low",
      checkedAt: "2026-10-20T00:00:00.000Z",
      pasteCount: "nope",
    });
    expect(getBreachHistory()[0].pasteCount).toBeUndefined();
  });
});
