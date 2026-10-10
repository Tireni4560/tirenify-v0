// Unbiased secure randomness for every generator. Uses crypto.getRandomValues
// with REJECTION SAMPLING (never modulo bias), and secure Fisher-Yates shuffle.
// Falls back to a clear error when WebCrypto is unavailable (non-secure
// contexts): generators must refuse rather than use Math.random silently.
function cryptoObj() {
  if (typeof globalThis !== "undefined" && globalThis.crypto?.getRandomValues) {
    return globalThis.crypto;
  }
  return null;
}

export function secureRandomAvailable() {
  return cryptoObj() !== null;
}

function requireCrypto() {
  const c = cryptoObj();
  if (!c) throw new Error("Secure randomness is not available in this browser context.");
  return c;
}

function randomBytes(n) {
  const c = requireCrypto();
  const buf = new Uint8Array(n);
  c.getRandomValues(buf);
  return buf;
}

/**
 * Uniform integer in [min, max] inclusive via rejection sampling.
 * Throws on bad range or when secure randomness is unavailable.
 */
export function randomInt(min, max) {
  if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
    throw new Error("randomInt needs integer min <= max.");
  }
  const span = max - min + 1;
  if (span === 1) return min;
  // Rejection sampling: draw 32-bit words, keep values below the largest
  // multiple of span so every outcome stays equally likely.
  const limit = Math.floor(0x100000000 / span) * span;
  const word = new Uint32Array(1);
  const c = requireCrypto();
  for (;;) {
    c.getRandomValues(word);
    if (word[0] < limit) return min + (word[0] % span);
  }
}

/** Uniform pick from a non-empty array/string. */
export function randomChoice(pool) {
  if (!pool || pool.length === 0) throw new Error("randomChoice needs a non-empty pool.");
  return pool[randomInt(0, pool.length - 1)];
}

/** Secure Fisher-Yates shuffle. Returns a NEW array; input untouched. */
export function secureShuffle(input) {
  const arr = Array.from(input);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(0, i);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Random hex string of `bytes` bytes (2*bytes hex chars). */
export function randomHex(bytes) {
  if (!Number.isInteger(bytes) || bytes < 1) throw new Error("randomHex needs bytes >= 1.");
  return Array.from(randomBytes(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Random base64url string (URL/filename safe, no padding). */
export function randomBase64Url(bytes) {
  if (!Number.isInteger(bytes) || bytes < 1) throw new Error("randomBase64Url needs bytes >= 1.");
  const raw = randomBytes(bytes);
  let bin = "";
  for (const b of raw) bin += String.fromCharCode(b);
  const b64 = typeof btoa === "function" ? btoa(bin) : Buffer.from(bin, "binary").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** UUID v4 (uses crypto.randomUUID when present, else manual). */
export function randomUUID() {
  const c = cryptoObj();
  if (c?.randomUUID) return c.randomUUID();
  const hex = randomHex(16);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${((parseInt(hex.slice(16, 17), 16) & 0x3) | 0x8).toString(16)}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

/** Entropy in bits for `length` draws from an alphabet of `size`. */
export function entropyBits(alphabetSize, length) {
  if (!(alphabetSize >= 2) || !(length >= 0)) throw new Error("entropyBits needs alphabet >= 2 and length >= 0.");
  return length * Math.log2(alphabetSize);
}
