// Shared Tirenify logo mark.
//
// Picks the dark/light variant from the app's ACTIVE theme — the `dark` /
// `light` class on <html> — never from `prefers-color-scheme`. The class is
// read synchronously during the first render (the source shell already has
// `<html class="dark">`), so the correct variant paints immediately: no flash
// on load, no layout shift. A future theme toggle only needs to flip the
// class; this component follows it.
//
// Served from our own origin as <img> with explicit width/height, sized by
// height inside the existing box. Intrinsic ratios come from the supplied SVG
// viewBoxes (never stretched). alt="Tirenify" on the lockup (it contains the
// wordmark), alt="" on the symbol when it sits beside visible text.
import { useEffect, useState } from "react";

const BRAND = "/brand";

// Intrinsic aspect ratios from the supplied SVG viewBoxes.
const ASPECT = {
  horizontal: 448.21 / 98, // tirenify-logo-horizontal-*.svg  (min width 96px)
  symbol: 86 / 79,         // tirenify-symbol-*.svg            (min width 16px)
};

export function activeTheme() {
  if (typeof document === "undefined") return "dark";
  const el = document.documentElement;
  if (el.classList.contains("light")) return "light";
  return "dark"; // app default
}

export function logoSrc({ variant = "horizontal", mono = false, theme = activeTheme() } = {}) {
  const dark = theme === "dark";
  if (variant === "symbol") {
    if (mono) return `${BRAND}/tirenify-symbol-mono-black.svg`;
    return dark ? `${BRAND}/tirenify-symbol-dark.svg` : `${BRAND}/tirenify-symbol-light.svg`;
  }
  if (mono) return `${BRAND}/tirenify-logo-horizontal-mono-black.svg`;
  return dark ? `${BRAND}/tirenify-logo-horizontal-dark.svg` : `${BRAND}/tirenify-logo-horizontal-light.svg`;
}

/** Exact width matching the intrinsic aspect for a given height (no stretch). */
export function logoWidthForHeight(height, variant = "horizontal") {
  return height * ASPECT[variant];
}

export default function TirenifyLogo({
  variant = "horizontal",
  height = 32,
  width,
  mono = false,
  className = "",
  alt,
  style,
  ...props
}) {
  // Initial state is read synchronously during the first render, so the correct
  // variant paints immediately (no flash, no layout shift). The observer below
  // keeps it in sync if the active-theme class is flipped later (a future
  // theme toggle) — the class is the single source of truth.
  const [theme, setTheme] = useState(() => activeTheme());
  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const el = document.documentElement;
    const observer = new MutationObserver(() => setTheme(activeTheme()));
    observer.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const src = logoSrc({ variant, mono, theme });
  // Tailwind's preflight sets `img { height: auto }`, so the browser would
  // re-derive the height from the (integer) width attribute and land on a
  // slightly-off box. Pinning both edges inline keeps the rendered box exactly
  // on the intrinsic aspect ratio, so the mark is never stretched.
  const exactWidth = width ?? logoWidthForHeight(height, variant);
  const defaultAlt = variant === "symbol" ? "" : "Tirenify";
  return (
    <img
      src={src}
      width={Math.round(exactWidth)}
      height={height}
      alt={alt === undefined ? defaultAlt : alt}
      className={`shrink-0 ${className}`.trim()}
      style={{ width: `${exactWidth}px`, height: `${height}px`, maxWidth: "100%", ...style }}
      {...props}
    />
  );
}
