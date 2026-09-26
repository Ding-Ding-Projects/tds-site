"use client";

import { useMemo, type ReactNode } from "react";
import { parseInline, parseWikiBlocks, splitWikiSections, wikiTitleKey } from "@/lib/wiki-source-renderer.mjs";

type ArticleEntry = { pageid: number; title: string; namespace: number };
type WikiToken = ReturnType<typeof parseInline>[number];
type WikiBlock = ReturnType<typeof parseWikiBlocks>[number];

function sourceUrl(title: string) {
  return `https://tds.wiki/w/${encodeURIComponent(title.replaceAll(" ", "_")).replaceAll("%3A", ":")}`;
}

export function WikiArticleBody({
  pageid,
  title,
  plainText,
  sourceMarkup,
  entries,
  onOpenArticle,
}: {
  pageid: number;
  title: string;
  plainText: string;
  sourceMarkup: string;
  entries: ArticleEntry[];
  onOpenArticle: (entry: ArticleEntry) => void;
}) {
  const sections = useMemo(() => splitWikiSections(sourceMarkup), [sourceMarkup]);
  const entryByTitle = useMemo(() => new Map(entries.map((entry) => [wikiTitleKey(entry.title), entry])), [entries]);

  function renderTokens(tokens: WikiToken[], keyPrefix: string): ReactNode[] {
    return tokens.map((token, index) => {
      const key = `${keyPrefix}-${index}`;
      if (token.type === "text") return <span key={key}>{token.value}</span>;
      if (token.type === "break") return <br key={key}/>;
      if (token.type === "strong") return <strong key={key}>{renderTokens(token.children, key)}</strong>;
      if (token.type === "emphasis") return <em key={key}>{renderTokens(token.children, key)}</em>;
      if (token.type === "external-link") return <a className="wiki-external-link" key={key} href={token.href} target="_blank" rel="noreferrer">{renderTokens(token.labelTokens, key)}</a>;
      if (token.type === "media") return <a className="wiki-media-reference" key={key} href={sourceUrl(`File:${token.file}`)} target="_blank" rel="noreferrer">Media file description: {token.file}</a>;
      if (token.type === "internal-link") {
        const target = token.target.split("#", 1)[0];
        const entry = entryByTitle.get(wikiTitleKey(target));
        const label = renderTokens(token.labelTokens ?? parseInline(token.label), key);
        if (entry && entry.pageid !== pageid) return <button className="wiki-internal-link" key={key} type="button" onClick={() => onOpenArticle(entry)}>{label}</button>;
        if (entry?.pageid === pageid && token.target.includes("#")) return <a className="wiki-internal-link" key={key} href={`#${sectionAnchor(token.target.slice(token.target.indexOf("#") + 1), sections)}`}>{label}</a>;
        return <a className="wiki-external-link" key={key} href={sourceUrl(target)} target="_blank" rel="noreferrer">{label}</a>;
      }
      if (token.type === "template") return <TemplateDisclosure key={key} block={token} renderTokens={renderTokens}/>;
      return <span key={key}>{"value" in token ? token.value : ""}</span>;
    });
  }

  function sectionAnchor(fragment: string, sectionList = sections) {
    const normalized = fragment.replaceAll("_", " ").trim().toLocaleLowerCase();
    return sectionList.find((section) => section.title.trim().toLocaleLowerCase() === normalized)?.id ?? "";
  }

  function renderBlocks(blocks: WikiBlock[], keyPrefix: string): ReactNode[] {
    return blocks.map((block, index) => {
      const key = `${keyPrefix}-block-${index}`;
      if (block.type === "paragraph") return <p key={key}>{renderTokens(block.children, key)}</p>;
      if (block.type === "rule") return <hr key={key}/>;
      if (block.type === "code") return <pre className="wiki-code" key={key}><code>{block.value}</code></pre>;
      if (block.type === "template") return <TemplateDisclosure key={key} block={block} renderTokens={renderTokens}/>;
      if (block.type === "table") return <div className="wiki-table-scroll" key={key} role="region" aria-label={`Table ${index + 1} in ${title}`} tabIndex={0}><table className="wiki-table"><tbody>{block.rows.map((row, rowIndex) => <tr key={`${key}-row-${rowIndex}`}>{row.cells.map((cell, cellIndex) => row.header ? <th scope="col" key={`${key}-cell-${cellIndex}`}>{renderTokens(cell, `${key}-cell-${cellIndex}`)}</th> : <td key={`${key}-cell-${cellIndex}`}>{renderTokens(cell, `${key}-cell-${cellIndex}`)}</td>)}</tr>)}</tbody></table></div>;
      if (block.type === "list") return <ul className="wiki-list" key={key}>{block.items.map((item, itemIndex) => <li key={`${key}-item-${itemIndex}`} style={{ marginInlineStart: `${Math.max(0, item.depth - 1) * 1.1}rem` }}>{item.marker === "#" ? <span className="wiki-list-number">{itemIndex + 1}. </span> : null}{renderTokens(item.children, `${key}-item-${itemIndex}`)}</li>)}</ul>;
      return null;
    });
  }

  return <div className="wiki-readable">
    {plainText && <section className="wiki-summary"><h2>Quick summary</h2><p>{plainText}</p></section>}
    {sections.length > 1 && <nav className="wiki-toc" aria-label={`Sections in ${title}`}><strong>In this article</strong><ol>{sections.filter((section) => section.title && section.title !== "Overview").map((section) => <li key={section.id}><a href={`#${section.id}`}>{section.title}</a></li>)}</ol></nav>}
    {sections.map((section, index) => {
      const blocks = parseWikiBlocks(section.source);
      if (!section.source.trim() && section.title === "Overview") return null;
      const Heading = section.level <= 2 ? "h2" : section.level === 3 ? "h3" : "h4";
      return <section className="wiki-section" id={section.id} key={section.id}>
        {section.title && section.title !== "Overview" ? <Heading>{section.title}</Heading> : null}
        {renderBlocks(blocks, `${section.id}-${index}`)}
      </section>;
    })}
  </div>;
}

function TemplateDisclosure({block, renderTokens}: {block: {name: string; params: Array<{name: string; value: string}>; source: string}; renderTokens: (tokens: WikiToken[], keyPrefix: string) => ReactNode[]}) {
  return <details className="wiki-template">
    <summary>Structured data: {block.name}</summary>
    {block.params.length > 0 && <dl>{block.params.map((param, index) => <div className="wiki-template-field" key={`${block.name}-${index}`}><dt>{param.name}</dt><dd>{renderTokens(parseInline(param.value), `${block.name}-${index}`)}</dd></div>)}</dl>}
    <details className="wiki-template-source"><summary>Original template syntax</summary><pre>{block.source}</pre></details>
  </details>;
}

