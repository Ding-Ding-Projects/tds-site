const SPECIAL_DAMAGE = /\b(?:burst|pulse|splash|poison|explosion|unit)\b/i;

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
    if (!["damage-over-interval", "unmodeled-special"].includes(tower.dpsFormula)) {
      errors.push(`invalid DPS formula classification for ${label}`);
    }
    if (SPECIAL_DAMAGE.test(tower.damageMethod ?? "") && tower.dpsFormula !== "unmodeled-special") {
      errors.push(`special damage method has a generic DPS formula for ${label}`);
    }
    if (!Array.isArray(tower.levels) || tower.levels.length === 0) errors.push(`missing upgrade levels for ${label}`);
  }

  const expected = wikiEntries.filter((entry) => entry.wikitext?.includes("{{TowerInfobox"));
  if (seen.size !== expected.length) errors.push(`tower count mismatch: expected ${expected.length}, received ${seen.size}`);
  for (const entry of expected) {
    if (!seen.has(String(entry.pageid))) errors.push(`missing tower record for page ${entry.pageid}`);
  }

  return errors;
}
