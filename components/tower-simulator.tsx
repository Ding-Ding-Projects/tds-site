"use client";

import { useEffect, useState } from "react";
import { SlidersHorizontal, TowerControl } from "lucide-react";
import towerCatalog from "../data/tower-stats.json";

type Tower = (typeof towerCatalog.towers)[number];

export default function TowerSimulator({ towers }: { towers: Tower[] }) {
  const [towerName, setTowerName] = useState("Accelerator");
  const [level, setLevel] = useState(0);
  const [placements, setPlacements] = useState(4);
  const tower = towers.find((item) => item.name === towerName) ?? towers[0];
  const stat = tower.levels.find((item) => item.level === level) ?? tower.levels[0];
  const dps = !tower.dpsMethod.startsWith("Special cycle") && stat.interval !== null && stat.interval > 0 && stat.damage !== null ? stat.damage / stat.interval : null;
  const investment = tower.placementCost === null || tower.levels.some((item) => item.level > 0 && item.level <= level && item.cost === null) ? null : tower.placementCost + tower.levels.filter((item) => item.level > 0 && item.level <= level).reduce((sum, item) => sum + (item.cost ?? 0), 0);
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
    <div className="tower-identity"><span className="tower-avatar"><TowerControl size={21}/></span><div><strong>{tower.name}</strong><small>{tower.role} · unlock {tower.unlock}</small></div><span className="level-chip">LEVEL {level}</span></div>
    <label className="select-row">Upgrade tier<select value={level} onChange={(event) => setLevel(Number(event.target.value))} aria-label="Select upgrade tier">{tower.levels.map((item) => <option key={`${item.level}-${item.title}`} value={item.level}>{item.level === 0 ? "Level 0 · Base" : `Level ${item.level} · ${item.title}`}</option>)}</select></label>
    <label className="range-control">Tower count<input type="range" min="1" max="10" value={placements} onChange={(event) => setPlacements(Number(event.target.value))}/><span><b>{placements}</b><small>1 — 10</small></span></label>
    <div className="stat-grid"><div><small>UPGRADE DAMAGE</small><b>{stat.damage ?? "—"}</b></div><div><small>FIRE INTERVAL</small><b>{stat.interval ? `${stat.interval}s` : "—"}</b></div><div className="highlight-stat"><small>{dps === null ? "DPS ESTIMATE" : "EST. DPS / TOWER"}</small><b>{dps === null ? "Not modeled" : dps.toFixed(2)}</b></div><div><small>SELECTED INVESTMENT</small><b>{investment === null ? "Unknown" : `$${investment.toLocaleString()}`}</b></div></div>
    <div className="detection-grid"><span>HIDDEN <b>{stat.hidden}</b></span><span>LEAD <b>{stat.lead}</b></span><span>FLYING <b>{stat.flying}</b></span></div>
    <div className="sim-total"><span>TOTAL EST. DPS · {placements} PLACEMENTS</span><b>{dps === null ? "Not modeled" : (dps * placements).toFixed(2)}</b></div>
    <p className="calc-note">Source revision <a href={tower.source.historyUrl} target="_blank" rel="noreferrer">{tower.source.revisionId}</a>. {tower.dpsMethod} DPS excludes buffs, defense, targeting downtime, and placement limits. Special-cycle values are left uncalculated until their full cycle formula is source-verified.</p>
  </section>;
}
