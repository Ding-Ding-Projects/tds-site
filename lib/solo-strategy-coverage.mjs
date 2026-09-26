export const STRATEGY_MODES = Object.freeze([
  "Casual",
  "Easy",
  "Intermediate",
  "Molten",
  "Fallen",
  "Hidden Wave",
  "Frost",
  "Hardcore",
  "Voidcore",
  "Challenge Trials",
  "PVP",
  "Pizza Party",
  "Badlands II",
  "Polluted Wasteland II",
  "Story Mode",
]);

export function validateSoloStrategyCoverage(source) {
  const issues = [];
  const modeMatch = source.match(/const modes = \[([^\]]+)\];/);
  if (!modeMatch) return ["missing strategy mode list"];

  const modes = Array.from(modeMatch[1].matchAll(/"([^"]+)"/g), (match) => match[1]);
  if (JSON.stringify(modes) !== JSON.stringify(STRATEGY_MODES)) {
    issues.push("strategy mode list differs from the required catalog");
  }

  const plansStart = source.indexOf("const plans: Plan[] = [");
  const plansEnd = source.indexOf("\n];", plansStart);
  if (plansStart < 0 || plansEnd < 0) return [...issues, "missing strategy plan list"];

  const planLines = source.slice(plansStart, plansEnd).split(/\r?\n/)
    .filter((line) => /^\s*\{ mode: "/.test(line));
  const coverage = { Solo: new Set(), "Co-op": new Set() };
  for (const line of planLines) {
    const mode = line.match(/^\s*\{ mode: "([^"]+)"/);
    const team = line.match(/team: "(Solo|Co-op)"/);
    if (!mode || !team) {
      issues.push("strategy plan row is missing its mode or player-count label");
      continue;
    }
    if (!STRATEGY_MODES.includes(mode[1])) issues.push(`unknown ${team[1]} strategy mode: ${mode[1]}`);
    if (coverage[team[1]].has(mode[1])) issues.push(`duplicate ${team[1]} strategy plan: ${mode[1]}`);
    coverage[team[1]].add(mode[1]);
    for (const field of ["opener:", "mid:", "late:", "soloNote:", "source:"]) {
      if (!line.includes(field)) issues.push(`${team[1]} strategy plan lacks ${field} for ${mode[1]}`);
    }
  }

  for (const mode of STRATEGY_MODES) {
    for (const team of ["Solo", "Co-op"]) {
      if (!coverage[team].has(mode)) issues.push(`missing ${team} strategy plan: ${mode}`);
    }
  }
  const checkpointsStart = source.indexOf("const soloCheckpoints:");
  const checkpointsEnd = source.indexOf("\n};", checkpointsStart);
  if (checkpointsStart < 0 || checkpointsEnd < 0) {
    issues.push("missing Solo decision checkpoints");
  } else {
    const checkpointSource = source.slice(checkpointsStart, checkpointsEnd);
    for (const mode of STRATEGY_MODES) {
      const escapedMode = mode.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const row = checkpointSource.match(new RegExp(`(?:^|\\n)  "${escapedMode}": \\[([\\s\\S]*?)\\n  \\]`, "m"));
      if (!row) {
        issues.push(`missing Solo decision checkpoints: ${mode}`);
      } else if ((row[1].match(/\{ title:/g) ?? []).length !== 4) {
        issues.push(`Solo decision checkpoints must contain four steps: ${mode}`);
      }
    }
  }
  if (!source.includes('team === "Solo" && <section className="solo-checklist"')) {
    issues.push("Solo decision checkpoints are not restricted to the Solo view");
  }
  return issues;
}
