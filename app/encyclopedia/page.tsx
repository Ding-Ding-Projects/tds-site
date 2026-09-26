"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, BookOpen, Search } from "lucide-react";
import { WikiRenderedArticle } from "@/components/wiki-rendered-article";

type ArticleRef = { pageid: number; title: string; namespace: number; revisionId: number; revisionTimestamp: string; sourceUrl: string; historyUrl: string; licensePolicyUrl: string; license: string; summary: string };
type Article = ArticleRef & { plainText: string; attribution: string; sizeBytes: number; sourceMarkup: string };
type IndexFile = { generatedAt: string; count: number; entries: ArticleRef[] };
type SearchFile = { generatedAt: string; articleCount: number; tokenCount: number; terms: Record<string, number[]> };

export default function EncyclopediaPage() {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState<IndexFile | null>(null);
  const [searchIndex, setSearchIndex] = useState<SearchFile | null>(null);
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Search the complete imported article text. Article details load when selected.");
  const results = useMemo(() => {
    if (!index || !query.trim() || !searchIndex) return index?.entries.slice(0, 40) ?? [];
    const tokens = [...new Set(query.normalize("NFKC").toLocaleLowerCase().match(/[\p{L}\p{N}]{2,}/gu) ?? [])];
    const scores = new Map<number, number>();
    for (const token of tokens) for (const pageid of searchIndex.terms[token] ?? []) scores.set(pageid, (scores.get(pageid) ?? 0) + 1);
    return index.entries.filter((entry) => scores.has(entry.pageid)).sort((a, b) => (scores.get(b.pageid) ?? 0) - (scores.get(a.pageid) ?? 0) || a.title.localeCompare(b.title)).slice(0, 80);
  }, [index, searchIndex, query]);

  async function loadIndex() {
    if (index) return;
    setLoading(true); setStatus("Loading the complete article index…");
    try {
      const [indexResponse, searchResponse] = await Promise.all([fetch("/wiki/index.json"), fetch("/wiki/search-index.json")]);
      if (!indexResponse.ok || !searchResponse.ok) throw new Error(`Index request returned ${indexResponse.status}/${searchResponse.status}`);
      const [data, searchData] = await Promise.all([indexResponse.json() as Promise<IndexFile>, searchResponse.json() as Promise<SearchFile>]);
      if (data.count !== searchData.articleCount) throw new Error("Article and full-text search counts do not match.");
      setIndex(data); setSearchIndex(searchData); setStatus(`${data.count.toLocaleString()} source-linked entries are indexed across ${searchData.tokenCount.toLocaleString()} terms. Search covers the full imported page source.`);
    } catch (error) { setStatus(error instanceof Error ? error.message : "The index could not be loaded."); }
    finally { setLoading(false); }
  }

  async function openArticle(item: ArticleRef) {
    setLoading(true); setArticle(null); setStatus(`Loading ${item.title}…`);
    try {
      const response = await fetch(`/wiki/pages/${item.pageid}.json`);
      if (!response.ok) throw new Error(`Article request returned ${response.status}`);
      setArticle(await response.json() as Article); setStatus(`Source revision ${item.revisionId} loaded.`);
    } catch (error) { setStatus(error instanceof Error ? error.message : "The article could not be loaded."); }
    finally { setLoading(false); }
  }

  return <main className="encyclopedia-page">
    <header className="encyclopedia-top"><Link href="/" className="back-link"><ArrowLeft size={16}/> Back to strategy lab</Link><span>FULL RESEARCH INDEX</span></header>
    <section className="encyclopedia-intro"><div className="eyebrow"><BookOpen size={14}/> COMMUNITY ENCYCLOPEDIA · SOURCE ATTRIBUTION PRESERVED</div><h1>Every article.<br/><em>One useful guide.</em></h1><p>Browse the imported public encyclopedia through native search and reading views. Every entry keeps its source revision, history, and copyright-policy link.</p>
      <form className="encyclopedia-search" onSubmit={(event) => { event.preventDefault(); void loadIndex(); }}><Search size={18}/><input value={query} onFocus={() => void loadIndex()} onChange={(event) => { setQuery(event.target.value); void loadIndex(); }} placeholder="Search towers, enemies, maps, modes…" aria-label="Search encyclopedia articles"/><button type="submit" disabled={loading}>Search</button></form>
      <p className="search-status" role="status" aria-live="polite">{status}</p>
    </section>
    <div className="encyclopedia-layout">
      <section className="encyclopedia-results" aria-label="Article search results"><div className="section-heading"><div><span className="eyebrow">BROWSE SOURCE PAGES</span><h2>{article ? article.title : index ? `${results.length} results` : "Load the index to browse"}</h2></div>{article && <button className="back-link" onClick={() => setArticle(null)}>← Results</button>}</div>
        {article ? <article className="article-reader"><div className="article-meta"><span>Revision {article.revisionId}</span><time dateTime={article.revisionTimestamp}>{new Date(article.revisionTimestamp).toLocaleDateString()}</time><span>{(article.sizeBytes / 1024).toFixed(1)} KB source text</span></div><WikiRenderedArticle key={article.revisionId} revisionId={article.revisionId} pageid={article.pageid} title={article.title} plainText={article.plainText} sourceMarkup={article.sourceMarkup} entries={index?.entries ?? []} onOpenArticle={(entry) => void openArticle(entry)}/><details className="source-markup"><summary>Complete imported source markup</summary><pre>{article.sourceMarkup}</pre></details><div className="article-attribution">{article.attribution}<br/>License: {article.license}<br/>Retrieved from the public wiki API. The exact imported revision is rendered with remote scripts, styles, and image files removed; its complete original source, history, and license links remain available below.</div><div className="source-actions"><a href={article.sourceUrl} target="_blank" rel="noreferrer">Original article <ArrowUpRight size={14}/></a><a href={article.historyUrl} target="_blank" rel="noreferrer">Revision history <ArrowUpRight size={14}/></a><a href={article.licensePolicyUrl} target="_blank" rel="noreferrer">Copyright policy <ArrowUpRight size={14}/></a></div></article> : <div className="result-list">{results.map((item) => <button className="result-item" key={item.pageid} onClick={() => void openArticle(item)}><span><strong>{item.title}</strong><small>{item.namespace === 2900 ? "Map namespace" : "Encyclopedia"} · revision {item.revisionId}</small><span className="result-summary">{item.summary || "No summary available. Open the original page for full content."}</span></span><ArrowUpRight size={16}/></button>)}{index && results.length === 0 && <p className="empty-results">No matches in the title and summary index. Try a shorter search or browse the original wiki search.</p>}{!index && <button className="load-index" onClick={() => void loadIndex()} disabled={loading}>{loading ? "Loading…" : "Load all encyclopedia entries"}</button>}</div>}
      </section>
      <aside className="encyclopedia-aside"><strong>Attribution is attached to each page</strong><p>Page ID, revision, retrieval timestamp, history URL, and policy link remain available alongside the adapted text.</p><a href="https://tds.wiki/w/Tower_Defense_Simulator_Wiki:Copyrights" target="_blank" rel="noreferrer">Read the source copyright policy ↗</a><hr/><strong>Media is handled separately</strong><p>Image files are not republished unless their individual reuse terms are verified. Source pages remain one click away.</p><Link href="/">Return to mode strategies ↗</Link></aside>
    </div>
  </main>;
}
