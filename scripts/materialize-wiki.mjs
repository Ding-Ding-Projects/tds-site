import { mkdir, readFile, writeFile } from "node:fs/promises";

const source = JSON.parse(await readFile(new URL("../data/wiki-corpus.json", import.meta.url), "utf8"));
const root = new URL("../public/wiki/", import.meta.url);
const pageRoot = new URL("pages/", root);
await mkdir(pageRoot, { recursive: true });
const index = source.entries.map((entry) => ({
  pageid: entry.pageid, title: entry.title, namespace: entry.namespace,
  revisionId: entry.revisionId, revisionTimestamp: entry.revisionTimestamp,
  sourceUrl: entry.sourceUrl, historyUrl: entry.historyUrl,
  licensePolicyUrl: entry.licensePolicyUrl, license: entry.license,
  summary: entry.plainText.slice(0, 320),
}));
const searchTerms = new Map();
for (const entry of source.entries) {
  const { wikitext, ...publicRecord } = entry;
  publicRecord.sourceMarkup = wikitext;
  await writeFile(new URL(`${entry.pageid}.json`, pageRoot), `${JSON.stringify(publicRecord)}\n`);
  const terms = new Set(`${entry.title} ${wikitext}`.normalize("NFKC").toLocaleLowerCase().match(/[\p{L}\p{N}]{2,}/gu) ?? []);
  for (const term of terms) {
    const ids = searchTerms.get(term) ?? [];
    ids.push(entry.pageid);
    searchTerms.set(term, ids);
  }
}
await writeFile(new URL("index.json", root), `${JSON.stringify({ generatedAt: source.generatedAt, source: source.source, count: index.length, entries: index }, null, 2)}\n`);
await writeFile(new URL("search-index.json", root), `${JSON.stringify({ generatedAt: source.generatedAt, articleCount: index.length, tokenCount: searchTerms.size, terms: Object.fromEntries(searchTerms) })}\n`);
console.log(`Materialized ${source.entries.length} article pages and their source index.`);
