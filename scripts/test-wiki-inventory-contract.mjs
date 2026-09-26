import assert from "node:assert/strict";
import test from "node:test";
import { compareWikiInventory } from "../lib/wiki-inventory-contract.mjs";

const page = (pageid, title, namespace = 0) => ({ pageid, title, namespace });

test("a matching namespace inventory is clean", () => {
  const result = compareWikiInventory([page(1, "Main Page"), page(2, "Map", 2900)], [page(1, "Main Page"), page(2, "Map", 2900)]);
  assert.equal(result.clean, true);
  assert.deepEqual(result.added, []);
  assert.deepEqual(result.removed, []);
});

test("the inventory audit identifies added, removed, renamed, and moved pages", () => {
  const result = compareWikiInventory(
    [page(1, "Kept"), page(2, "Removed"), page(3, "Old title"), page(4, "Old namespace")],
    [page(1, "Kept"), page(3, "New title"), page(4, "New namespace", 2900), page(5, "Added")],
  );
  assert.equal(result.clean, false);
  assert.deepEqual(result.added.map((entry) => entry.pageid), [5]);
  assert.deepEqual(result.removed.map((entry) => entry.pageid), [2]);
  assert.deepEqual(result.renamed.map(({ pageid, from, to }) => ({ pageid, from, to })), [{ pageid: 3, from: "Old title", to: "New title" }]);
  assert.deepEqual(result.moved.map(({ pageid, from, to }) => ({ pageid, from, to })), [{ pageid: 4, from: 0, to: 2900 }]);
});

test("duplicate IDs fail the inventory comparison", () => {
  const result = compareWikiInventory([page(1, "Saved"), page(1, "Duplicate")], [page(1, "Live")]);
  assert.equal(result.clean, false);
  assert.ok(result.issues.includes("duplicate snapshot page ID: 1"));
  assert.equal(result.renamed.length, 1);
});
