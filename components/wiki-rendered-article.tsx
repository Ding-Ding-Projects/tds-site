"use client";

import { createElement, useEffect, useMemo, useState, type ReactNode } from "react";
import { WikiArticleBody } from "@/components/wiki-article-body";
import { wikiTitleKey } from "@/lib/wiki-source-renderer.mjs";

type ArticleEntry = { pageid: number; title: string; namespace: number; revisionId: number; revisionTimestamp: string; sourceUrl: string; historyUrl: string; licensePolicyUrl: string; license: string; summary: string };
type WikiNode = string | { type: string; props: Record<string, string | number>; children: WikiNode[] };
type RenderedArticle = { schemaVersion: number; source: string; nodeCount: number; content: WikiNode[] };
const ALLOWED_TAGS = new Set(["a", "abbr", "b", "blockquote", "br", "caption", "cite", "code", "dd", "del", "div", "dl", "dt", "em", "figcaption", "figure", "h1", "h2", "h3", "h4", "h5", "h6", "hr", "i", "li", "ol", "p", "pre", "q", "s", "section", "small", "span", "strong", "sub", "sup", "table", "tbody", "td", "tfoot", "th", "thead", "tr", "u", "ul"]);

function sectionId(value: string) {
  return `wiki-section-${value.replaceAll("_", "-").replace(/[^\p{L}\p{N}-]/gu, "-")}`;
}

function sectionIdFromHash(value: string) {
  try { return sectionId(decodeURIComponent(value)); } catch { return sectionId(value); }
}

function sanitizeAnchorHref(value: string) {
  if (value.startsWith("#")) return /^#[\w:.-]+$/.test(value) ? value : "#";
  try {
    const url = new URL(value, "https://tds.wiki/");
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : "#";
  } catch {
    return "#";
  }
}

export function WikiRenderedArticle({
  revisionId,
  pageid,
  title,
  plainText,
  sourceMarkup,
  entries,
  onOpenArticle,
}: {
  revisionId: number;
  pageid: number;
  title: string;
  plainText: string;
  sourceMarkup: string;
  entries: ArticleEntry[];
  onOpenArticle: (entry: ArticleEntry) => void;
}) {
  const [rendered, setRendered] = useState<RenderedArticle | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "source-fallback" | "unavailable">("loading");
  const entryByTitle = useMemo(() => new Map(entries.map((entry) => [wikiTitleKey(entry.title), entry])), [entries]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/wiki-rendered/${revisionId}`, { signal: controller.signal })
      .then(async (response) => {
        if (response.status === 501) {
          setLoadState("source-fallback");
          return null;
        }
        if (!response.ok) throw new Error("Rendered article unavailable");
        return response.json() as Promise<RenderedArticle>;
      })
      .then((article) => {
        if (!article) return;
        if (article.schemaVersion !== 1 || !Array.isArray(article.content)) throw new Error("Rendered article format is unsupported");
        setRendered(article);
        setLoadState("ready");
      })
      .catch(() => { if (!controller.signal.aborted) setLoadState("unavailable"); });
    return () => controller.abort();
  }, [revisionId]);

  function renderLink(node: WikiNode, key: string): ReactNode | null {
    if (typeof node === "string" || node.type !== "a" || typeof node.props.href !== "string") return null;
    const rawHref = node.props.href;
    if (rawHref.startsWith("#")) return null;
    try {
      const url = new URL(rawHref, `https://tds.wiki/w/${encodeURIComponent(title.replaceAll(" ", "_"))}`);
      if (url.hostname !== "tds.wiki" || !url.pathname.startsWith("/w/")) return null;
      const target = decodeURIComponent(url.pathname.slice(3)).replaceAll("_", " ");
      const entry = entryByTitle.get(wikiTitleKey(target));
      if (!entry) return null;
      const label = node.children.map((child, index) => createWikiNode(child, `${key}-label-${index}`));
      if (entry.pageid !== pageid) return <button className="wiki-internal-link" key={key} type="button" onClick={() => onOpenArticle(entry)}>{label}</button>;
      if (url.hash) return <a className="wiki-internal-link" key={key} href={`#${sectionIdFromHash(url.hash.slice(1))}`}>{label}</a>;
      return <span key={key}>{label}</span>;
    } catch {
      return null;
    }
  }

  function renderNode(node: WikiNode, key: string): ReactNode {
    if (typeof node === "string") return node;
    const linked = renderLink(node, key);
    if (linked) return linked;
    if (typeof node !== "string" && node.type === "table") {
      const children = node.children.map((child, index) => renderNode(child, `${key}-${index}`));
      return <div className="wiki-table-scroll" key={key} role="region" aria-label={`Table in ${title}`} tabIndex={0}>{createElement("table", { className: "wiki-table" }, children)}</div>;
    }
    if (typeof node !== "string" && node.type === "a") {
      const href = sanitizeAnchorHref(String(node.props.href ?? "#"));
      const children = node.children.map((child, index) => renderNode(child, `${key}-${index}`));
      if (href.startsWith("#")) return <a className="wiki-external-link" key={key} href={`#${sectionIdFromHash(href.slice(1))}`}>{children}</a>;
      return <a className="wiki-external-link" key={key} href={href} target="_blank" rel="noreferrer">{children}</a>;
    }
    if (typeof node !== "string" && node.type === "section") {
      const rawId = String(node.props.id ?? "");
      const id = rawId ? sectionId(rawId) : undefined;
      return <section className="wiki-section" id={id} key={key}>{node.children.map((child, index) => renderNode(child, `${key}-${index}`))}</section>;
    }
    if (typeof node !== "string" && node.type === "ul") return <ul className="wiki-list" key={key}>{node.children.map((child, index) => renderNode(child, `${key}-${index}`))}</ul>;
    if (typeof node !== "string" && node.type === "ol") return <ol className="wiki-list" key={key}>{node.children.map((child, index) => renderNode(child, `${key}-${index}`))}</ol>;
    if (!ALLOWED_TAGS.has(node.type)) return node.children.map((child, index) => renderNode(child, `${key}-${index}`));
    const props: Record<string, string | number> = {};
    for (const [name, value] of Object.entries(node.props)) {
      if (["href", "title", "id", "colSpan", "rowSpan", "scope", "start", "cite"].includes(name)) props[name] = value;
    }
    if (node.type === "section") props.className = "wiki-section";
    if (typeof props.id === "string") props.id = sectionId(props.id);
    if (node.type === "ul" || node.type === "ol") props.className = "wiki-list";
    if (node.type === "br" || node.type === "hr") return createElement(node.type, { ...props, key });
    const children = node.children.map((child, index) => renderNode(child, `${key}-${index}`));
    return createElement(node.type, { ...props, key }, children);
  }

  return <div className="wiki-readable">
    {plainText && <section className="wiki-summary"><h2>Quick summary</h2><p>{plainText}</p></section>}
    {loadState === "loading" && <p className="wiki-render-status" role="status">Loading this imported revision’s readable article…</p>}
    {loadState === "source-fallback" && <p className="wiki-render-status" role="status">This map article uses its complete imported source and the local reader.</p>}
    {loadState === "unavailable" && <div className="wiki-render-status" role="status">The rendered article is temporarily unavailable. Showing the local partial rendering and complete imported source instead.</div>}
    {rendered ? rendered.content.map((node, index) => renderNode(node, `wiki-${revisionId}-${index}`)) : <WikiArticleBody pageid={pageid} title={title} plainText="" sourceMarkup={sourceMarkup} entries={entries} onOpenArticle={onOpenArticle}/>}
  </div>;
}
