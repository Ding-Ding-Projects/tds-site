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

function acceleratorCycle(entry) {
  const statistics = entry.wikitext.split(/==Statistics==/i)[1]?.split(/\n==/)[0] ?? "";
  const formula = statistics.match(/\$DPS\$\s*=\s*Overcharge\s*\/\s*\(Charge-Up\s*\+\s*Cooldown\s*\+\s*\(Overcharge\s*\/\s*Damage\s*\*\s*Tick\)\)/i);
  if (!formula) return null;
  const start = statistics.search(/\|-\|Regular\s*=/i);
  const end = statistics.search(/\|-\|PVP\s*=/i);
  if (start < 0 || end <= start) return null;
  const rows = [...statistics.slice(start, end).matchAll(/^\|\s*(\d+)\s*\|\|([^\n]+)$/gm)];
  const values = rows.map((row) => {
    const cells = [`${row[1]}`, ...row[2].replace(/^\s*\|\|/, "").split("||")];
    const numberAt = (index) => {
      const value = clean(cells[index] ?? "").match(/\d[\d,]*(?:\.\d+)?/)?.[0];
      return value ? Number(value.replaceAll(",", "")) : null;
    };
    return { level: numberAt(0), damage: numberAt(3), tick: numberAt(4), chargeUp: numberAt(5), cooldown: numberAt(6), overcharge: numberAt(7) };
  });
  if (!values.length || values.some((value, index) => value.level !== index || Object.values(value).some((item) => !Number.isFinite(item)))) return null;
  return { formula: "overcharge-cycle", values };
}

function operatorCycle(entry, levels) {
  const statistics = entry.wikitext.split(/==Statistics==/i)[1]?.split(/\n==/)[0] ?? "";
  const formula = statistics.match(/\$DPS\$\s*=\s*\(Damage\s*\*\s*Burst Count\)\s*\/\s*\(Burst Cooldown\s*\+\s*\(Firerate\s*\*\s*Burst Count\)\)/i);
  if (!formula) return null;
  const start = statistics.search(/\|-\|Regular\s*=/i);
  const endOffset = statistics.slice(start).search(/!\s*colspan=[^\n]*\|\s*Coordination Stats/i);
  const end = endOffset < 0 ? -1 : start + endOffset;
  if (start < 0 || end <= start) return null;
  const rows = [...statistics.slice(start, end).matchAll(/^\|\s*(\d+)\s*\|\|([^\n]+)$/gm)];
  const values = rows.map((row) => {
    const cells = [`${row[1]}`, ...row[2].replace(/^\s*\|\|/, "").split("||")];
    const numberAt = (index) => {
      const value = clean(cells[index] ?? "").match(/\d[\d,]*(?:\.\d+)?/)?.[0];
      return value ? Number(value.replaceAll(",", "")) : null;
    };
    return { level: numberAt(0), damage: numberAt(3), burstCount: numberAt(4), interval: numberAt(5), burstCooldown: numberAt(6) };
  });
  if (!values.length || values.length !== levels.length || values.some((value, index) => value.level !== index || !Number.isFinite(value.damage) || !Number.isFinite(value.interval) || !Number.isFinite(value.burstCooldown) || (value.burstCount !== null && (!Number.isFinite(value.burstCount) || value.burstCount < 1)) || Math.abs(value.damage - levels[index].damage) > 1e-9 || Math.abs(value.interval - levels[index].interval) > 1e-9)) return null;
  return { formula: "operator-burst-cycle", values };
}

function commandoCycle(entry, levels) {
  const statistics = entry.wikitext.split(/==Statistics==/i)[1]?.split(/\n==/)[0] ?? "";
  const formula = statistics.match(/\$DPS\$\s*=\s*\(Ammo\s*\*\s*Damage\)\s*\/\s*\(Ammo\s*\*\s*Firerate\s*\+\s*Reload Time\)/i);
  if (!formula) return null;
  const start = statistics.search(/!\s*colspan=[^\n]*\|\s*Tower Stats/i);
  const endOffset = start < 0 ? -1 : statistics.slice(start).search(/^\|\}/m);
  const end = endOffset < 0 ? -1 : start + endOffset;
  if (start < 0 || end <= start) return null;
  const rows = [...statistics.slice(start, end).matchAll(/^\|\s*(\d+)\s*\|\|([^\n]+)$/gm)];
  const values = rows.map((row) => {
    const cells = [`${row[1]}`, ...row[2].replace(/^\s*\|\|/, "").split("||")];
    const numberAt = (index) => {
      const value = clean(cells[index] ?? "").match(/\d[\d,]*(?:\.\d+)?/)?.[0];
      return value ? Number(value.replaceAll(",", "")) : null;
    };
    return { level: numberAt(0), damage: numberAt(3), interval: numberAt(4), reloadTime: numberAt(5), ammo: numberAt(6) };
  });
  if (!values.length || values.length !== levels.length || values.some((value, index) => value.level !== index || !Number.isFinite(value.damage) || !Number.isFinite(value.interval) || !Number.isFinite(value.reloadTime) || value.reloadTime < 0 || !Number.isFinite(value.ammo) || value.ammo < 1 || Math.abs(value.damage - levels[index].damage) > 1e-9 || Math.abs(value.interval - levels[index].interval) > 1e-9)) return null;
  return { formula: "commando-magazine-cycle", values };
}

function soldierCycle(entry, levels) {
  const statistics = entry.wikitext.split(/==Statistics==/i)[1]?.split(/\n==/)[0] ?? "";
  const formula = statistics.match(/\$DPS\$\s*=\s*\(Damage\s*\*\s*Burst Count\)\s*\/\s*\(Cooldown\s*\+\s*\(Firerate\s*\*\s*Burst Count\)\)/i);
  if (!formula) return null;
  const goldenSoldier = entry.title === "Golden Soldier";
  const start = goldenSoldier ? statistics.search(/^!\s*Level\s*!![^\n]*Burst Count[^\n]*Cooldown/m) : statistics.search(/\|-\|Regular\s*=/i);
  const endOffset = start < 0 ? -1 : goldenSoldier ? statistics.slice(start).search(/^\|\}/m) : statistics.slice(start).search(/\|-\|PVP\s*=/i);
  const end = endOffset < 0 ? -1 : start + endOffset;
  if (start < 0 || end <= start) return null;
  const rows = [...statistics.slice(start, end).matchAll(/^\|\s*(\d+)\s*\|\|([^\n]+)$/gm)];
  const values = rows.map((row) => {
    const cells = [`${row[1]}`, ...row[2].replace(/^\s*\|\|/, "").split("||")];
    const numberAt = (index) => {
      const value = clean(cells[index] ?? "").match(/\d[\d,]*(?:\.\d+)?/)?.[0];
      return value ? Number(value.replaceAll(",", "")) : null;
    };
    return { level: numberAt(0), damage: numberAt(3), burstCount: numberAt(4), interval: numberAt(5), burstCooldown: numberAt(6) };
  });
  if (!values.length || values.length !== levels.length || values.some((value, index) => value.level !== index || !Number.isFinite(value.damage) || !Number.isFinite(value.interval) || !Number.isFinite(value.burstCooldown) || value.burstCooldown < 0 || (value.burstCount !== null && (!Number.isFinite(value.burstCount) || value.burstCount < 1)) || (value.burstCount === null && value.burstCooldown !== 0) || Math.abs(value.damage - levels[index].damage) > 1e-9 || Math.abs(value.interval - levels[index].interval) > 1e-9)) return null;
  return { formula: entry.title === "Golden Soldier" ? "golden-soldier-cycle" : "soldier-burst-cycle", values };
}

function freezerCycle(entry, levels) {
  const statistics = entry.wikitext.split(/==Statistics==/i)[1]?.split(/\n==/)[0] ?? "";
  const formula = statistics.match(/\$DPS\$\s*=\s*\(Damage\s*\*\s*Burst Count\)\s*\/\s*\(Cooldown\s*\+\s*\(Firerate\s*\*\s*Burst Count\)\)/i);
  if (!formula) return null;
  const start = statistics.search(/\|-\|Regular\s*=/i);
  const endOffset = start < 0 ? -1 : statistics.slice(start).search(/\|-\|PVP\s*=/i);
  const end = endOffset < 0 ? -1 : start + endOffset;
  if (start < 0 || end <= start) return null;
  const rows = [...statistics.slice(start, end).matchAll(/^\|\s*(\d+)\s*\|\|([^\n]+)$/gm)];
  const values = rows.map((row) => {
    const cells = [`${row[1]}`, ...row[2].replace(/^\s*\|\|/, "").split("||")];
    const numberAt = (index) => {
      const value = clean(cells[index] ?? "").match(/\d[\d,]*(?:\.\d+)?/)?.[0];
      return value ? Number(value.replaceAll(",", "")) : null;
    };
    return { level: numberAt(0), damage: numberAt(3), burstCount: numberAt(11), interval: numberAt(5), burstCooldown: numberAt(12) };
  });
  if (!values.length || values.length !== levels.length || values.some((value, index) => value.level !== index || !Number.isFinite(value.damage) || !Number.isFinite(value.interval) || value.interval <= 0 || !Number.isFinite(value.burstCooldown) || value.burstCooldown < 0 || (value.burstCount !== null && (!Number.isFinite(value.burstCount) || value.burstCount < 1)) || Math.abs(value.damage - levels[index].damage) > 1e-9 || Math.abs(value.interval - levels[index].interval) > 1e-9)) return null;
  return { formula: "freezer-damage-cycle", values };
}

function splashDamageCycle(entry, levels) {
  const statistics = entry.wikitext.split(/==Statistics==/i)[1]?.split(/\n==/)[0] ?? "";
  const formula = statistics.match(/\$DPS\$\s*=\s*(?:\[\[)?Splash Damage(?:\]\])?\s*\/\s*Firerate/i);
  if (!formula) return null;
  const header = statistics.match(/^!\s*Level\s*!!([^\n]+)$/m);
  const columns = header ? ["Level", ...header[1].split("!!").map((column) => clean(column))] : [];
  const splashIndex = columns.findIndex((column) => /Splash Damage/i.test(column));
  const firerateIndex = columns.findIndex((column) => /Firerate/i.test(column));
  if (splashIndex < 1 || firerateIndex < 1) return null;
  const start = statistics.search(/^!\s*Level\s*!![^\n]*Splash Damage[^\n]*Firerate/m);
  const endOffset = start < 0 ? -1 : statistics.slice(start).search(/^\|\}/m);
  const end = endOffset < 0 ? -1 : start + endOffset;
  if (start < 0 || end <= start) return null;
  const rows = [...statistics.slice(start, end).matchAll(/^\|\s*(\d+)\s*\|\|([^\n]+)$/gm)];
  const values = rows.map((row) => {
    const cells = [`${row[1]}`, ...row[2].replace(/^\s*\|\|/, "").split("||")];
    const numberAt = (index) => {
      const value = clean(cells[index] ?? "").match(/\d[\d,]*(?:\.\d+)?/)?.[0];
      return value ? Number(value.replaceAll(",", "")) : null;
    };
    return { level: numberAt(0), splashDamage: numberAt(splashIndex), splashInterval: numberAt(firerateIndex) };
  });
  if (!values.length || values.length !== levels.length || values.some((value, index) => value.level !== index || !Number.isFinite(value.splashDamage) || value.splashDamage <= 0 || !Number.isFinite(value.splashInterval) || value.splashInterval <= 0)) return null;
  return { formula: "splash-damage-cycle", values };
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
  const cycle = entry.title === "Accelerator" ? acceleratorCycle(entry) : entry.title === "Operator" ? operatorCycle(entry, levels) : entry.title === "Commando" ? commandoCycle(entry, levels) : ["Soldier", "Golden Soldier"].includes(entry.title) ? soldierCycle(entry, levels) : entry.title === "Freezer" ? freezerCycle(entry, levels) : ["Demoman", "Golden Demoman", "Mortar"].includes(entry.title) ? splashDamageCycle(entry, levels) : null;
  if (cycle) {
    for (const stat of levels) Object.assign(stat, cycle.values.find((value) => value.level === stat.level));
  }
  const dpsFormula = cycle ? cycle.formula === "overcharge-cycle" ? "accelerator-overcharge-cycle" : cycle.formula === "operator-burst-cycle" ? "operator-burst-cycle" : cycle.formula === "commando-magazine-cycle" ? "commando-magazine-cycle" : cycle.formula === "golden-soldier-cycle" ? "golden-soldier-cycle" : cycle.formula === "freezer-damage-cycle" ? "freezer-damage-cycle" : cycle.formula === "splash-damage-cycle" ? "splash-damage-cycle" : "soldier-burst-cycle" : specialDamageMethod ? "unmodeled-special" : "damage-over-interval";
  let dpsMethod = cycle
    ? cycle.formula === "overcharge-cycle"
      ? "Source-listed cycle estimate: Overcharge / (Charge-Up + Cooldown + (Overcharge / Damage × Tick))."
      : cycle.formula === "operator-burst-cycle"
        ? "Source-listed burst estimate: (Damage × Burst Count) / (Burst Cooldown + (Firerate × Burst Count)); levels without a burst use Damage / Firerate. Coordination damage buffs are excluded."
        : cycle.formula === "commando-magazine-cycle"
          ? "Source-listed magazine estimate: (Ammo × Damage) / (Ammo × Firerate + Reload Time). Missile ability damage is excluded."
        : cycle.formula === "golden-soldier-cycle"
          ? "Source-listed burst estimate: (Damage × Burst Count) / (Cooldown + (Firerate × Burst Count)); single-fire levels use Damage / Firerate."
          : cycle.formula === "freezer-damage-cycle"
            ? "Source-listed direct-damage cycle: burst levels use (Damage × Burst Count) / (Cooldown + (Firerate × Burst Count)); non-burst levels use Damage / Firerate. Chill and slowdown effects are excluded."
            : cycle.formula === "splash-damage-cycle"
              ? "Source-listed per-target splash estimate: Splash Damage / Firerate. Actual total damage depends on how many enemies a blast hits."
              : "Source-listed burst estimate: (Damage × Burst Count) / (Cooldown + (Firerate × Burst Count)). Firerate applies within the burst."
    : specialDamageMethod
      ? `Special damage cycle (${damageMethod}); generic DPS is not estimated.`
    : revUp
      ? "Theoretical damage divided by attack interval; the source also documents firing startup, which this rate omits."
      : "Theoretical damage divided by attack interval.";
  if (entry.title === "Mortar" && dpsFormula === "splash-damage-cycle") {
    dpsMethod += " Cluster damage and target count are excluded; the source assumes full inner-sphere splash damage and excludes projectile travel time.";
  }
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
