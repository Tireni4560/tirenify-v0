// Input validators + file sniffing. Pure functions (unit-tested). Error strings
// are specific and tied to fields by the caller via aria-describedby.
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,253}\.[^\s@]{2,}$/;

/** True for a plausibly-shaped email address. Never sends anything. */
export function isValidEmail(value) {
  if (typeof value !== "string") return false;
  const v = value.trim();
  if (v.length === 0 || v.length > 254) return false;
  return EMAIL_RE.test(v);
}

export function emailError(value) {
  if (typeof value !== "string" || value.trim().length === 0) return "Enter an email address.";
  if (value.trim().length > 254) return "That email is too long (over 254 characters).";
  if (!EMAIL_RE.test(value.trim())) return "That doesn’t look like an email address. Check for typos.";
  return null;
}

/** Parse a URL robustly (adds https:// when the scheme is missing). */
export function parseUrlLoose(value) {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (!v) return null;
  try {
    return new URL(v);
  } catch {
    try {
      return new URL(`https://${v}`);
    } catch {
      return null;
    }
  }
}

export function urlError(value) {
  if (typeof value !== "string" || value.trim().length === 0) return "Enter a link.";
  if (!parseUrlLoose(value)) return "That doesn’t look like a link. Include the domain, e.g. example.com.";
  return null;
}

/** Clamp/validate a number within [min, max]; returns {ok, value, reason?}. */
export function inRange(value, min, max, label = "Number") {
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  if (typeof n !== "number" || Number.isNaN(n)) return { ok: false, value: null, reason: `${label} must be a number.` };
  if (!Number.isFinite(n)) return { ok: false, value: null, reason: `${label} is out of range.` };
  if (n < min || n > max) return { ok: false, value: null, reason: `${label} must be between ${min} and ${max}.` };
  return { ok: true, value: n };
}

/** Check a File/Blob size against a byte limit. */
export function fileSizeError(file, maxBytes, label = "File") {
  const size = file?.size;
  if (typeof size !== "number") return `${label} could not be read.`;
  if (size === 0) return `${label} is empty.`;
  if (size > maxBytes) {
    return `${label} is too big (${formatBytes(size)}). The limit here is ${formatBytes(maxBytes)}.`;
  }
  return null;
}

// Magic-byte sniffing: verify a file's real type from its first bytes, not its
// extension. Returns a lowercase kind ("jpeg" | "png" | "webp" | "pdf" | …)
// or null when unknown.
const MAGIC = [
  { kind: "jpeg", bytes: [0xff, 0xd8, 0xff] },
  { kind: "png", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { kind: "gif", bytes: [0x47, 0x49, 0x46, 0x38] },
  { kind: "webp", bytes: [0x52, 0x49, 0x46, 0x46] }, // + "WEBP" at offset 8
  { kind: "pdf", bytes: [0x25, 0x50, 0x44, 0x46] },
  { kind: "zip", bytes: [0x50, 0x4b, 0x03, 0x04] },
];

/** Sniff the kind of a Uint8Array (first bytes of a file). Pure + tested. */
export function sniffMagicBytes(head) {
  if (!head || head.length < 4) return null;
  for (const { kind, bytes } of MAGIC) {
    let match = true;
    for (let i = 0; i < bytes.length && i < head.length; i++) {
      if (head[i] !== bytes[i]) {
        match = false;
        break;
      }
    }
    if (!match) continue;
    if (kind === "webp") {
      if (head.length < 12) return null;
      if (head[8] === 0x57 && head[9] === 0x45 && head[10] === 0x42 && head[11] === 0x50) return "webp";
      return null;
    }
    return kind;
  }
  return null;
}

/** Read the first `n` bytes of a Blob/File as a Uint8Array (for sniffing). */
export async function readHeadBytes(blob, n = 16) {
  const slice = blob.slice(0, n);
  const buf = await slice.arrayBuffer();
  return new Uint8Array(buf);
}

// Small local byte formatter to keep this module dependency-free.
function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
