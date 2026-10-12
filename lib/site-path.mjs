/** Prefix public resources without depending on the current route depth. */
export function withSiteBasePath(path, basePath = "") {
  if (!path.startsWith("/") || path.startsWith("//")) {
    throw new TypeError("Expected an absolute same-site path.");
  }
  if (basePath !== "" && !/^\/[A-Za-z0-9_-]+$/.test(basePath)) {
    throw new TypeError("Expected an empty or single-segment site base path.");
  }
  return `${basePath}${path}`;
}

export function sitePath(path) {
  return withSiteBasePath(path, process.env.NEXT_PUBLIC_SITE_BASE_PATH ?? "");
}
