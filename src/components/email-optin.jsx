// Email opt-in block — strings and flow ported VERBATIM from the live site
// (public/script.js showEmailOptIn). Do not reword these strings.
import { useState } from "react";

export function EmailOptIn({ checkedEmail }) {
  const [phase, setPhase] = useState("form"); // form | sending | done | error
  const [message, setMessage] = useState(null); // {kind:"success"|"info"|"error", html}
  const [email, setEmail] = useState(checkedEmail || "");

  async function submit(e) {
    e.preventDefault();
    setPhase("sending");
    try {
      const res = await fetch("/api/email/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const result = await res.json();
      if (res.ok) {
        if (result.message === "Subscribed successfully.") {
          setMessage({
            kind: "success",
            paragraphs: [
              "🎉 Almost there — check your inbox!",
              `We've sent a confirmation email to ${email.trim()} from hello@tirenify.app.`,
              "Click the confirmation link inside to complete your subscription and start receiving security updates.",
            ],
          });
        } else {
          setMessage({ kind: "info", paragraphs: [`✅ ${result.message}`] });
        }
        setPhase("done");
      } else {
        setMessage({ kind: "error", text: result.message || "Something went wrong. Please try again." });
        setPhase("done");
      }
    } catch {
      setMessage({ kind: "error", text: "Could not connect. Please try again." });
      setPhase("done");
    }
  }

  return (
    <div id="emailOptIn" className="surface mt-6 p-6">
      <div className="max-w-xl">
        <p className="font-semibold">Stay informed about your security</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Get a welcome email with your results and security tips. No spam. Unsubscribe anytime.
        </p>
        {phase !== "done" ? (
          <form onSubmit={submit} className="mt-4">
            <label htmlFor="optInEmail" className="sr-only">
              Your email address
            </label>
            <input
              id="optInEmail"
              type="email"
              required
              maxLength={255}
              placeholder="Your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 w-full rounded-lg border border-input bg-background/60 px-4 outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="mt-3 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  const box = document.getElementById("emailOptIn");
                  if (box) box.remove();
                }}
                className="rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-secondary"
              >
                No thanks
              </button>
              <button
                type="submit"
                disabled={phase === "sending"}
                className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-70"
              >
                {phase === "sending" ? "Sending…" : "Subscribe"}
              </button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              We respect your privacy. One email to start, unsubscribe anytime.
            </p>
          </form>
        ) : message ? (
          <div
            className={`mt-4 text-sm ${
              message.kind === "error" ? "text-destructive" : "text-success"
            }`}
            role="status"
          >
            {message.paragraphs
              ? message.paragraphs.map((p, i) => (
                  <p key={i} className={i === 0 ? "font-semibold" : "mt-1 text-muted-foreground"}>
                    {p}
                  </p>
                ))
              : (
                <p>{message.text}</p>
              )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
