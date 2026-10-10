// Tiny in-house SPA router (History API). Zero dependencies.
// - matches static paths and ":param" segments (e.g. /tools/:slug)
// - <Link> intercepts clicks, updates history, scrolls to top
// - useRoute() gives { path, params, query }
// - navigate(path) for programmatic use
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  createElement,
} from "react";

const RouterContext = createContext({ path: "/", query: {} });

function currentLocation() {
  return {
    path: window.location.pathname.replace(/\/+$/, "") || "/",
    query: Object.fromEntries(new URLSearchParams(window.location.search)),
  };
}

export function RouterProvider({ children }) {
  const [loc, setLoc] = useState(currentLocation);

  useEffect(() => {
    const onPop = () => setLoc(currentLocation());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback((to, { replace = false } = {}) => {
    const url = new URL(to, window.location.origin);
    if (replace) window.history.replaceState({}, "", url);
    else window.history.pushState({}, "", url);
    setLoc(currentLocation());
    window.scrollTo(0, 0);
  }, []);

  const value = useMemo(() => ({ ...loc, navigate }), [loc, navigate]);
  return createElement(RouterContext.Provider, { value }, children);
}

export function useRoute() {
  return useContext(RouterContext);
}

/** Match "/tools/:slug" style patterns. Returns params or null. */
export function matchPath(pattern, path) {
  const p = pattern.split("/").filter(Boolean);
  const a = path.split("/").filter(Boolean);
  if (pattern === "/") return path === "/" ? {} : null;
  if (p.length !== a.length && !p.includes("*")) return null;
  const params = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i] === "*") return params;
    if (p[i].startsWith(":")) params[p[i].slice(1)] = decodeURIComponent(a[i] ?? "");
    else if (p[i] !== a[i]) return null;
  }
  return params;
}

export function Link({ to, children, className, onClick, ...rest }) {
  const { navigate } = useRoute();
  const handle = (e) => {
    if (
      e.defaultPrevented ||
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey ||
      e.currentTarget.target === "_blank"
    )
      return;
    e.preventDefault();
    onClick?.(e);
    navigate(to);
  };
  return (
    <a href={to} className={className} onClick={handle} {...rest}>
      {children}
    </a>
  );
}
