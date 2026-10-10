// Minimal shared UI pieces used across pages (in-house, no Radix).
export function PageHeader({ eyebrow, title, description, children }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && (
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">
            {eyebrow}
          </p>
        )}
        <h1 className="text-3xl font-semibold sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  );
}

export function Chip({ className = "", children, title }) {
  return (
    <span
      title={title}
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs ${className}`}
    >
      {children}
    </span>
  );
}

/** Letter avatar — no remote logos, ever. */
export function LetterAvatar({ name }) {
  const letter = (name || "?").trim().slice(0, 1).toUpperCase();
  return (
    <span
      aria-hidden="true"
      className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent font-display text-lg font-semibold text-accent-foreground"
    >
      {letter}
    </span>
  );
}

export function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-lg bg-secondary/60 ${className}`} aria-hidden="true" />;
}
