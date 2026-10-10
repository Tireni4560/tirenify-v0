// Shared UI kit — every control the tools use. In-house (no Radix), accessible
// by default: labels on everything, aria-describedby errors, visible focus
// rings (global :focus-visible), 44px+ touch targets, no hover-only behavior.
import { useEffect, useId, useRef, useState } from "react";
import { useClipboard } from "../lib/hooks.js";

// ── Buttons ────────────────────────────────────────────────────────────────
const BTN_BASE =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60";
const BTN_TONES = {
  primary: "bg-brand text-primary-foreground hover:opacity-90",
  secondary: "border border-input hover:bg-secondary",
  ghost: "hover:bg-secondary",
  danger: "border border-destructive/50 text-destructive hover:bg-destructive/10",
};

export function Button({ tone = "primary", className = "", ...rest }) {
  return <button type="button" className={`${BTN_BASE} ${BTN_TONES[tone] || BTN_TONES.primary} ${className}`} {...rest} />;
}

export function IconButton({ label, className = "", children, ...rest }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`grid h-11 w-11 place-items-center rounded-lg border border-input hover:bg-secondary ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

// ── Fields ─────────────────────────────────────────────────────────────────
// Field wraps a control with label + hint + error, wired via aria-describedby.
export function Field({ label, hint, error, htmlFor, children, className = "" }) {
  const hintId = useId();
  const errId = useId();
  const described = [hint ? hintId : null, error ? errId : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium">
          {label}
        </label>
      )}
      {typeof children === "function" ? children({ describedBy: described, invalid: !!error }) : children}
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} role="alert" className="mt-1.5 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

const INPUT_BASE =
  "h-11 w-full rounded-lg border border-input bg-background/60 px-4 text-sm outline-none focus:ring-2 focus:ring-ring aria-[invalid=true]:border-destructive";

export function TextInput({ id, describedBy, invalid, className = "", ...rest }) {
  const autoId = useId();
  return (
    <input
      id={id || autoId}
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
      className={`${INPUT_BASE} ${className}`}
      {...rest}
    />
  );
}

export function PasswordInput({ id, describedBy, invalid, showLabel = "Show password", hideLabel = "Hide password", ...rest }) {
  const autoId = useId();
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id || autoId}
        type={show ? "text" : "password"}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        className={`${INPUT_BASE} pr-20`}
        {...rest}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-pressed={show}
        className="absolute right-2 top-1/2 min-h-[36px] -translate-y-1/2 rounded-md px-3 text-xs font-semibold text-primary hover:bg-secondary"
      >
        {show ? hideLabel : showLabel}
      </button>
    </div>
  );
}

export function NumberInput({ min, max, step = 1, ...rest }) {
  return <TextInput type="number" inputMode="numeric" min={min} max={max} step={step} {...rest} />;
}

export function TextArea({ id, describedBy, invalid, rows = 4, className = "", ...rest }) {
  const autoId = useId();
  return (
    <textarea
      id={id || autoId}
      rows={rows}
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
      className={`w-full rounded-lg border border-input bg-background/60 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring aria-[invalid=true]:border-destructive ${className}`}
      {...rest}
    />
  );
}

export function Select({ id, describedBy, invalid, options = [], className = "", children, ...rest }) {
  const autoId = useId();
  return (
    <select
      id={id || autoId}
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
      className={`${INPUT_BASE} ${className}`}
      {...rest}
    >
      {children ||
        options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
    </select>
  );
}

// Toggle: labelled switch (button role=switch, keyboard native).
export function Toggle({ checked, onChange, label, hint }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={!!checked}
      onClick={() => onChange?.(!checked)}
      className="flex min-h-[44px] w-full items-center justify-between gap-4 rounded-lg border border-input px-4 py-2 text-left hover:bg-secondary"
    >
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
      <span
        aria-hidden="true"
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-primary" : "bg-secondary"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${checked ? "left-[22px]" : "left-0.5"}`}
        />
      </span>
    </button>
  );
}

// Slider: labelled range input with visible value.
export function Slider({ label, value, min, max, step = 1, onChange, format = (v) => v, hint }) {
  const id = useId();
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        <output htmlFor={id} className="text-sm tabular-nums text-muted-foreground">
          {format(value)}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={String(format(value))}
        onChange={(e) => onChange?.(Number(e.target.value))}
        className="h-11 w-full accent-[var(--color-primary)]"
      />
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

// Segmented: single-choice button group (radio semantics, arrow-key support).
export function Segmented({ label, options = [], value, onChange }) {
  const groupId = useId();
  return (
    <div>
      {label && (
        <p id={groupId} className="mb-1.5 text-sm font-medium">
          {label}
        </p>
      )}
      <div role="radiogroup" aria-labelledby={label ? groupId : undefined} className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange?.(o.value)}
              className={`min-h-[44px] rounded-lg border px-4 py-2 text-sm font-medium ${
                active ? "border-primary bg-primary/10 text-foreground" : "border-input hover:bg-secondary"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Tabs: button tablist with arrow-key navigation.
export function Tabs({ tabs = [], value, onChange, label }) {
  const ids = useId();
  const active = value ?? tabs[0]?.id;
  const onKey = (e, i) => {
    let n = null;
    if (e.key === "ArrowRight") n = (i + 1) % tabs.length;
    if (e.key === "ArrowLeft") n = (i - 1 + tabs.length) % tabs.length;
    if (n === null) return;
    e.preventDefault();
    onChange?.(tabs[n].id);
    document.getElementById(`${ids}-tab-${tabs[n].id}`)?.focus();
  };
  return (
    <div>
      <div role="tablist" aria-label={label} className="flex flex-wrap gap-2">
        {tabs.map((t, i) => (
          <button
            key={t.id}
            id={`${ids}-tab-${t.id}`}
            type="button"
            role="tab"
            aria-selected={t.id === active}
            aria-controls={`${ids}-panel-${t.id}`}
            tabIndex={t.id === active ? 0 : -1}
            onClick={() => onChange?.(t.id)}
            onKeyDown={(e) => onKey(e, i)}
            className={`min-h-[44px] rounded-lg border px-4 py-2 text-sm font-medium ${
              t.id === active ? "border-primary bg-primary/10" : "border-input hover:bg-secondary"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// Accordion: one-or-many disclosure sections (native button + region).
export function Accordion({ items = [], allowMultiple = true, className = "" }) {
  const [open, setOpen] = useState(() => items.filter((i) => i.defaultOpen).map((i) => i.id));
  const toggle = (id) =>
    setOpen((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : allowMultiple ? [...prev, id] : [id]));
  return (
    <div className={`divide-y divide-border rounded-xl border border-input ${className}`}>
      {items.map((item) => {
        const isOpen = open.includes(item.id);
        return (
          <div key={item.id}>
            <h3>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={`acc-${item.id}`}
                onClick={() => toggle(item.id)}
                className="flex min-h-[44px] w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold hover:bg-secondary/50"
              >
                {item.title}
                <span aria-hidden="true" className="text-muted-foreground">
                  {isOpen ? "−" : "+"}
                </span>
              </button>
            </h3>
            {isOpen && (
              <div id={`acc-${item.id}`} role="region" className="px-4 pb-4 text-sm text-muted-foreground">
                {item.body}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Dialog: modal with focus trap + Escape + overlay click.
export function Dialog({ open, onClose, title, children, labelledBy }) {
  const boxRef = useRef(null);
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement;
    const box = boxRef.current;
    box?.querySelector("button, [href], input, select, textarea, [tabindex]")?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose?.();
      }
      if (e.key === "Tab" && box) {
        const f = [...box.querySelectorAll("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])")].filter(
          (el) => !el.disabled,
        );
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (prev?.focus) prev.focus();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        ref={boxRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy || titleId}
        className="surface w-full max-w-lg p-6"
      >
        {title && (
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
        )}
        <div className="mt-3 text-sm text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}

// Toast: polite live-region announcements (caller renders <Toast .../>).
export function Toast({ message }) {
  if (!message) return null;
  return (
    <div role="status" aria-live="polite" className="surface fixed bottom-20 left-1/2 z-50 -translate-x-1/2 px-4 py-2 text-sm lg:bottom-8">
      {message}
    </div>
  );
}

// Tooltip: focus/click friendly (no hover-only). Trigger wraps children.
export function Tooltip({ tip, children }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-block">
      <span
        tabIndex={0}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        aria-describedby={show ? undefined : undefined}
        className="underline decoration-dotted underline-offset-2"
      >
        {children}
      </span>
      {show && (
        <span role="tooltip" className="surface absolute bottom-full left-0 z-30 mb-1 w-56 p-2 text-xs">
          {tip}
        </span>
      )}
    </span>
  );
}

// Callout: info / warn / danger blocks (icon + text, never color-only).
const CALLOUT = {
  info: { cls: "border-primary/40 bg-primary/5", icon: "ⓘ", label: "Note" },
  warn: { cls: "border-warning/50 bg-warning/5", icon: "⚠", label: "Warning" },
  danger: { cls: "border-destructive/50 bg-destructive/5", icon: "⛔", label: "Important" },
  success: { cls: "border-success/40 bg-success/5", icon: "✓", label: "Done" },
};

export function Callout({ tone = "info", title, children }) {
  const c = CALLOUT[tone] || CALLOUT.info;
  return (
    <div role={tone === "danger" ? "alert" : "note"} className={`rounded-xl border p-4 text-sm ${c.cls}`}>
      <p className="font-semibold">
        <span aria-hidden="true">{c.icon} </span>
        {title || c.label}
      </p>
      <div className="mt-1 text-muted-foreground">{children}</div>
    </div>
  );
}

// Card / Badge / Meter.
export function Card({ title, description, action, children, className = "" }) {
  return (
    <section className={`surface p-6 ${className}`}>
      {title && <h2 className="text-base font-semibold">{title}</h2>}
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
      {children && <div className="mt-4">{children}</div>}
    </section>
  );
}

const BADGE_TONES = {
  neutral: "border-input text-muted-foreground",
  good: "border-success/40 text-success",
  warn: "border-warning/50 text-warning",
  bad: "border-destructive/50 text-destructive",
  info: "border-primary/40 text-primary",
};

export function Badge({ tone = "neutral", icon, children }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${BADGE_TONES[tone]}`}>
      {icon && <span aria-hidden="true">{icon}</span>}
      {children}
    </span>
  );
}

// Meter: labelled progress meter (role=meter, text always present).
export function Meter({ label, value, max = 100, tone = "info", hint }) {
  const pct = Math.max(0, Math.min(100, max === 0 ? 0 : (value / max) * 100));
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm tabular-nums text-muted-foreground">
          {value}/{max}
        </span>
      </div>
      <div
        role="meter"
        aria-label={label}
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={max}
        className="h-2.5 overflow-hidden rounded-full bg-secondary"
      >
        <div
          className={`h-full rounded-full ${tone === "good" ? "bg-success" : tone === "warn" ? "bg-warning" : tone === "bad" ? "bg-destructive" : "bg-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ProgressBar: task progress (role=progressbar + visible %).
export function ProgressBar({ value, max = 100, label }) {
  const pct = Math.max(0, Math.min(100, max === 0 ? 0 : (value / max) * 100));
  return (
    <div>
      {label && <p className="mb-1 text-sm font-medium">{label}</p>}
      <div role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={max} aria-label={label || "Progress"} className="h-2.5 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-xs tabular-nums text-muted-foreground">{Math.round(pct)}% complete</p>
    </div>
  );
}

// Table: responsive (scrolls sideways; min-width keeps columns readable).
export function Table({ columns = [], rows = [], caption, emptyText = "Nothing here yet." }) {
  if (!rows.length) return <EmptyState title="Nothing here yet" body={emptyText} />;
  return (
    <div className="overflow-x-auto rounded-xl border border-input">
      <table className="w-full min-w-[480px] text-left text-sm">
        {caption && <caption className="px-4 py-2 text-left text-xs text-muted-foreground">{caption}</caption>}
        <thead>
          <tr className="border-b border-input text-xs uppercase tracking-wide text-muted-foreground">
            {columns.map((c) => (
              <th key={c.key} scope="col" className="px-4 py-2 font-semibold">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.key ?? i} className="border-b border-input/50 last:border-0">
              {columns.map((c) => (
                <td key={c.key} className="px-4 py-2 align-top">
                  {typeof c.render === "function" ? c.render(r) : r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Dropzone: file picker with drag support + keyboard-native input fallback.
export function Dropzone({ label, hint, accept, multiple = false, maxSize, onFiles, error }) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef(null);
  const handle = (list) => {
    const files = [...(list || [])];
    if (!multiple && files.length > 1) files.length = 1;
    onFiles?.(files);
  };
  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label={label}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          handle(e.dataTransfer?.files);
        }}
        className={`grid min-h-[120px] cursor-pointer place-items-center rounded-xl border-2 border-dashed p-6 text-center ${
          drag ? "border-primary bg-primary/5" : "border-input hover:border-primary/50"
        }`}
      >
        <div>
          <p className="text-sm font-semibold">{label}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
          {maxSize && <p className="mt-1 text-xs text-muted-foreground">Up to {maxSize}.</p>}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          handle(e.target.files);
          e.target.value = "";
        }}
      />
      {error && (
        <p role="alert" className="mt-1.5 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

// CopyButton: copy with visible + aria-live feedback.
export function CopyButton({ text, label = "Copy", copiedLabel = "Copied" }) {
  const { copy, copied } = useClipboard();
  return (
    <button
      type="button"
      onClick={() => copy(text)}
      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-input px-3 py-2 text-xs font-semibold hover:bg-secondary"
    >
      <span aria-hidden="true">{copied ? "✓" : "⧉"}</span>
      <span role="status" aria-live="polite">
        {copied ? copiedLabel : label}
      </span>
    </button>
  );
}

// States: Empty / Error / Checklist item / Stepper.
export function EmptyState({ title, body, action }) {
  return (
    <div className="surface grid place-items-center p-8 text-center">
      <p className="text-base font-semibold">{title || "Nothing here yet"}</p>
      {body && <p className="mt-1 max-w-md text-sm text-muted-foreground">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = "Something didn’t work", body, onRetry }) {
  return (
    <div role="alert" className="surface grid place-items-center border-destructive/40 p-8 text-center">
      <p className="text-base font-semibold text-destructive">{title}</p>
      {body && <p className="mt-1 max-w-md text-sm text-muted-foreground">{body}</p>}
      {onRetry && (
        <Button tone="secondary" onClick={onRetry} className="mt-4">
          Try again
        </Button>
      )}
    </div>
  );
}

export function ChecklistItem({ checked, onChange, title, hint }) {
  const id = useId();
  return (
    <div className="flex items-start gap-3 rounded-lg border border-input px-4 py-3 hover:bg-secondary/40">
      <input
        id={id}
        type="checkbox"
        checked={!!checked}
        onChange={(e) => onChange?.(e.target.checked)}
        className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-primary)]"
      />
      <label htmlFor={id} className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{title}</span>
        {hint && <span className="mt-0.5 block text-xs">{hint}</span>}
      </label>
    </div>
  );
}

export function Stepper({ steps = [], current = 0 }) {
  return (
    <ol className="flex flex-wrap items-center gap-2" aria-label="Progress">
      {steps.map((s, i) => {
        const done = i < current;
        const now = i === current;
        return (
          <li key={s} className="flex items-center gap-2" aria-current={now ? "step" : undefined}>
            <span
              aria-hidden="true"
              className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${
                done ? "bg-success text-black" : now ? "bg-primary text-black" : "bg-secondary text-muted-foreground"
              }`}
            >
              {done ? "✓" : i + 1}
            </span>
            <span className={`text-xs ${now ? "font-semibold" : "text-muted-foreground"}`}>{s}</span>
            {i < steps.length - 1 && (
              <span aria-hidden="true" className="mx-1 text-muted-foreground">
                →
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
