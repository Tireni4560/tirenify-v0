import { describe, it, expect } from "vitest";
import { qrEncode, qrToSvgString, QR_MAX_BYTES } from "../src/lib/qr-code.js";

// Golden vector: the "HELLO" matrix was cross-checked byte-for-byte against
// the reference `qrcode` package (EC level M, byte mode) before being pinned
// here — any encoder regression changes this hash.
const HELLO_HEX =
  "fed3fc13506e9ebb7525dba8aec15907faafe01f008bf7c8e5cbecace5c88d02" +
  "e4e300772ffb31504322ba93add0c2ee9cf1048c0fe8fa80";

function matrixHex(qr) {
  let hex = "";
  for (let i = 0; i < qr.modules.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | (qr.modules[i + j] || 0);
    hex += byte.toString(16).padStart(2, "0");
  }
  return hex;
}

describe("qrEncode", () => {
  it("matches the reference-verified golden matrix for 'HELLO'", () => {
    const qr = qrEncode("HELLO");
    expect(qr.size).toBe(21); // version 1 → 17 + 4
    expect(qr.version).toBe(1);
    expect(qr.mask).toBe(4);
    expect(matrixHex(qr)).toBe(HELLO_HEX);
  });

  it("is deterministic", () => {
    const a = qrEncode("https://tirenify.app/");
    const b = qrEncode("https://tirenify.app/");
    expect(a.size).toBe(25);
    expect(a.version).toBe(2);
    expect(matrixHex(a)).toBe(matrixHex(b));
  });

  it("draws the three finder patterns and the dark module", () => {
    const qr = qrEncode("finder test");
    const at = (x, y) => qr.modules[y * qr.size + x];
    for (const [cx, cy] of [[3, 3], [qr.size - 4, 3], [3, qr.size - 4]]) {
      expect(at(cx, cy)).toBe(1); // centre dark
      expect(at(cx - 3, cy)).toBe(1); // outer ring dark
      expect(at(cx - 2, cy)).toBe(0); // inner ring light
    }
    expect(at(8, qr.size - 8)).toBe(1); // fixed dark module
  });

  it("scales with input length", () => {
    const short = qrEncode("a");
    const long = qrEncode("a".repeat(300));
    expect(long.size).toBeGreaterThan(short.size);
    expect(short.version).toBe(1);
    expect(long.version).toBeGreaterThanOrEqual(10); // 16-bit length field
  });

  it("handles UTF-8 text", () => {
    const qr = qrEncode("Safeyard ✓ ₦ ọlá");
    expect(qr.size).toBeGreaterThanOrEqual(21);
    expect(matrixHex(qr)).not.toBe("");
  });

  it("rejects empty and oversized input", () => {
    expect(() => qrEncode("")).toThrow(/text or a url/i);
    expect(() => qrEncode("x".repeat(QR_MAX_BYTES + 100))).toThrow(/too long/i);
    expect(QR_MAX_BYTES).toBe(666);
  });
});

describe("qrToSvgString", () => {
  it("emits a standalone SVG with quiet zone and dark modules", () => {
    const qr = qrEncode("https://tirenify.app/");
    const svg = qrToSvgString(qr, { quiet: 4, scale: 8 });
    const n = qr.size + 8;
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    expect(svg).toContain(`viewBox="0 0 ${n} ${n}"`);
    expect(svg).toContain(`width="${n * 8}"`);
    expect(svg).toContain('fill="#000000"');
    expect(svg).toContain("M4 4h1v1h-1z"); // first dark module in the grid
    expect(svg.endsWith("</svg>")).toBe(true);
  });
});
