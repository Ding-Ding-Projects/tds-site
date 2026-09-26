import { readFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import { compareWikiInventory } from "../lib/wiki-inventory-contract.mjs";

const api = "https://tds.wiki/api.php";
const namespaces = [0, 2900];
const userAgent = "TDSStrategyLab/0.1 (research corpus; contact via GitHub Ding-Ding-Projects/tds-site)";

async function fetchPageBatch(namespace, continuation) {
  const params = new URLSearchParams({
    action: "query",
    list: "allpages",
    apnamespace: String(namespace),
    apfilterredir: "nonredirects",
    aplimit: "500",
    format: "json",
    formatversion: "2",
    ...(continuation ?? {}),
  });
  const response = await fetch(`${api}?${params}`, { headers: { "User-Agent": userAgent } });
  if (!response.ok) throw new Error(`MediaWiki inventory request returned ${response.status} ${response.statusText}`);
  const body = await response.json();
  if (body.error) throw new Error(`MediaWiki inventory API: ${body.error.code} ${body.error.info}`);
  return body;
}

async function getLiveInventory() {
  const entries = [];
  for (const namespace of namespaces) {
    let continuation;
    do {
      const body = await fetchPageBatch(namespace, continuation);
      entries.push(...body.query.allpages.map(({ pageid, title, ns }) => ({ pageid, title, namespace: ns })));
      continuation = body.continue;
      if (continuation) await delay(120);
    } while (continuation);
  }
  return entries;
}

const snapshot = JSON.parse(await readFile(new URL("../public/wiki/index.json", import.meta.url), "utf8"));
const live = await getLiveInventory();
const result = compareWikiInventory(snapshot.entries, live);
console.log(`Wiki inventory: ${snapshot.entries.length} snapshot, ${live.length} live, ${result.added.length} added, ${result.removed.length} removed, ${result.renamed.length} renamed, ${result.moved.length} namespace moves.`);

for (const issue of result.issues) console.error(`Inventory integrity: ${issue}`);
for (const entry of result.added) console.error(`Added page ${entry.pageid} (namespace ${entry.namespace}): ${entry.title}`);
for (const entry of result.removed) console.error(`Missing live page ${entry.pageid} (namespace ${entry.namespace}): ${entry.title}`);
for (const entry of result.renamed) console.error(`Renamed page ${entry.pageid} (namespace ${entry.namespace}): ${entry.from} -> ${entry.to}`);
for (const entry of result.moved) console.error(`Moved page ${entry.pageid}: namespace ${entry.from} -> ${entry.to} (${entry.title})`);

if (!result.clean) process.exitCode = 1;
