import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { sanitizeWikiHtml } from "../lib/wiki-html-sanitizer.mjs";

const revisionFile = new URL("../data/wiki-revisions.json", import.meta.url);
const revisions = JSON.parse(await readFile(revisionFile, "utf8"));
const canonicalRevisionSet = revisions.map(({ pageid, revisionId, namespace }) => ({ pageid, revisionId, namespace }));
const snapshotSha256 = createHash("sha256").update(JSON.stringify(canonicalRevisionSet)).digest("hex");
const revisionSetSha256 = snapshotSha256;
const wikiCorpus = JSON.parse(await readFile(new URL("../data/wiki-corpus.json", import.meta.url), "utf8"));
const sourceSnapshot = wikiCorpus.entries.map(({ pageid, title, revisionId, namespace }) => ({ pageid, title, revisionId, namespace }));
const sourceSnapshotSha256 = createHash("sha256").update(`${JSON.stringify(sourceSnapshot)}\n`).digest("hex");
const concurrency = 3;
const delayMs = 180;
const userAgent = "TDS Strategy Lab/1.0 (public corpus audit; https://github.com/Ding-Ding-Projects/tds-site)";
const mapFallbackReason = "The custom map namespace returns a widget fragment without the standard page-revision envelope; use the complete imported source with the local formatter.";
const standardEntries = revisions.filter((entry) => entry.namespace === 0);
const mapEntries = revisions.filter((entry) => entry.namespace === 2900);
const renderedRoot = new URL("../public/wiki/rendered/", import.meta.url);
const renderedIndexUrl = new URL("index.json", renderedRoot);
await mkdir(renderedRoot, { recursive: true });
let priorCacheIndex = null;
try {
  priorCacheIndex = JSON.parse(await readFile(renderedIndexUrl, "utf8"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
if (!priorCacheIndex && (await readdir(renderedRoot)).length > 0) {
  throw new Error("The rendered cache directory has files but no manifest; refusing to overwrite unknown data.");
}
if (priorCacheIndex && (priorCacheIndex.schemaVersion !== 1 || !Array.isArray(priorCacheIndex.entries))) {
  throw new Error("The prior rendered cache manifest is invalid; refusing to overwrite its data.");
}
let next = 0;
let completed = 0;
const failures = [];
const totals = { responseBytes: 0, sanitizedNodes: 0, cacheBytes: 0 };
const sourceFallbacks = [];
const cachedPages = [];
const priorEntries = new Map((priorCacheIndex?.entries ?? []).map((entry) => [String(entry.pageid), entry]));
let reusedCachePages = 0;

async function reuseCachedPage(entry) {
  const prior = priorEntries.get(String(entry.pageid));
  if (!prior || prior.revisionId !== entry.revisionId || prior.file !== `${entry.pageid}.json`) return false;
  try {
    const bytes = await readFile(new URL(prior.file, renderedRoot));
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    if (bytes.byteLength !== prior.sizeBytes || sha256 !== prior.sha256) return false;
    const cached = JSON.parse(bytes.toString("utf8"));
    if (cached.pageid !== entry.pageid || cached.revisionId !== entry.revisionId || cached.schemaVersion !== 1 || !Array.isArray(cached.content) || !Number.isSafeInteger(cached.nodeCount)) return false;
    cachedPages.push({ pageid: entry.pageid, revisionId: entry.revisionId, file: prior.file, sizeBytes: bytes.byteLength, sha256 });
    totals.sanitizedNodes += cached.nodeCount;
    totals.cacheBytes += bytes.byteLength;
    reusedCachePages += 1;
    return true;
  } catch {
    return false;
  }
}

async function auditOne(entry) {
  if (await reuseCachedPage(entry)) return { cached: true };
  const url = `https://tds.wiki/rest.php/v1/revision/${entry.revisionId}/html`;
  let lastCode = "network";
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { "Api-User-Agent": userAgent },
        redirect: "manual",
        signal: AbortSignal.timeout(20_000),
      });
      if (response.status !== 200) {
        lastCode = `http-${response.status}`;
      } else if (!response.headers.get("content-type")?.toLowerCase().startsWith("text/html")) {
        lastCode = "unexpected-content-type";
      } else {
        const declaredLength = Number(response.headers.get("content-length"));
        if (declaredLength > 6_000_000) {
          await response.body?.cancel();
          lastCode = "over-6mb-limit";
          continue;
        }
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (bytes.byteLength > 6_000_000) {
          lastCode = "over-6mb-limit";
        } else {
          const html = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
          if (!html.includes(`/revision/${entry.revisionId}`)) {
            lastCode = "revision-identity-mismatch";
          } else {
            const article = sanitizeWikiHtml(html);
            const cacheRecord = { ...article, pageid: entry.pageid, revisionId: entry.revisionId };
            const cachePayload = `${JSON.stringify(cacheRecord)}\n`;
            const cacheBytes = Buffer.byteLength(cachePayload);
            const cacheFile = `${entry.pageid}.json`;
            await writeFile(new URL(cacheFile, renderedRoot), cachePayload);
            cachedPages.push({ pageid: entry.pageid, revisionId: entry.revisionId, file: cacheFile, sizeBytes: cacheBytes, sha256: createHash("sha256").update(cachePayload).digest("hex") });
            totals.responseBytes += bytes.byteLength;
            totals.sanitizedNodes += article.nodeCount;
            totals.cacheBytes += cacheBytes;
            return { cached: false, failure: null };
          }
        }
      }
    } catch (error) {
      lastCode = error instanceof RangeError ? "sanitizer-limit" : error instanceof TypeError ? "decode-or-parse" : "network-or-timeout";
    }
    if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
  }
  return { cached: false, failure: { pageid: entry.pageid, revisionId: entry.revisionId, code: lastCode } };
}

async function worker() {
  while (next < revisions.length) {
    const entry = revisions[next++];
    if (entry.namespace === 2900) {
      sourceFallbacks.push({ pageid: entry.pageid, revisionId: entry.revisionId, reason: mapFallbackReason });
    } else {
      const result = await auditOne(entry);
      if (result.failure) failures.push(result.failure);
      if (!result.cached) await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    completed += 1;
    if (completed % 50 === 0 || completed === revisions.length) {
      console.log(`Rendered revision audit: ${completed}/${revisions.length}; source-fallback=${sourceFallbacks.length}; unavailable=${failures.length}`);
    }
  }
}

await Promise.all(Array.from({ length: concurrency }, worker));
if (failures.length === 0) {
  const currentPageIds = new Set(standardEntries.map((entry) => String(entry.pageid)));
  for (const oldEntry of priorCacheIndex?.entries ?? []) {
    if (!/^\d+\.json$/.test(oldEntry.file) || !Number.isSafeInteger(oldEntry.pageid)) throw new Error("The prior render-cache index contains an unsafe filename; refusing to remove it.");
    if (!currentPageIds.has(String(oldEntry.pageid))) await rm(new URL(oldEntry.file, renderedRoot), { force: true });
  }
  const cacheIndex = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    revisionAllowlistSha256: snapshotSha256,
    standardPageCount: standardEntries.length,
    entries: cachedPages.sort((a, b) => a.pageid - b.pageid),
  };
  await writeFile(renderedIndexUrl, `${JSON.stringify(cacheIndex, null, 2)}\n`);
}
const report = {
  schemaVersion: 2,
  auditedAt: new Date().toISOString(),
  sourceSnapshotSha256,
  currentRevisionAllowlistSha256: snapshotSha256,
  canonicalRevisionSetSha256: revisionSetSha256,
  importedRevisionCount: revisions.length,
  remoteRevisionHtml: { namespace: 0, count: standardEntries.length, sanitized: standardEntries.length - failures.length, reusedFromVerifiedCache: reusedCachePages, refreshedFromSource: standardEntries.length - failures.length - reusedCachePages, responseBytes: totals.responseBytes, sanitizedNodeCount: totals.sanitizedNodes },
  offlineSanitizedCache: { directory: "public/wiki/rendered", records: cachedPages.length, bytes: totals.cacheBytes, manifestPath: "public/wiki/rendered/index.json", boundToRevisionAllowlistSha256: snapshotSha256 },
  importedSourceFallback: { namespace: 2900, count: mapEntries.length, reason: mapFallbackReason, pages: sourceFallbacks },
  failedCount: failures.length,
  concurrency,
  interRequestDelayMs: delayMs,
  failures: failures.sort((a, b) => a.pageid - b.pageid),
};
const output = new URL("../data/wiki-render-audit.json", import.meta.url);
await mkdir(new URL("../data/", import.meta.url), { recursive: true });
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Audit saved: ${output.pathname}; rendered=${report.remoteRevisionHtml.sanitized}/${report.remoteRevisionHtml.count}; offline-cache=${report.offlineSanitizedCache.records}; source-fallback=${report.importedSourceFallback.count}; failed=${report.failedCount}; response-bytes=${report.remoteRevisionHtml.responseBytes}; cache-bytes=${report.offlineSanitizedCache.bytes}.`);
if (failures.length) process.exitCode = 1;
