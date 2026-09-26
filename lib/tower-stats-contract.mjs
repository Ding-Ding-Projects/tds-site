const SPECIAL_DAMAGE = /\b(?:burst|pulse|splash|poison|explosion|unit)\b/i;

export function estimateInvestment(tower, selectedLevel, count) {
  if (!Number.isInteger(count) || count < 1 || !Number.isInteger(selectedLevel) || selectedLevel < 0) return null;
  if (!Number.isFinite(tower.placementCost)) return null;
  const upgrades = tower.levels.filter((level) => level.level > 0 && level.level <= selectedLevel);
  if (upgrades.some((level) => !Number.isFinite(level.cost))) return null;
  return (tower.placementCost + upgrades.reduce((sum, level) => sum + level.cost, 0)) * count;
}

export function estimateTowerDps(tower, stat) {
  if (!stat || !Number.isFinite(stat.damage) || stat.damage <= 0) return null;
  if (tower.dpsFormula === "damage-over-interval") {
    return Number.isFinite(stat.interval) && stat.interval > 0 ? stat.damage / stat.interval : null;
  }
  if (tower.dpsFormula === "accelerator-overcharge-cycle") {
    const { overcharge, chargeUp, cooldown, tick } = stat;
    if (![overcharge, chargeUp, cooldown, tick].every(Number.isFinite) || overcharge <= 0 || chargeUp < 0 || cooldown < 0 || tick <= 0) return null;
    return overcharge / (chargeUp + cooldown + (overcharge / stat.damage * tick));
  }
  if (tower.dpsFormula === "operator-burst-cycle" || tower.dpsFormula === "soldier-burst-cycle") {
    const { burstCount, burstCooldown } = stat;
    if (!Number.isFinite(stat.interval) || stat.interval <= 0) return null;
    if (burstCount === null || burstCount === undefined) return stat.damage / stat.interval;
    if (!Number.isFinite(burstCount) || burstCount < 1 || !Number.isFinite(burstCooldown) || burstCooldown < 0) return null;
    return (stat.damage * burstCount) / (burstCooldown + (stat.interval * burstCount));
  }
  if (tower.dpsFormula === "commando-magazine-cycle") {
    const { ammo, reloadTime } = stat;
    if (!Number.isFinite(stat.interval) || stat.interval <= 0 || !Number.isFinite(ammo) || ammo < 1 || !Number.isFinite(reloadTime) || reloadTime < 0) return null;
    return (ammo * stat.damage) / (ammo * stat.interval + reloadTime);
  }
  return null;
}

export function validateTowerStats(towers, wikiEntries) {
  const errors = [];
  const sourceById = new Map(wikiEntries.map((entry) => [String(entry.pageid), entry]));
  const seen = new Set();

  for (const tower of towers) {
    const id = String(tower.pageid);
    const label = `${tower.name || "Unknown tower"} (${id})`;
    if (seen.has(id)) errors.push(`duplicate tower page ${id}`);
    seen.add(id);

    const source = sourceById.get(id);
    if (!source || source.revisionId !== tower.source?.revisionId) errors.push(`source revision mismatch for ${label}`);
    for (const field of ["url", "historyUrl", "licensePolicyUrl", "revisionTimestamp"]) {
      if (!tower.source?.[field]) errors.push(`missing ${field} for ${label}`);
    }
    if (!tower.damageMethod) errors.push(`missing damage method for ${label}`);
    if (!Array.isArray(tower.detectionNotes)) errors.push(`missing detection notes collection for ${label}`);
    if (tower.placementLimit !== null && (!Number.isInteger(tower.placementLimit) || tower.placementLimit < 1)) {
      errors.push(`invalid placement limit for ${label}`);
    }
    if (!["damage-over-interval", "accelerator-overcharge-cycle", "operator-burst-cycle", "soldier-burst-cycle", "commando-magazine-cycle", "unmodeled-special"].includes(tower.dpsFormula)) {
      errors.push(`invalid DPS formula classification for ${label}`);
    }
    if (tower.name === "Accelerator" && tower.dpsFormula !== "accelerator-overcharge-cycle") {
      errors.push(`Accelerator is missing its source-listed damage-cycle formula`);
    }
    if (tower.name === "Operator" && tower.dpsFormula !== "operator-burst-cycle") {
      errors.push(`Operator is missing its source-listed burst-cycle formula`);
    }
    if (tower.name === "Commando" && tower.dpsFormula !== "commando-magazine-cycle") {
      errors.push(`Commando is missing its source-listed magazine-cycle formula`);
    }
    if (tower.name === "Soldier" && tower.dpsFormula !== "soldier-burst-cycle") {
      errors.push(`Soldier is missing its source-listed burst-cycle formula`);
    }
    if (tower.dpsFormula === "accelerator-overcharge-cycle" && tower.name !== "Accelerator") {
      errors.push(`Accelerator damage-cycle formula is assigned to another tower for ${label}`);
    }
    if (tower.dpsFormula === "operator-burst-cycle" && tower.name !== "Operator") {
      errors.push(`Operator burst-cycle formula is assigned to another tower for ${label}`);
    }
    if (tower.dpsFormula === "commando-magazine-cycle" && tower.name !== "Commando") {
      errors.push(`Commando magazine-cycle formula is assigned to another tower for ${label}`);
    }
    if (tower.dpsFormula === "soldier-burst-cycle" && tower.name !== "Soldier") {
      errors.push(`Soldier burst-cycle formula is assigned to another tower for ${label}`);
    }
    if (SPECIAL_DAMAGE.test(tower.damageMethod ?? "") && tower.dpsFormula === "damage-over-interval") {
      errors.push(`special damage method has a generic DPS formula for ${label}`);
    }
    if (!Array.isArray(tower.levels) || tower.levels.length === 0) errors.push(`missing upgrade levels for ${label}`);
    if (tower.dpsFormula === "accelerator-overcharge-cycle" && Array.isArray(tower.levels)) {
      for (const level of tower.levels) {
        if (!["damage", "overcharge", "chargeUp", "cooldown", "tick"].every((field) => Number.isFinite(level[field]))) {
          errors.push(`Accelerator cycle inputs are incomplete at level ${level.level}`);
        }
      }
    }
    if (["operator-burst-cycle", "soldier-burst-cycle"].includes(tower.dpsFormula) && Array.isArray(tower.levels)) {
      for (const level of tower.levels) {
        if (!Number.isFinite(level.damage) || !Number.isFinite(level.interval) || !Number.isFinite(level.burstCooldown) || (level.burstCount !== null && (!Number.isFinite(level.burstCount) || level.burstCount < 1)) || (level.burstCount === null && level.burstCooldown !== 0)) {
          errors.push(`${tower.name} cycle inputs are incomplete at level ${level.level}`);
        }
      }
    }
    if (tower.dpsFormula === "commando-magazine-cycle" && Array.isArray(tower.levels)) {
      for (const level of tower.levels) {
        if (!Number.isFinite(level.damage) || !Number.isFinite(level.interval) || !Number.isFinite(level.ammo) || level.ammo < 1 || !Number.isFinite(level.reloadTime) || level.reloadTime < 0) {
          errors.push(`Commando cycle inputs are incomplete at level ${level.level}`);
        }
      }
    }
  }

  const expected = wikiEntries.filter((entry) => entry.wikitext?.includes("{{TowerInfobox"));
  if (seen.size !== expected.length) errors.push(`tower count mismatch: expected ${expected.length}, received ${seen.size}`);
  for (const entry of expected) {
    if (!seen.has(String(entry.pageid))) errors.push(`missing tower record for page ${entry.pageid}`);
  }

  return errors;
}
