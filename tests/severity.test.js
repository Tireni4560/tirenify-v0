import { describe, it, expect } from "vitest";
import { classifyDataType, SEVERITY_RANK } from "../src/lib/severity.js";

describe("classifyDataType", () => {
  it("maps critical types to critical severity", () => {
    for (const raw of [
      "Passwords",
      "Credit card details",
      "Bank account numbers",
      "Government IDs",
      "Security questions and answers",
      "Auth tokens",
    ]) {
      expect(classifyDataType(raw).severity).toBe("critical");
    }
  });

  it("maps high types to high severity", () => {
    for (const raw of ["Phone numbers", "Physical addresses", "Dates of birth", "Health records", "Financial info"]) {
      expect(classifyDataType(raw).severity).toBe("high");
    }
  });

  it("maps medium types to medium severity", () => {
    for (const raw of ["Names", "Usernames", "IP addresses", "Social media profiles", "Employers", "Genders"]) {
      expect(classifyDataType(raw).severity).toBe("medium");
    }
  });

  it("maps email-only to low severity", () => {
    expect(classifyDataType("Email addresses").severity).toBe("low");
  });

  it("sends unknown types to Other with unknown severity", () => {
    const r = classifyDataType("Totally unfamiliar field");
    expect(r.name).toBe("Other");
    expect(r.severity).toBe("unknown");
  });

  it("always returns a plain-language explanation and an action", () => {
    const r = classifyDataType("Passwords");
    expect(r.explain).toBeTruthy();
    expect(r.action).toBeTruthy();
  });

  it("is case-insensitive and handles surrounding whitespace", () => {
    expect(classifyDataType("  PASSWORD  ").severity).toBe("critical");
  });

  it("SEVERITY_RANK orders critical above unknown", () => {
    expect(SEVERITY_RANK.critical).toBeGreaterThan(SEVERITY_RANK.unknown);
  });
});
