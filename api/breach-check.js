// Vercel serverless function: POST /api/breach-check.
// Local dev/prod (`npm run dev`, `npm start`) still use the Express route in
// server.js — both call the SAME shared core in lib/breach-check.js, so the
// validation, rate limit, cache, upstream call, normalization and error codes
// cannot drift. The email is never logged. No app.listen here.
const { runBreachCheck } = require("../lib/breach-check.js");

function readJsonBody(req) {
  return new Promise((resolve) => {
    // Vercel may already parse JSON bodies for Node functions.
    if (req.body !== undefined) {
      if (typeof req.body === "string") {
        try {
          resolve(JSON.parse(req.body || "{}"));
        } catch {
          resolve({});
        }
      } else {
        resolve(req.body || {});
      }
      return;
    }
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 64 * 1024) req.destroy(); // sanity cap, emails are tiny
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(raw || "{}"));
      } catch {
        resolve({});
      }
    });
    req.on("error", () => resolve({}));
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "method_not_allowed", message: "Use POST." });
  }
  const body = await readJsonBody(req);
  const ip =
    (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    "unknown";
  const { status, body: out } = await runBreachCheck({ email: body && body.email, ip });
  return res.status(status).json(out);
};
