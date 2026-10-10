import { describe, it, expect } from "vitest";
import {
  randomInt,
  randomChoice,
  secureShuffle,
  randomHex,
  randomBase64Url,
  randomUUID,
  entropyBits,
  secureRandomAvailable,
} from "../src/lib/random.js";

describe("secure random", () => {
  it("is available in node (webcrypto)", () => {
    expect(secureRandomAvailable()).toBe(true);
  });
  it("randomInt stays in range and hits both ends", () => {
    const seen = new Set();
    for (let i = 0; i < 500; i++) {
      const n = randomInt(1, 3);
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(3);
      seen.add(n);
    }
    expect(seen.size).toBe(3);
  });
  it("randomInt rejects bad ranges", () => {
    expect(() => randomInt(5, 4)).toThrow();
    expect(() => randomInt(1.5, 4)).toThrow();
  });
  it("secureShuffle keeps all elements, returns a new array", () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const out = secureShuffle(input);
    expect(out).not.toBe(input);
    expect([...out].sort()).toEqual(input);
  });
  it("randomHex / base64url / uuid shapes", () => {
    expect(randomHex(8)).toMatch(/^[0-9a-f]{16}$/);
    expect(randomBase64Url(9)).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(randomUUID()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
  it("randomChoice rejects empty pools", () => {
    expect(() => randomChoice([])).toThrow();
    expect(randomChoice("ab")).toMatch(/^[ab]$/);
  });
  it("entropyBits matches log2 math", () => {
    expect(entropyBits(2, 8)).toBeCloseTo(8);
    expect(entropyBits(64, 4)).toBeCloseTo(24);
  });
});
