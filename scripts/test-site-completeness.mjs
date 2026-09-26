import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { SITE_CONTRACT_FAMILIES, validateSiteCompletenessInventory } from "../lib/site-completeness-contract.mjs";

const inventoryUrl = new URL("../docs/guide/completeness.md", import.meta.url);
const inventory = await readFile(inventoryUrl, "utf8");

test("the hand-written completeness inventory covers every required family exactly once", () => {
  assert.equal(SITE_CONTRACT_FAMILIES.length, 12);
  assert.deepEqual(validateSiteCompletenessInventory(inventory), []);
});

test("the inventory check fails when a required family is removed", () => {
  const missingFamily = SITE_CONTRACT_FAMILIES[0];
  const incomplete = inventory.split(/\r?\n/)
    .filter((line) => !line.startsWith(`| ${missingFamily} |`))
    .join("\n");
  assert.ok(validateSiteCompletenessInventory(incomplete)
    .includes(`missing completeness family: ${missingFamily}`));
});

test("the inventory check rejects duplicate families and unsupported completion claims", () => {
  const originalRow = inventory.split(/\r?\n/).find((line) => line.startsWith(`| ${SITE_CONTRACT_FAMILIES[0]} |`));
  assert.ok(originalRow);
  const duplicate = inventory.replace(originalRow, `${originalRow}\n${originalRow}`);
  assert.ok(validateSiteCompletenessInventory(duplicate)
    .includes(`duplicate completeness family: ${SITE_CONTRACT_FAMILIES[0]}`));

  const unsupportedComplete = inventory.replace(originalRow, originalRow.replace("| open |", "| complete |"));
  assert.ok(validateSiteCompletenessInventory(unsupportedComplete)
    .includes(`complete family lacks linked evidence: ${SITE_CONTRACT_FAMILIES[0]}`));
});
