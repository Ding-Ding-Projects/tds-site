import { parse } from "parse5";

const ELEMENTS = new Set([
  "a", "abbr", "b", "blockquote", "br", "caption", "cite", "code", "dd", "del", "div", "dl", "dt", "em",
  "figcaption", "figure", "h1", "h2", "h3", "h4", "h5", "h6", "hr", "i", "li", "ol", "p", "pre", "q",
  "s", "section", "small", "span", "strong", "sub", "sup", "table", "tbody", "td", "tfoot", "th", "thead",
  "tr", "u", "ul",
]);
const DROP_CONTENT = new Set(["audio", "embed", "iframe", "link", "meta", "noscript", "object", "script", "source", "style", "svg", "template", "video"]);
const VOID_ELEMENTS = new Set(["br", "hr"]);
const MAX_NODES = 200_000;

function attr(node, name) {
  return node.attrs?.find((item) => item.name === name)?.value;
}

function safeHref(value, baseUrl) {
  const href = String(value ?? "").trim();
  if (!href || href.startsWith("//")) return undefined;
  if (/^#[\w:.-]+$/.test(href)) return href;
  try {
    const parsed = new URL(href, baseUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return undefined;
    if (parsed.hostname === "tds.wiki") return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    return parsed.href;
  } catch {
    return undefined;
  }
}

function safeId(value) {
  const id = String(value ?? "");
  return /^[A-Za-z][A-Za-z0-9_.:-]{0,159}$/.test(id) ? id : undefined;
}

function safeSpan(value) {
  const number = Number.parseInt(String(value ?? ""), 10);
  return Number.isInteger(number) && number >= 1 && number <= 50 ? number : undefined;
}

export function sanitizeWikiHtml(html, title = "") {
  if (typeof html !== "string" || html.length === 0 || html.length > 6_000_000) {
    throw new Error("Rendered wiki response is missing or exceeds the 6 MB limit.");
  }
  const document = parse(html);
  const baseUrl = `https://tds.wiki/w/${encodeURIComponent(String(title).replaceAll(" ", "_"))}`;
  let nodeCount = 0;

  function convert(node, depth = 0) {
    nodeCount += 1;
    if (nodeCount > MAX_NODES || depth > 120) throw new Error("Rendered wiki response exceeds the structural limit.");
    if (node.nodeName === "#text") return node.value ?? "";
    if (!node.tagName) return (node.childNodes ?? []).map((child) => convert(child, depth + 1)).filter(Boolean);
    const tag = node.tagName.toLowerCase();
    if (DROP_CONTENT.has(tag)) return null;
    if (attr(node, "aria-hidden") === "true" || attr(node, "hidden") !== undefined) return null;

    if (tag === "img") {
      const label = attr(node, "alt")?.trim() || attr(node, "title")?.trim() || "Wiki media omitted";
      return label;
    }
    const children = (node.childNodes ?? []).map((child) => convert(child, depth + 1)).flat(Infinity).filter((child) => child !== null && child !== "");
    if (!ELEMENTS.has(tag)) return children;

    const props = {};
    if (tag === "a") {
      const href = safeHref(attr(node, "href"), baseUrl);
      if (href) props.href = href;
      const title = attr(node, "title")?.trim();
      if (title && title.length <= 300) props.title = title;
    }
    if (["section", "h1", "h2", "h3", "h4", "h5", "h6", "span", "div", "figure", "table", "td", "th"].includes(tag)) {
      const id = safeId(attr(node, "id"));
      if (id) props.id = id;
    }
    if (tag === "td" || tag === "th") {
      const colSpan = safeSpan(attr(node, "colspan"));
      const rowSpan = safeSpan(attr(node, "rowspan"));
      if (colSpan) props.colSpan = colSpan;
      if (rowSpan) props.rowSpan = rowSpan;
      const scope = attr(node, "scope");
      if (["row", "col", "rowgroup", "colgroup"].includes(scope)) props.scope = scope;
    }
    if (tag === "ol") {
      const start = Number.parseInt(attr(node, "start") ?? "", 10);
      if (Number.isInteger(start) && start > 0 && start <= 10_000) props.start = start;
    }
    if (tag === "q" || tag === "blockquote") {
      const cite = safeHref(attr(node, "cite"), baseUrl);
      if (cite) props.cite = cite;
    }
    if (VOID_ELEMENTS.has(tag)) return { type: tag, props, children: [] };
    return { type: tag, props, children };
  }

  const body = document.childNodes.find((node) => node.tagName === "html")?.childNodes.find((node) => node.tagName === "body");
  if (!body) throw new Error("Rendered wiki response has no body element.");
  const content = (body.childNodes ?? []).map((node) => convert(node)).flat(Infinity).filter((node) => node !== null && node !== "");
  if (!content.length || content.every((node) => typeof node === "string" && !node.trim())) {
    throw new Error("Rendered wiki response contains no readable article content.");
  }
  return { schemaVersion: 1, source: "MediaWiki REST revision HTML, sanitized", nodeCount, content };
}

export function visibleTextFromWikiAst(nodes) {
  return nodes.map((node) => typeof node === "string" ? node : visibleTextFromWikiAst(node.children ?? [])).join("");
}
