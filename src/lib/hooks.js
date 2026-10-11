// Shared React helpers: useLocalState, useDebounce, useClipboard, useOnlineStatus,
// useWorker, usePageMeta. All degrade gracefully (private mode, unsupported APIs).
import { useCallback, useEffect, useRef, useState } from "react";
import { getItem, setItem, storageStatus } from "./storage.js";
import { applyHead } from "./head.js";

/**
 * State persisted to on-device storage. Falls back to in-memory when storage
 * is blocked. Returns [value, setValue, persisted:boolean].
 */
export function useLocalState(key, initial) {
  const [value, setValueState] = useState(() => {
    const stored = getItem(key, undefined);
    return stored === undefined ? initial : stored;
  });
  const [persisted, setPersisted] = useState(() => storageStatus() === "ok");
  const setValue = useCallback(
    (next) => {
      setValueState((prev) => {
        const v = typeof next === "function" ? next(prev) : next;
        setPersisted(setItem(key, v));
        return v;
      });
    },
    [key],
  );
  return [value, setValue, persisted];
}

/** Debounce a fast-changing value (e.g. search input). */
export function useDebounce(value, delayMs = 200) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

/**
 * Clipboard with textarea fallback. Returns {copy, copied, supported}.
 * `copied` flips true briefly for aria-live feedback; callers announce it.
 */
export function useClipboard(resetMs = 2000) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = useCallback(
    async (text) => {
      const s = String(text ?? "");
      let ok = false;
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(s);
          ok = true;
        }
      } catch {
        ok = false;
      }
      if (!ok) {
        try {
          const ta = document.createElement("textarea");
          ta.value = s;
          ta.setAttribute("readonly", "");
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.select();
          ok = document.execCommand("copy");
          document.body.removeChild(ta);
        } catch {
          ok = false;
        }
      }
      if (ok) {
        setCopied(true);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), resetMs);
      }
      return ok;
    },
    [resetMs],
  );
  const supported =
    typeof navigator !== "undefined" && (!!navigator.clipboard || typeof document?.execCommand === "function");
  return { copy, copied, supported };
}

/**
 * Set this route's title/description/OG tags (client-side navigation).
 * Every lazy route chunk calls this once with its registry/route entry.
 */
export function usePageMeta({ title, description, path }) {
  useEffect(() => {
    applyHead({ title, description, path });
  }, [title, description, path]);
}

/**
 * Run heavy work in a Web Worker built from an inline function.
 * `workerFn` receives (input, postProgress) and returns/throws the result.
 * Returns {run, cancel, running, progress, error, supported}.
 */
export function useWorker(workerFn) {
  const workerRef = useRef(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const supported = typeof window !== "undefined" && typeof window.Worker !== "undefined";

  const cancel = useCallback(() => {
    try {
      workerRef.current?.terminate();
    } catch {
      /* ignore */
    }
    workerRef.current = null;
    setRunning(false);
  }, []);

  useEffect(() => cancel, [cancel]);

  const run = useCallback(
    (input) =>
      new Promise((resolve, reject) => {
        if (!supported) {
          reject(new Error("Web Workers are not supported in this browser."));
          return;
        }
        cancel();
        setRunning(true);
        setProgress(null);
        setError(null);
        let url = null;
        const finish = (w) => {
          setRunning(false);
          try {
            w.terminate();
          } catch {
            /* ignore */
          }
          workerRef.current = null;
          if (url) URL.revokeObjectURL(url);
        };
        try {
          const src = `onmessage=async(e)=>{try{const r=await(${workerFn.toString()})(e.data,(p)=>postMessage({__progress:p}));postMessage({__done:r})}catch(err){postMessage({__error:String(err&&(err.message||err))})}}`;
          url = URL.createObjectURL(new Blob([src], { type: "text/javascript" }));
          const w = new Worker(url);
          workerRef.current = w;
          w.onmessage = (e) => {
            const m = e.data;
            if (m && typeof m === "object" && "__progress" in m) {
              setProgress(m.__progress);
              return;
            }
            if (m && typeof m === "object" && "__error" in m) {
              const err = new Error(m.__error);
              setError(err);
              finish(w);
              reject(err);
              return;
            }
            finish(w);
            resolve(m && typeof m === "object" && "__done" in m ? m.__done : m);
          };
          w.onerror = (ev) => {
            const err = new Error(ev.message || "Worker failed.");
            setError(err);
            finish(w);
            reject(err);
          };
          w.postMessage(input);
        } catch (err) {
          if (url) URL.revokeObjectURL(url);
          setRunning(false);
          setError(err);
          reject(err);
        }
      }),
    [cancel, supported, workerFn],
  );

  return { run, cancel, running, progress, error, supported };
}
