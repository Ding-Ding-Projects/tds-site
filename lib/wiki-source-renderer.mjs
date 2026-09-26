const HEADING = /^(={2,6})\s*(.*?)\s*\1\s*$/;
const INLINE_HTML_BREAK = /^<\s*br\s*\/?\s*>/i;
const MEDIA_PREFIX = /^(?:file|image):/i;
const SECTION_ID_PREFIX = "wiki-section-";

function decodeEntities(value) {
  return value.replace(/&(#(?:x[0-9a-f]+|\d+)|amp|lt|gt|quot|apos|nbsp);/gi, (match, entity) => {
    const named = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: "\u00a0" };
    if (!entity.startsWith("#")) return named[entity.toLowerCase()] ?? match;
    const hex = entity[1]?.toLowerCase() === "x";
    const point = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
    if (!Number.isInteger(point) || point < 0 || point > 0x10ffff || (point >= 0xd800 && point <= 0xdfff)) return match;
    return String.fromCodePoint(point);
  });
}

function findBalanced(source, start, open, close) {
  if (!source.startsWith(open, start)) return -1;
  let depth = 0;
  for (let index = start; index < source.length;) {
    if (open === "{{" && source.startsWith("{{{", index)) {
      depth += 1;
      index += 3;
    } else if (close === "}}" && source.startsWith("}}}", index)) {
      depth -= 1;
      index += 3;
      if (depth === 0) return index;
    } else if (source.startsWith(open, index)) {
      depth += 1;
      index += open.length;
    } else if (source.startsWith(close, index)) {
      depth -= 1;
      index += close.length;
      if (depth === 0) return index;
    } else {
      index += 1;
    }
  }
  return -1;
}

function splitTopLevel(source, delimiter) {
  const parts = [];
  let start = 0;
  let braces = 0;
  let links = 0;
  for (let index = 0; index < source.length;) {
    if (source.startsWith("{{{", index)) {
      braces += 1;
      index += 3;
    } else if (source.startsWith("}}}", index)) {
      braces = Math.max(0, braces - 1);
      index += 3;
    } else if (source.startsWith("{{", index)) {
      braces += 1;
      index += 2;
    } else if (source.startsWith("}}", index)) {
      braces = Math.max(0, braces - 1);
      index += 2;
    } else if (source.startsWith("[[", index)) {
      links += 1;
      index += 2;
    } else if (source.startsWith("]]", index)) {
      links = Math.max(0, links - 1);
      index += 2;
    } else if (braces === 0 && links === 0 && source.startsWith(delimiter, index)) {
      parts.push(source.slice(start, index));
      index += delimiter.length;
      start = index;
    } else {
      index += 1;
    }
  }
  parts.push(source.slice(start));
  return parts;
}

function parseTemplate(source, end) {
  const raw = source.slice(2, end - 2);
  const fields = splitTopLevel(raw, "|");
  const name = fields.shift()?.trim() || "Template";
  const params = fields.map((field, index) => {
    const [key, ...rest] = splitTopLevel(field, "=");
    if (rest.length === 0) return { name: `Parameter ${index + 1}`, value: field.trim() };
    return { name: key.trim() || `Parameter ${index + 1}`, value: rest.join("=").trim() };
  });
  return { type: "template", name, params, source: source.slice(0, end) };
}

function parseLink(target, label) {
  const normalized = target.trim();
  if (/^https?:\/\//i.test(normalized)) {
    try {
      const url = new URL(normalized);
      return { type: "external-link", href: url.href, labelTokens: parseInline(label?.trim() || normalized) };
    } catch {
      return { type: "text", value: label?.trim() || normalized };
    }
  }
  if (MEDIA_PREFIX.test(normalized)) {
    const file = normalized.replace(MEDIA_PREFIX, "");
    return { type: "media", file, label: label?.trim() || file };
  }
  return { type: "internal-link", target: normalized, label: label?.trim() || normalized };
}

export function parseInline(source, depth = 0) {
  if (depth > 12) return [{ type: "text", value: decodeEntities(source) }];
  const tokens = [];
  let text = "";
  const flush = () => {
    if (text) tokens.push({ type: "text", value: decodeEntities(text) });
    text = "";
  };
  for (let index = 0; index < source.length;) {
    if (source.startsWith("<!--", index)) {
      const close = source.indexOf("-->", index + 4);
      index = close < 0 ? source.length : close + 3;
      continue;
    }
    if (source.startsWith("[[", index)) {
      const end = findBalanced(source, index, "[[", "]]");
      if (end > index) {
        flush();
        const body = source.slice(index + 2, end - 2);
        const [target, ...label] = splitTopLevel(body, "|");
        const link = parseLink(target, label.join("|"));
        if (label.length) link.labelTokens = parseInline(label.join("|"), depth + 1);
        tokens.push(link);
        index = end;
        continue;
      }
    }
    if (source[index] === "[" && /^\[(?:https?:)?\/\//i.test(source.slice(index))) {
      const end = source.indexOf("]", index + 1);
      if (end > index) {
        const body = source.slice(index + 1, end).trim();
        const match = body.match(/^(https?:\/\/\S+)(?:\s+([\s\S]*))?$/i);
        if (match) {
          flush();
          try {
            const url = new URL(match[1]);
            if (url.protocol === "http:" || url.protocol === "https:") {
              tokens.push({ type: "external-link", href: url.href, labelTokens: parseInline(match[2] || match[1], depth + 1) });
              index = end + 1;
              continue;
            }
          } catch {
            // Invalid external link syntax remains ordinary text.
          }
        }
      }
    }
    if (INLINE_HTML_BREAK.test(source.slice(index))) {
      flush();
      const match = source.slice(index).match(INLINE_HTML_BREAK);
      tokens.push({ type: "break" });
      index += match[0].length;
      continue;
    }
    if (source.startsWith("{{", index)) {
      const end = findBalanced(source, index, "{{", "}}");
      if (end > index) {
        flush();
        tokens.push({ type: "template", ...parseTemplate(source.slice(index, end), end - index) });
        index = end;
        continue;
      }
    }
    const marks = source.startsWith("'''", index) ? "'''" : source.startsWith("''", index) ? "''" : null;
    if (marks) {
      const end = source.indexOf(marks, index + marks.length);
      if (end > index + marks.length) {
        flush();
        const inner = parseInline(source.slice(index + marks.length, end), depth + 1);
        tokens.push({ type: marks.length === 3 ? "strong" : "emphasis", children: inner });
        index = end + marks.length;
        continue;
      }
    }
    text += source[index];
    index += 1;
  }
  flush();
  return tokens;
}

function parseTable(lines) {
  const rows = [];
  let row = null;
  const commit = () => {
    if (row?.cells.length) rows.push(row);
    row = null;
  };
  for (const line of lines) {
    if (/^\s*\|-/.test(line)) {
      commit();
      row = { header: false, cells: [] };
      continue;
    }
    if (/^\s*\|\}/.test(line)) break;
    const marker = line.trimStart()[0];
    if (marker !== "|" && marker !== "!") {
      if (row && line.trim()) row.cells.push(parseInline(line.trim()));
      continue;
    }
      row ??= { header: marker === "!", cells: [] };
      if (marker === "!" && row.cells.length === 0) row.header = true;
    const body = line.trimStart().slice(1);
    const delimiter = marker === "!" ? "!!" : "||";
    for (const value of splitTopLevel(body, delimiter)) {
      const separator = splitTopLevel(value, "|");
      const cell = separator.length > 1 ? separator.slice(1).join("|") : value;
      row.cells.push(parseInline(cell.trim()));
    }
  }
  commit();
  return { type: "table", rows };
}

export function splitWikiSections(source) {
  const sections = [{ title: "Overview", level: 1, source: "", id: `${SECTION_ID_PREFIX}0` }];
  for (const line of source.split(/\r?\n/)) {
    const heading = line.match(HEADING);
    if (heading) {
      sections.push({ title: heading[2].trim(), level: heading[1].length, source: "", id: `${SECTION_ID_PREFIX}${sections.length}` });
    } else {
      sections.at(-1).source += `${line}\n`;
    }
  }
  return sections.filter((section, index) => index === 0 || section.title || section.source.trim());
}

export function parseWikiBlocks(source) {
  const lines = source.split(/\r?\n/);
  const blocks = [];
  for (let index = 0; index < lines.length;) {
    const line = lines[index];
    if (!line.trim() || /^\s*__(?:TOC|NOTOC|FORCETOC)__\s*$/.test(line)) { index += 1; continue; }
    if (/^\s*\{\|/.test(line)) {
      const table = [line];
      index += 1;
      while (index < lines.length) {
        table.push(lines[index]);
        if (/^\s*\|\}/.test(lines[index])) { index += 1; break; }
        index += 1;
      }
      blocks.push(parseTable(table.slice(1)));
      continue;
    }
    if (/^\s*\{\{/.test(line)) {
      const start = lines.slice(index).join("\n");
      const startAt = start.search(/\{\{/);
      const end = findBalanced(start, startAt, "{{", "}}");
      if (end > 0) {
        const consumed = start.slice(startAt, end);
        const consumedLines = consumed.split(/\r?\n/).length;
        blocks.push({ type: "template", ...parseTemplate(consumed, consumed.length) });
        const trailingText = start.slice(end).split(/\r?\n/, 1)[0]?.trim();
        if (trailingText) blocks.push({ type: "paragraph", children: parseInline(trailingText) });
        index += consumedLines;
        continue;
      }
    }
    if (/^\s*<nowiki\b/i.test(line)) {
      const raw = [line];
      index += 1;
      while (index < lines.length) { raw.push(lines[index]); if (/<\/nowiki\s*>/i.test(lines[index])) { index += 1; break; } index += 1; }
      blocks.push({ type: "code", value: raw.join("\n").replace(/^\s*<nowiki\b[^>]*>/i, "").replace(/<\/nowiki\s*>\s*$/i, "") });
      continue;
    }
    const list = line.match(/^\s*([*#;:]+)\s*(.*)$/);
    if (list) {
      const items = [];
      while (index < lines.length) {
        const item = lines[index].match(/^\s*([*#;:]+)\s*(.*)$/);
        if (!item) break;
        items.push({ depth: item[1].length, marker: item[1].at(-1), children: parseInline(item[2]) });
        index += 1;
      }
      blocks.push({ type: "list", items });
      continue;
    }
    if (/^\s*----+\s*$/.test(line)) { blocks.push({ type: "rule" }); index += 1; continue; }
    const paragraph = [line.trim()];
    index += 1;
    while (index < lines.length && lines[index].trim() && !HEADING.test(lines[index]) && !/^\s*(?:\{\{|\{\||[*#;:]+\s|----+\s*$)/.test(lines[index])) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    blocks.push({ type: "paragraph", children: parseInline(paragraph.join(" ")) });
  }
  return blocks;
}

export function wikiTitleKey(title) {
  return String(title ?? "").normalize("NFKC").replaceAll("_", " ").trim().toLocaleLowerCase();
}
