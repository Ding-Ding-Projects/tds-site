export const SITE_CONTRACT_FAMILIES = Object.freeze([
  "English, Cantonese, bilingual, funny levels, emoji, School mode, narration",
  "Personal vocabulary upload, validation, replace, clear, local-only handling",
  "Scheduled and external settings, dim-sum surprise, notifications",
  "Search, regex builders, tabs/groups, command palette, settings search",
  "Visual appearance, element editors, logo customization and conversion",
  "Accessibility, responsive sizing, ADHD modes, reduced motion",
  "Local history, changelog, exports, bulk actions, external-editor handoff",
  "Destructive-action confirmation, locks, unlock ladder, Support Tickets",
  "File conversion and local Ollama suite manager",
  "Version/provenance, offline documentation, public-link preview graphic",
  "Shared Status Hub registration and reporting",
  "Browser-extension download progress states",
]);

const columns = [
  "Contract family",
  "Implementation",
  "Documentation",
  "Persistence",
  "Focused checks",
  "Built-site evidence",
  "Status",
];

function cells(line) {
  return line.split("|").slice(1, -1).map((cell) => cell.trim());
}

export function validateSiteCompletenessInventory(markdown) {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const issues = [];
  const headerIndex = lines.findIndex((line) => line.trimStart().startsWith("| Contract family |"));
  if (headerIndex < 0) return ["missing completeness table header"];

  if (JSON.stringify(cells(lines[headerIndex])) !== JSON.stringify(columns)) {
    issues.push("completeness table columns do not match the required schema");
  }

  const rows = [];
  for (const line of lines.slice(headerIndex + 1)) {
    if (!line.trim()) {
      if (rows.length) break;
      continue;
    }
    if (!line.trimStart().startsWith("|")) break;
    if (/^\s*\|\s*[-:| ]+\|\s*$/.test(line)) continue;
    rows.push({ line, values: cells(line) });
  }
  const seen = new Set();

  for (const row of rows) {
    const [family, implementation, documentation, persistence, checks, evidence, status] = row.values;
    if (row.values.length !== columns.length) {
      issues.push(`row has ${row.values.length} columns instead of ${columns.length}: ${family || "(unnamed)"}`);
      continue;
    }
    if (!SITE_CONTRACT_FAMILIES.includes(family)) issues.push(`unknown completeness family: ${family}`);
    if (seen.has(family)) issues.push(`duplicate completeness family: ${family}`);
    seen.add(family);
    if (!/^(open|partial|complete|blocked|unavailable)\b/i.test(status)) {
      issues.push(`invalid status for ${family}: ${status}`);
    }
    if (/^complete\b/i.test(status)) {
      const evidenceFields = [implementation, documentation, persistence, checks, evidence];
      if (evidenceFields.some((value) => !value || value.toLowerCase() === "pending")) {
        issues.push(`complete family lacks linked evidence: ${family}`);
      }
    }
  }

  for (const family of SITE_CONTRACT_FAMILIES) {
    if (!seen.has(family)) issues.push(`missing completeness family: ${family}`);
  }
  return issues;
}
