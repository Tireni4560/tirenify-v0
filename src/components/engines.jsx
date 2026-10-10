// Data-driven engines + pure scoring logic. GuideRenderer NEVER uses
// dangerouslySetInnerHTML — it renders structured content objects only.
// Pure helpers (scoreQuiz, summarizeWeakTopics, deriveDayIndex) are
// unit-tested in tests/engines.test.js.
import { useMemo, useState } from "react";
import { Button, ChecklistItem, ProgressBar, Stepper, Meter, EmptyState, Callout } from "./ui-kit.jsx";

// ── Pure logic (testable without React) ─────────────────────────────────────

/** Score quiz answers. Question: {id, topic, choices[], answer: index}. */
export function scoreQuiz(questions, answers) {
  let correct = 0;
  const byTopic = {};
  const wrong = [];
  for (const q of questions) {
    const given = answers[q.id];
    const ok = given !== undefined && given === q.answer;
    byTopic[q.topic] = byTopic[q.topic] || { total: 0, correct: 0 };
    byTopic[q.topic].total += 1;
    if (ok) {
      correct += 1;
      byTopic[q.topic].correct += 1;
    } else {
      wrong.push(q.id);
    }
  }
  return { total: questions.length, correct, byTopic, wrongIds: wrong };
}

/** Topics scoring below 70% (for the "what to review" summary). */
export function summarizeWeakTopics(scored) {
  return Object.entries(scored.byTopic)
    .filter(([, t]) => t.total > 0 && t.correct / t.total < 0.7)
    .map(([topic]) => topic)
    .sort();
}

/** Deterministic "tip of the day" index from a date (for the dashboard). */
export function deriveDayIndex(date, count) {
  if (count <= 0) return 0;
  const d = date instanceof Date ? date : new Date(date);
  const days = Math.floor(d.getTime() / 86400000);
  return ((days % count) + count) % count;
}

// ── ChecklistEngine ─────────────────────────────────────────────────────────
export function ChecklistEngine({ items = [], value = {}, onChange, printable = true }) {
  const done = items.filter((i) => value[i.id]).length;
  return (
    <div>
      <ProgressBar value={done} max={items.length || 1} label="Checklist progress" />
      <div className="mt-4 space-y-2">
        {items.map((i) => (
          <ChecklistItem
            key={i.id}
            title={i.title}
            hint={i.hint}
            checked={!!value[i.id]}
            onChange={(v) => onChange?.({ ...value, [i.id]: v })}
          />
        ))}
      </div>
      {printable && (
        <Button tone="secondary" onClick={() => window.print()} className="mt-4 no-print">
          Print checklist
        </Button>
      )}
    </div>
  );
}

// ── WizardEngine ────────────────────────────────────────────────────────────
export function WizardEngine({ steps = [], onDone, doneLabel = "Finish" }) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const step = steps[index];
  const last = index === steps.length - 1;
  const given = answers[step?.id];
  const canNext = step?.optional ? true : given !== undefined && given !== "";
  return (
    <div>
      <Stepper steps={steps.map((s) => s.label)} current={index} />
      <div className="surface mt-4 p-6" role="group" aria-label={`Step ${index + 1} of ${steps.length}: ${step?.label}`}>
        <h2 className="text-lg font-semibold">{step?.title || step?.label}</h2>
        {step?.body && <div className="mt-2 text-sm text-muted-foreground">{step.body}</div>}
        {step?.render && (
          <div className="mt-4">{step.render({ value: given, set: (v) => setAnswers((a) => ({ ...a, [step.id]: v })) })}</div>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button tone="secondary" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>
          Back
        </Button>
        {!last ? (
          <Button onClick={() => setIndex((i) => i + 1)} disabled={!canNext}>
            Next
          </Button>
        ) : (
          <Button onClick={() => onDone?.(answers)} disabled={!canNext}>
            {doneLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

// ── QuizEngine ──────────────────────────────────────────────────────────────
export function QuizEngine({ questions = [], onComplete, allowRetakeWrong = true }) {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [retakeIds, setRetakeIds] = useState(null); // null = all questions
  const activeQs = useMemo(
    () => (retakeIds ? questions.filter((q) => retakeIds.includes(q.id)) : questions),
    [retakeIds, questions],
  );
  const scored = useMemo(() => scoreQuiz(questions, answers), [questions, answers]);
  if (!questions.length) return <EmptyState title="No questions yet" />;
  if (submitted) {
    const weak = summarizeWeakTopics(scored);
    return (
      <div>
        <Meter
          label="Your score"
          value={scored.correct}
          max={scored.total}
          tone={scored.total > 0 && scored.correct / scored.total >= 0.7 ? "good" : "warn"}
        />
        <p className="mt-2 text-sm text-muted-foreground">
          You got {scored.correct} out of {scored.total} right.
        </p>
        {weak.length > 0 ? (
          <div className="mt-3">
            <Callout tone="info" title="Worth reviewing">
              <p>{weak.join(", ")}</p>
            </Callout>
          </div>
        ) : (
          <div className="mt-3">
            <Callout tone="success" title="Well done">
              <p>No weak topics — you answered every topic well.</p>
            </Callout>
          </div>
        )}
        <div className="mt-4 space-y-3">
          {questions.map((q) => (
            <div key={q.id} className="surface p-4 text-sm">
              <p className="font-semibold">{q.prompt}</p>
              <p className="mt-1 text-muted-foreground">{q.explanation}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {allowRetakeWrong && scored.wrongIds.length > 0 && (
            <Button
              onClick={() => {
                setRetakeIds(scored.wrongIds);
                setSubmitted(false);
                setAnswers({});
              }}
            >
              Retake wrong answers ({scored.wrongIds.length})
            </Button>
          )}
          <Button
            tone="secondary"
            onClick={() => {
              setSubmitted(false);
              setRetakeIds(null);
              setAnswers({});
            }}
          >
            Start over
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div>
      <ProgressBar value={Object.keys(answers).length} max={activeQs.length} label="Answered" />
      <div className="mt-4 space-y-4">
        {activeQs.map((q, qi) => (
          <fieldset key={q.id} className="surface p-4">
            <legend className="px-1 text-sm font-semibold">
              {qi + 1}. {q.prompt}
            </legend>
            <div className="mt-2 space-y-2">
              {q.choices.map((c, ci) => (
                <label
                  key={ci}
                  className="flex min-h-[44px] cursor-pointer items-start gap-2 rounded-lg border border-input px-3 py-2 text-sm hover:bg-secondary/50"
                >
                  <input
                    type="radio"
                    name={`q-${q.id}`}
                    checked={answers[q.id] === ci}
                    onChange={() => setAnswers((a) => ({ ...a, [q.id]: ci }))}
                    className="mt-1 accent-[var(--color-primary)]"
                  />
                  {c}
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
      <Button
        className="mt-4"
        disabled={Object.keys(answers).length < activeQs.length}
        onClick={() => {
          setSubmitted(true);
          onComplete?.(scoreQuiz(questions, answers));
        }}
      >
        See my score
      </Button>
    </div>
  );
}

// ── GuideRenderer ───────────────────────────────────────────────────────────
// Renders structured content objects: {blocks: [{h?, p?, steps?, avoid?, help?}]}.
// Plain elements only — never innerHTML.
export function GuideRenderer({ doc }) {
  if (!doc?.blocks?.length) return <EmptyState title="Guide not found" />;
  return (
    <article className="space-y-6">
      {doc.blocks.map((b, i) => (
        <section key={i} className="surface p-6">
          {b.h && <h2 className="text-lg font-semibold">{b.h}</h2>}
          {b.p && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{b.p}</p>}
          {b.steps?.length > 0 && (
            <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
              {b.steps.map((s, j) => (
                <li key={j}>{s}</li>
              ))}
            </ol>
          )}
          {b.avoid?.length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-semibold">What not to do</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {b.avoid.map((s, j) => (
                  <li key={j}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          {b.help && <p className="mt-3 text-sm text-muted-foreground">When to get help: {b.help}</p>}
        </section>
      ))}
    </article>
  );
}
