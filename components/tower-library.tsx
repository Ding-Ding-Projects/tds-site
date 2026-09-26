"use client";

import { useMemo, useState } from "react";
import { Search, TowerControl } from "lucide-react";
import towerCatalog from "../data/tower-stats.json";

type Tower = (typeof towerCatalog.towers)[number];

export default function TowerLibrary({ towers }: { towers: Tower[] }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => towers.filter((tower) => `${tower.name} ${tower.role} ${tower.placement}`.toLowerCase().includes(query.trim().toLowerCase())), [towers, query]);
  return <section className="tower-library" id="towers"><div className="section-heading"><div><span className="eyebrow">WIKI EXTRACT · {towers.length} TOWERS</span><h2>Tower field index</h2></div><label className="search-field"><Search size={16}/><input aria-label="Search towers" placeholder="Search towers or roles" value={query} onChange={(event) => setQuery(event.target.value)}/><kbd>/</kbd></label></div><div className="tower-table"><div className="table-head"><span>TOWER</span><span>ROLE</span><span>UNLOCK</span><span>PLACEMENT</span><span>BASE DPS</span><span>DETECTION</span></div>{filtered.map((tower) => { const base = tower.levels[0]; const dps = tower.dpsMethod.startsWith("Special cycle") || !base.interval || base.damage === null ? null : base.damage / base.interval; return <a className="tower-row" key={tower.pageid} href="#simulator" onClick={() => window.dispatchEvent(new CustomEvent("tds-select-tower", { detail: tower.name }))}><strong><span className="mini-tower"><TowerControl size={15}/></span>{tower.name}</strong><span>{tower.role}</span><span>{tower.unlock}</span><span>{tower.placementCost === null ? "Unknown" : `$${tower.placementCost.toLocaleString()}`}</span><b>{dps === null ? "Cycle" : dps.toFixed(2)}</b><span className="detect-tag">H {base.hidden} · L {base.lead} · F {base.flying}</span></a>; })}{filtered.length === 0 && <p className="empty-results">No towers match this search.</p>}</div><p className="table-caption">Values are extracted from the linked wiki revision. Unknown costs and special firing cycles are left uncalculated.</p></section>;
}
