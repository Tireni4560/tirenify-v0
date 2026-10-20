import { describe, it, expect } from "vitest";
import {
  TOOLS,
  getTool,
  toolsByCategory,
  validateRegistry,
  searchTools,
  TOOL_CATEGORIES,
} from "../src/content/tools.js";
import { CATEGORIES } from "../src/config/brand.js";

const sample = [
  {
    slug: "alpha-tool",
    name: "Alpha Tool",
    purpose: "Does alpha things.",
    category: "passwords",
    keywords: ["secret", "login"],
    icon: "KeyRound",
    priority: 2,
    related: ["beta-tool"],
    limits: "Local signals only.",
  },
  {
    slug: "beta-tool",
    name: "Beta Tool",
    purpose: "Does beta things.",
    category: "passwords",
    keywords: [],
    icon: "Shield",
    priority: 1,
    related: [],
    limits: "Local signals only.",
  },
];

describe("tool registry", () => {
  it("ships the first working tools and validates them", () => {
    expect(validateRegistry()).toEqual([]);
    expect(TOOLS).toHaveLength(11);
    const passwordTools = [
      "password-generator",
      "password-strength",
      "username-generator",
      "email-alias-generator",
      "security-answer-generator",
      "pin-generator",
      "passphrase-generator",
      "entropy-calculator",
      "password-reuse-checker",
      "leak-safety-guide",
    ];
    for (const slug of passwordTools) {
      const tool = getTool(slug);
      expect(tool).not.toBeNull();
      expect(tool.category).toBe("passwords");
    }
  });

  it("covers every brand category key", () => {
    expect([...TOOL_CATEGORIES].sort()).toEqual(Object.keys(CATEGORIES).sort());
  });
  it("queries and validates sample entries", () => {
    expect(toolsByCategory("passwords", sample).map((t) => t.slug)).toEqual([
      "beta-tool",
      "alpha-tool",
    ]);
    expect(validateRegistry(sample)).toEqual([]);
    expect(getTool.call(null, "x")).toBe(null);
  });
  it("rejects bad entries", () => {
    expect(
      validateRegistry([{ ...sample[0], slug: "Bad Slug" }]).length,
    ).toBeGreaterThan(0);
    expect(
      validateRegistry([{ ...sample[0], category: "nope" }]).length,
    ).toBeGreaterThan(0);
    expect(
      validateRegistry([{ ...sample[0], related: ["ghost"] }]).length,
    ).toBeGreaterThan(0);
    expect(validateRegistry([sample[0], sample[0]]).length).toBeGreaterThan(0);
  });
  it("fuzzy-searches name before keywords", () => {
    const hits = searchTools("alpha", sample);
    expect(hits[0].slug).toBe("alpha-tool");
    expect(searchTools("login", sample)[0].slug).toBe("alpha-tool");
    expect(searchTools("zzz-nomatch", sample)).toEqual([]);
    expect(searchTools("", sample)).toEqual([]);
  });
});
