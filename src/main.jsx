import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import ErrorBoundary from "./components/error-boundary.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

// Service worker (PWA) registration. The worker serves the app shell, never
// caches /api/*, and refreshes itself. Registration is best-effort — the app
// works without PWA.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        reg.onupdatefound = () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              // A newer SW finished installing and will control this page on the
              // next reload. The SW activates itself (skipWaiting + clients.claim).
            }
          });
        };
      })
      .catch(() => {
        // SW registration is best-effort; offline/PWA is not required.
      });
  });
}
