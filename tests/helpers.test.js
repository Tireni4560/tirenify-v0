import { describe, it, expect } from "vitest";
import {
  isValidEmail,
  emailError,
  parseUrlLoose,
  urlError,
  inRange,
  fileSizeError,
  sniffMagicBytes,
} from "../src/lib/validators.js";
import { formatBytes, formatInt, formatDateShort, timeAgo, truncateMiddle } from "../src/lib/formatters.js";

describe("validators", () => {
  it("accepts good emails, rejects bad ones with specific messages", () => {
    expect(isValidEmail("a@b.co")).toBe(true);
    expect(isValidEmail("not-an-email")).toBe(false);
    expect(emailError("")).toMatch(/Enter an email/);
    expect(emailError("nope")).toMatch(/doesn’t look like/);
    expect(emailError("a@b.co")).toBe(null);
  });
  it("parses URLs with and without schemes", () => {
    expect(parseUrlLoose("example.com/path")?.hostname).toBe("example.com");
    expect(parseUrlLoose("https://x.ng")?.hostname).toBe("x.ng");
    expect(parseUrlLoose("   ")).toBe(null);
    expect(urlError("")).toMatch(/Enter a link/);
    expect(urlError("nota url!!")).toBeTruthy();
  });
  it("inRange validates numbers with messages", () => {
    expect(inRange("8", 4, 10)).toMatchObject({ ok: true, value: 8 });
    expect(inRange(99, 4, 10, "Length").reason).toMatch(/between 4 and 10/);
    expect(inRange("abc", 1, 5).ok).toBe(false);
  });
  it("fileSizeError flags empty and oversized files", () => {
    expect(fileSizeError({ size: 0 })).toMatch(/empty/);
    expect(fileSizeError({ size: 5 * 1024 * 1024 }, 1024)).toMatch(/too big/);
    expect(fileSizeError({ size: 10 }, 1024)).toBe(null);
  });
  it("sniffs magic bytes, not extensions", () => {
    expect(sniffMagicBytes(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("jpeg");
    expect(sniffMagicBytes(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("png");
    expect(
      sniffMagicBytes(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])),
    ).toBe("webp");
    expect(sniffMagicBytes(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]))).toBe("pdf");
    expect(sniffMagicBytes(new Uint8Array([1, 2, 3, 4]))).toBe(null);
    expect(sniffMagicBytes(new Uint8Array([1, 2]))).toBe(null);
  });
});

describe("formatters", () => {
  it("formats bytes, ints, dates, relative time, truncation", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(-1)).toBe("—");
    expect(formatInt(1234567)).toMatch(/1.234.567|1,234,567/);
    expect(formatDateShort("not-a-date")).toBe("—");
    expect(formatDateShort("2026-03-04T00:00:00Z")).toMatch(/2026/);
    expect(timeAgo(new Date(Date.now() - 1000).toISOString())).toBe("just now");
    expect(timeAgo(new Date(Date.now() - 3 * 86400000).toISOString())).toMatch(/3 days ago/);
    expect(truncateMiddle("abcdefghijklmnopqrstuvwxyz", 4, 3)).toBe("abcd…xyz");
    expect(truncateMiddle("short")).toBe("short");
  });
});
