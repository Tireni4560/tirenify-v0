// App entry: router + lazy-loaded routes + per-route <head> updates.
// Routes are matched against the table in config/routes.js so new modules can
// be added there without editing this file.
import { Suspense, lazy, useEffect } from "react";
import { RouterProvider, useRoute, matchPath } from "./lib/router.jsx";
import { AppShell } from "./components/AppShell.jsx";
import { EmailFlow } from "./components/email-flow.jsx";
import { applyHead } from "./lib/head.js";
import { ROUTES } from "./config/routes.js";
import { PRODUCT_FULL } from "./config/brand.js";

const BreachGuard = lazy(() => import("./routes/breach-guard.jsx"));
const Dashboard = lazy(() => import("./routes/index.jsx"));
const NotFound = lazy(() => import("./routes/not-found.jsx"));
const StaticPage = lazy(() => import("./routes/static-page.jsx"));
const ToolsIndex = lazy(() => import("./routes/tools.jsx"));
const ToolRoute = lazy(() => import("./routes/tool.jsx"));
const LearnHub = lazy(() => import("./routes/learn.jsx"));
const GuideRoute = lazy(() => import("./routes/guide.jsx"));
const Report = lazy(() => import("./routes/report.jsx"));
const Account = lazy(() => import("./routes/account.jsx"));

/** Map a pathname to its route entry (supports :param patterns). */
function findRoute(pathname) {
  for (const r of ROUTES) {
    if (r.path === pathname) return { route: r, params: {} };
    if (r.path.includes(":")) {
      const params = matchPath(r.path, pathname);
      if (params) return { route: r, params };
    }
  }
  return null;
}

const STATIC_PAGES = new Set(["/help", "/privacy", "/terms", "/about"]);

function PageView() {
  const { path } = useRoute();
  const found = findRoute(path);
  const route = found?.route || null;

  useEffect(() => {
    if (route && (route.path === "/tools/:slug" || route.path === "/learn/:slug")) return; // page component sets its own head
    if (route) applyHead({ title: route.title, description: route.description, path: route.path });
    else applyHead({ title: `Page not found | ${PRODUCT_FULL}`, description: "", path });
  }, [route, path]);

  return (
    <AppShell>
      <Suspense fallback={<div className="animate-pulse text-sm text-muted-foreground">Loading…</div>}>
        {!route || route.status !== "live" ? (
          // Not-yet-built routes and unknown paths both show the 404 view;
          // planned routes are intentionally not linked from anywhere.
          <NotFound />
        ) : path === "/" ? (
          <Dashboard />
        ) : path === "/breach-guard" ? (
          <BreachGuard />
        ) : path === "/report" ? (
          <Report />
        ) : path === "/account" ? (
          <Account />
        ) : path === "/tools" ? (
          <ToolsIndex />
        ) : route.path === "/tools/:slug" ? (
          <ToolRoute slug={found.params.slug} />
        ) : path === "/learn" ? (
          <LearnHub />
        ) : route.path === "/learn/:slug" ? (
          <GuideRoute slug={found.params.slug} />
        ) : STATIC_PAGES.has(path) ? (
          <StaticPage route={route} />
        ) : (
          <NotFound />
        )}
      </Suspense>
    </AppShell>
  );
}

export default function App() {
  return (
    <RouterProvider>
      <EmailFlow />
      <PageView />
    </RouterProvider>
  );
}
