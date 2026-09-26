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
  const formula = statistics.match(/\$DPS\$\s*=\s*(?:\[\[)?Splash Damage(?:\]\])?(?:\s*\*\s*Missile Count)?\s*\/\s*Firerate/i);
  if (!formula) return null;
  const hasMissileCount = /\*\s*Missile Count/i.test(formula[0]);
  const header = statistics.match(/^!\s*Level\s*!!([^\n]+)$/m);
  const columns = header ? ["Level", ...header[1].split("!!").map((column) => clean(column))] : [];
  const splashIndex = columns.findIndex((column) => /Splash Damage/i.test(column));
  const firerateIndex = columns.findIndex((column) => /Firerate/i.test(column));
  const missileIndex = hasMissileCount ? columns.findIndex((column) => /Missile Count/i.test(column)) : -1;
  const maxHitsIndex = columns.findIndex((column) => /Max Hits/i.test(column));
  if (splashIndex < 1 || firerateIndex < 1 || (hasMissileCount && missileIndex < 1)) return null;
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
    return {
      level: numberAt(0),
      splashDamage: numberAt(splashIndex),
      ...(hasMissileCount ? { splashHits: numberAt(missileIndex) } : {}),
      ...(maxHitsIndex > 0 ? { splashMaxHits: numberAt(maxHitsIndex) } : {}),
      splashInterval: numberAt(firerateIndex),
    };
  });
  if (!values.length || values.length !== levels.length || values.some((value, index) => value.level !== index || !Number.isFinite(value.splashDamage) || value.splashDamage <= 0 || !Number.isFinite(value.splashInterval) || value.splashInterval <= 0)) return null;
  return { formula: hasMissileCount ? "missile-splash-cycle" : "splash-damage-cycle", values };
}

function snowballerSplashCycle(entry, levels) {
  const statistics = entry.wikitext.split(/==Statistics==/i)[1]?.split(/\n==/)[0] ?? "";
  if (!/\$DPS\$\s*=\s*Damage\s*\/\s*Firerate/i.test(statistics)) return null;
  const header = statistics.match(/^!\s*Level\s*!!([^\n]+)$/m);
  const columns = header ? ["Level", ...header[1].split("!!").map((column) => clean(column))] : [];
  const damageIndex = columns.findIndex((column) => /^Damage\b/i.test(column));
  const firerateIndex = columns.findIndex((column) => /Firerate/i.test(column));
  const maxHitsIndex = columns.findIndex((column) => /Max Hits/i.test(column));
  if (damageIndex < 1 || firerateIndex < 1 || maxHitsIndex < 1) return null;
  const start = statistics.search(/^!\s*Level\s*!![^\n]*Damage[^\n]*Firerate[^\n]*Max Hits/m);
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
    return {
      level: numberAt(0),
      splashDamage: numberAt(damageIndex),
      splashInterval: numberAt(firerateIndex),
      splashMaxHits: numberAt(maxHitsIndex),
    };
  });
  if (!values.length || values.length !== levels.length || values.some((value, index) => value.level !== index || !Number.isFinite(value.splashDamage) || value.splashDamage <= 0 || !Number.isFinite(value.splashInterval) || value.splashInterval <= 0 || !Number.isFinite(value.splashMaxHits) || value.splashMaxHits < 1)) return null;
  return { formula: "splash-damage-cycle", values };
}

function directSplashCycle(entry, levels) {
  const statistics = entry.wikitext.split(/==Statistics==/i)[1]?.split(/\n==/)[0] ?? "";
  const hasDirectFormula = /\$DPS\$\s*=\s*Damage\s*\/\s*Firerate/i.test(statistics);
  const hasSplashFormula = /\$SDPS\$\s*=\s*(?:\[\[)?Splash Damage(?:\]\])?\s*\/\s*Firerate/i.test(statistics);
  const hasCombinedFormula = /\$TDPS\$\s*=\s*\$DPS\$\s*\+\s*\$SDPS\$/i.test(statistics);
  if (!hasDirectFormula || !hasSplashFormula || !hasCombinedFormula) return null;
  const header = statistics.match(/^!\s*Level\s*!!([^\n]+)$/m);
  const columns = header ? ["Level", ...header[1].split("!!").map((column) => clean(column))] : [];
  const damageIndex = columns.findIndex((column) => /^Damage\b/i.test(column));
  const splashIndex = columns.findIndex((column) => /Splash Damage/i.test(column));
  const firerateIndex = columns.findIndex((column) => /Firerate/i.test(column));
  const maxHitsIndex = columns.findIndex((column) => /Max Hits/i.test(column));
  if (damageIndex < 1 || splashIndex < 1 || firerateIndex < 1) return null;
  const start = statistics.search(/^!\s*Level\s*!![^\n]*Damage[^\n]*Splash Damage[^\n]*Firerate/m);
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
    return {
      level: numberAt(0),
      damage: numberAt(damageIndex),
      splashDamage: numberAt(splashIndex),
      interval: numberAt(firerateIndex),
      splashMaxHits: maxHitsIndex > 0 ? numberAt(maxHitsIndex) : null,
    };
  });
  if (!values.length || values.length !== levels.length || values.some((value, index) => value.level !== index || !Number.isFinite(value.damage) || value.damage <= 0 || !Number.isFinite(value.interval) || value.interval <= 0 || (value.splashDamage !== null && value.splashDamage < 0) || (value.splashMaxHits !== null && value.splashMaxHits < 1))) return null;
  return { formula: "direct-splash-cycle", values };
}

function toxicGunnerCycle(entry, levels) {
  const statistics = entry.wikitext.split(/==Statistics==/i)[1]?.split(/\n==/)[0] ?? "";
  const directFormula = /\$DPSGUN\$\s*=\s*\(Damage\s*\*\s*Burst Count\)\s*\/\s*\(Cooldown\s*\+\s*\(Firerate\s*\*\s*Burst Count\)\)/i.test(statistics);
  const poisonFormula = /\$DPSPOISON\$\s*=\s*\(Poison Damage\s*\/\s*Tick\)/i.test(statistics);
  if (!directFormula || !poisonFormula || !/\$DPS\$\s*=\s*\$DPSGUN\$\s*\+\s*\$DPSPOISON\$/i.test(statistics)) return null;
  const header = statistics.match(/^!\s*Level\s*!!([^\n]+)$/m);
  const columns = header ? ["Level", ...header[1].split("!!").map((column) => clean(column))] : [];
  const index = (name) => columns.findIndex((column) => new RegExp(`^${name}(?:\\b|\\$)`, "i").test(column));
  const indexes = Object.fromEntries(["Damage", "Poison Damage", "Burst Count", "Firerate", "Tick", "Cooldown"].map((name) => [name, index(name)]));
  if (Object.values(indexes).some((value) => value < 1)) return null;
  const start = statistics.search(/^!\s*Level\s*!![^\n]*Poison Damage[^\n]*Burst Count[^\n]*Cooldown/m);
  const endOffset = start < 0 ? -1 : statistics.slice(start).search(/^\|\}/m);
  const end = endOffset < 0 ? -1 : start + endOffset;
  if (start < 0 || end <= start) return null;
  const rows = [...statistics.slice(start, end).matchAll(/^\|\s*(\d+)\s*\|\|([^\n]+)$/gm)];
  const values = rows.map((row) => {
    const cells = [row[1], ...row[2].replace(/^\s*\|\|/, "").split("||")];
    const numberAt = (column) => {
      const value = clean(cells[indexes[column]] ?? "").match(/\d[\d,]*(?:\.\d+)?/);
      return value ? Number(value[0].replaceAll(",", "")) : null;
    };
    return { level: Number(row[1]), damage: numberAt("Damage"), poisonDamage: numberAt("Poison Damage"), burstCount: /N\/A/i.test(clean(cells[indexes["Burst Count"]] ?? "")) ? null : numberAt("Burst Count"), interval: numberAt("Firerate"), tick: numberAt("Tick"), cooldown: numberAt("Cooldown") };
  });
  if (values.length !== levels.length || values.some((value, position) => value.level !== position || ![value.damage, value.poisonDamage, value.interval, value.tick, value.cooldown].every(Number.isFinite) || value.damage <= 0 || value.poisonDamage < 0 || value.interval <= 0 || value.tick <= 0 || value.cooldown < 0 || (value.burstCount !== null && (!Number.isFinite(value.burstCount) || value.burstCount < 1)) || Math.abs(value.damage - levels[position].damage) > 1e-9 || (value.burstCount === null && value.cooldown !== 0))) return null;
  return { formula: "toxic-gunner-poison-cycle", values };
}

function acePilotCycle(entry, levels) {
  const statistics = entry.wikitext.split(/==Statistics==/i)[1]?.split(/\n==/)[0] ?? "";
  if (!/\$GDPS\$\s*=\s*Normal Damage\s*\/\s*Firerate/i.test(statistics) || !/\$BDPS\$\s*=\s*Splash Damage\s*\/\s*Bomb Cooldown/i.test(statistics) || !/\$TDPS\$\s*=\s*\$GDPS\$\s*\+\s*\$BDPS\$/i.test(statistics)) return null;
  const header = statistics.match(/^!\s*Level\s*!!([^\n]+)$/m);
  const columns = header ? ["Level", ...header[1].split("!!").map((column) => clean(column))] : [];
  const index = (pattern) => columns.findIndex((column) => pattern.test(column));
  const indexes = { damage: index(/^Normal Damage$/i), splashDamage: index(/^Splash Damage$/i), interval: index(/^Firerate/i), bombCooldown: index(/^Bomb Cooldown$/i) };
  if (Object.values(indexes).some((value) => value < 1)) return null;
  const start = statistics.search(/^!\s*Level\s*!![^\n]*Normal Damage[^\n]*Splash Damage[^\n]*Firerate[^\n]*Bomb Cooldown/m);
  const endOffset = start < 0 ? -1 : statistics.slice(start).search(/^\|\}/m);
  const end = endOffset < 0 ? -1 : start + endOffset;
  if (start < 0 || end <= start) return null;
  const rows = [...statistics.slice(start, end).matchAll(/^\|\s*(\d+)\s*\|\|([^\n]+)$/gm)];
  const values = rows.map((row) => {
    const cells = [row[1], ...row[2].replace(/^\s*\|\|/, "").split("||")];
    const numberAt = (field) => {
      const value = clean(cells[indexes[field]] ?? "").match(/\d[\d,]*(?:\.\d+)?/);
      return value ? Number(value[0].replaceAll(",", "")) : null;
    };
    return { level: Number(row[1]), damage: numberAt("damage"), splashDamage: numberAt("splashDamage"), interval: numberAt("interval"), bombCooldown: numberAt("bombCooldown") };
  });
  if (values.length !== levels.length || values.some((value, position) => value.level !== position || !Number.isFinite(value.damage) || value.damage <= 0 || !Number.isFinite(value.interval) || value.interval <= 0 || Math.abs(value.damage - levels[position].damage) > 1e-9 || (value.splashDamage === null ? value.bombCooldown !== null : !Number.isFinite(value.splashDamage) || value.splashDamage <= 0 || !Number.isFinite(value.bombCooldown) || value.bombCooldown <= 0))) return null;
  return { formula: "ace-pilot-bomb-cycle", values };
}

function singleTargetDamageCycle(entry, levels) {
  const statistics = entry.wikitext.split(/==Statistics==/i)[1]?.split(/\n==/)[0] ?? "";
  if (!/\$DPS\$\s*=\s*Damage\s*\/\s*Firerate/i.test(statistics) || !/DPS assumes that only one enemy is hit and it receives full damage/i.test(statistics) || !/DPS does not consider projectile travel time/i.test(statistics)) return null;
  const header = statistics.match(/^!\s*Level\s*!!([^\n]+)$/m);
  const columns = header ? ["Level", ...header[1].split("!!").map((column) => clean(column))] : [];
  const damageIndex = columns.findIndex((column) => /^Damage$/i.test(column));
  const intervalIndex = columns.findIndex((column) => /^Firerate/i.test(column));
  if (damageIndex < 1 || intervalIndex < 1) return null;
  const start = statistics.search(/^!\s*Level\s*!![^\n]*Damage[^\n]*Firerate/m);
  const endOffset = start < 0 ? -1 : statistics.slice(start).search(/^\|\}/m);
  const end = endOffset < 0 ? -1 : start + endOffset;
  if (start < 0 || end <= start) return null;
  const rows = [...statistics.slice(start, end).matchAll(/^\|\s*(\d+)\s*\|\|([^\n]+)$/gm)];
  const values = rows.map((row) => {
    const cells = [row[1], ...row[2].replace(/^\s*\|\|/, "").split("||")];
    const numberAt = (index) => {
      const value = clean(cells[index] ?? "").match(/\d[\d,]*(?:\.\d+)?/);
      return value ? Number(value[0].replaceAll(",", "")) : null;
    };
    return { level: Number(row[1]), damage: numberAt(damageIndex), interval: numberAt(intervalIndex) };
  });
  if (values.length !== levels.length || values.some((value, position) => value.level !== position || !Number.isFinite(value.damage) || value.damage <= 0 || !Number.isFinite(value.interval) || value.interval <= 0 || Math.abs(value.damage - levels[position].damage) > 1e-9 || Math.abs(value.interval - levels[position].interval) > 1e-9)) return null;
  return { formula: "single-target-damage-cycle", values };
}

function pulseTrooperCycle(entry, levels) {
  const statistics = entry.wikitext.split(/==Statistics==/i)[1]?.split(/\n==/)[0] ?? "";
  if (!/\$DPS\$\s*=\s*Damage\s*\/\s*Firerate/i.test(statistics)) return null;
  const header = statistics.match(/^!\s*Level\s*!!([^\n]+)$/m);
  const columns = header ? ["Level", ...header[1].split("!!").map((column) => clean(column))] : [];
  const damageIndex = columns.findIndex((column) => /^Damage$/i.test(column));
  const intervalIndex = columns.findIndex((column) => /^Firerate/i.test(column));
  const maxHitsIndex = columns.findIndex((column) => /^Max Hits$/i.test(column));
  if (damageIndex < 1 || intervalIndex < 1 || maxHitsIndex < 1) return null;
  const start = statistics.search(/^!\s*Level\s*!![^\n]*Damage[^\n]*Firerate[^\n]*Max Hits/m);
  const endOffset = start < 0 ? -1 : statistics.slice(start).search(/^\|\}/m);
  const end = endOffset < 0 ? -1 : start + endOffset;
  if (start < 0 || end <= start) return null;
  const rows = [...statistics.slice(start, end).matchAll(/^\|\s*(\d+)\s*\|\|([^\n]+)$/gm)];
  const values = rows.map((row) => {
    const cells = [row[1], ...row[2].replace(/^\s*\|\|/, "").split("||")];
    const numberAt = (index) => {
      const value = clean(cells[index] ?? "").match(/\d[\d,]*(?:\.\d+)?/);
      return value ? Number(value[0].replaceAll(",", "")) : null;
    };
    return { level: Number(row[1]), damage: numberAt(damageIndex), interval: numberAt(intervalIndex), splashMaxHits: numberAt(maxHitsIndex) };
  });
  if (values.length !== levels.length || values.some((value, position) => value.level !== position || !Number.isFinite(value.damage) || value.damage <= 0 || !Number.isFinite(value.interval) || value.interval <= 0 || !Number.isFinite(value.splashMaxHits) || value.splashMaxHits < 1 || Math.abs(value.damage - levels[position].damage) > 1e-9 || Math.abs(value.interval - levels[position].interval) > 1e-9)) return null;
  return { formula: "pulse-direct-cycle", values };
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
  const cycle = entry.title === "Accelerator" ? acceleratorCycle(entry) : entry.title === "Operator" ? operatorCycle(entry, levels) : entry.title === "Commando" ? commandoCycle(entry, levels) : ["Soldier", "Golden Soldier"].includes(entry.title) ? soldierCycle(entry, levels) : entry.title === "Freezer" ? freezerCycle(entry, levels) : entry.title === "Ranger" ? directSplashCycle(entry, levels) : ["Snowballer", "Golden Snowballer"].includes(entry.title) ? snowballerSplashCycle(entry, levels) : entry.title === "Toxic Gunner" ? toxicGunnerCycle(entry, levels) : entry.title === "Ace Pilot" ? acePilotCycle(entry, levels) : entry.title === "Slime Trooper" ? singleTargetDamageCycle(entry, levels) : entry.title === "Pulse Trooper" ? pulseTrooperCycle(entry, levels) : ["Demoman", "Golden Demoman", "Mortar", "Paintballer", "Rocketeer"].includes(entry.title) ? splashDamageCycle(entry, levels) : null;
  if (cycle) {
    for (const stat of levels) Object.assign(stat, cycle.values.find((value) => value.level === stat.level));
  }
  const dpsFormula = cycle ? cycle.formula === "overcharge-cycle" ? "accelerator-overcharge-cycle" : cycle.formula === "operator-burst-cycle" ? "operator-burst-cycle" : cycle.formula === "commando-magazine-cycle" ? "commando-magazine-cycle" : cycle.formula === "golden-soldier-cycle" ? "golden-soldier-cycle" : cycle.formula === "freezer-damage-cycle" ? "freezer-damage-cycle" : cycle.formula === "toxic-gunner-poison-cycle" ? "toxic-gunner-poison-cycle" : cycle.formula === "ace-pilot-bomb-cycle" ? "ace-pilot-bomb-cycle" : cycle.formula === "single-target-damage-cycle" ? "single-target-damage-cycle" : cycle.formula === "pulse-direct-cycle" ? "pulse-direct-cycle" : cycle.formula === "splash-damage-cycle" ? "splash-damage-cycle" : cycle.formula === "missile-splash-cycle" ? "missile-splash-cycle" : cycle.formula === "direct-splash-cycle" ? "direct-splash-cycle" : "soldier-burst-cycle" : specialDamageMethod ? "unmodeled-special" : "damage-over-interval";
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
            : cycle.formula === "toxic-gunner-poison-cycle"
              ? "Source-listed combined estimate: burst gun DPS + Poison Damage / Tick; the single-fire level uses Damage / Firerate + Poison Damage / Tick. Assumes every shot poisons the same enemy."
              : cycle.formula === "ace-pilot-bomb-cycle"
                ? "Source-listed combined estimate: Normal Damage / Firerate + Splash Damage / Bomb Cooldown. Bomb splash is shown as a per-target-equivalent estimate; blast target count and projectile travel time are excluded."
                : cycle.formula === "single-target-damage-cycle"
                  ? "Source-listed single-target estimate: Damage / Firerate. Assumes one enemy receives full damage; projectile travel time and slowdown effects are excluded."
                  : cycle.formula === "pulse-direct-cycle"
                    ? "Source-listed main-pulse estimate: Damage / Firerate. Maximum Hits is shown separately and not multiplied into this rate; the Sweeper ability is excluded."
            : cycle.formula === "splash-damage-cycle"
              ? ["Snowballer", "Golden Snowballer"].includes(entry.title)
                ? "Source-listed estimate: Damage / Firerate for one target receiving full damage. Maximum-hit count and projectile travel time are excluded."
                : "Source-listed per-target splash estimate: Splash Damage / Firerate. Actual total damage depends on how many enemies a blast hits."
              : cycle.formula === "missile-splash-cycle"
                ? "Source-listed single-target missile splash estimate: (Splash Damage × Missile Count) / Firerate. Projectile travel time and multiple targets are excluded."
                : cycle.formula === "direct-splash-cycle"
                  ? "Source-listed single-target combined estimate: (Damage / Firerate) + (Splash Damage / Firerate). Maximum Hits is shown separately and is not multiplied into this estimate."
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
