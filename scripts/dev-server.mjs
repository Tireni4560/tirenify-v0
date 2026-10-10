// Zero-dependency dev launcher (Node 20+). "npm run dev" starts BOTH the
// Express API server (server.js on :3000) and the Vite dev server (:5173).
// Vite proxies /api -> :3000 (see vite.config.js), so the browser only ever
// talks to http://localhost:5173 — one URL, front end + server routes
// together. No global installs, no "vercel dev", no login required.
//
// Both children inherit stdio so you see the API logs (including the
// dev-only [breach-check] diagnostics) and Vite's output in one terminal.
// When either process exits (or you press Ctrl+C) we shut the other down too.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(name, command, args) {
  const child = spawn(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32", // so "vite"/"node" resolve on Windows
    env: { ...process.env, FORCE_COLOR: "1" },
  });
  child.on("exit", (code) => {
    console.log(`\n[dev] ${name} exited (code ${code}). Stopping the other process…`);
    shutdown(code ?? 0);
  });
  return child;
}

const children = [
  run("api server", "node", ["server.js"]),
  run("vite dev server", "vite", []),
];

let shuttingDown = false;
function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const c of children) {
    try {
      c.kill();
    } catch {
      /* already gone */
    }
  }
  process.exit(code);
}

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    console.log(`\n[dev] Received ${sig}. Shutting down…`);
    shutdown(0);
  });
}
