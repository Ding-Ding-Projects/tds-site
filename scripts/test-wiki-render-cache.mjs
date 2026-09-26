import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { validateWikiRenderCache } from "../lib/wiki-render-cache-contract.mjs";

const sourceIndex = JSON.parse(await readFile(new URL("../public/wiki/index.json", import.meta.url), "utf8"));
const revisions = JSON.parse(await readFile(new URL("../data/wiki-revisions.json", import.meta.url), "utf8"));
const revisionBytes = await readFile(new URL("../data/wiki-revisions.json", import.meta.url));
const renderIndex = JSON.parse(await readFile(new URL("../public/wiki/rendered/index.json", import.meta.url), "utf8"));
const readerSource = await readFile(new URL("../components/wiki-rendered-article.tsx", import.meta.url), "utf8");
const cacheRoot = new URL("../public/wiki/rendered/", import.meta.url);
const files = new Map();
const cacheFileNames = await readdir(cacheRoot);
const unexpectedFileNames = cacheFileNames.filter((name) => name !== "index.json" && !/^\d+\.json$/.test(name));
for (const name of cacheFileNames) {
  if (name === "index.json" || !/^\d+\.json$/.test(name)) continue;
  const bytes = await readFile(new URL(name, cacheRoot));
  const item = JSON.parse(bytes.toString("utf8"));
  files.set(String(item.pageid), {
    pageid: item.pageid,
    revisionId: item.revisionId,
    schemaVersion: item.schemaVersion,
    nodeCount: item.nodeCount,
    contentValid: Array.isArray(item.content),
    sha256: createHash("sha256").update(bytes).digest("hex"),
    sizeBytes: bytes.byteLength,
  });
}

test("every standard page has a revision-matched sanitized offline render", () => {
  assert.deepEqual(unexpectedFileNames, []);
  const snapshotSha = createHash("sha256").update(revisionBytes).digest("hex");
  assert.equal(renderIndex.revisionAllowlistSha256, snapshotSha);
  assert.deepEqual(validateWikiRenderCache(sourceIndex.entries, renderIndex, files), []);
  assert.equal(files.size, sourceIndex.entries.filter((entry) => entry.namespace === 0).length);
  assert.equal(revisions.length, sourceIndex.count);
});

test("the offline render completeness check rejects missing or stale entries", () => {
  const missing = { ...renderIndex, entries: renderIndex.entries.slice(1) };
  assert.ok(validateWikiRenderCache(sourceIndex.entries, missing, files).some((issue) => issue.startsWith("missing rendered cache index entry")));

  const staleEntries = renderIndex.entries.map((entry, index) => index === 0 ? { ...entry, revisionId: entry.revisionId + 1 } : entry);
  assert.ok(validateWikiRenderCache(sourceIndex.entries, { ...renderIndex, entries: staleEntries }, files).some((issue) => issue.includes("rendered cache revision mismatch")));
});

test("the offline render completeness check rejects altered digests and orphan files", () => {
  const firstId = String(renderIndex.entries[0].pageid);
  const tampered = new Map(files);
  tampered.set(firstId, { ...tampered.get(firstId), sha256: "0".repeat(64) });
  assert.ok(validateWikiRenderCache(sourceIndex.entries, renderIndex, tampered).some((issue) => issue.includes(`rendered cache digest mismatch for page ${firstId}`)));

  const orphan = new Map(files);
  orphan.set("999999999", { pageid: 999999999, revisionId: 1, schemaVersion: 1, nodeCount: 1, contentValid: true, sha256: "0".repeat(64), sizeBytes: 1 });
  assert.ok(validateWikiRenderCache(sourceIndex.entries, renderIndex, orphan).some((issue) => issue === "orphan rendered cache file for page 999999999"));
});

test("the article reader uses the local revision cache before its network fallback", () => {
  const localRead = readerSource.indexOf("/wiki/rendered/${pageid}.json");
  const networkFallback = readerSource.indexOf("/api/wiki-rendered/${revisionId}");
  assert.ok(localRead >= 0);
  assert.ok(networkFallback > localRead);
  assert.ok(readerSource.includes("namespace === 2900"));
  assert.ok(readerSource.includes("cached.pageid === pageid && cached.revisionId === revisionId"));
});
