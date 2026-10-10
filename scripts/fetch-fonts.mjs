// Build-time helper: downloads the latin woff2 subsets of the two self-hosted
// fonts (Sora for display, Manrope for body) into static/fonts/. Run ONCE by a
// maintainer: `node scripts/fetch-fonts.mjs`. Fonts ship in the repo so the
// runtime never contacts Google Fonts (zero-network rule).
import { writeFile, readFile } from "node:fs/promises";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
const CSS_URL =
  "https://fonts.googleapis.com/css2?family=Sora:wght@600;700&family=Manrope:wght@400;500;600;700&display=swap";

const css = await (await fetch(CSS_URL, { headers: { "User-Agent": UA } })).text();

// Split into @font-face blocks, keep only the latin subset (comment above block).
const blocks = [...css.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*@font-face\s*\{([^}]*)\}/g)];
const wanted = [];
for (const [, subset, body] of blocks) {
  if (subset !== "latin") continue;
  const family = /font-family:\s*'([^']+)'/.exec(body)?.[1];
  const weight = /font-weight:\s*(\d+)/.exec(body)?.[1];
  const url = /url\((https:[^)]+)\)/.exec(body)?.[1];
  if (family && weight && url) wanted.push({ family, weight, url });
}
if (wanted.length === 0) throw new Error("no latin font blocks parsed");

for (const { family, weight, url } of wanted) {
  const buf = Buffer.from(await (await fetch(url, { headers: { "User-Agent": UA } })).arrayBuffer());
  const name = `${family.toLowerCase()}-${weight}.woff2`;
  await writeFile(new URL(`../static/fonts/${name}`, import.meta.url), buf);
  console.log(`saved ${name} (${buf.length} bytes)`);
}
console.log("done");
