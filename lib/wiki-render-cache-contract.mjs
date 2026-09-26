export function validateWikiRenderCache(snapshotEntries, cacheIndex, cachedFiles) {
  const issues = [];
  const expected = new Map();
  const indexed = new Map();
  for (const entry of snapshotEntries) {
    if (entry.namespace === 0) {
      const id = String(entry.pageid);
      if (expected.has(id)) issues.push(`duplicate standard page ID ${id}`);
      expected.set(id, entry);
    }
  }

  if (cacheIndex?.schemaVersion !== 1) issues.push("unsupported rendered cache index version");
  if (cacheIndex?.standardPageCount !== expected.size) issues.push("rendered cache count does not match standard pages");
  const entries = Array.isArray(cacheIndex?.entries) ? cacheIndex.entries : [];
  for (const entry of entries) {
    const id = String(entry.pageid);
    if (indexed.has(id)) issues.push(`duplicate rendered cache page ID ${id}`);
    indexed.set(id, entry);
  }
  for (const [id, source] of expected) {
    const item = indexed.get(id);
    if (!item) {
      issues.push(`missing rendered cache index entry for page ${id}`);
      continue;
    }
    if (item.revisionId !== source.revisionId) issues.push(`rendered cache revision mismatch for page ${id}`);
    if (item.file !== `${id}.json`) issues.push(`rendered cache filename mismatch for page ${id}`);
    if (!/^[a-f0-9]{64}$/.test(item.sha256 ?? "") || !Number.isSafeInteger(item.sizeBytes) || item.sizeBytes <= 0) issues.push(`invalid rendered cache integrity metadata for page ${id}`);
    const file = cachedFiles.get(id);
    if (!file) issues.push(`missing rendered cache file for page ${id}`);
    else {
      if (file.sha256 !== item.sha256 || file.sizeBytes !== item.sizeBytes) issues.push(`rendered cache digest mismatch for page ${id}`);
      if (file.pageid !== source.pageid || file.revisionId !== source.revisionId) issues.push(`rendered cache content identity mismatch for page ${id}`);
      if (file.schemaVersion !== 1 || file.contentValid !== true || !Number.isSafeInteger(file.nodeCount)) issues.push(`invalid rendered cache content for page ${id}`);
    }
  }
  for (const id of indexed.keys()) if (!expected.has(id)) issues.push(`unexpected rendered cache index entry for page ${id}`);
  for (const id of cachedFiles.keys()) if (!expected.has(String(id))) issues.push(`orphan rendered cache file for page ${id}`);
  return [...new Set(issues)].sort();
}
