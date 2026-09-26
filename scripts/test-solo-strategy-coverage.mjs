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
  assert.ok(component.includes("For Lost Souls matches only"));
  assert.ok(component.includes("No post-v2.3.0 complete solo run is verified here."));
});

test("Polluted Wasteland II separates a historical v1.83.10 clear report from current feasibility", () => {
  const soloRow = component.split(/\r?\n/).find((line) => line.startsWith('  { mode: "Polluted Wasteland II"') && line.includes('team: "Solo"'));
  const historicalVideo = "https://www.youtube.com/watch?v=kNXHDUkjqa8";
  const currentUpdate = "https://tds.wiki/w/V2.3.0";
  assert.ok(soloRow);
  for (const fact of ["v1.83.10", "maxed skill tree", "The live Official Wiki Strategy section now says solo completion is impossible", historicalVideo, currentUpdate, "No post-v2.3.0 complete solo run is verified here."]) {
    assert.ok(soloRow.includes(fact), `Solo Polluted Wasteland II should preserve this dated evidence: ${fact}`);
  }
  const hasHistoricalCandidate = (source) => source.includes(historicalVideo)
    && source.includes("Historical solo triumph report · v1.83.10 · maxed skill tree")
    && source.includes("not a current build or guarantee");
  assert.equal(hasHistoricalCandidate(component), true);
  assert.equal(hasHistoricalCandidate(component.split(historicalVideo).join("")), false, "removing the video citation must invalidate the historical candidate");
});

test("Fallen Solo exposes the attributed staged proposal without calling it a verified clear", () => {
  const sourceUrl = "https://www.reddit.com/r/TDS_Roblox/comments/1vgav6u/solo_fallen_mode_strategy_level_50/";
  const containsCandidate = (source) => source.includes(sourceUrl) && source.includes("August 2026 player post outlines a pre-Wave-35 build") && source.includes("does not claim a verified clear");
  assert.equal(containsCandidate(component), true);
  assert.equal(containsCandidate(component.split(sourceUrl).join("")), false, "removing every copy of the source link must remove the sourced-candidate evidence");
});

test("Fallen Solo includes the reported wave-35 economy and pressure case with its evidence limit", () => {
  const sourceUrl = "https://www.reddit.com/r/TowerDefenseSimulator/comments/1vaobut/any-tips-for-solo-fallen/";
  const hasEvidence = (source) => source.includes(sourceUrl)
    && source.includes("Economy-first pressure test: Engineer · Kingpin · Crook Boss · Juggernaut · Commander")
    && source.includes("faster enemy waves after wave 35")
    && source.includes("not a complete purchase order or independently verified clear");
  assert.equal(hasEvidence(component), true);
  assert.equal(hasEvidence(component.split(sourceUrl).join("")), false, "removing the discussion citation must invalidate the Solo Fallen candidate");
});

test("Frost Solo exposes the caveated budget proposal and fails when its source is removed", () => {
  const sourceUrl = "https://www.reddit.com/r/TDS_Roblox/comments/1vaqkuy/cheapest_possible_solo_frost_loadout/";
  const containsCandidate = (source) => source.includes(sourceUrl) && source.includes("Long-map budget route") && source.includes("clear provenance are unclear") && source.includes("not a verified route");
  assert.equal(containsCandidate(component), true);
  assert.equal(containsCandidate(component.split(sourceUrl).join("")), false, "removing every source link must invalidate the sourced Frost candidate");
});

test("Frost Solo distinguishes both official bosses and their detection and phase requirements", () => {
  const row = component.split(/\r?\n/).find((line) => line.startsWith('  { mode: "Frost"') && line.includes('team: "Solo"'));
  assert.ok(row);
  for (const fact of ["Frost Champion mini-boss", "Wave 33", "Wave 40", "Lead Frost Invaders", "Hidden Unstable Ice", "10% for 30 seconds", "32% health", "Ice Beacons", "4,500 HP per second"]) {
    assert.ok(row.includes(fact), `Solo Frost plan should preserve the source-backed checkpoint: ${fact}`);
  }
  assert.ok(row.includes("Frost_Champion"));
  assert.ok(row.includes("Frost_Spirit"));
  assert.ok(row.includes("no current wave-by-wave Solo route is independently reproduced"));
});

test("every mode has four Solo decision checkpoints and the checklist stays out of Co-op", () => {
  assert.deepEqual(validateSoloStrategyCoverage(component), []);
  const missingMode = component.replace('  "Challenge Trials": [', '  "Challenge Trial": [');
  assert.ok(validateSoloStrategyCoverage(missingMode).includes("missing Solo decision checkpoints: Challenge Trials"));
  const easyStart = component.indexOf('  "Easy": [');
  const easyEnd = component.indexOf("\n  ]", easyStart);
  const easyBlock = component.slice(easyStart, easyEnd).replace(/\n    \{ title:[^\n]+/, "");
  const shortened = component.slice(0, easyStart) + easyBlock + component.slice(easyEnd);
  assert.ok(validateSoloStrategyCoverage(shortened).includes("Solo decision checkpoints must contain four steps: Easy"));
  const coOpLeak = component.replace('team === "Solo" && <section className="solo-checklist"', '<section className="solo-checklist"');
  assert.ok(validateSoloStrategyCoverage(coOpLeak).includes("Solo decision checkpoints are not restricted to the Solo view"));
  assert.match(component, /const planText = .*soloNotes/);
  assert.ok(component.includes("new SpeechSynthesisUtterance(planText)"));
  assert.ok(component.includes("navigator.clipboard?.writeText(planText)"));
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
