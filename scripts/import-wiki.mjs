import { mkdir, writeFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";

const api = "https://tds.wiki/api.php";
const namespaces = [0, 2900];
const pages = new Map();
const request = async (params) => {
  const url = new URL(api);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
  const response = await fetch(url, { headers: { "User-Agent": "TDSStrategyLab/0.1 (research corpus; contact via GitHub Ding-Ding-Projects/tds-site)" } });
  if (!response.ok) throw new Error(`MediaWiki API returned ${response.status} ${response.statusText}`);
  const body = await response.json();
  if (body.error) throw new Error(`MediaWiki API: ${body.error.code} ${body.error.info}`);
  return body;
};

for (const namespace of namespaces) {
  let continuation;
  do {
    const body = await request({ action: "query", list: "allpages", apnamespace: namespace, apfilterredir: "nonredirects", aplimit: 500, format: "json", formatversion: 2, ...(continuation ?? {}) });
    for (const page of body.query.allpages) pages.set(page.pageid, page);
    continuation = body.continue;
  } while (continuation);
}

const inventory = [...pages.values()].sort((a, b) => a.ns - b.ns || a.title.localeCompare(b.title));
const corpus = [];
for (let offset = 0; offset < inventory.length; offset += 50) {
  const chunk = inventory.slice(offset, offset + 50);
  const retrievedAt = new Date().toISOString();
  const body = await request({
    action: "query", pageids: chunk.map((page) => page.pageid).join("|"), prop: "info|extracts|revisions",
    inprop: "url", explaintext: 1, exsectionformat: "plain",
    rvprop: "ids|timestamp|size|content", rvslots: "main", format: "json", formatversion: 2,
  });
  for (const page of body.query.pages) {
    const revision = page.revisions?.[0];
    if (!revision) continue;
    corpus.push({
      pageid: page.pageid, title: page.title, namespace: page.ns,
      sourceUrl: page.fullurl ?? `https://tds.wiki/wiki/${encodeURIComponent(page.title.replaceAll(" ", "_"))}`,
      historyUrl: `https://tds.wiki/w/${encodeURIComponent(page.title.replaceAll(" ", "_"))}?action=history`,
      revisionId: revision.revid, parentRevisionId: revision.parentid ?? null, revisionTimestamp: revision.timestamp,
      retrievedAt, sizeBytes: revision.size,
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
      historicalLicenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
      licensePolicyUrl: "https://tds.wiki/w/Tower_Defense_Simulator_Wiki:Copyrights",
      license: "Current page adaptations are reused under CC BY-SA 4.0 International with attribution and a change notice; copied pre-2026-09-12 wording may remain CC BY-SA 3.0.",
      attribution: `Adapted from ${page.title}, revision ${revision.revid}, retrieved from the Tower Defense Simulator Wiki API.`,
      adaptation: {
        method: page.ns === 0 ? "revision-html-sanitized" : "local-wikitext-renderer",
        sourceMarkupPreserved: true,
        changesMade: page.ns === 0
          ? "Article presentation uses the matching revision HTML with scripts, styles, hidden challenge markup, and remote image files removed; original source markup is retained."
          : "Article presentation uses the local source formatter because the map endpoint returns a widget fragment; original source markup is retained.",
        historicalLicenseNotice: "Unchanged wording from before 2026-09-12 remains under CC BY-SA 3.0; consult the revision history when reusing excerpts.",
        retrievedAt,
      },
      plainText: page.extract ?? "", wikitext: revision.slots?.main?.content ?? "",
    });
  }
  console.log(`Imported ${Math.min(offset + 50, inventory.length)} of ${inventory.length} article records`);
  await delay(220);
}

const output = new URL("../data/wiki-corpus.json", import.meta.url);
await mkdir(new URL("../data/", import.meta.url), { recursive: true });
await writeFile(output, `${JSON.stringify({ generatedAt: new Date().toISOString(), source: api, namespaces, count: corpus.length, entries: corpus }, null, 2)}\n`);
console.log(`Wrote ${corpus.length} articles to ${output.pathname}`);
