const baseUrl = import.meta.env.BASE_URL || "/";

export function appPath(path = "/") {
  if (path === "/") return baseUrl;

  return `${baseUrl}${path.replace(/^\/+/, "")}`;
}

export function navigate(path = "/") {
  window.location.href = appPath(path);
}

export function replaceHistory(path = "/") {
  window.history.replaceState({}, "", appPath(path));
}

export function currentPath() {
  const pathname = window.location.pathname;

  if (baseUrl !== "/" && pathname.startsWith(baseUrl)) {
    return `/${pathname.slice(baseUrl.length)}`;
  }

  return pathname;
}
