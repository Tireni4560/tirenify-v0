import { useEffect, useState } from "react";
import type { ScanResult } from "./breach.functions";

const KEY = "tirenify:last-scan";
const EVT = "tirenify:scan";

export function saveScan(r: ScanResult) {
  localStorage.setItem(KEY, JSON.stringify(r));
  window.dispatchEvent(new Event(EVT));
}

export function useLastScan() {
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const read = () => {
      try { setScan(JSON.parse(localStorage.getItem(KEY) || "null")); } catch { setScan(null); }
      setReady(true);
    };
    read();
    window.addEventListener(EVT, read);
    return () => window.removeEventListener(EVT, read);
  }, []);
  return { scan, ready };
}

export function riskOf(scan: ScanResult | null) {
  if (!scan) return { score: null as number | null, level: "Unknown", tone: "muted" as const };
  const n = scan.breaches.length;
  const pw = scan.breaches.some((b) => b.dataClasses.some((d) => /password/i.test(d)));
  const score = Math.max(8, 100 - n * 9 - (pw ? 15 : 0));
  if (n === 0) return { score: 100, level: "Low risk", tone: "success" as const };
  if (score >= 70) return { score, level: "Moderate", tone: "warning" as const };
  return { score, level: "High risk", tone: "destructive" as const };
}

export function recommendations(scan: ScanResult | null) {
  const classes = new Set(scan?.breaches.flatMap((b) => b.dataClasses.map((d) => d.toLowerCase())) ?? []);
  const recs = [
    { title: "Turn on two-factor authentication", body: "Add 2FA to your email, banking and social accounts first.", priority: "High" },
    { title: "Use a password manager", body: "Generate a unique, strong password for every account.", priority: "High" },
  ];
  if ([...classes].some((c) => c.includes("password")))
    recs.unshift({ title: "Change exposed passwords now", body: "Your password appeared in a breach. Update it everywhere you reused it.", priority: "Critical" });
  if ([...classes].some((c) => c.includes("phone")))
    recs.push({ title: "Watch for SMS phishing", body: "Your phone number was exposed. Be wary of unexpected texts with links.", priority: "Medium" });
  recs.push({ title: "Be alert to phishing emails", body: "Breached emails attract targeted scams. Verify senders before clicking.", priority: "Medium" });
  return recs;
}
