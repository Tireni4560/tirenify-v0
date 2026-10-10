// Email-confirmation handling — ported from the live site's
// handleConfirmationToken() and showEmailLinkBanner() (public/script.js).
// Text strings are verbatim.
import { useEffect, useRef, useState } from "react";
import { useRoute } from "../lib/router.jsx";

function ConfirmationTokenFlow() {
  const { query } = useRoute();
  const token = query.token;
  const [state, setState] = useState(token ? "confirming" : "idle");
  const [message, setMessage] = useState("Please wait while we confirm your subscription.");
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    fetch(`/api/email/confirm?token=${encodeURIComponent(token)}`, {
      headers: { Accept: "application/json" },
    })
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (ok && data.success) {
          setState("success");
          setMessage(`${data.message} Redirecting you to the homepage…`);
          setTimeout(() => {
            window.location.href = "/";
          }, 3000);
        } else {
          setState("failure");
          setMessage(data.message || "This confirmation link is invalid or has expired.");
        }
      })
      .catch(() => {
        setState("failure");
        setMessage("Could not reach the server. Please try the link again in a moment.");
      });
  }, [token]);

  if (!token) return null;
  return (
    <div className="mx-auto my-8 max-w-xl surface p-8 text-center">
      <h2
        className="text-2xl font-semibold"
        style={{ color: state === "success" ? "#22c55e" : state === "failure" ? "#f87171" : undefined }}
      >
        {state === "confirming"
          ? "Confirming your email…"
          : state === "success"
            ? "✓ Subscription confirmed"
            : "Confirmation failed"}
      </h2>
      <p className="mt-3 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function LinkBanner() {
  const { query, path, navigate } = useRoute();
  const [banner, setBanner] = useState(null);
  useEffect(() => {
    if (query.confirmed === "1") {
      setBanner({
        title: "✓ Subscription confirmed",
        body: "You're all set! You'll now receive security insights and updates from Tirenify.",
        accent: "#22c55e",
      });
    } else if (query.unsubscribed === "1") {
      setBanner({
        title: "You've been unsubscribed",
        body: "You won't receive any more emails from Tirenify. You can resubscribe anytime after a breach check.",
        accent: "#94a3b8",
      });
    }
    if (query.confirmed || query.unsubscribed) {
      // Clean the query string so a refresh doesn't re-show the banner.
      navigate(path, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!banner) return null;
  return (
    <div
      className="surface mb-6 p-4"
      style={{ borderColor: banner.accent }}
      role="status"
    >
      <p className="font-bold" style={{ color: banner.accent }}>
        {banner.title}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{banner.body}</p>
    </div>
  );
}

/** Mounted once at app root. */
export function EmailFlow() {
  return (
    <>
      <ConfirmationTokenFlow />
      <LinkBanner />
    </>
  );
}
