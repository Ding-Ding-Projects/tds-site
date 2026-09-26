import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { validateWikiCorpus } from "../lib/wiki-corpus-contract.mjs";

const index = JSON.parse(await readFile(new URL("../public/wiki/index.json", import.meta.url), "utf8"));
const revisionBytes = await readFile(new URL("../data/wiki-revisions.json", import.meta.url));
const revisions = JSON.parse(revisionBytes.toString("utf8"));
const wikiCorpus = JSON.parse(await readFile(new URL("../data/wiki-corpus.json", import.meta.url), "utf8"));
const renderAudit = JSON.parse(await readFile(new URL("../data/wiki-render-audit.json", import.meta.url), "utf8"));
const pageDirectory = new URL("../public/wiki/pages/", import.meta.url);
const files = (await readdir(pageDirectory)).filter((name) => /^\d+\.json$/.test(name));
const records = new Map(await Promise.all(files.map(async (name) => {
  const record = JSON.parse(await readFile(new URL(name, pageDirectory), "utf8"));
  return [String(record.pageid), record];
})));

test("every eligible encyclopedia page has exact source and revision provenance", () => {
  assert.deepEqual(validateWikiCorpus(index, revisions, records), []);
});

test("the completeness check fails when one imported page is missing", () => {
  const first = index.entries[0];
  const incomplete = new Map(records);
  incomplete.delete(String(first.pageid));
  assert.ok(validateWikiCorpus(index, revisions, incomplete).some((issue) => issue.includes(`missing page file ${first.pageid}`)));
});

test("the completeness check fails when one revision provenance row is missing", () => {
  const first = index.entries[0];
  const incompleteRevisions = revisions.filter((entry) => entry.revisionId !== first.revisionId);
  assert.ok(validateWikiCorpus(index, incompleteRevisions, records).some((issue) => issue.includes(`revision allowlist mismatch for page ${first.pageid}`)));
});

test("the completeness check fails when license provenance is removed", () => {
  const first = index.entries[0];
  const incomplete = new Map(records);
  incomplete.set(String(first.pageid), { ...records.get(String(first.pageid)), licensePolicyUrl: "" });
  const issues = validateWikiCorpus(index, revisions, incomplete);
  assert.ok(issues.some((issue) => issue.includes(`missing licensePolicyUrl for page ${first.pageid}`)));
  assert.ok(issues.some((issue) => issue.includes(`source provenance URL mismatch for page ${first.pageid}`)));
});

test("the completeness check fails when adaptation or direct license provenance is removed", () => {
  const first = index.entries[0];
  const original = records.get(String(first.pageid));
  const missingAdaptation = new Map(records);
  missingAdaptation.set(String(first.pageid), { ...original, adaptation: null });
  assert.ok(validateWikiCorpus(index, revisions, missingAdaptation).some((issue) => issue.includes(`missing or mismatched adaptation provenance for page ${first.pageid}`)));

  const missingLicense = new Map(records);
  missingLicense.set(String(first.pageid), { ...original, licenseUrl: "" });
  assert.ok(validateWikiCorpus(index, revisions, missingLicense).some((issue) => issue.includes(`missing licenseUrl for page ${first.pageid}`)));

  const missingHistoricalLicense = new Map(records);
  missingHistoricalLicense.set(String(first.pageid), { ...original, historicalLicenseUrl: "" });
  assert.ok(validateWikiCorpus(index, revisions, missingHistoricalLicense).some((issue) => issue.includes(`missing historicalLicenseUrl for page ${first.pageid}`)));
});

test("the full rendering audit matches the exact imported revision snapshot", () => {
  const namespaceZeroCount = index.entries.filter((entry) => entry.namespace === 0).length;
  const mapNamespaceCount = index.entries.filter((entry) => entry.namespace === 2900).length;
  const canonicalRevisionSet = revisions.map(({ pageid, revisionId, namespace }) => ({ pageid, revisionId, namespace }));
  const canonicalRevisionSetHash = createHash("sha256").update(JSON.stringify(canonicalRevisionSet)).digest("hex");
  const historicalAuditInput = wikiCorpus.entries.map(({ pageid, title, revisionId, namespace }) => ({ pageid, title, revisionId, namespace }));
  const historicalAuditHash = createHash("sha256").update(`${JSON.stringify(historicalAuditInput)}\n`).digest("hex");
  assert.equal(renderAudit.currentRevisionAllowlistSha256, canonicalRevisionSetHash);
  assert.equal(renderAudit.canonicalRevisionSetSha256, canonicalRevisionSetHash);
  assert.equal(renderAudit.sourceSnapshotSha256, historicalAuditHash);
  assert.equal(renderAudit.importedRevisionCount, index.entries.length);
  assert.equal(renderAudit.remoteRevisionHtml.namespace, 0);
  assert.equal(renderAudit.remoteRevisionHtml.count, namespaceZeroCount);
  assert.equal(renderAudit.remoteRevisionHtml.sanitized, namespaceZeroCount);
  assert.equal(renderAudit.importedSourceFallback.namespace, 2900);
  assert.equal(renderAudit.importedSourceFallback.count, mapNamespaceCount);
  assert.equal(renderAudit.failedCount, 0);
  assert.equal(renderAudit.failures.length, 0);
});
