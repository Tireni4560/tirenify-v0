import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type Breach = {
  name: string;
  domain: string;
  date: string;
  dataClasses: string[];
  industry: string;
  passwordRisk: string;
  description: string;
};

export type ScanResult = { email: string; checkedAt: string; breaches: Breach[] };

export const checkEmail = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ email: z.string().trim().email().max(255) }).parse(d))
  .handler(async ({ data }): Promise<ScanResult> => {
    const res = await fetch(
      `https://api.xposedornot.com/v1/breach-analytics?email=${encodeURIComponent(data.email)}`,
      { headers: { Accept: "application/json" } },
    );
    if (res.status === 404) return { email: data.email, checkedAt: new Date().toISOString(), breaches: [] };
    if (!res.ok) throw new Error("The breach database is unavailable right now. Please try again shortly.");
    const json: any = await res.json().catch(() => null);
    const details: any[] = json?.ExposedBreaches?.breaches_details ?? [];
    const breaches: Breach[] = details.map((b) => ({
      name: String(b.breach ?? "Unknown"),
      domain: String(b.domain ?? ""),
      date: String(b.xposed_date ?? ""),
      dataClasses: String(b.xposed_data ?? "").split(";").map((s) => s.trim()).filter(Boolean),
      industry: String(b.industry ?? ""),
      passwordRisk: String(b.password_risk ?? ""),
      description: String(b.details ?? "").replace(/<[^>]*>/g, ""),
    }));
    return { email: data.email, checkedAt: new Date().toISOString(), breaches };
  });
