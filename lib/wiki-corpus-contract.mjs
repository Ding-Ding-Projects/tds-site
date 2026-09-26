const ELIGIBLE_NAMESPACES = new Set([0, 2900]);

export function validateWikiCorpus(index, revisions, pageRecords) {
  const issues = [];
  const entries = Array.isArray(index?.entries) ? index.entries : [];
  const revisionEntries = Array.isArray(revisions) ? revisions : [];
  const pages = pageRecords instanceof Map ? pageRecords : new Map();
  if (index?.count !== entries.length) issues.push("index count does not match its entries");
  if (entries.length !== revisionEntries.length) issues.push("revision allowlist count does not match the article index");
  if (pages.size !== entries.length) issues.push("page-file count does not match the article index");

  const pagesById = new Map();
  const revisionsById = new Map();
  for (const entry of entries) {
    if (!ELIGIBLE_NAMESPACES.has(entry.namespace)) issues.push(`unexpected namespace for page ${entry.pageid}`);
    if (pagesById.has(String(entry.pageid))) issues.push(`duplicate page ID ${entry.pageid}`);
    pagesById.set(String(entry.pageid), entry);
  }
  for (const entry of revisionEntries) {
    const key = String(entry.revisionId);
    if (revisionsById.has(key)) issues.push(`duplicate revision ID ${key}`);
    revisionsById.set(key, entry);
  }

  for (const entry of entries) {
    const pageKey = String(entry.pageid);
    const revision = revisionsById.get(String(entry.revisionId));
    const record = pages.get(pageKey);
    if (!revision || String(revision.pageid) !== pageKey || revision.namespace !== entry.namespace) {
      issues.push(`revision allowlist mismatch for page ${pageKey}`);
    }
    if (!record) {
      issues.push(`missing page file ${pageKey}`);
      continue;
    }
    if (record.pageid !== entry.pageid || record.title !== entry.title || record.namespace !== entry.namespace || record.revisionId !== entry.revisionId) {
      issues.push(`page metadata mismatch for page ${pageKey}`);
    }
    if (typeof record.sourceMarkup !== "string") issues.push(`missing source markup for page ${pageKey}`);
    if (!Number.isFinite(Date.parse(record.revisionTimestamp))) issues.push(`invalid revision timestamp for page ${pageKey}`);
    for (const field of ["sourceUrl", "historyUrl", "licensePolicyUrl", "licenseUrl", "historicalLicenseUrl", "license", "attribution", "retrievedAt"]) {
      if (typeof record[field] !== "string" || !record[field].trim()) issues.push(`missing ${field} for page ${pageKey}`);
    }
    if (!(record.sourceUrl?.startsWith("https://tds.wiki/") && record.historyUrl?.startsWith("https://tds.wiki/") && record.licensePolicyUrl?.startsWith("https://tds.wiki/"))) {
      issues.push(`source provenance URL mismatch for page ${pageKey}`);
    }
    if (!record.licenseUrl?.startsWith("https://creativecommons.org/licenses/by-sa/")) issues.push(`license URL mismatch for page ${pageKey}`);
    if (!record.historicalLicenseUrl?.startsWith("https://creativecommons.org/licenses/by-sa/")) issues.push(`historical license URL mismatch for page ${pageKey}`);
    if (!Number.isFinite(Date.parse(record.retrievedAt))) issues.push(`invalid retrieval timestamp for page ${pageKey}`);
    const adaptation = record.adaptation;
    const expectedMethod = entry.namespace === 0 ? "revision-html-sanitized" : "local-wikitext-renderer";
    if (!adaptation || adaptation.method !== expectedMethod || adaptation.sourceMarkupPreserved !== true || typeof adaptation.changesMade !== "string" || !adaptation.changesMade.trim() || typeof adaptation.historicalLicenseNotice !== "string" || !adaptation.historicalLicenseNotice.trim() || adaptation.retrievedAt !== record.retrievedAt) {
      issues.push(`missing or mismatched adaptation provenance for page ${pageKey}`);
    }
  }
  for (const revision of revisionEntries) {
    if (!pagesById.has(String(revision.pageid))) issues.push(`revision allowlist contains unindexed page ${revision.pageid}`);
  }
  for (const pageKey of pages.keys()) {
    if (!pagesById.has(String(pageKey))) issues.push(`orphan page file ${pageKey}`);
  }
  return [...new Set(issues)].sort();
}
