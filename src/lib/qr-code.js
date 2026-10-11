// In-house QR code encoder — byte mode, error-correction level M, versions
// 1–20 (up to ~660 characters). Zero dependencies, pure functions, no network.
// Implements ISO/IEC 18004: Reed–Solomon over GF(256), all 8 masks with the
// standard penalty score. Verified against the reference `qrcode` package
// during development (see PROGRESS.md); unit-tested in tests/qr-code.test.js.
//
// API:
//   qrEncode(text) -> { size, modules: Uint8Array(size*size), version, mask }
//     modules[y*size + x] is 1 for dark, 0 for light (quiet zone NOT included)
//   qrToSvgString(qr, { scale, quiet }) -> standalone SVG document
//   qrCapacityText(maxChars) -> user-facing max length for the input box

// ── Static tables (ISO/IEC 18004 §8, level M) ──────────────────────────────

// Total codewords per version (data + EC), versions 1..20.
const TOTAL_CODEWORDS = [26, 44, 70, 100, 134, 172, 196, 242, 292, 346, 404, 466, 532, 581, 655, 733, 815, 901, 991, 1085];

// Level M: [ecCodewordsPerBlock, [[numBlocks, dataCodewordsPerBlock], ...]]
const EC_LEVEL_M = [
  [10, [[1, 16]]],
  [16, [[1, 28]]],
  [26, [[1, 44]]],
  [18, [[2, 32]]],
  [24, [[2, 43]]],
  [16, [[4, 27]]],
  [18, [[4, 31]]],
  [22, [[2, 38], [2, 39]]],
  [22, [[3, 36], [2, 37]]],
  [26, [[4, 43], [1, 44]]],
  [30, [[1, 50], [4, 51]]],
  [22, [[6, 36], [2, 37]]],
  [22, [[8, 37], [1, 38]]],
  [24, [[4, 40], [5, 41]]],
  [24, [[5, 41], [5, 42]]],
  [28, [[7, 45], [3, 46]]],
  [28, [[10, 46], [1, 47]]],
  [26, [[9, 43], [4, 44]]],
  [26, [[3, 44], [11, 45]]],
  [26, [[3, 41], [13, 42]]],
];

// Alignment pattern centre coordinates per version (index 0 unused = v1).
const ALIGNMENT_CENTRES = [
  [],
  [6, 18], [6, 22], [6, 26], [6, 30], [6, 34],
  [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50], [6, 30, 54],
  [6, 32, 58], [6, 34, 62], [6, 26, 46, 66], [6, 26, 48, 70], [6, 26, 50, 74],
  [6, 30, 54, 78], [6, 30, 56, 82], [6, 30, 58, 86], [6, 34, 62, 90],
];

// Remainder bits after the last codeword, per version.
function remainderBits(version) {
  if (version >= 2 && version <= 6) return 7;
  if (version >= 14 && version <= 20) return 3;
  return 0;
}

function dataCodewordCount(version) {
  const [, groups] = EC_LEVEL_M[version - 1];
  return groups.reduce((sum, [blocks, len]) => sum + blocks * len, 0);
}

function blockStructure(version) {
  const [ecLen, groups] = EC_LEVEL_M[version - 1];
  const blocks = [];
  for (const [num, len] of groups) {
    for (let i = 0; i < num; i++) blocks.push({ dataLen: len, ecLen });
  }
  const dataTotal = blocks.reduce((s, b) => s + b.dataLen, 0);
  const ecTotal = blocks.length * ecLen;
  if (dataTotal + ecTotal !== TOTAL_CODEWORDS[version - 1]) {
    throw new Error(`QR table inconsistency at version ${version}`);
  }
  return blocks;
}

// ── GF(256) arithmetic (primitive polynomial 0x11D) ────────────────────────

const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
})();

function gfMul(a, b) {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

/** Generator polynomial for `degree` EC codewords: monic descending, minus leading 1. */
function rsGenerator(degree) {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    // multiply by (x + α^i)
    const next = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j]; // × x
      next[j + 1] ^= gfMul(poly[j], GF_EXP[i]); // × α^i
    }
    poly = next;
  }
  return poly.slice(1); // drop the monic leading coefficient
}

/** Systematic RS encoding: returns `ecLen` check codewords for `data`. */
function rsEncode(data, ecLen) {
  const divisor = rsGenerator(ecLen);
  const res = new Uint8Array(ecLen);
  for (const b of data) {
    const factor = b ^ res[0];
    res.copyWithin(0, 1);
    res[ecLen - 1] = 0;
    for (let i = 0; i < ecLen; i++) res[i] ^= gfMul(divisor[i], factor);
  }
  return res;
}

// ── Bitstream → codewords ──────────────────────────────────────────────────

class BitBuffer {
  constructor() {
    this.bits = [];
  }
  push(value, len) {
    for (let i = len - 1; i >= 0; i--) this.bits.push((value >>> i) & 1);
  }
  toBytes() {
    const out = [];
    for (let i = 0; i < this.bits.length; i += 8) {
      let byte = 0;
      for (let j = 0; j < 8; j++) byte = (byte << 1) | (this.bits[i + j] || 0);
      out.push(byte);
    }
    return out;
  }
}

const utf8Bytes = (text) => Array.from(new TextEncoder().encode(text));

function charCountBits(version) {
  return version < 10 ? 8 : 16;
}

function chooseVersion(byteLength) {
  for (let v = 1; v <= 20; v++) {
    const capacity = dataCodewordCount(v) * 8;
    const needed = 4 + charCountBits(v) + 8 * byteLength;
    if (needed <= capacity) return v;
  }
  throw new Error(`Text is too long for this QR generator (max ${QR_MAX_BYTES} characters).`);
}

function buildCodewords(bytes, version) {
  const dataCount = dataCodewordCount(version);
  const buf = new BitBuffer();
  buf.push(0b0100, 4); // byte mode
  buf.push(bytes.length, charCountBits(version));
  for (const b of bytes) buf.push(b, 8);
  // terminator (up to 4 zero bits), byte align, pad with 0xEC / 0x11
  const capacity = dataCount * 8;
  buf.push(0, Math.min(4, capacity - buf.bits.length));
  while (buf.bits.length % 8 !== 0) buf.bits.push(0);
  const data = buf.toBytes();
  let pad = 0xec;
  while (data.length < dataCount) {
    data.push(pad);
    pad = pad === 0xec ? 0x11 : 0xec;
  }

  // Split into blocks, encode EC, interleave.
  const structure = blockStructure(version).map((b) => ({ ...b, data: [], ec: null }));
  let idx = 0;
  for (const block of structure) {
    block.data = data.slice(idx, idx + block.dataLen);
    idx += block.dataLen;
  }
  for (const block of structure) block.ec = rsEncode(block.data, block.ecLen);

  const out = [];
  const maxLen = Math.max(...structure.map((b) => b.dataLen));
  for (let i = 0; i < maxLen; i++) {
    for (const block of structure) if (i < block.data.length) out.push(block.data[i]);
  }
  for (let i = 0; i < structure[0].ecLen; i++) {
    for (const block of structure) out.push(block.ec[i]);
  }
  return out;
}

// ── Matrix construction ────────────────────────────────────────────────────

function getBit(value, i) {
  return ((value >>> i) & 1) === 1;
}

function formatInfoBits(mask) {
  const data = (0b00 << 3) | mask; // EC level M = 00
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  return ((data << 10) | rem) ^ 0x5412;
}

function versionInfoBits(version) {
  let rem = version;
  for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
  return (version << 12) | rem;
}

function makeMatrix(version) {
  const size = 4 * version + 17;
  const modules = new Uint8Array(size * size); // 0 = light
  const isFn = new Uint8Array(size * size); // 1 = function module
  const set = (x, y, dark) => {
    const i = y * size + x;
    modules[i] = dark ? 1 : 0;
    isFn[i] = 1;
  };
  const isFunction = (x, y) => isFn[y * size + x] === 1;

  // 1. Timing patterns across the full row/column (finders overwrite corners).
  for (let i = 0; i < size; i++) {
    set(6, i, i % 2 === 0);
    set(i, 6, i % 2 === 0);
  }

  // 2. Finder patterns + separators (9×9 clamp, dark at dist != 2 && != 4).
  for (const [cx, cy] of [[3, 3], [size - 4, 3], [3, size - 4]]) {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || y < 0 || x >= size || y >= size) continue;
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        set(x, y, dist !== 2 && dist !== 4);
      }
    }
  }

  // 3. Alignment patterns (5×5 rings), skipping the three finder corners.
  const centres = ALIGNMENT_CENTRES[version - 1];
  for (let i = 0; i < centres.length; i++) {
    for (let j = 0; j < centres.length; j++) {
      const corner =
        (i === 0 && j === 0) ||
        (i === 0 && j === centres.length - 1) ||
        (i === centres.length - 1 && j === 0);
      if (corner) continue;
      const cx = centres[i];
      const cy = centres[j];
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          set(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
        }
      }
    }
  }

  // 4. Format-info areas (placeholder; redrawn with the chosen mask later).
  const drawFormat = (mask) => {
    const bits = formatInfoBits(mask);
    for (let i = 0; i <= 5; i++) set(8, i, getBit(bits, i));
    set(8, 7, getBit(bits, 6));
    set(8, 8, getBit(bits, 7));
    set(7, 8, getBit(bits, 8));
    for (let i = 9; i < 15; i++) set(14 - i, 8, getBit(bits, i));
    for (let i = 0; i < 8; i++) set(size - 1 - i, 8, getBit(bits, i));
    for (let i = 8; i < 15; i++) set(8, size - 15 + i, getBit(bits, i));
    set(8, size - 8, true); // dark module
  };
  drawFormat(0);

  // 5. Version info (v7+).
  if (version >= 7) {
    const bits = versionInfoBits(version);
    for (let i = 0; i < 18; i++) {
      const bit = getBit(bits, i);
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      set(a, b, bit);
      set(b, a, bit);
    }
  }

  return { size, modules, isFn, set, isFunction, drawFormat };
}

function placeData(matrix, codewords) {
  const { size, modules, isFn, set, isFunction } = matrix;
  let bitIndex = 0;
  const totalBits = codewords.length * 8;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5; // skip the vertical timing column
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (isFunction(x, y)) continue;
        let dark = false;
        if (bitIndex < totalBits) {
          dark = getBit(codewords[bitIndex >>> 3], 7 - (bitIndex & 7));
          bitIndex++;
        }
        const i = y * size + x;
        modules[i] = dark ? 1 : 0;
      }
    }
  }
}

// ── Masking + penalty score ────────────────────────────────────────────────

function maskFn(mask, x, y) {
  switch (mask) {
    case 0: return (x + y) % 2 === 0;
    case 1: return y % 2 === 0;
    case 2: return x % 3 === 0;
    case 3: return (x + y) % 3 === 0;
    case 4: return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
    case 5: return ((x * y) % 2) + ((x * y) % 3) === 0;
    case 6: return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
    default: return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
  }
}

const PENALTY_RUN = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0]; // 10111010000
const PENALTY_RUN_REV = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];

function matchesAt(arr, start, pattern) {
  for (let i = 0; i < pattern.length; i++) {
    if (arr[start + i] !== pattern[i]) return false;
  }
  return true;
}

function penaltyScore(modules, size) {
  let score = 0;
  const row = new Uint8Array(size);
  const col = new Uint8Array(size);

  // Rules 1 (runs ≥5), 3 (finder-like patterns) — rows and columns.
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      row[x] = modules[y * size + x];
      col[x] = modules[x * size + y];
    }
    for (const line of [row, col]) {
      let run = 1;
      for (let i = 1; i < size; i++) {
        if (line[i] === line[i - 1]) {
          run++;
        } else {
          if (run >= 5) score += 3 + (run - 5);
          run = 1;
        }
      }
      if (run >= 5) score += 3 + (run - 5);
      for (let i = 0; i + 11 <= size; i++) {
        if (matchesAt(line, i, PENALTY_RUN)) score += 40;
        if (matchesAt(line, i, PENALTY_RUN_REV)) score += 40;
      }
    }
  }

  // Rule 2: 2×2 blocks of the same colour.
  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size - 1; x++) {
      const v = modules[y * size + x];
      if (v === modules[y * size + x + 1] && v === modules[(y + 1) * size + x] && v === modules[(y + 1) * size + x + 1]) {
        score += 3;
      }
    }
  }

  // Rule 4: deviation from 50% dark.
  let dark = 0;
  for (let i = 0; i < modules.length; i++) dark += modules[i];
  const percent = (dark * 100) / (size * size);
  score += Math.floor(Math.abs(percent - 50) / 5) * 10;
  return score;
}

/** Apply mask `m` to data modules and redraw format info with `m`. */
function applyMask(matrix, mask) {
  const { size, modules, isFn, drawFormat } = matrix;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      if (isFn[i]) continue;
      if (maskFn(mask, x, y)) modules[i] ^= 1;
    }
  }
  drawFormat(mask);
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Encode `text` as a QR code (byte mode, EC level M, versions 1–20).
 * Returns { size, modules, version, mask } where modules[y*size + x] is 1/0.
 * Throws for empty or oversized input.
 */
export function qrEncode(text) {
  const str = String(text ?? "");
  if (!str) throw new Error("Enter some text or a URL to encode.");
  const bytes = utf8Bytes(str);
  const version = chooseVersion(bytes.length);
  const codewords = buildCodewords(bytes, version);

  const matrix = makeMatrix(version);
  placeData(matrix, codewords);

  // Try every mask, keep the lowest penalty score.
  let best = null;
  for (let mask = 0; mask < 8; mask++) {
    applyMask(matrix, mask);
    const score = penaltyScore(matrix.modules, matrix.size);
    if (!best || score < best.score) best = { mask, score, snapshot: matrix.modules.slice() };
    applyMask(matrix, mask); // XOR is its own inverse — unmask for the next try
  }
  matrix.modules.set(best.snapshot);
  matrix.drawFormat(best.mask);

  return { size: matrix.size, modules: matrix.modules, version, mask: best.mask };
}

/** Largest UTF-8 byte length that fits version 20-M. */
export const QR_MAX_BYTES = (function () {
  const data = dataCodewordCount(20) * 8;
  return Math.floor((data - 4 - 16) / 8);
})();

/** Standalone SVG document for a QR result. */
export function qrToSvgString(qr, { quiet = 4, scale = 8 } = {}) {
  const n = qr.size + quiet * 2;
  let path = "";
  for (let y = 0; y < qr.size; y++) {
    for (let x = 0; x < qr.size; x++) {
      if (qr.modules[y * qr.size + x]) path += `M${x + quiet} ${y + quiet}h1v1h-1z`;
    }
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" ` +
    `width="${n * scale}" height="${n * scale}" shape-rendering="crispEdges">` +
    `<rect width="${n}" height="${n}" fill="#ffffff"/>` +
    `<path d="${path}" fill="#000000"/></svg>`
  );
}


