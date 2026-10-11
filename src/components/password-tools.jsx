// Password & account tool pages — one component per registry slug, exported as
// TOOL_PAGES (slug -> page). Every page uses the shared ToolPage layout and the
// pure helpers in lib/password-tools.js. Rules: Web Crypto / in-house random
// only, zero network, never store raw passwords or typed input — results live
// in component state and disappear when you leave the page. Strength tools show
// SIGNALS (length, patterns, entropy estimates), never a verdict about you.
import { useState } from "react";
import { ToolPage } from "./tool-page.jsx";
import { getTool } from "../content/tools.js";
import { CopyButton } from "./ui-kit.jsx";
import { ChecklistEngine, GuideRenderer } from "./engines.jsx";
import { getItem, setItem } from "../lib/storage.js";
import {
  generatePassword,
  generatePins,
  generatePassphrases,
  generateUsernames,
  generateSecurityAnswers,
  makePlusAlias,
  makeDotAlias,
  makeNicknameAlias,
  classifyPasswordSignals,
  estimateEntropy,
  crackTimeSeconds,
  checkPasswordReuse,
} from "../lib/password-tools.js";

const BTN = "inline-flex min-h-[44px] items-center justify-center rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60";
const INPUT = "mt-1 w-full rounded-lg border border-input bg-background/60 px-4 text-sm outline-none focus:ring-2 focus:ring-ring";
const ROW = "surface p-3 flex items-center gap-2";
const CODE = "flex-1 break-all font-mono text-sm";
const HINT = "text-sm text-muted-foreground";

/** Thin wrapper: resolves the registry entry and passes layout props through. */
function Page({ slug, form, result, resultEmpty, howItWorks, tips, nextSteps, actions }) {
  return (
    <ToolPage
      tool={getTool(slug)}
      form={form}
      result={result}
      resultEmpty={resultEmpty}
      howItWorks={howItWorks}
      tips={tips}
      nextSteps={nextSteps}
      actions={actions}
    />
  );
}

function CopyList({ items }) {
  return (
    <ul className="space-y-2">
      {items.map((v, i) => (
        <li key={i} className={ROW}>
          <code className={CODE}>{v}</code>
          <CopyButton text={v} />
        </li>
      ))}
    </ul>
  );
}

/** Human-readable crack-time label from an entropy estimate (signals only). */
function crackTimeLabel(bits, speed) {
  const sec = crackTimeSeconds(bits, speed);
  if (sec == null) return "—";
  if (sec < 1) return "< 1s";
  if (sec < 60) return `${Math.round(sec)}s`;
  const mins = Math.round(sec / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.round(hrs / 24);
  if (days < 365) return `${days}d`;
  const years = days / 365;
  if (years < 1000) return `${years < 10 ? years.toFixed(1) : Math.round(years)} years`;
  return "centuries+";
}

// ── Password generator ─────────────────────────────────────────────────────

function PasswordGeneratorPage() {
  const [length, setLength] = useState(16);
  const [classes, setClasses] = useState({ lower: true, upper: true, digit: true, symbol: true });
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  const generate = () => {
    try {
      setValue(
        generatePassword({
          length,
          useLower: classes.lower,
          useUpper: classes.upper,
          useDigits: classes.digit,
          useSymbols: classes.symbol,
        }),
      );
      setError("");
    } catch (e) {
      setError(e.message);
    }
  };

  const form = (
    <>
      <label className="block text-sm font-medium">
        Length: <span className="tabular-nums">{length}</span>
        <input
          type="range"
          min={8}
          max={64}
          value={length}
          onChange={(e) => setLength(Number(e.target.value))}
          className="mt-2 w-full"
          aria-label="Password length"
        />
      </label>
      <fieldset className="mt-4">
        <legend className="text-sm font-medium">Character classes</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {[
            ["lower", "a–z"],
            ["upper", "A–Z"],
            ["digit", "0–9"],
            ["symbol", "!@#…"],
          ].map(([key, label]) => (
            <label key={key} className="flex min-h-[44px] items-center gap-2 rounded-lg border border-input px-3 text-sm">
              <input
                type="checkbox"
                checked={classes[key]}
                onChange={(e) => setClasses((c) => ({ ...c, [key]: e.target.checked }))}
                className="h-4 w-4 accent-[var(--color-primary)]"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <button type="button" onClick={generate} className={`${BTN} mt-4 w-full`}>
        Generate password
      </button>
      {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
    </>
  );

  const result = value ? (
    <div>
      <p className={ROW}>
        <code className={CODE}>{value}</code>
        <CopyButton text={value} />
      </p>
      <p className="mt-3 text-xs text-muted-foreground">
        Generated in this browser with secure randomness. It was never sent anywhere — store it in a
        password manager, then clear it here.
      </p>
    </div>
  ) : null;

  return (
    <Page
      slug="password-generator"
      form={form}
      result={result}
      resultEmpty={<p className={HINT}>Click “Generate password” — your password appears here.</p>}
      howItWorks={[
        "Your browser's secure random number generator (Web Crypto) picks each character.",
        "Ambiguous look-alikes (I, l, 1, O, 0) are removed by default so you can read what you typed.",
        "Nothing is transmitted: the generator runs entirely in this page.",
      ]}
      tips={[
        "16+ characters with all four classes is a safe default for most accounts.",
        "Longer beats clever — length matters more than symbols.",
        "Store generated passwords in a password manager, not in a note on your phone.",
      ]}
      nextSteps={[{ to: "/tools/password-strength", label: "Check a password's signals" }]}
      actions={{ copyText: value }}
    />
  );
}

// ── Password strength checker ──────────────────────────────────────────────

function PasswordStrengthPage() {
  const [value, setValue] = useState("");
  const signals = value ? classifyPasswordSignals(value) : null;
  const bits = signals ? estimateEntropy(value) : 0;

  const form = (
    <>
      <label className="block text-sm font-medium" htmlFor="strength-input">
        Password to inspect
      </label>
      <input
        id="strength-input"
        type="password"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Type or paste a password"
        autoComplete="off"
        spellCheck={false}
        className={INPUT}
      />
      <p className="mt-2 text-xs text-muted-foreground">
        Analyzed in this page as you type. Nothing is stored, nothing is sent — close the tab and it's gone.
      </p>
      {value && (
        <button type="button" onClick={() => setValue("")} className="mt-3 text-sm text-muted-foreground hover:underline">
          Clear
        </button>
      )}
    </>
  );

  const result = signals ? (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium">Signals</p>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Length: {signals.length} characters {signals.length < 12 && "(under 12)"}</li>
          <li>Character classes used: {signals.classCount}/4</li>
          <li>Character pool ≈ {signals.charsetSize} symbols → ~{bits} bits of entropy (rough estimate)</li>
          <li>Repeated characters: {signals.repeated.length ? signals.repeated.join(", ") : "none"}</li>
          <li>Doubled characters: {signals.doubled.length ? signals.doubled.join(", ") : "none"}</li>
          {signals.runs.length > 0 && <li>Keyboard runs: {signals.runs.map((r) => r.text).join(", ")}</li>}
        </ul>
      </div>
      <div>
        <p className="text-sm font-medium">What to improve</p>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {signals.length < 12 && <li>Use at least 12 characters — 16+ is better.</li>}
          {signals.classCount < 4 && <li>Mix lowercase, uppercase, digits and symbols.</li>}
          {signals.repeated.length > 0 && <li>Avoid runs like aaa or 111 — attackers try them first.</li>}
          {signals.runs.length > 0 && <li>Avoid keyboard runs such as abc, 123 or qwerty.</li>}
          {signals.length >= 12 && signals.classCount === 4 && signals.repeated.length === 0 && signals.runs.length === 0 && (
            <li>No obvious pattern problems found — length is doing the heavy work here.</li>
          )}
        </ul>
      </div>
    </div>
  ) : null;

  return (
    <Page
      slug="password-strength"
      form={form}
      result={result}
      resultEmpty={<p className={HINT}>Type a password — signals and improvement hints appear here.</p>}
      howItWorks={[
        "We measure length, count character classes, and scan for repeated characters and keyboard runs (abc, 123, qwerty).",
        "Entropy is estimated as length × log2(character pool) — a standard rough formula, not a measure of real-world attack time.",
        "Everything runs in this page; the value never leaves your device and is never stored.",
      ]}
      tips={[
        "Treat these as signals, not a verdict — a short random password and a long passphrase behave differently.",
        "If a site allows it, a 4-word passphrase often beats a 12-character scramble.",
        "Never reuse a password you check here on a second account.",
      ]}
      nextSteps={[
        { to: "/tools/password-generator", label: "Generate a strong password" },
        { to: "/tools/password-reuse-checker", label: "Check for reuse" },
      ]}
    />
  );
}

// ── Username generator ─────────────────────────────────────────────────────

function UsernameGeneratorPage() {
  const [count, setCount] = useState(5);
  const [withNum, setWithNum] = useState(true);
  const [withSym, setWithSym] = useState(false);
  const [list, setList] = useState([]);
  const [error, setError] = useState("");

  const generate = () => {
    try {
      setList(generateUsernames({ count, withNumber: withNum, withSymbol: withSym }));
      setError("");
    } catch (e) {
      setError(e.message);
    }
  };

  const form = (
    <>
      <label className="block text-sm font-medium">
        How many: <span className="tabular-nums">{count}</span>
        <input
          type="range"
          min={1}
          max={20}
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          className="mt-2 w-full"
          aria-label="Number of usernames"
        />
      </label>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="flex min-h-[44px] items-center gap-2 rounded-lg border border-input px-3 text-sm">
          <input type="checkbox" checked={withNum} onChange={(e) => setWithNum(e.target.checked)} className="h-4 w-4 accent-[var(--color-primary)]" />
          Add 2-digit number
        </label>
        <label className="flex min-h-[44px] items-center gap-2 rounded-lg border border-input px-3 text-sm">
          <input type="checkbox" checked={withSym} onChange={(e) => setWithSym(e.target.checked)} className="h-4 w-4 accent-[var(--color-primary)]" />
          Add a symbol
        </label>
      </div>
      <button type="button" onClick={generate} className={`${BTN} mt-4 w-full`}>
        Generate usernames
      </button>
      {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
    </>
  );

  return (
    <Page
      slug="username-generator"
      form={form}
      result={list.length ? <CopyList items={list} /> : null}
      resultEmpty={<p className={HINT}>Click “Generate usernames” — suggestions appear here.</p>}
      howItWorks={[
        "Two random word lists (adjectives and nouns) are combined with secure randomness.",
        "An optional number or symbol makes collisions with existing accounts less likely.",
        "Nothing is saved: usernames exist only until you leave this page.",
      ]}
      tips={[
        "Keep your real name out of usernames — it makes you easy to find across sites.",
        "Reuse the same alias on sites where you don't mind being linked; use fresh ones where you do.",
        "If a username is for a throwaway account, avoid anything you'd want associated with your main identity.",
      ]}
      nextSteps={[{ to: "/tools/email-alias-generator", label: "Build an email alias" }]}
    />
  );
}

// ── Email alias generator ──────────────────────────────────────────────────

function EmailAliasPage() {
  const [email, setEmail] = useState("");
  const [method, setMethod] = useState("plus");
  const [tag, setTag] = useState("newsletter");
  const [aliases, setAliases] = useState([]);
  const [error, setError] = useState("");

  const build = () => {
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setError("Enter a full email address, e.g. you@example.com.");
      setAliases([]);
      return;
    }
    setError("");
    if (method === "plus") setAliases([makePlusAlias(value, tag.trim() || "mail")]);
    else if (method === "dot") setAliases([makeDotAlias(value), makeDotAlias(value, 2)]);
    else setAliases([makeNicknameAlias(value, "safer"), makeNicknameAlias(value, "shop")]);
  };

  const form = (
    <>
      <label className="block text-sm font-medium" htmlFor="alias-email">
        Your email address
      </label>
      <input
        id="alias-email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        autoComplete="off"
        className={INPUT}
      />
      <label className="mt-4 block text-sm font-medium" htmlFor="alias-method">
        Alias style
      </label>
      <select
        id="alias-method"
        value={method}
        onChange={(e) => setMethod(e.target.value)}
        className={INPUT}
      >
        <option value="plus">Plus addressing (you+tag@…)</option>
        <option value="dot">Dot variant (y.o.u@…)</option>
        <option value="nick">Nickname swap (safer@…)</option>
      </select>
      {method === "plus" && (
        <>
          <label className="mt-4 block text-sm font-medium" htmlFor="alias-tag">
            Tag
          </label>
          <input
            id="alias-tag"
            type="text"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            placeholder="newsletter"
            className={INPUT}
          />
        </>
      )}
      <button type="button" onClick={build} className={`${BTN} mt-4 w-full`}>
        Build alias
      </button>
      {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
    </>
  );

  return (
    <Page
      slug="email-alias-generator"
      form={form}
      result={aliases.length ? <CopyList items={aliases} /> : null}
      resultEmpty={<p className={HINT}>Enter your address and click “Build alias”.</p>}
      howItWorks={[
        "Plus addressing appends +tag before the @ — most providers deliver it to the same inbox and you can filter on it.",
        "Dot variants and nicknames only work where the provider ignores dots or allows aliases; Gmail ignores dots in the local part.",
        "Nothing is sent anywhere: the alias is assembled in this page with plain string handling.",
      ]}
      tips={[
        "Give each site a unique tag so a leak tells you who sold your address.",
        "Aliases don't create a new mailbox — mail still arrives in your inbox.",
        "Some sign-up forms reject '+' — keep a dot or nickname variant ready.",
      ]}
      nextSteps={[
        { to: "/tools/username-generator", label: "Generate a username" },
        { to: "/breach-guard", label: "Check a breach" },
      ]}
    />
  );
}

// ── Security answer generator ──────────────────────────────────────────────

function SecurityAnswerPage() {
  const [count, setCount] = useState(5);
  const [words, setWords] = useState(3);
  const [list, setList] = useState([]);
  const [error, setError] = useState("");

  const generate = () => {
    try {
      setList(generateSecurityAnswers({ count, words }));
      setError("");
    } catch (e) {
      setError(e.message);
    }
  };

  const form = (
    <>
      <label className="block text-sm font-medium">
        How many answers: <span className="tabular-nums">{count}</span>
        <input
          type="range"
          min={1}
          max={10}
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          className="mt-2 w-full"
          aria-label="Number of answers"
        />
      </label>
      <label className="mt-4 block text-sm font-medium">
        Words per answer: <span className="tabular-nums">{words}</span>
        <input
          type="range"
          min={2}
          max={5}
          value={words}
          onChange={(e) => setWords(Number(e.target.value))}
          className="mt-2 w-full"
          aria-label="Words per answer"
        />
      </label>
      <button type="button" onClick={generate} className={`${BTN} mt-4 w-full`}>
        Generate answers
      </button>
      {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
    </>
  );

  return (
    <Page
      slug="security-answer-generator"
      form={form}
      result={list.length ? <CopyList items={list} /> : null}
      resultEmpty={<p className={HINT}>Click “Generate answers” — fake answers appear here.</p>}
      howItWorks={[
        "Random words plus digits are combined with secure randomness — the answer is unrelated to you.",
        "You then store the answer in your password manager next to the account, so you can always look it up.",
        "No answer is saved by this page; generate again any time and update your manager.",
      ]}
      tips={[
        "Security questions ask for facts about you (mother's maiden name, first school) — those are guessable. Never use the real answer.",
        "Treat the generated answer like a password: unique per site, stored in your manager.",
        "Where a site lets you, prefer turning on two-factor authentication instead of relying on recovery questions.",
      ]}
      nextSteps={[{ to: "/tools/password-generator", label: "Generate a password" }]}
    />
  );
}

// ── PIN generator ──────────────────────────────────────────────────────────

function PinGeneratorPage() {
  const [length, setLength] = useState(4);
  const [count, setCount] = useState(5);
  const [avoidWeak, setAvoidWeak] = useState(true);
  const [list, setList] = useState([]);
  const [error, setError] = useState("");

  const generate = () => {
    try {
      setList(generatePins({ length, count, avoidWeak }));
      setError("");
    } catch (e) {
      setError(e.message);
    }
  };

  const form = (
    <>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-medium">
          Digits
          <select value={length} onChange={(e) => setLength(Number(e.target.value))} className={INPUT}>
            <option value={4}>4</option>
            <option value={5}>5</option>
            <option value={6}>6</option>
            <option value={8}>8</option>
          </select>
        </label>
        <label className="block text-sm font-medium">
          How many
          <select value={count} onChange={(e) => setCount(Number(e.target.value))} className={INPUT}>
            {[1, 3, 5, 10].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="mt-4 flex min-h-[44px] items-center gap-2 rounded-lg border border-input px-3 text-sm">
        <input
          type="checkbox"
          checked={avoidWeak}
          onChange={(e) => setAvoidWeak(e.target.checked)}
          className="h-4 w-4 accent-[var(--color-primary)]"
        />
        Avoid easy guesses (repeats, runs like 1234, years like 1985)
      </label>
      <button type="button" onClick={generate} className={`${BTN} mt-4 w-full`}>
        Generate PINs
      </button>
      {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
    </>
  );

  return (
    <Page
      slug="pin-generator"
      form={form}
      result={list.length ? <CopyList items={list} /> : null}
      resultEmpty={<p className={HINT}>Click “Generate PINs” — PINs appear here.</p>}
      howItWorks={[
        "Each digit comes from Web Crypto randomness, drawn one at a time.",
        "With “avoid easy guesses” on, candidates matching weak patterns are discarded and redrawn.",
        "Nothing is stored — treat any PIN you keep as sensitive and never reuse your real banking PIN.",
      ]}
      tips={[
        "A 4-digit PIN has only 10,000 combinations — longer PINs are dramatically harder to guess.",
        "Never use your birthday, address or a repeated digit as a PIN.",
        "Don't reuse your bank PIN on apps or devices.",
      ]}
      nextSteps={[{ to: "/tools/password-generator", label: "Generate a full password" }]}
    />
  );
}

// ── Passphrase generator ───────────────────────────────────────────────────

function PassphraseGeneratorPage() {
  const [wordCount, setWordCount] = useState(5);
  const [separator, setSeparator] = useState(" ");
  const [count, setCount] = useState(4);
  const [list, setList] = useState([]);
  const [error, setError] = useState("");

  const generate = () => {
    try {
      setList(generatePassphrases({ wordCount, separator, count }));
      setError("");
    } catch (e) {
      setError(e.message);
    }
  };

  const form = (
    <>
      <label className="block text-sm font-medium">
        Words: <span className="tabular-nums">{wordCount}</span>
        <input
          type="range"
          min={3}
          max={8}
          value={wordCount}
          onChange={(e) => setWordCount(Number(e.target.value))}
          className="mt-2 w-full"
          aria-label="Words per passphrase"
        />
      </label>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <label className="block text-sm font-medium">
          Separator
          <select value={separator} onChange={(e) => setSeparator(e.target.value)} className={INPUT}>
            <option value=" ">space</option>
            <option value="-">hyphen</option>
            <option value=".">dot</option>
          </select>
        </label>
        <label className="block text-sm font-medium">
          How many
          <select value={count} onChange={(e) => setCount(Number(e.target.value))} className={INPUT}>
            {[1, 3, 4, 6].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
      </div>
      <button type="button" onClick={generate} className={`${BTN} mt-4 w-full`}>
        Generate passphrases
      </button>
      {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
    </>
  );

  return (
    <Page
      slug="passphrase-generator"
      form={form}
      result={list.length ? <CopyList items={list} /> : null}
      resultEmpty={<p className={HINT}>Click “Generate passphrases” — phrases appear here.</p>}
      howItWorks={[
        "Words are picked at random from a built-in list of common, easy-to-spell words using Web Crypto randomness.",
        "Five random words give roughly the strength of a long random password — the length does the work.",
        "Everything runs locally; nothing about your passphrase leaves this page.",
      ]}
      tips={[
        "Passphrases shine where you must type the secret often — master passwords, Wi-Fi keys, phone unlocks.",
        "Don't invent your own phrase from a book quote or lyric — those are guessable.",
        "Store generated passphrases in a password manager.",
      ]}
      nextSteps={[{ to: "/tools/entropy-calculator", label: "Estimate its entropy" }]}
    />
  );
}

// ── Entropy calculator ─────────────────────────────────────────────────────

function EntropyCalculatorPage() {
  const [value, setValue] = useState("");
  const bits = value ? estimateEntropy(value) : 0;
  const signals = value ? classifyPasswordSignals(value) : null;

  const form = (
    <>
      <label className="block text-sm font-medium" htmlFor="entropy-input">
        Password or passphrase
      </label>
      <input
        id="entropy-input"
        type="password"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Type or paste a value"
        autoComplete="off"
        spellCheck={false}
        className={INPUT}
      />
      <p className="mt-2 text-xs text-muted-foreground">
        Calculated locally with a standard formula. Nothing is stored or sent.
      </p>
      {value && (
        <button type="button" onClick={() => setValue("")} className="mt-3 text-sm text-muted-foreground hover:underline">
          Clear
        </button>
      )}
    </>
  );

  const result = signals ? (
    <div className="space-y-4">
      <div className="surface p-4">
        <p className="text-sm text-muted-foreground">Estimated entropy</p>
        <p className="font-display text-3xl font-bold">~{bits} bits</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {signals.length} characters × log2(pool of ~{signals.charsetSize})
        </p>
      </div>
      <div>
        <p className="text-sm font-medium">Rough time to guess (attack on a fast hash)</p>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Slow online attempts (~100/sec): {crackTimeLabel(bits, "online")}</li>
          <li>Fast hash (~1 billion/sec): {crackTimeLabel(bits, "fastHash")}</li>
          <li>Deliberate slow hash (~10,000/sec): {crackTimeLabel(bits, "slowHash")}</li>
        </ul>
      </div>
    </div>
  ) : null;

  return (
    <Page
      slug="entropy-calculator"
      form={form}
      result={result}
      resultEmpty={<p className={HINT}>Enter a value — entropy and rough crack-time estimates appear here.</p>}
      howItWorks={[
        "Entropy (bits) ≈ length × log2(character pool size): how much uncertainty a perfect guesser faces.",
        "Crack times divide 2^bits by assumed guess rates. Real attacks vary hugely — reuse, dictionaries and breaches beat pure guessing.",
        "The estimate assumes every character was chosen randomly; a phrase like 'password1!' scores far worse in practice than its formula.",
      ]}
      tips={[
        "Around 60+ bits is a reasonable floor for important accounts; 80+ is comfortable.",
        "Doubling the bits squares the search space — small length increases matter a lot.",
        "This is arithmetic, not a security guarantee: how you pick the value matters as much as the number.",
      ]}
      nextSteps={[{ to: "/tools/password-strength", label: "See pattern signals" }]}
    />
  );
}

// ── Password reuse checker ─────────────────────────────────────────────────

function ReuseCheckerPage() {
  const [text, setText] = useState("");
  const [report, setReport] = useState(null);

  const check = () => setReport(checkPasswordReuse(text.split(/\r?\n/)));

  const clear = () => {
    setText("");
    setReport(null);
  };

  const form = (
    <>
      <label className="block text-sm font-medium" htmlFor="reuse-input">
        One password per line
      </label>
      <textarea
        id="reuse-input"
        rows={6}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"hunter2-secret\nanother-one\nhunter2-secret"}
        autoComplete="off"
        spellCheck={false}
        className="mt-1 w-full rounded-lg border border-input bg-background/60 px-4 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-ring"
      />
      <p className="mt-2 text-xs text-muted-foreground">
        Comparison happens in this page only. The values are never stored or sent — we only ever show
        line numbers, never the passwords themselves.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={check} className={BTN}>
          Compare in this browser
        </button>
        <button
          type="button"
          onClick={clear}
          className="inline-flex min-h-[44px] items-center rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-secondary"
        >
          Clear
        </button>
      </div>
    </>
  );

  const result = report ? (
    <div className="space-y-3">
      <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        <li>Lines pasted: {report.total}</li>
        <li>Unique passwords: {report.pastedUnique}</li>
        <li>Repeated: {report.duplicates} (in {report.duplicateGroups} matching group{report.duplicateGroups === 1 ? "" : "s"})</li>
      </ul>
      {report.groups.length > 0 ? (
        <div>
          <p className="text-sm font-medium">Reused on these lines</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {report.groups.map((idxs, i) => (
              <li key={i}>Line{idxs.length > 1 ? "s" : ""} {idxs.join(", ")}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No repeats among the lines you pasted — each one appears once.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Clear the box when you're done so the values leave the page.
      </p>
    </div>
  ) : null;

  return (
    <Page
      slug="password-reuse-checker"
      form={form}
      result={result}
      resultEmpty={<p className={HINT}>Paste a few passwords (one per line) and compare — in this browser only.</p>}
      howItWorks={[
        "Each pasted line is compared with the others for an exact match, in memory in this page.",
        "Results show counts and line numbers only — the passwords themselves are never written anywhere.",
        "Nothing is transmitted and nothing persists after you leave the page.",
      ]}
      tips={[
        "Any repeat you find should be replaced: one leaked site then unlocks all of them.",
        "Reusing a strong password is still reuse — attackers replay credentials across sites.",
        "A password manager is the easiest way to keep every site unique.",
      ]}
      nextSteps={[
        { to: "/tools/password-generator", label: "Generate replacements" },
        { to: "/tools/leak-safety-guide", label: "What to do after a leak" },
      ]}
    />
  );
}

// ── Leak safety guide ──────────────────────────────────────────────────────

const LEAK_DOC = {
  blocks: [
    {
      h: "First 15 minutes: change the password that leaked",
      p: "Start with the account named in the breach. If you still have access, change the password from a device you trust. If you are locked out, use the provider's official account-recovery page — type the address yourself, never follow a link from a message.",
      steps: [
        "Open the site directly (type the address or use your bookmark).",
        "Change the password to something new and unique — generate one here if needed.",
        "Sign out all other sessions if the service offers it.",
      ],
    },
    {
      h: "Then fix every account that reused it",
      p: "A leaked password is most dangerous where it was reused. One breach can unlock your email, social and banking accounts at once.",
      steps: [
        "List the accounts where you reused the password (the reuse checker helps).",
        "Change each one to a unique password, ideally with two-factor authentication on.",
        "Change the password on your email FIRST if it was reused anywhere — email is the key to every other reset link.",
      ],
      help: "if you cannot access your email anymore, stop and go straight to the provider's recovery page before changing other accounts.",
    },
    {
      h: "Turn on two-factor authentication (2FA)",
      p: "2FA means a stolen password alone is not enough. An authenticator app or security key is stronger than SMS, but SMS is still far better than nothing.",
      steps: [
        "Enable 2FA on your email first, then banking and messaging apps.",
        "Prefer an authenticator app or passkey where offered.",
        "Store backup codes in your password manager.",
      ],
      avoid: ["Never share a one-time code (OTP) with anyone — no legitimate company will ever ask for it."],
    },
    {
      h: "Watch for what comes next",
      p: "After a breach, phishing messages get smarter: they quote your real password or breach details to look convincing.",
      steps: [
        "Be suspicious of any message that quotes your old password.",
        "Never log in from a link in a message — type the address yourself.",
        "Check where recovery email and phone number were changed, and undo anything you didn't do.",
      ],
    },
  ],
};

const LEAK_CHECKLIST = [
  { id: "pw-affected", title: "Changed the password on the affected account", hint: "From a trusted device, via the real site." },
  { id: "pw-reused", title: "Changed the password everywhere it was reused", hint: "Email first — it resets everything else." },
  { id: "reuse-scan", title: "Found reuse candidates with the Password Reuse Checker", hint: "Runs entirely in your browser." },
  { id: "2fa", title: "Turned on two-factor authentication", hint: "Email and banking first." },
  { id: "sessions", title: "Signed out other sessions / reviewed connected apps", hint: "Most account settings pages list them." },
  { id: "recovery", title: "Checked recovery email and phone number", hint: "Attackers change these to lock you out." },
  { id: "breach-check", title: "Ran Breach Guard to see the full picture", hint: "Which breaches, when, what was exposed." },
  { id: "phishing", title: "Know that phishing will follow", hint: "Messages quoting your old password are bait." },
];

function LeakSafetyGuidePage() {
  const [checks, setChecks] = useState(() => {
    const all = getItem("checklists") || {};
    return all["leak-safety-guide"] || {};
  });

  const update = (next) => {
    setChecks(next);
    const all = getItem("checklists") || {};
    all["leak-safety-guide"] = next;
    setItem("checklists", all);
  };

  const form = (
    <div>
      <h2 className="text-base font-semibold">First 15 minutes, then the rest</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Work top to bottom. Tick items as you go — progress is stored on this device only
        (no passwords, no email addresses, just these ticks).
      </p>
      <div className="mt-4">
        <ChecklistEngine items={LEAK_CHECKLIST} value={checks} onChange={update} />
      </div>
    </div>
  );

  const result = (
    <div className="space-y-4">
      <GuideRenderer doc={LEAK_DOC} />
      <div className="surface p-4">
        <p className="text-sm font-medium">Progress</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {Object.values(checks).filter(Boolean).length} of {LEAK_CHECKLIST.length} steps done.
        </p>
      </div>
    </div>
  );

  return (
    <Page
      slug="leak-safety-guide"
      form={form}
      result={result}
      howItWorks={[
        "This guide is plain text built into the app — it loads and works with no connection.",
        "Checklist ticks are saved under one device-storage key (safeyard:checklists) and cleared with “clear my data”.",
        "No step here asks you to type a password or email into the page.",
      ]}
      tips={[
        "Change the leaked password first, everywhere it was reused second, 2FA third.",
        "Never follow “your account was breached” links in messages — go to the site yourself.",
        "If money or identity documents were exposed, check your bank's and ID issuer's recovery flows too.",
      ]}
      nextSteps={[
        { to: "/breach-guard", label: "Run Breach Guard" },
        { to: "/tools/password-generator", label: "Generate replacement passwords" },
      ]}
    />
  );
}

/** slug -> page component. Every registry tool must have an entry here. */
export const TOOL_PAGES = {
  "password-generator": PasswordGeneratorPage,
  "password-strength": PasswordStrengthPage,
  "username-generator": UsernameGeneratorPage,
  "email-alias-generator": EmailAliasPage,
  "security-answer-generator": SecurityAnswerPage,
  "pin-generator": PinGeneratorPage,
  "passphrase-generator": PassphraseGeneratorPage,
  "entropy-calculator": EntropyCalculatorPage,
  "password-reuse-checker": ReuseCheckerPage,
  "leak-safety-guide": LeakSafetyGuidePage,
};

export default TOOL_PAGES;
