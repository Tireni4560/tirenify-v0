// Breach Guard — the front door. Runs the check through POST /api/breach-check
// (our server calls XposedOrNot). The loading sequence mirrors the live site
// exactly (same messages, same 2×2.5s rotation + 2.5s floor).
import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader, Chip, LetterAvatar } from "../components/ui.jsx";
import { EmailOptIn } from "../components/email-optin.jsx";
import { checkBreach } from "../lib/breach-api.js";
import { pickLoadingSequence, wait, isValidEmail } from "../lib/loading-messages.js";
import { classifyDataType, SEVERITY_RANK } from "../lib/severity.js";
import { scoreBreachResult } from "../lib/risk.js";
import { saveBreachSummary, clearAllSafeyardData } from "../lib/device-storage.js";
import { DATA_SOURCE } from "../config/brand.js";

const PAGE_SIZE = 20;

const RISK_TONE = {
  Critical: "text-destructive",
  High: "text-warning",
  Medium: "text-warning",
  Low: "text-success",
  "None known": "text-success",
};

function formatRecords(n) {
  if (n === null || n === undefined) return null;
  try {
    return n.toLocaleString("en-US");
  } catch {
    return String(n);
  }
}

/** Breaches-per-year bar chart, inline SVG (no external images). */
function YearTimeline({ years }) {
  const entries = Object.entries(years || {}).sort(([a], [b]) => a.localeCompare(b));
  if (entries.length < 2) return null;
  const max = Math.max(...entries.map(([, c]) => c));
  const w = 640;
  const h = 120;
  const pad = 4;
  const bw = (w - pad * 2) / entries.length;
  return (
    <svg viewBox={`0 0 ${w} ${h + 24}`} className="w-full" role="img" aria-label="Breaches per year">
      {entries.map(([year, count], i) => {
        const bh = (count / max) * h;
        return (
          <g key={year}>
            <rect
              x={pad + i * bw + 1}
              y={h - bh}
              width={Math.max(2, bw - 2)}
              height={bh}
              rx="2"
              fill="var(--color-primary)"
              opacity="0.85"
            />
            {entries.length <= 12 || i % 2 === 0 ? (
              <text
                x={pad + i * bw + bw / 2}
                y={h + 16}
                textAnchor="middle"
                fontSize="10"
                fill="var(--color-muted-foreground)"
              >
                {year}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

/** Aggregate data types across all breaches with per-type breach counts. */
function aggregateDataTypes(breaches) {
  const map = new Map();
  for (const b of breaches) {
    for (const raw of b.dataTypes || []) {
      const c = classifyDataType(raw);
      const prev = map.get(c.name) || { ...c, count: 0 };
      prev.count += 1;
      map.set(c.name, prev);
    }
  }
  return [...map.values()].sort(
    (a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || b.count - a.count,
  );
}

/** First and latest breach dates as given (a year stays a year). */
function firstAndLatest(breaches) {
  const dated = breaches.filter((b) => b.date).sort((a, b) => a.date.localeCompare(b.date));
  if (!dated.length) return { first: null, latest: null };
  return { first: dated[0].date, latest: dated[dated.length - 1].date };
}

/** Truncated description with "read more". */
function BreachDescription({ text }) {
  const [open, setOpen] = useState(false);
  if (!text) return null;
  const long = text.length > 220;
  return (
    <p className="mt-2 text-sm text-muted-foreground">
      {open || !long ? text : `${text.slice(0, 220)}… `}
      {long && (
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="ml-1 font-medium text-primary hover:underline"
        >
          {open ? "Show less" : "read more"}
        </button>
      )}
    </p>
  );
}

const PASSWORD_RISK_LABEL = {
  plaintext: "Plaintext passwords",
  easytocrack: "Weakly protected passwords",
  hardtocrack: "Strongly hashed passwords",
  stronghash: "Strongly hashed passwords",
  unknown: "Password risk unknown",
};

const SORTS = {
  newest: (a, b) => (b.date || "").localeCompare(a.date || ""),
  biggest: (a, b) => (b.records || 0) - (a.records || 0),
  riskiest: (a, b) => {
    const rank = (x) =>
      Math.max(
        ...(x.dataTypes || []).map((d) => SEVERITY_RANK[classifyDataType(d).severity] ?? 0),
        x.passwordRisk === "plaintext" ? 3 : x.passwordRisk === "easytocrack" ? 2 : 0,
      );
    return rank(b) - rank(a);
  },
};

/** Specific "what to do" advice derived from what this breach exposed. */
function whatToDo(breach) {
  const chips = [...new Set(breach.dataTypes || [])];
  const parts = [];
  if (chips.some((raw) => /password/i.test(raw))) {
    parts.push("Change this password everywhere you reused it.");
  }
  if (breach.passwordRisk === "plaintext" || breach.passwordRisk === "easytocrack") {
    parts.push("Treat the exposed password as known to attackers — change it now.");
  }
  if (chips.some((raw) => /credit card|debit card|bank|routing|sort code|iban/i.test(raw))) {
    parts.push("Contact your bank and review recent statements for unknown transactions.");
  }
  if (chips.some((raw) => /security question|mother.?maiden|answer/i.test(raw))) {
    parts.push("Change any security-question answers you reused.");
  }
  parts.push(
    "Turn on two-factor authentication, and be wary of scam messages that quote your details.",
  );
  return parts.join(" ");
}
function BreachCard({ breach }) {
  const chips = [...new Set(breach.dataTypes || [])];
  const pw = PASSWORD_RISK_LABEL[breach.passwordRisk] || PASSWORD_RISK_LABEL.unknown;
  const records = formatRecords(breach.records);
  return (
    <li className="surface p-5">
      <div className="flex items-start gap-4">
        <LetterAvatar name={breach.name} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="font-semibold">{breach.name}</p>
            {breach.date && <p className="text-xs text-muted-foreground">{breach.date}</p>}
            {breach.verified && (
              <Chip
                className="border-success/30 bg-success/10 text-success"
                title="Verified by the data source"
              >
                Verified
              </Chip>
            )}
          </div>
          {breach.domain && <p className="mt-0.5 text-xs text-muted-foreground">{breach.domain}</p>}
          <BreachDescription text={breach.details} />
          {chips.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {chips.map((raw) => {
                const c = classifyDataType(raw);
                return (
                  <Chip key={raw} className={c.chip} title={c.explain}>
                    {c.name}
                  </Chip>
                );
              })}
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {records !== null && <span>{records} records exposed</span>}
            {breach.industry && <span>{breach.industry}</span>}
            <span>{pw}</span>
          </div>
          {breach.references?.length > 0 && (
            <p className="mt-2 text-xs">
              {breach.references.map((ref) => (
                <a
                  key={ref}
                  href={ref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mr-3 text-primary hover:underline"
                >
                  Source
                </a>
              ))}
            </p>
          )}
          <div className="mt-3 rounded-lg border border-border bg-background/40 p-3 text-sm">
            <p className="font-semibold">What to do</p>
            <p className="mt-1 text-muted-foreground">{whatToDo(breach)}</p>
          </div>
        </div>
      </div>
    </li>
  );
}

/** Combined prioritized action checklist. Local checkboxes only. */
function ActionPlan({ dataTypes, breaches }) {
  const [done, setDone] = useState({});
  const hasPassword = dataTypes.some((t) => /password/i.test(t.name));
  const hasBank = dataTypes.some((t) => /bank|card|financial/i.test(t.name));
  const hasId = dataTypes.some((t) => /government id/i.test(t.name));
  const hasPhone = dataTypes.some((t) => /phone/i.test(t.name));
  const items = [];
  items.push(
    hasPassword
      ? { id: "pw", text: "Change passwords on every account where you reused the exposed one." }
      : { id: "pw", text: "Make sure every account uses its own strong, unique password." },
  );
  items.push({ id: "2fa", text: "Turn on two-factor authentication, starting with your email." });
  if (hasBank) items.push({ id: "bank", text: "Call your bank and review recent statements." });
  if (hasId) items.push({ id: "id", text: "Watch for misuse of your ID number and report anything odd." });
  if (hasPhone) {
    items.push({ id: "phone", text: "Be alert for SMS scams, and protect your SIM with your network." });
  }
  items.push({
    id: "gen",
    text: "Generate a strong unique password with the password generator for a key account.",
  });
  if (breaches.length >= 3) {
    items.push({ id: "many", text: "Set a reminder to re-check in 6 months — you appear in many breaches." });
  }
  return (
    <div className="surface p-5">
      <p className="font-semibold">Your action plan</p>
      <ul className="mt-3 space-y-2">
        {items.map((it) => (
          <li key={it.id} className="flex items-start gap-3 text-sm">
            <input
              id={`plan-${it.id}`}
              type="checkbox"
              checked={!!done[it.id]}
              onChange={(e) => setDone((d) => ({ ...d, [it.id]: e.target.checked }))}
              className="mt-0.5 h-4 w-4 accent-[var(--color-primary)]"
            />
            <label
              htmlFor={`plan-${it.id}`}
              className={done[it.id] ? "text-muted-foreground line-through" : ""}
            >
              {it.text}
            </label>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">
        These checkboxes are kept only in this page. Nothing is uploaded.
      </p>
    </div>
  );
}


export default function BreachGuard() {
  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState("idle"); // idle | loading | done | error
  const [loadingMsg, setLoadingMsg] = useState("");
  const [error, setError] = useState(null); // {message, kind}
  const [result, setResult] = useState(null);
  const [checkedEmail, setCheckedEmail] = useState("");
  const [sort, setSort] = useState("newest");
  const [typeFilter, setTypeFilter] = useState("");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [showExplain, setShowExplain] = useState(false);
  const loadingTimer = useRef(null);

  useEffect(() => () => clearInterval(loadingTimer.current), []);

  const risk = useMemo(() => (result ? scoreBreachResult(result) : null), [result]);
  const dataTypes = useMemo(() => (result ? aggregateDataTypes(result.breaches) : []), [result]);
  const typeOptions = useMemo(() => dataTypes.map((t) => t.name), [dataTypes]);
  const dates = useMemo(
    () => (result ? firstAndLatest(result.breaches) : { first: null, latest: null }),
    [result],
  );

  const sorted = useMemo(() => {
    if (!result) return [];
    let list = [...result.breaches];
    if (typeFilter) {
      list = list.filter((b) =>
        (b.dataTypes || []).some((d) => classifyDataType(d).name === typeFilter),
      );
    }
    list.sort(SORTS[sort] || SORTS.newest);
    return list;
  }, [result, sort, typeFilter]);

  async function submit(e) {
    e.preventDefault();
    e.stopPropagation();
    const entered = email;

    if (!isValidEmail(entered)) {
      setPhase("error");
      setError({
        kind: "invalid_email",
        title: "Check the email",
        message: "That email doesn't look right. Please check it and try again.",
      });
      return;
    }

    setPhase("loading");
    setError(null);
    setResult(null);
    setVisible(PAGE_SIZE);
    setSort("newest");
    setTypeFilter("");

    // Same pacing as the live site: rotate 3 messages every 2.5s, then a
    // minimum 2.5s floor before rendering so the sequence always completes.
    const messages = pickLoadingSequence();
    setLoadingMsg(messages[0]);
    let idx = 0;
    clearInterval(loadingTimer.current);
    loadingTimer.current = setInterval(() => {
      idx = Math.min(idx + 1, messages.length - 1);
      setLoadingMsg(messages[idx]);
    }, 2500);

    const res = await checkBreach(entered);
    await wait(2500);
    clearInterval(loadingTimer.current);

    if (!res.ok) {
      setPhase("error");
      setError({ kind: res.error, title: res.title, message: res.message });
      return;
    }

    setResult(res.result);
    setCheckedEmail(entered.trim());
    setPhase("done");
    const dataTypesFlat = res.result.breaches.flatMap((b) => b.dataTypes || []);
    saveBreachSummary({
      email: entered.trim(),
      breachCount: res.result.breaches.length,
      dataTypes: dataTypesFlat,
      riskLevel: scoreBreachResult(res.result).level,
      checkedAt: res.result.checkedAt,
    });
  }

  function copySummary() {
    if (!result) return;
    const lines = [];
    lines.push(
      `Breach summary for ${checkedEmail} (checked ${new Date(result.checkedAt).toLocaleString()})`,
    );
    lines.push(`Risk level: ${risk.level} (score ${risk.score}/100)`);
    lines.push(`Found in ${result.breaches.length} breach${result.breaches.length === 1 ? "" : "es"}.`);
    if (dataTypes.length) {
      lines.push("");
      lines.push("Exposed data types:");
      for (const t of dataTypes) {
        lines.push(`- ${t.name} (in ${t.count} breach${t.count === 1 ? "" : "es"}) — ${t.explain}`);
      }
    }
    if (result.breaches.length) {
      lines.push("");
      lines.push("Breaches (newest first):");
      for (const b of [...result.breaches].sort(SORTS.newest)) {
        lines.push(`- ${b.name}${b.date ? ` (${b.date})` : ""}${b.domain ? ` — ${b.domain}` : ""}`);
      }
    }
    lines.push("");
    lines.push(`Generated by ${DATA_SOURCE.attribution}`);
    navigator.clipboard?.writeText(lines.join("\n")).catch(() => {});
  }


  return (
    <div>
      <PageHeader
        eyebrow="Breach Guard"
        title="Was your email in a data breach?"
        description="Enter your email to see which known breaches included it, when they happened, and what data was exposed. Nothing is stored, and we never log your email."
      />

      <form onSubmit={submit} className="surface mx-auto max-w-3xl p-5 sm:p-6" noValidate>
        <label htmlFor="breachEmail" className="block text-sm font-medium">
          Email address
        </label>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <input
            id="breachEmail"
            type="email"
            inputMode="email"
            autoComplete="email"
            maxLength={255}
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={phase === "loading"}
            className="h-12 w-full rounded-lg border border-input bg-background/60 px-4 outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={phase === "loading"}
            className="h-12 shrink-0 rounded-lg bg-brand px-6 text-sm font-semibold text-primary-foreground disabled:opacity-70"
          >
            {phase === "loading" ? "Checking…" : "Check for breaches"}
          </button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Free, no signup, nothing stored. Your email is only used to run the check.
        </p>
      </form>

      {/* Loading — skeleton using the preserved loading messages */}
      {phase === "loading" && (
        <div className="mt-8" role="status" aria-live="polite">
          <p className="text-sm text-primary">{loadingMsg}</p>
          <div className="mt-4 space-y-3">
            <div className="surface animate-pulse p-6">
              <div className="h-6 w-40 rounded bg-secondary/60" />
              <div className="mt-3 h-4 w-64 rounded bg-secondary/50" />
            </div>
            <div className="surface animate-pulse p-6">
              <div className="h-4 w-full rounded bg-secondary/40" />
              <div className="mt-2 h-4 w-2/3 rounded bg-secondary/40" />
            </div>
          </div>
        </div>
      )}

      {/* Error states — one friendly title + message per distinct error code. */}
      {phase === "error" && error && (
        <div
          className={`surface mt-6 p-5 ${
            error.kind === "rate_limited" ? "border-warning/40" : "border-destructive/40"
          }`}
          role="alert"
        >
          <p
            className={
              error.kind === "rate_limited"
                ? "font-semibold text-warning"
                : "font-semibold text-destructive"
            }
          >
            {error.title ||
              (error.kind === "rate_limited"
                ? "We're busy"
                : error.kind === "offline"
                  ? "You're offline"
                  : error.kind === "invalid_email"
                    ? "Check the email"
                    : "Something went wrong")}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
        </div>
      )}


      {/* Results */}
      {phase === "done" && result && (
        <div className="mt-8" aria-live="polite">
          <div className="surface mx-auto max-w-3xl p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="text-2xl font-semibold">
                {result.breaches.length === 0
                  ? "Good news: no breaches found"
                  : `Found in ${result.breaches.length} breach${result.breaches.length === 1 ? "" : "es"}`}
              </h2>
              {result.breaches.length > 0 && (
                <p className={`text-lg font-semibold ${RISK_TONE[risk.level] || ""}`}>
                  Risk: {risk.level}
                  <span className="ml-1 text-sm text-muted-foreground">({risk.score}/100)</span>
                </p>
              )}
            </div>

            {result.breaches.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                We didn't find this email in the breaches we can see. This isn't proof you were never
                exposed — some leaks are never made public. Keep using unique passwords and two-factor
                authentication as a habit.
              </p>
            ) : (
              <>
                <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                  {dates.first && <span>Earliest: {dates.first}</span>}
                  {dates.latest && <span>Most recent: {dates.latest}</span>}
                  {result.pastes.length > 0 && (
                    <span>
                      Also in {result.pastes.length} paste{result.pastes.length === 1 ? "" : "s"}
                    </span>
                  )}
                </div>

                {dataTypes.length > 0 && (
                  <div className="mt-5">
                    <h3 className="text-sm font-semibold">Data exposed about you</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {dataTypes.map((t) => {
                        const c = classifyDataType(t.name);
                        return (
                          <Chip key={t.name} className={c.chip} title={c.explain}>
                            {t.name}
                            <span className="ml-1 opacity-70">×{t.count}</span>
                          </Chip>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => setShowExplain((v) => !v)}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {showExplain ? "Hide how we calculated this" : "How we calculated this"}
                  </button>
                  {showExplain && (
                    <div className="mt-2 rounded-lg border border-border bg-background/40 p-3 text-sm">
                      {risk.factors.length === 0 ? (
                        <p className="text-muted-foreground">No risk factors were detected.</p>
                      ) : (
                        <ul className="space-y-1 text-muted-foreground">
                          {risk.factors.map((f, i) => (
                            <li key={i} className="flex justify-between gap-4">
                              <span>{f.label}</span>
                              <span className="shrink-0 tabular-nums">+{f.points}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      <p className="mt-2 text-xs text-muted-foreground">
                        We add up points for the sensitivity of the data exposed and how many breaches
                        included it, then cap the total at 100. This is a rough guide, not a guarantee.
                      </p>
                    </div>
                  )}
                </div>

                {Object.keys(result.years || {}).length > 1 && (
                  <div className="mt-5">
                    <h3 className="text-sm font-semibold">Breaches per year</h3>
                    <YearTimeline years={result.years} />
                  </div>
                )}
              </>
            )}
          </div>

          {result.breaches.length > 0 && (
            <>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between no-print">
                <div className="flex flex-wrap items-center gap-2">
                  <label htmlFor="sortBy" className="text-sm text-muted-foreground">
                    Sort
                  </label>
                  <select
                    id="sortBy"
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    className="h-9 rounded-lg border border-input bg-background/60 px-2 text-sm"
                  >
                    <option value="newest">Newest</option>
                    <option value="biggest">Biggest</option>
                    <option value="riskiest">Riskiest</option>
                  </select>
                  <label htmlFor="typeFilter" className="ml-2 text-sm text-muted-foreground">
                    Data type
                  </label>
                  <select
                    id="typeFilter"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="h-9 rounded-lg border border-input bg-background/60 px-2 text-sm"
                  >
                    <option value="">All</option>
                    {typeOptions.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={copySummary}
                    className="rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-secondary"
                  >
                    Copy summary
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-secondary"
                  >
                    Print / Save as PDF
                  </button>
                </div>
              </div>

              <h3 className="mt-6 text-lg font-semibold">
                Breaches ({sorted.length}
                {typeFilter ? ` matching ${typeFilter}` : ""})
              </h3>
              <ul className="mx-auto mt-3 max-w-3xl space-y-4">
                {sorted.slice(0, visible).map((b) => (
                  <BreachCard key={`${b.name}-${b.date || ""}`} breach={b} />
                ))}
              </ul>
              {visible < sorted.length && (
                <button
                  type="button"
                  onClick={() => setVisible((v) => v + PAGE_SIZE)}
                  className="mt-4 rounded-lg border border-input px-5 py-2 text-sm font-medium hover:bg-secondary no-print"
                >
                  Show more ({sorted.length - visible} more)
                </button>
              )}
            </>
          )}

          {result.breaches.length > 0 && (
            <div className="mt-8">
              <ActionPlan dataTypes={dataTypes} breaches={result.breaches} />
            </div>
          )}

          <p className="mt-6 text-xs text-muted-foreground">
            {DATA_SOURCE.attribution}. Results reflect publicly known breaches only.
          </p>
          <EmailOptIn checkedEmail={checkedEmail} />
          <div className="mt-4 no-print">
            <button
              type="button"
              onClick={() => clearAllSafeyardData()}
              className="text-xs text-muted-foreground underline hover:text-foreground"
            >
              Clear my data stored on this device
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

