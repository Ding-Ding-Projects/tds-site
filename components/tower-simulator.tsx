"use client";

import { useEffect, useState } from "react";
import { SlidersHorizontal, TowerControl } from "lucide-react";
import towerCatalog from "../data/tower-stats.json";
import { estimateInvestment } from "@/lib/tower-stats-contract.mjs";

type Tower = (typeof towerCatalog.towers)[number];

export default function TowerSimulator({ towers }: { towers: Tower[] }) {
  const [towerName, setTowerName] = useState("Accelerator");
  const [level, setLevel] = useState(0);
  const [placements, setPlacements] = useState(4);
  const tower = towers.find((item) => item.name === towerName) ?? towers[0];
  const stat = tower.levels.find((item) => item.level === level) ?? tower.levels[0];
  const placementMax = Math.min(10, tower.placementLimit ?? 10);
  const selectedPlacements = Math.min(placements, placementMax);
  const dps = tower.dpsFormula === "damage-over-interval" && stat.interval !== null && stat.interval > 0 && stat.damage !== null ? stat.damage / stat.interval : null;
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
    <div className="tower-identity"><span className="tower-avatar"><TowerControl size={21}/></span><div><strong>{tower.name}</strong><small>{tower.role} · unlock {tower.unlock}</small><small>{tower.placement} · {tower.damageMethod}</small></div><span className="level-chip">LEVEL {level}</span></div>
    <label className="select-row">Upgrade tier<select value={level} onChange={(event) => setLevel(Number(event.target.value))} aria-label="Select upgrade tier">{tower.levels.map((item) => <option key={`${item.level}-${item.title}`} value={item.level}>{item.level === 0 ? "Level 0 · Base" : `Level ${item.level} · ${item.title}`}</option>)}</select></label>
    <label className="range-control">Tower count<input type="range" min="1" max={placementMax} value={selectedPlacements} onChange={(event) => setPlacements(Number(event.target.value))} aria-label={`Tower count, maximum ${placementMax}`}/><span><b>{selectedPlacements}</b><small>1 - {placementMax}{tower.placementLimit ? ` (limit ${tower.placementLimit})` : ""}</small></span></label>
    <div className="stat-grid"><div><small>UPGRADE DAMAGE</small><b>{stat.damage ?? "—"}</b></div><div><small>FIRE INTERVAL</small><b>{stat.interval ? `${stat.interval}s` : "—"}</b></div><div className="highlight-stat"><small>{dps === null ? "DPS ESTIMATE" : "EST. DPS / TOWER"}</small><b>{dps === null ? "Not modeled" : dps.toFixed(2)}</b></div><div><small>INVESTMENT / TOWER</small><b>{investmentPerTower === null ? "Unknown" : `$${investmentPerTower.toLocaleString()}`}</b></div></div>
    <div className="detection-grid"><span>HIDDEN <b>{stat.hidden}</b></span><span>LEAD <b>{stat.lead}</b></span><span>FLYING <b>{stat.flying}</b></span></div>
    {tower.detectionNotes.length > 0 && <ul className="calc-note">{tower.detectionNotes.map((note) => <li key={`${note.attribute}-${note.text}`}>{note.attribute} detection note: {note.text}</li>)}</ul>}
    <div className="sim-total"><div><span>TOTAL EST. DPS · {selectedPlacements} PLACEMENTS</span><b>{dps === null ? "Not modeled" : (dps * selectedPlacements).toFixed(2)}</b></div><div><span>TOTAL INVESTMENT</span><b>{totalInvestment === null ? "Unknown" : `$${totalInvestment.toLocaleString()}`}</b></div></div>
    <p className="calc-note">Damage method: {tower.damageMethod}. Source revision <a href={tower.source.historyUrl} target="_blank" rel="noreferrer">{tower.source.revisionId}</a>. {tower.dpsMethod} Estimates exclude buffs, target downtime, overkill, enemy defense, and range uptime. Special damage methods remain unmodeled until a source-backed cycle formula is available.</p>
  </section>;
}
