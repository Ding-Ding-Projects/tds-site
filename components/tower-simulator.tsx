"use client";

import { useEffect, useState } from "react";
import { SlidersHorizontal, TowerControl } from "lucide-react";
import towerCatalog from "../data/tower-stats.json";
import { estimateInvestment, estimateTowerDps } from "@/lib/tower-stats-contract.mjs";

type Tower = (typeof towerCatalog.towers)[number];

export default function TowerSimulator({ towers }: { towers: Tower[] }) {
  const [towerName, setTowerName] = useState("Accelerator");
  const [level, setLevel] = useState(0);
  const [placements, setPlacements] = useState(4);
  const [compareName, setCompareName] = useState("");
  const [compareLevel, setCompareLevel] = useState(0);
  const tower = towers.find((item) => item.name === towerName) ?? towers[0];
  const stat = tower.levels.find((item) => item.level === level) ?? tower.levels[0];
  const compareTower = towers.find((item) => item.name === compareName && item.name !== tower.name);
  const compareStat = compareTower?.levels.find((item) => item.level === compareLevel) ?? compareTower?.levels[0];
  const placementMax = Math.min(10, tower.placementLimit ?? 10);
  const selectedPlacements = Math.min(placements, placementMax);
  const dps = estimateTowerDps(tower, stat);
  const comparePlacementMax = compareTower ? Math.min(10, compareTower.placementLimit ?? 10) : 0;
  const comparePlacements = Math.min(selectedPlacements, comparePlacementMax);
  const compareDps = compareTower && compareStat ? estimateTowerDps(compareTower, compareStat) : null;
  const compareInvestment = compareTower && compareStat ? estimateInvestment(compareTower, compareStat.level, comparePlacements) : null;
  const intervalLabel = tower.dpsFormula === "accelerator-overcharge-cycle" ? "DAMAGE TICK" : "FIRE INTERVAL";
  const damageLabel = tower.dpsFormula === "toxic-gunner-poison-cycle" ? "GUN + POISON" : tower.dpsFormula === "direct-splash-cycle" ? "DIRECT + SPLASH" : ["splash-damage-cycle", "missile-splash-cycle"].includes(tower.dpsFormula) ? "SPLASH DAMAGE" : "UPGRADE DAMAGE";
  const investmentPerTower = estimateInvestment(tower, level, 1);
  const totalInvestment = estimateInvestment(tower, level, selectedPlacements);
  useEffect(() => {
    const selectTower = (event: Event) => {
      const name = (event as CustomEvent<string>).detail;
      if (towers.some((item) => item.name === name)) { setTowerName(name); setLevel(0); }
    };
    window.addEventListener("tds-select-tower", selectTower);
    return () => window.removeEventListener("tds-select-tower", selectTower);
  }, [towers]);

  return <section className="card simulator-card" id="simulator">
    <div className="section-heading"><div><span className="eyebrow">LIVE CALCULATOR · 83 WIKI TOWERS</span><h2>Tower simulator</h2></div><span className="sim-icon"><SlidersHorizontal size={17}/></span></div>
    <label className="select-row">Select tower<select value={tower.name} onChange={(event) => { setTowerName(event.target.value); setLevel(0); }} aria-label="Select a tower">{towers.map((item) => <option key={item.pageid} value={item.name}>{item.name}</option>)}</select></label>
    <label className="select-row">Compare with<select value={compareTower?.name ?? ""} onChange={(event) => { setCompareName(event.target.value); setCompareLevel(0); }} aria-label="Choose a tower to compare"><option value="">No comparison</option>{towers.filter((item) => item.name !== tower.name).map((item) => <option key={item.pageid} value={item.name}>{item.name}</option>)}</select></label>
    {compareTower && compareStat && <label className="select-row">Comparison upgrade tier<select value={compareStat.level} onChange={(event) => setCompareLevel(Number(event.target.value))} aria-label={`Select ${compareTower.name} comparison upgrade tier`}>{compareTower.levels.map((item) => <option key={`${item.level}-${item.title}`} value={item.level}>{item.level === 0 ? "Level 0 · Base" : `Level ${item.level} · ${item.title}`}</option>)}</select></label>}
    <div className="tower-identity"><span className="tower-avatar"><TowerControl size={21}/></span><div><strong>{tower.name}</strong><small>{tower.role} · unlock {tower.unlock}</small><small>{tower.placement} · {tower.damageMethod}</small></div><span className="level-chip">LEVEL {level}</span></div>
    <label className="select-row">Upgrade tier<select value={level} onChange={(event) => setLevel(Number(event.target.value))} aria-label="Select upgrade tier">{tower.levels.map((item) => <option key={`${item.level}-${item.title}`} value={item.level}>{item.level === 0 ? "Level 0 · Base" : `Level ${item.level} · ${item.title}`}</option>)}</select></label>
    <label className="range-control">Tower count<input type="range" min="1" max={placementMax} value={selectedPlacements} onChange={(event) => setPlacements(Number(event.target.value))} aria-label={`Tower count, maximum ${placementMax}`}/><span><b>{selectedPlacements}</b><small>1 - {placementMax}{tower.placementLimit ? ` (limit ${tower.placementLimit})` : ""}</small></span></label>
    <div className="stat-grid"><div><small>{damageLabel}</small><b>{tower.dpsFormula === "toxic-gunner-poison-cycle" ? `${stat.damage} + ${stat.poisonDamage}` : tower.dpsFormula === "direct-splash-cycle" ? `${stat.damage}${stat.splashDamage ? ` + ${stat.splashDamage}` : ""}` : ["splash-damage-cycle", "missile-splash-cycle"].includes(tower.dpsFormula) ? stat.splashDamage : stat.damage ?? "—"}</b></div><div><small>{intervalLabel}</small><b>{["splash-damage-cycle", "missile-splash-cycle"].includes(tower.dpsFormula) ? `${stat.splashInterval}s` : stat.interval ? `${stat.interval}s` : "—"}</b></div><div className="highlight-stat"><small>{dps === null ? "DPS ESTIMATE" : "EST. DPS / TOWER"}</small><b>{dps === null ? "Not modeled" : dps.toFixed(2)}</b></div><div><small>INVESTMENT / TOWER</small><b>{investmentPerTower === null ? "Unknown" : `$${investmentPerTower.toLocaleString()}`}</b></div></div>
    {tower.dpsFormula === "accelerator-overcharge-cycle" && <p className="calc-note">Cycle inputs: {stat.overcharge?.toLocaleString()} overcharge · {stat.chargeUp}s charge · {stat.cooldown}s cooldown · {stat.tick}s damage tick.</p>}
    {tower.dpsFormula === "operator-burst-cycle" && <p className="calc-note">{stat.burstCount == null ? "Single-fire level: Damage / Firerate." : `Burst inputs: ${stat.burstCount} shots · ${stat.burstCooldown}s burst cooldown.`}</p>}
    {tower.dpsFormula === "soldier-burst-cycle" && <p className="calc-note">Burst inputs: {stat.burstCount} shots · {stat.interval}s between shots · {stat.burstCooldown}s between bursts.</p>}
    {tower.dpsFormula === "golden-soldier-cycle" && <p className="calc-note">{stat.burstCount == null ? "Single-fire level: Damage / Firerate." : `Burst inputs: ${stat.burstCount} shots · ${stat.interval}s between shots · ${stat.burstCooldown}s between bursts.`}</p>}
    {tower.dpsFormula === "freezer-damage-cycle" && <p className="calc-note">{stat.burstCount == null ? "Damage / Firerate. Chill and slowdown effects are excluded." : `Burst inputs: ${stat.burstCount} shots · ${stat.interval}s between shots · ${stat.burstCooldown}s between bursts. Chill and slowdown effects are excluded.`}</p>}
    {tower.dpsFormula === "toxic-gunner-poison-cycle" && <p className="calc-note">{stat.burstCount == null ? `Single-fire inputs: ${stat.damage} direct damage / ${stat.interval}s + ${stat.poisonDamage} poison damage / ${stat.tick}s.` : `Burst inputs: ${stat.burstCount} shots · ${stat.interval}s between shots · ${stat.cooldown}s between bursts. Poison: ${stat.poisonDamage} damage / ${stat.tick}s.`} The source estimate assumes every shot poisons the same enemy; slowdown and defense melting are not converted into DPS.</p>}
    {tower.dpsFormula === "splash-damage-cycle" && <p className="calc-note">Single-target-equivalent rate. Actual total damage depends on how many enemies each blast hits.{tower.name === "Mortar" ? " The source-listed estimate assumes full inner-sphere splash and excludes cluster-bomb damage and projectile travel time." : tower.name === "Paintballer" || tower.name === "Snowballer" ? ` The source lists up to ${stat.splashMaxHits} hits; this estimate does not assume every hit lands.` : ""}{tower.name === "Snowballer" ? " Slowdown and freeze effects are excluded." : ""}</p>}
    {tower.dpsFormula === "missile-splash-cycle" && <p className="calc-note">Missile cycle: {stat.splashHits} missiles. The estimate assumes one enemy is hit and excludes projectile travel time.</p>}
    {tower.dpsFormula === "direct-splash-cycle" && <p className="calc-note">Combined source estimate assumes one enemy is hit. Maximum Hits: {stat.splashMaxHits ?? "N/A"}; it is not multiplied into the displayed rate.</p>}
    {tower.dpsFormula === "commando-magazine-cycle" && <p className="calc-note">Magazine inputs: {stat.ammo} shots · {stat.interval}s fire interval · {stat.reloadTime}s reload. Missile ability damage is excluded.</p>}
    <div className="detection-grid"><span>HIDDEN <b>{stat.hidden}</b></span><span>LEAD <b>{stat.lead}</b></span><span>FLYING <b>{stat.flying}</b></span></div>
    {tower.detectionNotes.length > 0 && <ul className="calc-note">{tower.detectionNotes.map((note) => <li key={`${note.attribute}-${note.text}`}>{note.attribute} detection note: {note.text}</li>)}</ul>}
    <div className="sim-total"><div><span>TOTAL EST. DPS · {selectedPlacements} PLACEMENTS</span><b>{dps === null ? "Not modeled" : (dps * selectedPlacements).toFixed(2)}</b></div><div><span>TOTAL INVESTMENT</span><b>{totalInvestment === null ? "Unknown" : `$${totalInvestment.toLocaleString()}`}</b></div></div>
    {compareTower && compareStat && <div className="comparison-panel"><h3>Side-by-side comparison</h3><div className="comparison-scroll"><table className="comparison-table"><thead><tr><th scope="col">Metric</th><th scope="col">{tower.name} · Level {level}</th><th scope="col">{compareTower.name} · Level {compareStat.level}</th></tr></thead><tbody><tr><th scope="row">Estimated DPS per tower</th><td>{dps === null ? "Not modeled" : dps.toFixed(2)}</td><td>{compareDps === null ? "Not modeled" : compareDps.toFixed(2)}</td></tr><tr><th scope="row">Estimated DPS at selected count</th><td>{dps === null ? "Not modeled" : (dps * selectedPlacements).toFixed(2)} <small>({selectedPlacements})</small></td><td>{compareDps === null ? "Not modeled" : (compareDps * comparePlacements).toFixed(2)} <small>({comparePlacements})</small></td></tr><tr><th scope="row">Investment at selected count</th><td>{totalInvestment === null ? "Unknown" : `$${totalInvestment.toLocaleString()}`}</td><td>{compareInvestment === null ? "Unknown" : `$${compareInvestment.toLocaleString()}`}</td></tr><tr><th scope="row">Range</th><td>{stat.range ?? "Unknown"}</td><td>{compareStat.range ?? "Unknown"}</td></tr><tr><th scope="row">Placement limit</th><td>{tower.placementLimit ?? "No listed cap"}</td><td>{compareTower.placementLimit ?? "No listed cap"}</td></tr><tr><th scope="row">Detection</th><td>H {stat.hidden} · L {stat.lead} · F {stat.flying}</td><td>H {compareStat.hidden} · L {compareStat.lead} · F {compareStat.flying}</td></tr></tbody></table></div><p className="calc-note">Each tower uses its supported source-listed damage cycle. A special cycle without a verified estimate stays “Not modeled.” Placement counts respect each tower&apos;s limit.</p></div>}
    <p className="calc-note">Damage method: {tower.damageMethod}. Source revision <a href={tower.source.historyUrl} target="_blank" rel="noreferrer">{tower.source.revisionId}</a>. {tower.dpsMethod} Estimates exclude buffs, target downtime, overkill, enemy defense, and range uptime. Special damage stays unmodeled when the imported source does not provide a supported cycle formula.</p>
  </section>;
}
