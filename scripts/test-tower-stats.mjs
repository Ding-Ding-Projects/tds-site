import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validateTowerStats } from "../lib/tower-stats-contract.mjs";

const catalog = JSON.parse(await readFile(new URL("../data/tower-stats.json", import.meta.url), "utf8"));
const corpus = JSON.parse(await readFile(new URL("../data/wiki-corpus.json", import.meta.url), "utf8"));
const find = (name) => catalog.towers.find((tower) => tower.name === name);

test("every imported tower has complete source-linked simulator fields", () => {
  assert.equal(catalog.count, catalog.towers.length);
  assert.deepEqual(validateTowerStats(catalog.towers, corpus.entries), []);
});

test("the simulator withholds generic DPS for special damage methods", () => {
  for (const name of ["Biologist", "Pulse Trooper", "Accelerator"]) {
    assert.equal(find(name)?.dpsFormula, "unmodeled-special", `${name} must not use generic DPS`);
  }
  assert.equal(find("Scout")?.dpsFormula, "damage-over-interval");
  assert.match(find("Minigunner")?.dpsMethod ?? "", /startup/i);
});

test("detection footnotes remain separate from the detection flag", () => {
  const pulseTrooper = find("Pulse Trooper");
  assert.equal(pulseTrooper?.levels[0].hidden, "No");
  assert.equal(pulseTrooper?.levels[0].flying, "No");
  assert.ok(pulseTrooper?.detectionNotes.some((note) => note.attribute === "Hidden" && /indirectly hit/i.test(note.text)));
  assert.ok(pulseTrooper?.detectionNotes.some((note) => note.attribute === "Flying" && /indirectly hit/i.test(note.text)));
});

test("the data contract rejects missing records, broken provenance, and false generic formulas", () => {
  const incomplete = catalog.towers.slice(1).map((tower) => ({ ...tower }));
  incomplete[0] = {
    ...incomplete[0],
    source: { ...incomplete[0].source, revisionId: "wrong-revision" },
    placementLimit: 0,
  };
  const biologistIndex = incomplete.findIndex((tower) => tower.name === "Biologist");
  incomplete[biologistIndex] = { ...incomplete[biologistIndex], dpsFormula: "damage-over-interval" };

  const issues = validateTowerStats(incomplete, corpus.entries);
  assert.ok(issues.some((issue) => issue.includes("tower count mismatch")));
  assert.ok(issues.some((issue) => issue.includes("source revision mismatch")));
  assert.ok(issues.some((issue) => issue.includes("invalid placement limit")));
  assert.ok(issues.some((issue) => issue.includes("special damage method has a generic DPS formula for Biologist")));
});
