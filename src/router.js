const listeners = new Set();

export function parseLocation() {
  const url = new URL(window.location.href);
  const parts = url.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  const route = parts[0] || "home";
  return {
    route,
    id: parts[1] || null,
    query: Object.fromEntries(url.searchParams.entries()),
    path: url.pathname || "/",
  };
}

export function navigate(path, { replace = false } = {}) {
  const next = path.startsWith("/") ? path : `/${path}`;
  const current = `${window.location.pathname}${window.location.search}`;
  if (current === next) {
    listeners.forEach((listener) => listener(parseLocation()));
    return;
  }
  if (replace) window.history.replaceState({}, "", next);
  else window.history.pushState({}, "", next);
  listeners.forEach((listener) => listener(parseLocation()));
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function initRouter() {
  window.addEventListener("popstate", () => {
    listeners.forEach((listener) => listener(parseLocation()));
  });
  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[data-link]");
    if (!link) return;
    const href = link.getAttribute("href");
    if (!href || href.startsWith("http") || link.target === "_blank") return;
    event.preventDefault();
    navigate(href);
  });
}
