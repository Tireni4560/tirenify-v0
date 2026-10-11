import { describe, it, expect } from "vitest";
import {
  COMPANY,
  PRODUCT_NAME,
  PRODUCT_FULL,
  PRODUCT_ATTRIBUTION,
  TAGLINE,
  pageTitle,
} from "../src/config/brand.js";
import { STATIC_CONTENT } from "../src/lib/static-content.js";
import { ROUTES } from "../src/config/routes.js";

describe("brand naming (no doubling)", () => {
  it("defines the mandatory hierarchy", () => {
    expect(COMPANY).toBe("Tirenify");
    expect(PRODUCT_NAME).toBe("Safeyard");
    expect(PRODUCT_ATTRIBUTION).toBe("Safeyard by Tirenify");
    expect(PRODUCT_FULL).toBe(PRODUCT_ATTRIBUTION);
    expect(TAGLINE).toBe("Know Before They Do");
    expect(TAGLINE).not.toContain(COMPANY);
  });

  it("pageTitle never doubles the attribution", () => {
    for (const title of [pageTitle(null), pageTitle("Report"), pageTitle("Account")]) {
      expect(title).not.toMatch(/by Tirenify by Tirenify/);
    }
    expect(pageTitle("Report")).toBe("Report | Safeyard by Tirenify");
  });
});

describe("user-facing copy (no doubling)", () => {
  const allText = () => {
    const chunks = [];
    for (const page of Object.values(STATIC_CONTENT)) {
      chunks.push(page.title, ...(page.body || []));
    }
    for (const r of ROUTES) chunks.push(r.title, r.description);
    return chunks.join("\n");
  };

  it("has zero doubled attributions in static copy + route table", () => {
    expect(allText()).not.toMatch(/by Tirenify by Tirenify/);
    expect(allText()).not.toMatch(/Safeyard by Tirenify by/);
  });
});
