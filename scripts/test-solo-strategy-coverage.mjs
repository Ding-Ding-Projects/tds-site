import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { STRATEGY_MODES, validateSoloStrategyCoverage } from "../lib/solo-strategy-coverage.mjs";
import { getEffectiveStrategyMap, getStrategyMapOptions } from "../lib/strategy-map-options.mjs";

const component = await readFile(new URL("../components/strategy-lab.tsx", import.meta.url), "utf8");

test("every supported mode has exactly one solo and one co-op plan with phases and source attribution", () => {
  assert.equal(STRATEGY_MODES.length, 15);
  assert.deepEqual(validateSoloStrategyCoverage(component), []);
  assert.ok(component.includes("Snapshot: v2.11.0 · reviewed 2026-09-26"));
  assert.ok(component.includes("https://www.roblox.com/games/3260590327/Tower-Defense-Simulator"));
});

test("strategy coverage fails when a solo mode plan is removed", () => {
  const row = component.split(/\r?\n/).find((line) => line.startsWith('  { mode: "Badlands II"') && line.includes('team: "Solo"'));
  assert.ok(row);
  const incomplete = component.replace(row, "");
  assert.ok(validateSoloStrategyCoverage(incomplete).includes("missing Solo strategy plan: Badlands II"));
});

test("solo strategy coverage fails when the mode catalog drifts", () => {
  const changed = component.replace('const modes = ["Casual"', 'const modes = ["Unreviewed"');
  assert.ok(validateSoloStrategyCoverage(changed).includes("strategy mode list differs from the required catalog"));
});

test("co-op strategy coverage fails when a mode plan is removed", () => {
  const row = component.split(/\r?\n/).find((line) => line.startsWith('  { mode: "Badlands II"') && line.includes('team: "Co-op"'));
  assert.ok(row);
  const incomplete = component.replace(row, "");
  assert.ok(validateSoloStrategyCoverage(incomplete).includes("missing Co-op strategy plan: Badlands II"));
});

test("solo map choices respect fixed-map modes and replace stale selections", () => {
  assert.deepEqual(getStrategyMapOptions("Pizza Party"), ["Pizza Party"]);
  assert.deepEqual(getStrategyMapOptions("Badlands II"), ["Badlands II"]);
  assert.deepEqual(getStrategyMapOptions("Polluted Wasteland II"), ["Polluted Wasteland II"]);
  assert.deepEqual(getStrategyMapOptions("Hidden Wave"), ["Fungi Island", "Wrecked Battlefield", "Summer Castle"]);
  assert.equal(getEffectiveStrategyMap("Pizza Party", "Gilded Path"), "Pizza Party");
  assert.equal(getEffectiveStrategyMap("Frost", "Mode default"), "Mode default");
  assert.equal(getEffectiveStrategyMap("Frost", "Space City"), "Space City");
});
