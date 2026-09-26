export function compareWikiInventory(snapshotEntries, liveEntries) {
  const issues = [];
  const snapshotById = new Map();
  const liveById = new Map();

  for (const entry of snapshotEntries) {
    const id = String(entry.pageid);
    if (snapshotById.has(id)) issues.push(`duplicate snapshot page ID: ${id}`);
    else snapshotById.set(id, entry);
  }

  for (const entry of liveEntries) {
    const id = String(entry.pageid);
    if (liveById.has(id)) issues.push(`duplicate live page ID: ${id}`);
    else liveById.set(id, entry);
  }

  const added = [];
  const removed = [];
  const renamed = [];
  const moved = [];

  for (const [id, entry] of liveById) {
    const saved = snapshotById.get(id);
    if (!saved) {
      added.push(entry);
      continue;
    }
    if (saved.namespace !== entry.namespace) {
      moved.push({ pageid: entry.pageid, title: entry.title, from: saved.namespace, to: entry.namespace });
    } else if (saved.title !== entry.title) {
      renamed.push({ pageid: entry.pageid, from: saved.title, to: entry.title, namespace: entry.namespace });
    }
  }

  for (const [id, entry] of snapshotById) {
    if (!liveById.has(id)) removed.push(entry);
  }

  return Object.freeze({
    added: Object.freeze(added),
    removed: Object.freeze(removed),
    renamed: Object.freeze(renamed),
    moved: Object.freeze(moved),
    issues: Object.freeze(issues),
    clean: added.length === 0 && removed.length === 0 && renamed.length === 0 && moved.length === 0 && issues.length === 0,
  });
}
