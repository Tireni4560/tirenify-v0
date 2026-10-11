// QR Code Generator tool page — text/URL in, PNG/SVG out. Encoding happens in
// src/lib/qr-code.js (in-house, zero deps) directly in the browser; the input
// is never stored or sent. Registered under QR_PAGES (merged with TOOL_PAGES
// by the /tools/:slug route).
import { useEffect, useRef, useState } from "react";
import { ToolPage } from "./tool-page.jsx";
import { getTool } from "../content/tools.js";
import { qrEncode, qrToSvgString, QR_MAX_BYTES } from "../lib/qr-code.js";

const QUIET = 4;

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function QrCodeGeneratorPage() {
  const [text, setText] = useState("");
  const [qr, setQr] = useState(null);
  const [error, setError] = useState("");
  const canvasRef = useRef(null);

  // Draw the current QR onto the preview canvas (crisp, integer scale).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !qr) return;
    const scale = Math.max(4, Math.floor(560 / (qr.size + QUIET * 2)));
    const n = qr.size + QUIET * 2;
    canvas.width = n * scale;
    canvas.height = n * scale;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#000000";
    for (let y = 0; y < qr.size; y++) {
      for (let x = 0; x < qr.size; x++) {
        if (qr.modules[y * qr.size + x]) {
          ctx.fillRect((x + QUIET) * scale, (y + QUIET) * scale, scale, scale);
        }
      }
    }
  }, [qr]);

  const generate = () => {
    try {
      setQr(qrEncode(text));
      setError("");
    } catch (e) {
      setQr(null);
      setError(e.message);
    }
  };

  const savePng = () => {
    const canvas = canvasRef.current;
    if (!canvas || !qr) return;
    canvas.toBlob((blob) => blob && downloadBlob(blob, "qr-code.png"), "image/png");
  };

  const saveSvg = () => {
    if (!qr) return;
    downloadBlob(new Blob([qrToSvgString(qr, { quiet: QUIET, scale: 8 })], { type: "image/svg+xml" }), "qr-code.svg");
  };

  const form = (
    <>
      <label className="block text-sm font-medium" htmlFor="qr-input">
        Text or URL to encode
      </label>
      <textarea
        id="qr-input"
        rows={4}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="https://example.com or any text"
        spellCheck={false}
        className="mt-1 w-full rounded-lg border border-input bg-background/60 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
      <p className="mt-1.5 text-xs text-muted-foreground">
        {text.length} / {QR_MAX_BYTES} characters. Encoded in this page — nothing is uploaded.
      </p>
      <button
        type="button"
        onClick={generate}
        className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-primary-foreground"
      >
        Generate QR code
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </>
  );

  const result = qr ? (
    <div>
      <div className="flex justify-center">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`QR code for: ${text.slice(0, 60)}`}
          className="max-w-full rounded-lg border border-input bg-white p-2"
        />
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={savePng}
          className="inline-flex min-h-[44px] items-center rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-secondary"
        >
          Download PNG
        </button>
        <button
          type="button"
          onClick={saveSvg}
          className="inline-flex min-h-[44px] items-center rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-secondary"
        >
          Download SVG
        </button>
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Version {qr.version} · {qr.size}×{qr.size} modules · scan to test
      </p>
    </div>
  ) : null;

  return (
    <ToolPage
      tool={getTool("qr-code-generator")}
      form={form}
      result={result}
      resultEmpty={<p className="text-sm text-muted-foreground">Enter text or a URL and click “Generate QR code”.</p>}
      howItWorks={[
        "Your text is converted to bytes (UTF-8) and packed into the QR data area with error-correction codewords added.",
        "The matrix is masked and scored in the browser, then drawn pixel-by-pixel onto a canvas — no server, no library download at runtime.",
        "PNG export uses the canvas; SVG export writes plain rectangles, so it stays sharp at any print size.",
      ]}
      tips={[
        "Test-scan the code with your phone camera before printing or sharing it.",
        "Scanners show exactly the text you entered — a QR code adds no privacy by itself.",
        "Keep the white margin around the code; covering it makes many scanners fail.",
        "Never put a password or one-time code into a QR code you plan to share publicly.",
      ]}
      nextSteps={[{ to: "/tools", label: "See all tools" }]}
    />
  );
}

/** slug → page map (merged with TOOL_PAGES by routes/tool.jsx). */
export const QR_PAGES = {
  "qr-code-generator": QrCodeGeneratorPage,
};

export default QrCodeGeneratorPage;
