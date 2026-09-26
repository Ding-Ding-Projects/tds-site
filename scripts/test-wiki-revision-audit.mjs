import assert from "node:assert/strict";
import test from "node:test";
import { compareWikiRevisions } from "../lib/wiki-revision-audit.mjs";

const snapshot = [
  { pageid: 1, title: "A", revisionId: 10 },
  { pageid: 2, title: "B", revisionId: 20 },
];

test("the live revision audit accepts matching page revisions", () => {
  const result = compareWikiRevisions(snapshot, [
    { pageid: 1, title: "A", revisionId: 10 },
    { pageid: 2, title: "B", revisionId: 20 },
  ]);
  assert.equal(result.clean, true);
  assert.deepEqual(result.counts, { current: 2, "stale-revision": 0, "missing-live-page": 0, "new-live-page": 0 });
});

test("the live revision audit rejects stale, missing, and newly eligible pages", () => {
  const result = compareWikiRevisions(snapshot, [
    { pageid: 1, title: "A", revisionId: 11 },
    { pageid: 3, title: "C", revisionId: 30 },
  ]);
  assert.equal(result.clean, false);
  assert.deepEqual(result.entries.map(({ status }) => status), ["stale-revision", "missing-live-page", "new-live-page"]);
});

test("the live revision audit flags duplicate page IDs", () => {
  const result = compareWikiRevisions(snapshot, [
    { pageid: 1, title: "A", revisionId: 10 },
    { pageid: 1, title: "A copy", revisionId: 11 },
    { pageid: 2, title: "B", revisionId: 20 },
  ]);
  assert.equal(result.clean, false);
  assert.ok(result.issues.includes("duplicate live page ID 1"));
});
