import { describe, it, expect } from "vitest";
import {
  generatePassword,
  generatePins,
  generatePassphrases,
  generateUsernames,
  generateSecurityAnswers,
  makePlusAlias,
  makeDotAlias,
  makeNicknameAlias,
  usedAlphabetSize,
  estimateEntropy,
  crackTimeSeconds,
  classifyPasswordSignals,
  checkPasswordReuse,
} from "../src/lib/password-tools.js";
import { TOOLS } from "../src/content/tools.js";
import { TOOL_PAGES } from "../src/components/password-tools.jsx";
import { QR_PAGES } from "../src/components/qr-tool.jsx";

describe("generatePassword", () => {
  it("returns the requested length and respects class flags", () => {
    expect(generatePassword({ length: 20 })).toHaveLength(20);
    const noDigits = generatePassword({ length: 24, useDigits: false });
    expect(noDigits).not.toMatch(/[0-9]/);
    const digitsOnly = generatePassword({ length: 12, useLower: false, useUpper: false, useSymbols: false });
    expect(digitsOnly).toMatch(/^[0-9]+$/);
  });
  it("throws when no character class or bad length is given", () => {
    expect(() => generatePassword({ useLower: false, useUpper: false, useDigits: false, useSymbols: false })).toThrow();
    expect(() => generatePassword({ length: 0 })).toThrow();
  });
  it("produces different passwords on each call", () => {
    const a = generatePassword({ length: 32 });
    const b = generatePassword({ length: 32 });
    expect(a).not.toBe(b);
  });
});

describe("generatePins", () => {
  it("returns the requested count of numeric PINs", () => {
    const pins = generatePins({ length: 6, count: 5 });
    expect(pins).toHaveLength(5);
    for (const pin of pins) expect(pin).toMatch(/^\d{6}$/);
  });
  it("avoids trivially guessable patterns when asked", () => {
    const pins = generatePins({ length: 4, count: 25, avoidWeak: true });
    for (const pin of pins) {
      expect(pin).not.toMatch(/^(\d)\1+$/); // 1111, 8888…
      expect(pin).not.toBe("1234");
      expect(pin).not.toBe("4321");
      expect(pin).not.toMatch(/^(19|20)\d{2}$/); // years
    }
  });
});

describe("passphrases, usernames, security answers", () => {
  it("builds passphrases with the requested word count and separator", () => {
    const [phrase] = generatePassphrases({ wordCount: 4, separator: "-", count: 1 });
    expect(phrase.split("-")).toHaveLength(4);
  });
  it("generates the requested number of usernames", () => {
    expect(generateUsernames({ count: 3 })).toHaveLength(3);
  });
  it("generates fake security answers as words plus digits", () => {
    const answers = generateSecurityAnswers({ count: 4, words: 3 });
    expect(answers).toHaveLength(4);
    for (const a of answers) expect(a.split("-")).toHaveLength(4); // 3 words + 2 digits
  });
});

describe("email aliases", () => {
  it("builds plus, dot and nickname variants", () => {
    expect(makePlusAlias("person@example.com", "news")).toBe("person+news@example.com");
    expect(makeDotAlias("ab@example.com", 0)).toBe("a.b@example.com");
    expect(makeNicknameAlias("person@example.com", "shop")).toBe("shop@example.com");
    expect(makePlusAlias("", "x")).toBe("");
  });
});

describe("entropy and signals", () => {
  it("estimates entropy from length and pool size", () => {
    expect(usedAlphabetSize("abc")).toBe(26);
    expect(usedAlphabetSize("abc123")).toBe(36);
    expect(estimateEntropy("")).toBe(0);
    expect(estimateEntropy("abcdefgh")).toBeCloseTo(37.6, 1);
    expect(estimateEntropy("abcdefghij")).toBeGreaterThan(estimateEntropy("abcd"));
  });
  it("computes crack times and returns null for invalid bits", () => {
    expect(crackTimeSeconds(10, "online")).toBeCloseTo(10.24, 2);
    expect(crackTimeSeconds(0, "online")).toBeNull();
    expect(crackTimeSeconds(NaN)).toBeNull();
  });
  it("detects keyboard runs without false positives from regex characters", () => {
    expect(classifyPasswordSignals("abcxyz").runs.length).toBeGreaterThan(0);
    // '.' must not act as a regex wildcard when scanning for repeats.
    const sig = classifyPasswordSignals("ab.cd");
    expect(sig.repeated).toEqual([]);
    expect(classifyPasswordSignals("aaa").repeated).toContain("a");
  });
});

describe("checkPasswordReuse", () => {
  it("finds duplicates by line number without exposing values", () => {
    const report = checkPasswordReuse(["one", "two", "one", "three", "two"]);
    expect(report.total).toBe(5);
    expect(report.pastedUnique).toBe(3);
    expect(report.duplicates).toBe(2);
    expect(report.duplicateGroups).toBe(2);
    expect(report.groups).toContainEqual([1, 3]);
    expect(report.groups).toContainEqual([2, 5]);
    expect(JSON.stringify(report)).not.toContain("one");
  });
  it("handles a plain string and empty input", () => {
    expect(checkPasswordReuse("a\nb\na").duplicates).toBe(1);
    expect(checkPasswordReuse("").total).toBe(0);
  });
});

describe("tool page wiring", () => {
  it("has a page component for every registry tool (and nothing extra)", () => {
    const merged = { ...TOOL_PAGES, ...QR_PAGES };
    expect(Object.keys(merged).sort()).toEqual(TOOLS.map((t) => t.slug).sort());
  });
});
