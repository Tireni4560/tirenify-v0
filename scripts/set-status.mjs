// Dev helper: set each route's status. Usage:
//   node scripts/set-status.mjs planned
//   node scripts/set-status.mjs live /breach-guard /tools
import { readFile, writeFile } from "node:fs/promises";

const [mode, ...paths] = process.argv.slice(2);
if (!["live", "planned"].includes(mode)) {
  console.error("mode must be 'live' or 'planned'");
  process.exit(1);
}

const file = new URL("../src/config/routes.js", import.meta.url);
let text = await readFile(file, "utf8");

if (paths.length === 0) {
  // set every route
  text = text.replace(/status: "(live|planned)"/g, `status: "${mode}"`);
} else {
  for (const p of paths) {
    // match the route object line for this path and rewrite its status
    const lineRe = new RegExp(`(path: "${p.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}"[\\s\\S]*?)status: "(live|planned)"`);
    if (!lineRe.test(text)) {
      console.error(`route not found: ${p}`);
      process.exit(1);
    }
    text = text.replace(lineRe, `$1status: "${mode}"`);
  }
}

await writeFile(file, text);
const mod = await import(`../src/config/routes.js?v=${Date.now()}`);
console.log("live routes:", mod.LIVE_ROUTES.map((r) => r.path).join(", "));
