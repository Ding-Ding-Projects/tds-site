import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { estimateInvestment, estimateTowerDps, validateTowerStats } from "../lib/tower-stats-contract.mjs";

const catalog = JSON.parse(await readFile(new URL("../data/tower-stats.json", import.meta.url), "utf8"));
const corpus = JSON.parse(await readFile(new URL("../data/wiki-corpus.json", import.meta.url), "utf8"));
const find = (name) => catalog.towers.find((tower) => tower.name === name);

test("every imported tower has complete source-linked simulator fields", () => {
  assert.equal(catalog.count, catalog.towers.length);
  assert.deepEqual(validateTowerStats(catalog.towers, corpus.entries), []);
});

test("the simulator withholds generic DPS for special damage methods", () => {
  for (const name of ["Biologist", "Pulse Trooper"]) {
    assert.equal(find(name)?.dpsFormula, "unmodeled-special", `${name} must not use generic DPS`);
  }
  assert.equal(find("Accelerator")?.dpsFormula, "accelerator-overcharge-cycle");
  assert.equal(find("Operator")?.dpsFormula, "operator-burst-cycle");
  assert.equal(find("Commando")?.dpsFormula, "commando-magazine-cycle");
  assert.equal(find("Soldier")?.dpsFormula, "soldier-burst-cycle");
  assert.equal(find("Golden Soldier")?.dpsFormula, "golden-soldier-cycle");
  assert.equal(find("Freezer")?.dpsFormula, "freezer-damage-cycle");
  assert.equal(find("Toxic Gunner")?.dpsFormula, "toxic-gunner-poison-cycle");
  assert.equal(find("Ace Pilot")?.dpsFormula, "ace-pilot-bomb-cycle");
  assert.equal(find("Golden Snowballer")?.dpsFormula, "splash-damage-cycle");
  assert.equal(find("Slime Trooper")?.dpsFormula, "single-target-damage-cycle");
  assert.equal(find("Demoman")?.dpsFormula, "splash-damage-cycle");
  assert.equal(find("Golden Demoman")?.dpsFormula, "splash-damage-cycle");
  assert.equal(find("Mortar")?.dpsFormula, "splash-damage-cycle");
  assert.equal(find("Paintballer")?.dpsFormula, "splash-damage-cycle");
  assert.equal(find("Snowballer")?.dpsFormula, "splash-damage-cycle");
  assert.equal(find("Rocketeer")?.dpsFormula, "missile-splash-cycle");
  assert.equal(find("Ranger")?.dpsFormula, "direct-splash-cycle");
  assert.equal(find("Scout")?.dpsFormula, "damage-over-interval");
  assert.match(find("Minigunner")?.dpsMethod ?? "", /startup/i);
});

test("Snowballer uses the wiki-listed single-target splash cycle and does not multiply hit count", () => {
  const snowballer = find("Snowballer");
  assert.deepEqual(snowballer.levels.map(({ splashDamage, splashInterval, splashMaxHits }) => [splashDamage, splashInterval, splashMaxHits]), [
    [3, 1.5, 2],
    [3, 1.35, 2],
    [6, 1.35, 2],
    [28, 1.25, 3],
  ]);
  assert.deepEqual(snowballer.levels.map((level) => estimateTowerDps(snowballer, level)), [2, 3 / 1.35, 6 / 1.35, 22.4]);
  assert.match(snowballer.dpsMethod, /Damage \/ Firerate/);
  assert.match(snowballer.dpsMethod, /Maximum-hit count.*excluded/i);
  const broken = { ...snowballer, levels: snowballer.levels.map((level) => ({ ...level })) };
  broken.levels[3].splashMaxHits = null;
  assert.ok(validateTowerStats([broken], catalog.towers.filter((tower) => tower.name === "Snowballer").map(() => corpus.entries.find((entry) => entry.pageid === broken.pageid))).includes("Snowballer maximum-hit source value is missing at level 3"));
});

test("Toxic Gunner combines source-listed burst or single-fire DPS with poison ticks", () => {
  const toxicGunner = find("Toxic Gunner");
  assert.deepEqual(toxicGunner.levels.map(({ damage, poisonDamage, burstCount, interval, tick, cooldown }) => [damage, poisonDamage, burstCount, interval, tick, cooldown]), [
    [1, 1, 4, 0.12, 1, 1.2],
    [1, 1, 4, 0.12, 1, 0.6],
    [1, 3, 8, 0.12, 1, 0.6],
    [4, 3, 20, 0.12, 1, 0.6],
    [8, 10, null, 0.12, 1, 0],
  ]);
  assert.deepEqual(toxicGunner.levels.map((level) => estimateTowerDps(toxicGunner, level)), [
    1 + 4 / 1.68,
    1 + 4 / 1.08,
    3 + 8 / 1.56,
    3 + 80 / 3,
    10 + 8 / 0.12,
  ]);
  assert.match(toxicGunner.dpsMethod, /assumes every shot poisons the same enemy/i);
  assert.equal(estimateTowerDps(toxicGunner, { ...toxicGunner.levels[0], tick: 0 }), null);
  assert.equal(estimateTowerDps(toxicGunner, { ...toxicGunner.levels[0], burstCount: null }), null);
});

test("Ace Pilot combines the source-listed gun rate with bomb splash cooldowns", () => {
  const acePilot = find("Ace Pilot");
  assert.deepEqual(acePilot.levels.map(({ damage, splashDamage, interval, bombCooldown }) => [damage, splashDamage, interval, bombCooldown]), [
    [2, null, 0.22, null],
    [3, null, 0.22, null],
    [4, 10, 0.22, 4],
    [5, 30, 0.15, 4],
    [8, 30, 0.15, 2],
    [14, 45, 0.12, 1.5],
  ]);
  assert.deepEqual(acePilot.levels.map((level) => estimateTowerDps(acePilot, level)), [
    2 / 0.22,
    3 / 0.22,
    4 / 0.22 + 10 / 4,
    5 / 0.15 + 30 / 4,
    8 / 0.15 + 30 / 2,
    14 / 0.12 + 45 / 1.5,
  ]);
  assert.match(acePilot.dpsMethod, /bomb splash is shown as a per-target-equivalent estimate/i);
  assert.equal(estimateTowerDps(acePilot, { ...acePilot.levels[2], bombCooldown: null }), null);
  assert.equal(estimateTowerDps(acePilot, { ...acePilot.levels[0], bombCooldown: 4 }), null);
});

test("Golden Snowballer uses the source single-target rate and keeps maximum hits separate", () => {
  const goldenSnowballer = find("Golden Snowballer");
  assert.deepEqual(goldenSnowballer.levels.map(({ splashDamage, splashInterval, splashMaxHits }) => [splashDamage, splashInterval, splashMaxHits]), [
    [6, 0.5, 2],
    [17, 0.35, 2],
    [67, 0.2, 2],
    [3267, 0.1, 4],
  ]);
  assert.deepEqual(goldenSnowballer.levels.map((level) => estimateTowerDps(goldenSnowballer, level)), [12, 17 / 0.35, 335, 32670]);
  assert.match(goldenSnowballer.dpsMethod, /one target receiving full damage/i);
  assert.equal(estimateTowerDps(goldenSnowballer, { ...goldenSnowballer.levels[0], splashMaxHits: null }), 12);
  const broken = { ...goldenSnowballer, levels: goldenSnowballer.levels.map((level) => ({ ...level })) };
  broken.levels[3].splashMaxHits = null;
  assert.ok(validateTowerStats([broken], corpus.entries.filter((entry) => entry.pageid === broken.pageid)).some((error) => /Golden Snowballer maximum-hit source value is missing at level 3/.test(error)));
});

test("Slime Trooper uses the source one-target rate without multiplying its Level 4 splash", () => {
  const slimeTrooper = find("Slime Trooper");
  assert.deepEqual(slimeTrooper.levels.map(({ damage, interval }) => [damage, interval]), [
    [10, 3],
    [10, 2.25],
    [20, 2.25],
    [46, 2.25],
    [64, 1.8],
  ]);
  assert.deepEqual(slimeTrooper.levels.map((level) => estimateTowerDps(slimeTrooper, level)), [10 / 3, 10 / 2.25, 20 / 2.25, 46 / 2.25, 64 / 1.8]);
  assert.match(slimeTrooper.dpsMethod, /one enemy receives full damage/i);
  assert.equal(estimateTowerDps(slimeTrooper, { ...slimeTrooper.levels[4], interval: 0 }), null);
  const broken = { ...slimeTrooper, levels: slimeTrooper.levels.map((level) => ({ ...level })) };
  broken.levels[4].interval = null;
  assert.ok(validateTowerStats([broken], corpus.entries.filter((entry) => entry.pageid === broken.pageid)).includes("Slime Trooper single-target inputs are incomplete at level 4"));
});

test("Accelerator DPS follows its source-listed charge, tick, cooldown, and overcharge cycle", () => {
  const accelerator = find("Accelerator");
  assert.equal(estimateTowerDps(accelerator, accelerator.levels[0]), 9000 / (6.5 + 2.5 + (9000 / 12 * 0.25)));
  assert.ok(Math.abs(estimateTowerDps(accelerator, accelerator.levels[0]) - 45.8) < 0.01);
  assert.ok(Math.abs(estimateTowerDps(accelerator, accelerator.levels[5]) - 474.31) < 0.01);
  assert.equal(estimateTowerDps(accelerator, { ...accelerator.levels[0], tick: null }), null);
});

test("Operator DPS follows source-listed burst stats and switches to single-fire at Levels 5 and 6", () => {
  const operator = find("Operator");
  assert.equal(operator.levels.length, 7);
  assert.deepEqual(operator.levels.map(({ burstCount, burstCooldown }) => [burstCount, burstCooldown]), [[6, 1.4], [6, 1.4], [6, 1], [9, 1], [9, 1], [null, 0], [null, 0]]);
  assert.ok(Math.abs(estimateTowerDps(operator, operator.levels[0]) - 2.83) < 0.01);
  assert.ok(Math.abs(estimateTowerDps(operator, operator.levels[4]) - 28.42) < 0.01);
  assert.equal(estimateTowerDps(operator, operator.levels[5]), 37.5);
  assert.equal(estimateTowerDps(operator, operator.levels[6]), 62.5);
});

test("Commando DPS follows its source-listed magazine cycle and excludes missile ability damage", () => {
  const commando = find("Commando");
  assert.equal(commando.levels.length, 5);
  assert.deepEqual(commando.levels.map(({ ammo, reloadTime }) => [ammo, reloadTime]), [[30, 2.25], [30, 2], [45, 2], [60, 1.5], [80, 1.25]]);
  assert.ok(Math.abs(estimateTowerDps(commando, commando.levels[0]) - (30 * 5) / (30 * 0.225 + 2.25)) < 0.01);
  assert.ok(Math.abs(estimateTowerDps(commando, commando.levels[4]) - (80 * 23) / (80 * 0.1 + 1.25)) < 0.01);
  assert.match(commando.dpsMethod, /Missile ability damage is excluded/i);
});

test("Soldier DPS follows its source-listed burst and between-burst cooldown", () => {
  const soldier = find("Soldier");
  assert.equal(soldier.levels.length, 5);
  assert.deepEqual(soldier.levels.map(({ burstCount, burstCooldown }) => [burstCount, burstCooldown]), [[3, 0.5], [3, 0.4], [4, 0.4], [8, 0.4], [12, 0.4]]);
  assert.ok(Math.abs(estimateTowerDps(soldier, soldier.levels[0]) - (1 * 3) / (0.5 + (0.175 * 3))) < 0.01);
  assert.ok(Math.abs(estimateTowerDps(soldier, soldier.levels[4]) - (10 * 12) / (0.4 + (0.15 * 12))) < 0.01);
  assert.match(soldier.dpsMethod, /Firerate applies within the burst/i);
});

test("Golden Soldier DPS follows burst levels then switches to single-fire", () => {
  const goldenSoldier = find("Golden Soldier");
  assert.equal(goldenSoldier.levels.length, 5);
  assert.deepEqual(goldenSoldier.levels.map(({ burstCount, burstCooldown }) => [burstCount, burstCooldown]), [[4, 0.45], [4, 0.35], [5, 0.35], [null, 0], [null, 0]]);
  assert.ok(Math.abs(estimateTowerDps(goldenSoldier, goldenSoldier.levels[0]) - (1 * 4) / (0.45 + (0.15 * 4))) < 0.01);
  assert.equal(estimateTowerDps(goldenSoldier, goldenSoldier.levels[3]), 4 / 0.12);
  assert.equal(estimateTowerDps(goldenSoldier, goldenSoldier.levels[4]), 12 / 0.12);
  assert.match(goldenSoldier.dpsMethod, /single-fire levels use Damage \/ Firerate/i);
});

test("Freezer DPS follows single-hit levels and the burst cycle at Levels 3 and 4", () => {
  const freezer = find("Freezer");
  assert.equal(freezer.levels.length, 5);
  assert.deepEqual(freezer.levels.map(({ burstCount, burstCooldown }) => [burstCount, burstCooldown]), [[1, 0], [1, 0], [1, 0], [6, 0.6], [8, 0.6]]);
  assert.ok(Math.abs(estimateTowerDps(freezer, freezer.levels[0]) - 2 / 0.55) < 0.01);
  assert.ok(Math.abs(estimateTowerDps(freezer, freezer.levels[3]) - (4 * 6) / (0.6 + (0.15 * 6))) < 0.01);
  assert.ok(Math.abs(estimateTowerDps(freezer, freezer.levels[4]) - (9 * 8) / (0.6 + (0.15 * 8))) < 0.01);
  assert.match(freezer.dpsMethod, /Chill and slowdown effects are excluded/i);
});

test("Demoman splash estimates use source damage and interval without assuming target count", () => {
  const demoman = find("Demoman");
  const goldenDemoman = find("Golden Demoman");
  assert.deepEqual(demoman.levels.map(({ splashDamage, splashInterval }) => [splashDamage, splashInterval]), [[8, 2.6], [8, 1.9], [18, 1.9], [25, 1.5], [35, 1]]);
  assert.deepEqual(goldenDemoman.levels.map(({ splashDamage, splashInterval }) => [splashDamage, splashInterval]), [[10, 1.95], [10, 1.8], [18, 1.8], [25, 1.1], [25, 0.45]]);
  assert.ok(Math.abs(estimateTowerDps(demoman, demoman.levels[0]) - 8 / 2.6) < 0.01);
  assert.equal(estimateTowerDps(demoman, { ...demoman.levels[0], splashDamage: null }), null);
  assert.ok(Math.abs(estimateTowerDps(goldenDemoman, goldenDemoman.levels[4]) - 25 / 0.45) < 0.01);
  assert.match(demoman.dpsMethod, /Actual total damage depends on how many enemies a blast hits/i);
});

test("Mortar splash estimates use the named source columns and exclude cluster damage", () => {
  const mortar = find("Mortar");
  assert.deepEqual(mortar.levels.map(({ splashDamage, splashInterval }) => [splashDamage, splashInterval]), [[15, 4], [15, 2.75], [35, 2.75], [65, 2.75], [100, 2.75], [235, 2.75]]);
  assert.ok(Math.abs(estimateTowerDps(mortar, mortar.levels[0]) - 15 / 4) < 0.01);
  assert.ok(Math.abs(estimateTowerDps(mortar, mortar.levels[5]) - 235 / 2.75) < 0.01);
  assert.match(mortar.dpsMethod, /cluster damage and target count are excluded/i);
});

test("Paintballer estimates use the source splash formula without applying its separate maximum-hit count", () => {
  const paintballer = find("Paintballer");
  assert.deepEqual(paintballer.levels.map(({ splashDamage, splashInterval, splashMaxHits }) => [splashDamage, splashInterval, splashMaxHits]), [[1, 1.7, 8], [1, 1.7, 8], [2, 1.4, 8], [3, 0.7, 8], [8, 0.7, 8], [20, 0.7, 8]]);
  assert.ok(Math.abs(estimateTowerDps(paintballer, paintballer.levels[0]) - 1 / 1.7) < 0.01);
  assert.ok(Math.abs(estimateTowerDps(paintballer, paintballer.levels[5]) - 20 / 0.7) < 0.01);
  assert.match(paintballer.dpsMethod, /Actual total damage depends on how many enemies a blast hits/i);
});

test("Ranger combines source direct and splash rates while keeping maximum hits out of the single-target estimate", () => {
  const ranger = find("Ranger");
  assert.deepEqual(ranger.levels.map(({ damage, splashDamage, interval, splashMaxHits }) => [damage, splashDamage, interval, splashMaxHits]), [[100, null, 6, null], [100, null, 4.75, null], [185, null, 4.75, null], [430, null, 4.5, null], [875, 375, 8, 3]]);
  assert.ok(Math.abs(estimateTowerDps(ranger, ranger.levels[0]) - 100 / 6) < 0.01);
  assert.ok(Math.abs(estimateTowerDps(ranger, ranger.levels[4]) - (875 + 375) / 8) < 0.01);
  assert.match(ranger.dpsMethod, /Maximum Hits is shown separately/i);
});

test("Rocketeer estimates use source missile count and exclude multi-target and travel assumptions", () => {
  const rocketeer = find("Rocketeer");
  assert.deepEqual(rocketeer.levels.map(({ splashDamage, splashHits, splashInterval }) => [splashDamage, splashHits, splashInterval]), [[30, 1, 3.75], [30, 1, 3], [50, 1, 3], [95, 1, 2.75], [95, 4, 4.5]]);
  assert.ok(Math.abs(estimateTowerDps(rocketeer, rocketeer.levels[0]) - (30 * 1) / 3.75) < 0.01);
  assert.ok(Math.abs(estimateTowerDps(rocketeer, rocketeer.levels[4]) - (95 * 4) / 4.5) < 0.01);
  assert.equal(estimateTowerDps(rocketeer, { ...rocketeer.levels[4], splashHits: null }), null);
  assert.match(rocketeer.dpsMethod, /Projectile travel time and multiple targets are excluded/i);
});

test("detection footnotes remain separate from the detection flag", () => {
  const pulseTrooper = find("Pulse Trooper");
  assert.equal(pulseTrooper?.levels[0].hidden, "No");
  assert.equal(pulseTrooper?.levels[0].flying, "No");
  assert.ok(pulseTrooper?.detectionNotes.some((note) => note.attribute === "Hidden" && /indirectly hit/i.test(note.text)));
  assert.ok(pulseTrooper?.detectionNotes.some((note) => note.attribute === "Flying" && /indirectly hit/i.test(note.text)));
});

test("investment estimates scale with count and selected upgrade costs", () => {
  const scout = find("Scout");
  assert.equal(estimateInvestment(scout, 0, 1), 125);
  assert.equal(estimateInvestment(scout, 2, 4), 2_200);
  assert.equal(estimateInvestment(scout, 0, 0), null);
  assert.equal(estimateInvestment({ ...scout, placementCost: null }, 0, 1), null);
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
  const acceleratorIndex = incomplete.findIndex((tower) => tower.name === "Accelerator");
  incomplete[acceleratorIndex] = { ...incomplete[acceleratorIndex], levels: incomplete[acceleratorIndex].levels.map((level) => ({ ...level })) };
  delete incomplete[acceleratorIndex].levels[0].overcharge;
  const operatorIndex = incomplete.findIndex((tower) => tower.name === "Operator");
  incomplete[operatorIndex] = { ...incomplete[operatorIndex], levels: incomplete[operatorIndex].levels.map((level) => ({ ...level })) };
  delete incomplete[operatorIndex].levels[0].burstCount;
  const commandoIndex = incomplete.findIndex((tower) => tower.name === "Commando");
  incomplete[commandoIndex] = { ...incomplete[commandoIndex], levels: incomplete[commandoIndex].levels.map((level) => ({ ...level })) };
  delete incomplete[commandoIndex].levels[0].ammo;
  const soldierIndex = incomplete.findIndex((tower) => tower.name === "Soldier");
  incomplete[soldierIndex] = { ...incomplete[soldierIndex], levels: incomplete[soldierIndex].levels.map((level) => ({ ...level })) };
  delete incomplete[soldierIndex].levels[0].burstCooldown;
  const goldenSoldierIndex = incomplete.findIndex((tower) => tower.name === "Golden Soldier");
  incomplete[goldenSoldierIndex] = { ...incomplete[goldenSoldierIndex], levels: incomplete[goldenSoldierIndex].levels.map((level) => ({ ...level })) };
  delete incomplete[goldenSoldierIndex].levels[3].burstCooldown;
  const freezerIndex = incomplete.findIndex((tower) => tower.name === "Freezer");
  incomplete[freezerIndex] = { ...incomplete[freezerIndex], levels: incomplete[freezerIndex].levels.map((level) => ({ ...level })) };
  delete incomplete[freezerIndex].levels[3].burstCount;
  const demomanIndex = incomplete.findIndex((tower) => tower.name === "Demoman");
  incomplete[demomanIndex] = { ...incomplete[demomanIndex], levels: incomplete[demomanIndex].levels.map((level) => ({ ...level })) };
  delete incomplete[demomanIndex].levels[0].splashDamage;
  const mortarIndex = incomplete.findIndex((tower) => tower.name === "Mortar");
  incomplete[mortarIndex] = { ...incomplete[mortarIndex], levels: incomplete[mortarIndex].levels.map((level) => ({ ...level })) };
  delete incomplete[mortarIndex].levels[0].splashInterval;
  const rocketeerIndex = incomplete.findIndex((tower) => tower.name === "Rocketeer");
  incomplete[rocketeerIndex] = { ...incomplete[rocketeerIndex], levels: incomplete[rocketeerIndex].levels.map((level) => ({ ...level })) };
  delete incomplete[rocketeerIndex].levels[4].splashHits;
  const paintballerIndex = incomplete.findIndex((tower) => tower.name === "Paintballer");
  incomplete[paintballerIndex] = { ...incomplete[paintballerIndex], levels: incomplete[paintballerIndex].levels.map((level) => ({ ...level })) };
  delete incomplete[paintballerIndex].levels[0].splashDamage;
  delete incomplete[paintballerIndex].levels[1].splashMaxHits;
  const rangerIndex = incomplete.findIndex((tower) => tower.name === "Ranger");
  incomplete[rangerIndex] = { ...incomplete[rangerIndex], levels: incomplete[rangerIndex].levels.map((level) => ({ ...level })) };
  delete incomplete[rangerIndex].levels[4].splashDamage;

  const issues = validateTowerStats(incomplete, corpus.entries);
  assert.ok(issues.some((issue) => issue.includes("tower count mismatch")));
  assert.ok(issues.some((issue) => issue.includes("source revision mismatch")));
  assert.ok(issues.some((issue) => issue.includes("invalid placement limit")));
  assert.ok(issues.some((issue) => issue.includes("special damage method has a generic DPS formula for Biologist")));
  assert.ok(issues.some((issue) => issue.includes("Accelerator cycle inputs are incomplete at level 0")));
  assert.ok(issues.some((issue) => issue.includes("Operator cycle inputs are incomplete at level 0")));
  assert.ok(issues.some((issue) => issue.includes("Commando cycle inputs are incomplete at level 0")));
  assert.ok(issues.some((issue) => issue.includes("Soldier cycle inputs are incomplete at level 0")));
  assert.ok(issues.some((issue) => issue.includes("Golden Soldier cycle inputs are incomplete at level 3")));
  assert.ok(issues.some((issue) => issue.includes("Freezer cycle inputs are incomplete at level 3")));
  assert.ok(issues.some((issue) => issue.includes("splash-damage cycle inputs are incomplete at level 0")));
  assert.ok(issues.some((issue) => issue.includes("missile splash cycle inputs are incomplete at level 4")));
  assert.ok(issues.some((issue) => issue.includes("Paintballer is missing its source-listed maximum-hit count")));
  assert.ok(issues.some((issue) => issue.includes("direct-plus-splash cycle inputs are incomplete at level 4")));
});
