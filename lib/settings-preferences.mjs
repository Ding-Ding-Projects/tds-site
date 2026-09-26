export const PREFERENCE_STORAGE_KEY = "tds-ui-preferences-v1";
export const VOCABULARY_STORAGE_KEY = "tds-local-vocabulary-v1";
export const MAX_VOCABULARY_BYTES = 1024 * 1024;
export const MAX_VOCABULARY_ENTRIES = 4096;
export const MAX_VOCABULARY_KEY_LENGTH = 160;
export const MAX_VOCABULARY_VALUE_LENGTH = 1000;
export const MAX_VOCABULARY_KEY_BYTES = 64 * 1024;

const UNSAFE_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const MODES = new Set(["en", "yue", "bi"]);

export const DEFAULT_PREFERENCES = Object.freeze({
  schemaVersion: 1,
  languageMode: "en",
  showDialogEmojis: false,
});

function scanJsonForDuplicates(source, maxDepth = 2) {
  let cursor = 0;
  const skipWhitespace = () => {
    while (/\s/u.test(source[cursor] ?? "")) cursor += 1;
  };
  const parseStringEnd = () => {
    const start = cursor;
    cursor += 1;
    while (cursor < source.length) {
      const character = source[cursor];
      if (character === "\\") {
        cursor += 2;
      } else if (character === '"') {
        cursor += 1;
        return JSON.parse(source.slice(start, cursor));
      } else {
        cursor += 1;
      }
    }
    throw new Error("The JSON string is incomplete.");
  };
  const parseValue = (depth) => {
    skipWhitespace();
    if (depth > maxDepth) throw new Error("The JSON nesting limit is exceeded.");
    const next = source[cursor];
    if (next === '"') {
      parseStringEnd();
      return;
    }
    if (next === "{") {
      cursor += 1;
      skipWhitespace();
      const keys = new Set();
      if (source[cursor] === "}") {
        cursor += 1;
        return;
      }
      while (cursor < source.length) {
        skipWhitespace();
        if (source[cursor] !== '"') throw new Error("An object key is not a string.");
        const key = parseStringEnd();
        if (keys.has(key)) throw new Error("The JSON contains a duplicate object key.");
        keys.add(key);
        skipWhitespace();
        if (source[cursor] !== ":") throw new Error("An object key is missing its colon.");
        cursor += 1;
        parseValue(depth + 1);
        skipWhitespace();
        if (source[cursor] === "}") {
          cursor += 1;
          return;
        }
        if (source[cursor] !== ",") throw new Error("An object entry is missing its separator.");
        cursor += 1;
      }
      throw new Error("The JSON object is incomplete.");
    }
    if (next === "[") {
      cursor += 1;
      skipWhitespace();
      if (source[cursor] === "]") {
        cursor += 1;
        return;
      }
      while (cursor < source.length) {
        parseValue(depth + 1);
        skipWhitespace();
        if (source[cursor] === "]") {
          cursor += 1;
          return;
        }
        if (source[cursor] !== ",") throw new Error("An array item is missing its separator.");
        cursor += 1;
      }
      throw new Error("The JSON array is incomplete.");
    }
    const start = cursor;
    while (cursor < source.length && !/[\s,}\]]/u.test(source[cursor])) cursor += 1;
    if (cursor === start) throw new Error("The JSON value is missing.");
  };

  parseValue(0);
  skipWhitespace();
  if (cursor !== source.length) throw new Error("The JSON has trailing content.");
}

export function parseVocabularyPayload(source) {
  if (typeof source !== "string") throw new Error("The file could not be read as text.");
  const byteLength = new TextEncoder().encode(source).byteLength;
  if (byteLength === 0 || byteLength > MAX_VOCABULARY_BYTES) {
    throw new Error("The file is empty or exceeds the 1 MiB limit.");
  }
  scanJsonForDuplicates(source);
  let parsed;
  try {
    parsed = JSON.parse(source);
  } catch {
    throw new Error("The file is not valid JSON.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("The top-level JSON value must be an object.");
  }
  const topKeys = Object.keys(parsed);
  if (topKeys.length !== 2 || !topKeys.includes("schemaVersion") || !topKeys.includes("entries")) {
    throw new Error("The file must contain only schemaVersion and entries.");
  }
  if (parsed.schemaVersion !== 1 || !parsed.entries || typeof parsed.entries !== "object" || Array.isArray(parsed.entries)) {
    throw new Error("The schema version or entries object is unsupported.");
  }
  const keys = Object.keys(parsed.entries);
  if (keys.length > MAX_VOCABULARY_ENTRIES) throw new Error("The entries limit is exceeded.");
  let totalKeyBytes = 0;
  for (const key of keys) {
    const value = parsed.entries[key];
    if (!key || key.length > MAX_VOCABULARY_KEY_LENGTH || UNSAFE_KEYS.has(key)) {
      throw new Error("An entry key is empty, too long, or unsafe.");
    }
    totalKeyBytes += new TextEncoder().encode(key).byteLength;
    if (totalKeyBytes > MAX_VOCABULARY_KEY_BYTES) throw new Error("The total key-size limit is exceeded.");
    if (typeof value !== "string" || value.length > MAX_VOCABULARY_VALUE_LENGTH || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value)) {
      throw new Error("An entry value is invalid or too long.");
    }
  }
  return { schemaVersion: 1, entries: parsed.entries };
}

export function parsePreferences(source) {
  try {
    const parsed = JSON.parse(source);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return DEFAULT_PREFERENCES;
    if (parsed.schemaVersion !== 1 || !MODES.has(parsed.languageMode) || typeof parsed.showDialogEmojis !== "boolean") return DEFAULT_PREFERENCES;
    if (Object.keys(parsed).length !== 3) return DEFAULT_PREFERENCES;
    return { schemaVersion: 1, languageMode: parsed.languageMode, showDialogEmojis: parsed.showDialogEmojis };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function savePreferences(storage, preferences) {
  const valid = parsePreferences(JSON.stringify(preferences));
  storage.setItem(PREFERENCE_STORAGE_KEY, JSON.stringify(valid));
  return valid;
}

export function loadPreferences(storage) {
  try {
    const raw = storage.getItem(PREFERENCE_STORAGE_KEY);
    return raw ? parsePreferences(raw) : DEFAULT_PREFERENCES;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function loadVocabularyCache(storage) {
  try {
    const raw = storage.getItem(VOCABULARY_STORAGE_KEY);
    return raw ? parseVocabularyPayload(raw) : null;
  } catch {
    try {
      storage.removeItem(VOCABULARY_STORAGE_KEY);
    } catch {
      // Storage may be read-only, so original wording remains the fallback.
    }
    return null;
  }
}

export function storeVocabularyCache(storage, vocabulary) {
  const valid = parseVocabularyPayload(JSON.stringify(vocabulary));
  storage.setItem(VOCABULARY_STORAGE_KEY, JSON.stringify(valid));
  return valid;
}

export function clearVocabularyCache(storage) {
  storage.removeItem(VOCABULARY_STORAGE_KEY);
}

export function applyVocabularyText(text, vocabulary) {
  if (!vocabulary) return text;
  const entries = Object.entries(vocabulary.entries).sort(([a], [b]) => b.length - a.length);
  if (entries.length === 0) return text;
  const replacements = new Map(entries);
  const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const pattern = new RegExp(entries.map(([source]) => escapeRegExp(source)).join("|"), "gu");
  return text.replace(pattern, (source) => replacements.get(source) ?? source);
}
