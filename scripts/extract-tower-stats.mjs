import { mkdir, readFile, writeFile } from "node:fs/promises";

const corpus = JSON.parse(await readFile(new URL("../data/wiki-corpus.json", import.meta.url), "utf8"));
function templates(input, wanted) {
  const found = [];
  for (let i = 0; i < input.length - 1;) {
    if (input.slice(i, i + 2) !== "{{") { i++; continue; }
    let depth = 0; let end = i;
    for (; end < input.length - 1; end++) {
      if (input.slice(end, end + 2) === "{{") { depth++; end++; continue; }
      if (input.slice(end, end + 2) === "}}") { depth--; end++; if (!depth) break; }
    }
    if (depth) break;
    const body = input.slice(i + 2, end - 1);
    if (body.slice(0, body.indexOf("|") < 0 ? body.length : body.indexOf("|")).trim().toLowerCase() === wanted.toLowerCase()) found.push(body);
    i = end + 1;
  }
  return found;
}
function args(body) {
  const out = {}; let part = ""; let braces = 0; let links = 0;
  const parts = [];
  for (let i = 0; i < body.length; i++) {
    const two = body.slice(i, i + 2);
    if (two === "{{") { braces++; part += two; i++; continue; }
    if (two === "}}") { braces--; part += two; i++; continue; }
    if (two === "[[") { links++; part += two; i++; continue; }
    if (two === "]] ".trim()) { links--; part += two; i++; continue; }
    if (body[i] === "|" && braces === 0 && links === 0) { parts.push(part); part = ""; continue; }
    part += body[i];
  }
  parts.push(part);
  for (const raw of parts.slice(1)) { const split = raw.indexOf("="); if (split > 0) out[raw.slice(0, split).trim().toLowerCase()] = raw.slice(split + 1).trim(); }
  return out;
}
function lastNumber(value) { return [...String(value ?? "").matchAll(/\d[\d,]*(?:\.\d+)?/g)].map((x) => Number(x[0].replaceAll(",", ""))).at(-1) ?? null; }
function clean(value) {
  let text = String(value ?? "").replace(/\[\[File:[^\]]+\]\]/gi, "").replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2").replace(/\[\[([^\]]+)\]\]/g, "$1").replace(/<br\s*\/?\s*>/gi, " ").replace(/<[^>]+>/g, "");
  while (/\{\{[^{}]*\}\}/.test(text)) text = text.replace(/\{\{([^{}]*)\}\}/g, (_whole, inner) => inner.split("|").at(-1) ?? "");
  return text.replace(/\s+/g, " ").trim();
}
function referencedNotes(value) {
  return [...String(value ?? "").matchAll(/<ref(?:\s+[^>]*)?>([\s\S]*?)<\/ref>/gi)].map((match) => clean(match[1])).filter(Boolean);
}
function parseUpgrade(body, prior) {
  const data = args(body); const info = clean(data.information ?? "");
  const damage = [...info.matchAll(/\+(\d+(?:\.\d+)?)\s*Damage/gi)].map((m) => Number(m[1])).reduce((a, b) => a + b, 0);
  const range = [...info.matchAll(/\+(\d+(?:\.\d+)?)\s*Range/gi)].map((m) => Number(m[1])).reduce((a, b) => a + b, 0);
  const fire = [...info.matchAll(/(\d+(?:\.\d+)?)\s*>\s*(\d+(?:\.\d+)?)\s*Firerate/gi)].at(-1);
  const next = { level: Number((data.level ?? "").match(/\d+/)?.[0] ?? 0), title: clean(data["upgrade title"] ?? ""), cost: lastNumber(data.cost), damage: prior.damage === null ? null : prior.damage + damage, interval: fire ? Number(fire[2]) : prior.interval, range: prior.range === null ? null : prior.range + range, hidden: /Hidden Detection/i.test(info) ? "Yes" : prior.hidden, lead: /Lead Detection/i.test(info) ? "Yes" : prior.lead, flying: /Flying Detection/i.test(info) ? "Yes" : prior.flying, notes: info };
  return next;
}

function placementLimit(raw) {
  const value = clean(raw ?? "");
  if (!value || /∞|unlimited/i.test(value)) return null;
  const regular = value.match(/^\s*(\d+)/);
  return regular ? Number(regular[1]) : null;
}

const result = [];
for (const entry of corpus.entries) {
  if (!entry.wikitext.includes("{{TowerInfobox")) continue;
  const box = templates(entry.wikitext, "TowerInfobox")[0];
  if (!box) continue;
  const tower = args(box);
  const detection = (raw) => { const value = clean(String(raw ?? "No").replace(/<ref(?:\s+[^>]*)?>[\s\S]*?<\/ref>/gi, "")); return /^(?:N\/A|None|No)$/i.test(value) ? "No" : value || "No"; };
  const base = { level: 0, title: "Base", cost: lastNumber(tower.basecost), damage: lastNumber(tower.basedamage), interval: lastNumber(tower.basefirerate), range: lastNumber(tower.baserange), hidden: detection(tower.hidden_detection), lead: detection(tower.lead_detection), flying: detection(tower.flying_detection), notes: "" };
  const upgradesSection = entry.wikitext.split(/==Upgrades==/i)[1]?.split(/\n==/)[0] ?? "";
  const tabber = templates(upgradesSection, "PVPTabber")[0];
  let regular = upgradesSection;
  if (tabber) {
    let depth = 0; let linkDepth = 0; let start = 0; const branches = [];
    for (let i = 0; i < tabber.length; i++) { const two = tabber.slice(i, i + 2); if (two === "{{") { depth++; i++; } else if (two === "}}") { depth--; i++; } else if (two === "[[") { linkDepth++; i++; } else if (two === "]]" ) { linkDepth--; i++; } else if (tabber[i] === "|" && depth === 0 && linkDepth === 0) { branches.push(tabber.slice(start, i)); start = i + 1; } }
    branches.push(tabber.slice(start));
    regular = branches[1] ?? "";
  }
  const levels = [base];
  for (const upgrade of templates(regular, "Upgrade")) levels.push(parseUpgrade(upgrade, levels.at(-1)));
  const damageMethod = clean(tower.damagetype ?? "Unknown");
  const specialDamageMethod = /\b(?:burst|pulse|splash|poison|explosion|unit)\b/i.test(damageMethod);
  const revUp = /rev[- ]?up/i.test(entry.wikitext);
  const dpsFormula = /accelerator/i.test(entry.title) || specialDamageMethod ? "unmodeled-special" : "damage-over-interval";
  const dpsMethod = /accelerator/i.test(entry.title) || specialDamageMethod
    ? `Special damage cycle (${damageMethod}); generic DPS is not estimated.`
    : revUp
      ? "Theoretical damage divided by attack interval; the source also documents firing startup, which this rate omits."
      : "Theoretical damage divided by attack interval.";
  const detectionNotes = [
    ...referencedNotes(tower.hidden_detection).map((text) => ({ attribute: "Hidden", text })),
    ...referencedNotes(tower.lead_detection).map((text) => ({ attribute: "Lead", text })),
    ...referencedNotes(tower.flying_detection).map((text) => ({ attribute: "Flying", text })),
  ];
  result.push({ pageid: entry.pageid, name: entry.title, role: clean(tower.role ?? "Unknown"), placement: clean(tower.placement ?? "Unknown"), placementLimit: placementLimit(tower.placement_limit), unlock: clean(tower.unlockcost ?? "Unknown"), placementCost: base.cost, pvpPlacementCost: lastNumber(tower.pvp_basecost), damageMethod, dpsFormula, detectionNotes, levels, source: { url: entry.sourceUrl, historyUrl: entry.historyUrl, revisionId: entry.revisionId, revisionTimestamp: entry.revisionTimestamp, licensePolicyUrl: entry.licensePolicyUrl, license: entry.license }, dpsMethod });
}
await mkdir(new URL("../data/", import.meta.url), { recursive: true });
await writeFile(new URL("../data/tower-stats.json", import.meta.url), `${JSON.stringify({ generatedFromRevisionSnapshot: corpus.generatedAt, count: result.length, towers: result }, null, 2)}\n`);
console.log(`Extracted ${result.length} tower records from the dated wiki snapshot.`);
