export function compareWikiRevisions(snapshotEntries, liveEntries) {
  const issues = [];
  const snapshot = new Map();
  const live = new Map();

  for (const entry of snapshotEntries) {
    const id = String(entry.pageid);
    if (snapshot.has(id)) issues.push(`duplicate snapshot page ID ${id}`);
    snapshot.set(id, entry);
  }
  for (const entry of liveEntries) {
    const id = String(entry.pageid);
    if (live.has(id)) issues.push(`duplicate live page ID ${id}`);
    live.set(id, entry);
  }

  const entries = [];
  for (const [pageid, source] of snapshot) {
    const current = live.get(pageid);
    if (!current) {
      entries.push({ pageid: source.pageid, title: source.title, snapshotRevisionId: source.revisionId, currentRevisionId: null, status: "missing-live-page" });
      continue;
    }
    const status = current.revisionId === source.revisionId ? "current" : "stale-revision";
    entries.push({ pageid: source.pageid, title: source.title, snapshotRevisionId: source.revisionId, currentRevisionId: current.revisionId, status });
  }
  for (const [pageid, current] of live) {
    if (!snapshot.has(pageid)) entries.push({ pageid: current.pageid, title: current.title, snapshotRevisionId: null, currentRevisionId: current.revisionId, status: "new-live-page" });
  }

  entries.sort((a, b) => Number(a.pageid) - Number(b.pageid));
  const counts = Object.fromEntries(["current", "stale-revision", "missing-live-page", "new-live-page"].map((status) => [status, entries.filter((entry) => entry.status === status).length]));
  return { clean: issues.length === 0 && counts["stale-revision"] === 0 && counts["missing-live-page"] === 0 && counts["new-live-page"] === 0, issues: [...new Set(issues)].sort(), counts, entries };
}
