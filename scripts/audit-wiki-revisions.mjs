import { readFile, writeFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import { compareWikiRevisions } from "../lib/wiki-revision-audit.mjs";

const api = "https://tds.wiki/api.php";
const userAgent = "TDSStrategyLab/0.1 (read-only revision freshness audit; contact via GitHub Ding-Ding-Projects/tds-site)";
const index = JSON.parse(await readFile(new URL("../public/wiki/index.json", import.meta.url), "utf8"));
const snapshot = index.entries;
const live = [];

for (let offset = 0; offset < snapshot.length; offset += 50) {
  const batch = snapshot.slice(offset, offset + 50);
  const params = new URLSearchParams({
    action: "query", pageids: batch.map((entry) => entry.pageid).join("|"), prop: "revisions", rvprop: "ids",
    format: "json", formatversion: "2",
  });
  const response = await fetch(`${api}?${params}`, { headers: { "User-Agent": userAgent } });
  if (!response.ok) throw new Error(`MediaWiki revision audit returned ${response.status} ${response.statusText}`);
  const body = await response.json();
  if (body.error) throw new Error(`MediaWiki revision audit: ${body.error.code} ${body.error.info}`);
  for (const page of body.query.pages ?? []) {
    live.push({ pageid: page.pageid, title: page.title, revisionId: page.revisions?.[0]?.revid ?? null });
  }
  if (offset + 50 < snapshot.length) await delay(150);
  if ((offset + batch.length) % 500 === 0 || offset + batch.length === snapshot.length) console.log(`Revision freshness audit: ${Math.min(offset + batch.length, snapshot.length)}/${snapshot.length}`);
}

const result = compareWikiRevisions(snapshot, live);
const report = {
  schemaVersion: 1,
  auditedAt: new Date().toISOString(),
  snapshotGeneratedAt: index.generatedAt,
  snapshotCount: snapshot.length,
  liveCount: live.length,
  counts: result.counts,
  issues: result.issues,
  entries: result.entries,
};
await writeFile(new URL("../data/wiki-revision-audit.json", import.meta.url), `${JSON.stringify(report, null, 2)}\n`);
console.log(`Wiki revision freshness: ${result.counts.current} current, ${result.counts["stale-revision"]} stale, ${result.counts["missing-live-page"]} missing, ${result.counts["new-live-page"]} new, ${result.issues.length} integrity issues.`);
if (!result.clean) process.exitCode = 1;
