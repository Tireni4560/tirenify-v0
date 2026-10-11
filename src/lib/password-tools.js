import { randomChoice, randomInt } from "./random.js";

const LOWERS = "abcdefghijklmnopqrstuvwxyz";
const UPPERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS = "0123456789";
const SYMBOLS = "!@#$%^&*()-_=+[]{};:,.<>?";
const AMBIGUOUS = "Il1O0o";

const CLASSES = {
  lower: { chars: LOWERS, size: 26 },
  upper: { chars: UPPERS, size: 26 },
  digit: { chars: DIGITS, size: 10 },
  symbol: { chars: SYMBOLS, size: 32 },
};

export function generatePassword({
  length = 16,
  useLower = true,
  useUpper = true,
  useDigits = true,
  useSymbols = true,
  excludeAmbiguous = true,
} = {}) {
  if (!Number.isInteger(length) || length < 1) throw new Error("length must be a positive integer");
  const pools = [];
  if (useLower) pools.push(LOWERS);
  if (useUpper) pools.push(UPPERS);
  if (useDigits) pools.push(DIGITS);
  if (useSymbols) pools.push(SYMBOLS);
  if (pools.length === 0) throw new Error("choose at least one character class");
  if (excludeAmbiguous) {
    const clean = (s) => s.split("").filter((c) => !AMBIGUOUS.includes(c)).join("");
    const cleaned = pools.map(clean);
    if (cleaned.some((p) => p.length === 0)) {
      throw new Error("character set is empty after removing ambiguous characters");
    }
    pools.splice(0, pools.length, ...cleaned);
  }
  const buf = new Uint8Array(length);
  const crypto_ = globalThis.crypto ?? null;
  if (!crypto_?.getRandomValues) {
    throw new Error("secure randomness is not available in this browser context");
  }
  for (let i = 0; i < length; i++) {
    const pool = pools[randomInt(0, pools.length - 1)];
    buf[i] = pool.charCodeAt(randomInt(0, pool.length - 1));
  }
  return String.fromCodePoint(...buf);
}

function isWeakPin(pin) {
  if (!/^\d+$/.test(pin)) return true;
  if (pin.length < 4) return true;
  if (/^(\d)\1+$/.test(pin)) return true;
  const nums = pin.split("").map(Number);
  const asc = nums.every((v, i, arr) => i === 0 || v === arr[i - 1] + 1);
  const desc = nums.every((v, i, arr) => i === 0 || v === arr[i - 1] - 1);
  if (asc || desc) return true;
  if (/^(19|20)\d{2}$/.test(pin)) return true;
  if (/^(0{4}|1{4}|2{4}|3{4}|4{4}|5{4}|6{4}|7{4}|8{4}|9{4})$/.test(pin)) return true;
  const checkRun = (dir) => {
    for (let i = 0; i <= pin.length - 4; i++) {
      let ok = true;
      for (let d = 0; d < 4; d++) {
        const a = Number(pin[i + d]);
        const b = a + dir;
        if (pin[i + d] !== String(b)) { ok = false; break; }
      }
      if (ok) return true;
    }
    return false;
  };
  if (checkRun(1) || checkRun(-1)) return true;
  return false;
}

export function generatePins({ length = 4, count = 1, avoidWeak = true } = {}) {
  if (!Number.isInteger(length) || length < 1) throw new Error("length must be a positive integer");
  if (!Number.isInteger(count) || count < 1) throw new Error("count must be a positive integer");
  const crypto_ = globalThis.crypto ?? null;
  if (!crypto_?.getRandomValues) {
    throw new Error("secure randomness is not available in this browser context");
  }
  const pins = new Set();
  const limit = Math.max(count * 40, 400);
  for (let i = 0; i < limit; i++) {
    const digits = new Array(length);
    for (let d = 0; d < length; d++) digits[d] = String(randomInt(0, 9));
    const pin = digits.join("");
    if (avoidWeak && isWeakPin(pin)) continue;
    pins.add(pin);
    if (pins.size >= count) break;
  }
  if (pins.size < count) {
    for (let i = 0; i < limit; i++) {
      const digits = new Array(length);
      for (let d = 0; d < length; d++) digits[d] = String(randomInt(0, 9));
      pins.add(digits.join(""));
      if (pins.size >= count) break;
    }
  }
  return Array.from(pins).slice(0, count);
}


const PASSPHRASE_WORDS = [
  "aback", "abase", "abate", "amber", "atlas", "basin", "beacon", "berry",
  "blank", "blaze", "bloom", "board", "brave", "bread", "brick", "bridge",
  "bronze", "brush", "cabin", "cable", "camel", "canal", "candy", "canvas",
  "carbon", "cargo", "cedar", "chalk", "charm", "chess", "chest", "child",
  "cider", "civic", "cliff", "cloud", "clover", "cobalt", "compass", "coral",
  "cotton", "courage", "creek", "criminal", "crystal", "cucumber", "currency", "current",
  "cursor", "curve", "cycle", "dance", "debris", "delay", "demo", "denim",
  "depart", "depth", "desert", "desktop", "diamond", "diesel", "dinner", "domino",
  "duplex", "dress", "dwell", "eager", "ebony", "eclipse", "effect", "eight",
  "eldest", "eleven", "elbow", "emerge", "emotion", "empty", "enable", "energy",
  "enemy", "enjoy", "enter", "entire", "entry", "envelope", "episode", "equip",
  "era", "error", "escape", "essay", "estate", "ether", "evolve", "exact",
  "example", "exchange", "execute", "exercise", "exit", "expand", "expect", "expire",
  "explain", "explore", "export", "expose", "extend", "extra", "fabric", "factory",
  "fall", "family", "fan", "fantasy", "farm", "fast", "fat", "father",
  "fault", "favorite", "feature", "february", "federal", "fee", "feed", "feel",
  "female", "fence", "ferry", "fetch", "fever", "few", "fiber", "field",
  "figure", "file", "film", "filter", "final", "find", "fine", "finger",
  "finish", "fire", "firm", "first", "fixture", "five", "fix", "flag",
  "flame", "flash", "flat", "flavor", "flee", "flesh", "flight", "flip",
  "float", "flock", "flood", "floor", "flour", "flow", "flower", "fly",
  "foam", "focus", "fog", "foil", "fold", "folk", "follow", "food",
  "foot", "forge", "fork", "form", "former", "fort", "forward", "fossil",
  "foster", "found", "four", "fox", "frame", "free", "freeze", "fresh",
  "friend", "fright", "frog", "front", "frost", "fruit", "fuel", "fun",
  "funny", "furnace", "future", "gain", "galaxy", "gallery", "game", "gap",
  "garage", "garden", "gas", "gate", "gather", "gauge", "gaze", "general",
  "genie", "genre", "gentle", "gift", "girl", "give", "glad", "glass",
  "glove", "go", "goal", "goat", "god", "gold", "good", "goose",
  "grace", "grade", "grain", "grand",
];

// ---- Passphrase generator ----

export function generatePassphrase({
  wordCount = 5,
  separator = " ",
  capitalize = false,
} = {}) {
  const count = Math.min(Math.max(2, Number(wordCount) || 5), 8);
  const chosen = [];
  for (let i = 0; i < count; i++) chosen.push(randomChoice(PASSPHRASE_WORDS));
  let phrase = chosen.join(separator);
  if (capitalize) phrase = phrase.charAt(0).toUpperCase() + phrase.slice(1);
  return phrase;
}

export function generatePassphrases({
  wordCount = 5,
  separator = " ",
  count = 5,
  capitalize = false,
} = {}) {
  const arr = [];
  for (let i = 0; i < count; i++) {
    arr.push(generatePassphrase({ wordCount, separator, capitalize }));
  }
  return arr;
}

// ---- Username generator ----

const USER_PREFIXES = [
  "blue", "cosmic", "dragon", "eagle", "flame", "forest", "golden", "green",
  "harbor", "icy", "jade", "knight", "lunar", "maple", "ocean", "penny",
  "quartz", "rain", "silver", "storm", "tiger", "unity", "valley", "wind",
  "winter", "xylo", "yellow", "zen",
];

const USER_SUFFIXES = [
  "arc", "bolt", "born", "byte", "cove", "dash", "dust", "edge", "fall",
  "fin", "fire", "flow", "forge", "fox", "gale", "gate", "gold", "grain",
  "hawk", "heap", "hip", "hint", "hope", "hub", "ink", "joy", "kind", "lab",
  "lake", "leaf", "leg", "lock", "loud", "love", "mail", "map", "mine",
  "mode", "mood", "name", "nest", "nook", "note", "num", "oak", "pace",
  "pen", "pest", "pix", "proof", "pulse", "queen", "rail", "rain", "rat",
  "reef", "rhythm", "ring", "rise", "river", "roof", "root", "row", "sage",
  "salt", "sense", "service", "shade", "ship", "shot", "sight", "silk",
  "site", "sleep", "slide", "snow", "song", "sort", "sound", "space",
  "spade", "spare", "sphere", "spine", "spit", "spot", "stash", "stem",
  "stir", "stock", "storm", "straw", "stream", "stretch", "strip", "strong",
  "stub", "stun", "sub", "suit", "sun", "super", "surf", "surge", "sweet",
  "swell", "swim", "swap", "sword", "sway", "tax", "team", "tea", "tel",
  "tip", "tor", "tot", "toy", "trek", "trib", "tuck", "tune", "twin",
  "tye", "zeny", "zig", "zoo",
];

export function generateUsernames({ count = 5, withNumber = true, withSymbol = false } = {}) {
  if (!Number.isInteger(count) || count < 1) throw new Error("count must be a positive integer");
  const out = [];
  for (let i = 0; i < count; i++) {
    const prefix = randomChoice(USER_PREFIXES);
    const suffix = randomChoice(USER_SUFFIXES);
    let name = prefix + suffix;
    if (withNumber) name += String(randomInt(10, 99));
    if (withSymbol) name += randomChoice(["!", ".", "_", "*"]);
    out.push(name);
  }
  return out;
}

// ---- Email alias generator ----

export function makePlusAlias(email, tag = "spam") {
  if (!email) return "";
  const [local = "", domain = ""] = String(email).split("@");
  return `${local.trim()}+${tag}@${domain.trim()}`;
}

export function makeDotAlias(email, index = 1) {
  if (!email) return "";
  const [local = "", domain = ""] = String(email).split("@");
  const dotted = local.split("").join(".");
  return `${dotted}${index ? `.${index}` : ""}@${domain.trim()}`;
}

export function makeNicknameAlias(email, nick) {
  if (!email) return "";
  const [local = "", domain = ""] = String(email).split("@");
  return `${String(nick || local).trim().replace(/[^a-zA-Z0-9.]/g, "")}@${domain.trim()}`;
}

// ---- Security answer generator ----

/**
 * Fake, memorable answers for security questions: random words plus digits,
 * joined by a separator. Advice: store the answer in a password manager, never
 * the real fact about yourself.
 */
export function generateSecurityAnswers({ count = 5, words = 3, separator = "-", digits = 2 } = {}) {
  if (!Number.isInteger(count) || count < 1) throw new Error("count must be a positive integer");
  const n = Math.min(Math.max(2, Number(words) || 3), 6);
  const d = Math.min(Math.max(0, Number(digits) ?? 2), 4);
  const out = [];
  for (let i = 0; i < count; i++) {
    const parts = [];
    for (let w = 0; w < n; w++) parts.push(randomChoice(PASSPHRASE_WORDS));
    if (d > 0) parts.push(String(randomInt(0, 10 ** d - 1)).padStart(d, "0"));
    out.push(parts.join(separator));
  }
  return out;
}

// ---- Entropy / strength signals (no verdict) ----

export function usedAlphabetSize(password) {
  const p = String(password || "");
  let size = 0;
  if (/[a-z]/.test(p)) size += 26;
  if (/[A-Z]/.test(p)) size += 26;
  if (/[0-9]/.test(p)) size += 10;
  if (/[^a-zA-Z0-9]/.test(p)) size += 32;
  return size === 0 ? 26 : size;
}

export function estimateEntropy(password) {
  const p = String(password || "");
  if (!p) return 0;
  return Math.round((p.length * Math.log2(usedAlphabetSize(p))) * 10) / 10;
}

export function crackTimeSeconds(bits, speed = "online") {
  if (!Number.isFinite(bits) || bits <= 0) return null;
  const limits = { online: 100, fastHash: 1e9, slowHash: 1e4 };
  const guesses = Math.pow(2, bits);
  return Math.max(0, guesses / (limits[speed] || limits.online));
}

export function classifyPasswordSignals(password) {
  const p = String(password || "");
  const lower = /[a-z]/.test(p);
  const upper = /[A-Z]/.test(p);
  const digit = /[0-9]/.test(p);
  const symbol = /[^a-zA-Z0-9]/.test(p);
  const classes = [];
  if (lower) classes.push("lowercase");
  if (upper) classes.push("uppercase");
  if (digit) classes.push("digits");
  if (symbol) classes.push("symbols");
  const runs = [];
  const checkRun = (dir) => {
    for (let i = 0; i <= p.length - 3; i++) {
      const a = p.charCodeAt(i);
      const b = p.charCodeAt(i + 1);
      const c = p.charCodeAt(i + 2);
      const ok = dir === 1 ? b - a === 1 && c - b === 1 : a - b === 1 && b - c === 1;
      if (ok) {
        let end = i + 3;
        while (end < p.length) {
          const e = p.charCodeAt(end);
          const prev = p.charCodeAt(end - 1);
          if ((dir === 1 ? e - prev === 1 : prev - e === 1)) end++;
          else break;
        }
        runs.push({ start: i, length: end - i, text: p.slice(i, end) });
        i = end - 1;
      }
    }
  };
  checkRun(1);
  checkRun(-1);
  const repeated = [];
  const doubled = [];
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  for (const ch of new Set(p)) {
    const safe = esc(ch);
    if (new RegExp(`${safe}{3,}`).test(p)) repeated.push(ch);
    if (new RegExp(`${safe}{2,}`).test(p)) doubled.push(ch);
  }
  return {
    length: p.length,
    classes,
    classCount: classes.length,
    charsetSize: usedAlphabetSize(p),
    runs,
    repeated,
    doubled,
  };
}

// ---- Password reuse checker ----

/**
 * Compare pasted passwords IN MEMORY ONLY. Accepts an array of values or a
 * newline-separated string. Returns counts plus the 1-based line numbers of
 * matching groups — never the passwords themselves.
 */
export function checkPasswordReuse(input) {
  const arr = (Array.isArray(input) ? input : String(input ?? "").split(/\r?\n/))
    .map((l) => String(l).trim())
    .filter(Boolean);
  const byValue = new Map();
  arr.forEach((value, i) => {
    if (!byValue.has(value)) byValue.set(value, []);
    byValue.get(value).push(i + 1);
  });
  const groups = [...byValue.values()].filter((idxs) => idxs.length > 1);
  return {
    total: arr.length,
    pastedUnique: byValue.size,
    duplicates: arr.length - byValue.size,
    duplicateGroups: groups.length,
    groups,
    linesChecked: arr.length,
  };
}
