import { defineConfig } from "vitest/config";

// Scope tests to our own tests/ directory so the exported Lovable prototype
// (tirenify-src/, with its own incompatible test setup) is never picked up.
export default defineConfig({
  test: {
    include: ["tests/**/*.test.{js,jsx}"],
    environment: "node",
  },
});
