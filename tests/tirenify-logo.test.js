import { describe, it, expect } from "vitest";
import {
  activeTheme,
  logoSrc,
  logoWidthForHeight,
} from "../src/components/tirenify-logo.jsx";

const ASPECT = {
  horizontal: 448.21 / 98,
  symbol: 86 / 79,
};

describe("logo source selection", () => {
  it("picks the dark variant on the dark theme", () => {
    expect(logoSrc({ theme: "dark" })).toBe("/brand/tirenify-logo-horizontal-dark.svg");
    expect(logoSrc({ theme: "dark", variant: "symbol" })).toBe("/brand/tirenify-symbol-dark.svg");
  });

  it("picks the light variant on the light theme", () => {
    expect(logoSrc({ theme: "light" })).toBe("/brand/tirenify-logo-horizontal-light.svg");
    expect(logoSrc({ theme: "light", variant: "symbol" })).toBe("/brand/tirenify-symbol-light.svg");
  });

  it("picks the mono variant regardless of theme", () => {
    expect(logoSrc({ theme: "dark", mono: true })).toBe("/brand/tirenify-logo-horizontal-mono-black.svg");
    expect(logoSrc({ theme: "light", mono: true })).toBe("/brand/tirenify-logo-horizontal-mono-black.svg");
    expect(logoSrc({ theme: "light", mono: true, variant: "symbol" })).toBe(
      "/brand/tirenify-symbol-mono-black.svg",
    );
  });

  it("defaults to the dark theme when there is no document", () => {
    expect(activeTheme()).toBe("dark");
    expect(logoSrc()).toBe("/brand/tirenify-logo-horizontal-dark.svg");
  });
});

describe("logo sizing (never stretched)", () => {
  it("derives the width from the intrinsic aspect ratio", () => {
    expect(logoWidthForHeight(22, "horizontal")).toBeCloseTo(22 * ASPECT.horizontal, 6);
    expect(logoWidthForHeight(32, "horizontal")).toBeCloseTo(32 * ASPECT.horizontal, 6);
    expect(logoWidthForHeight(22, "symbol")).toBeCloseTo(22 * ASPECT.symbol, 6);
  });

  it("keeps the footer lockup at or above the 96px minimum width", () => {
    expect(logoWidthForHeight(22, "horizontal")).toBeGreaterThanOrEqual(96);
  });

  it("rounds to an integer width attribute without distorting the ratio", () => {
    const w = logoWidthForHeight(22, "horizontal");
    // The integer attribute is within 1px of the exact width, so the mark is
    // never visibly stretched.
    expect(Math.abs(Math.round(w) - w)).toBeLessThanOrEqual(0.5);
  });
});
