import { mkdir, readFile, writeFile } from "node:fs/promises";

const source = JSON.parse(await readFile(new URL("../data/wiki-corpus.json", import.meta.url), "utf8"));
const root = new URL("../public/wiki/", import.meta.url);
const pageRoot = new URL("pages/", root);
await mkdir(pageRoot, { recursive: true });
async function writeIfChanged(target, content) {
  try {
    const existing = (await readFile(target, "utf8")).replace(/\r\n/g, "\n");
    if (existing === content.replace(/\r\n/g, "\n")) return;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  await writeFile(target, content);
}
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
  await writeIfChanged(new URL(`${entry.pageid}.json`, pageRoot), `${JSON.stringify(publicRecord)}\n`);
  const terms = new Set(`${entry.title} ${wikitext}`.normalize("NFKC").toLocaleLowerCase().match(/[\p{L}\p{N}]{2,}/gu) ?? []);
  for (const term of terms) {
    const ids = searchTerms.get(term) ?? [];
    ids.push(entry.pageid);
    searchTerms.set(term, ids);
  }
}
await writeIfChanged(new URL("index.json", root), `${JSON.stringify({ generatedAt: source.generatedAt, source: source.source, count: index.length, entries: index }, null, 2)}\n`);
await writeIfChanged(new URL("search-index.json", root), `${JSON.stringify({ generatedAt: source.generatedAt, articleCount: index.length, tokenCount: searchTerms.size, terms: Object.fromEntries(searchTerms) })}\n`);
await writeIfChanged(new URL("wiki-revisions.json", new URL("../data/", import.meta.url)), `${JSON.stringify(source.entries.map(({ pageid, revisionId, namespace }) => ({ pageid, revisionId, namespace })))}\n`);
console.log(`Materialized ${source.entries.length} article pages and their source index.`);
