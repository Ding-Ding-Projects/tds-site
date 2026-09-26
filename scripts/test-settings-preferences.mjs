import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  clearVocabularyCache,
  DEFAULT_PREFERENCES,
  applyVocabularyText,
  loadPreferences,
  loadVocabularyCache,
  PREFERENCE_STORAGE_KEY,
  parseVocabularyPayload,
  savePreferences,
  storeVocabularyCache,
  VOCABULARY_STORAGE_KEY,
} from "../lib/settings-preferences.mjs";

class MemoryStorage {
  #values = new Map();
  getItem(key) { return this.#values.get(key) ?? null; }
  setItem(key, value) { this.#values.set(key, String(value)); }
  removeItem(key) { this.#values.delete(key); }
}

const validVocabulary = JSON.stringify({ schemaVersion: 1, entries: { alpha: "beta" } });

test("accepts the bounded version 1 string-to-string schema", () => {
  assert.deepEqual(parseVocabularyPayload(validVocabulary), { schemaVersion: 1, entries: { alpha: "beta" } });
});

test("applies replacements in one pass without transforming replacement values again", () => {
  const vocabulary = parseVocabularyPayload('{"schemaVersion":1,"entries":{"alpha":"beta","beta":"gamma"}}');
  assert.equal(applyVocabularyText("alpha beta", vocabulary), "beta gamma");
  assert.equal(applyVocabularyText("alpha beta", null), "alpha beta");
});

test("rejects duplicate keys including escaped equivalents", () => {
  assert.throws(() => parseVocabularyPayload('{"schemaVersion":1,"entries":{"alpha":"one","alpha":"two"}}'), /duplicate/i);
  assert.throws(() => parseVocabularyPayload('{"schemaVersion":1,"entries":{"a":"one","\\u0061":"two"}}'), /duplicate/i);
});

test("rejects malformed, oversized, and empty input before applying values", () => {
  assert.throws(() => parseVocabularyPayload("{"), /JSON/i);
  assert.throws(() => parseVocabularyPayload(" ".repeat(1024 * 1024 + 1)), /empty or exceeds/i);
  assert.throws(() => parseVocabularyPayload(""), /empty or exceeds/i);
});

test("rejects unsupported versions, fields, and unsafe keys", () => {
  assert.throws(() => parseVocabularyPayload('{"schemaVersion":2,"entries":{}}'), /unsupported/i);
  assert.throws(() => parseVocabularyPayload('{"schemaVersion":1,"entries":{},"extra":true}'), /only schemaVersion/i);
  assert.throws(() => parseVocabularyPayload('{"schemaVersion":1,"entries":{"__proto__":"x"}}'), /unsafe/i);
  assert.throws(() => parseVocabularyPayload('{"schemaVersion":1,"entries":{"constructor":"x"}}'), /unsafe/i);
});

test("rejects excessive nesting, entry count, key length, value length, and non-string values", () => {
  assert.throws(() => parseVocabularyPayload('{"schemaVersion":1,"entries":{"alpha":[[["x"]]]}}'), /nesting/i);
  const tooMany = Object.fromEntries(Array.from({ length: 4097 }, (_, index) => [`k${index}`, "v"]));
  assert.throws(() => parseVocabularyPayload(JSON.stringify({ schemaVersion: 1, entries: tooMany })), /entries limit/i);
  assert.throws(() => parseVocabularyPayload(JSON.stringify({ schemaVersion: 1, entries: { ["k".repeat(161)]: "v" } })), /unsafe/i);
  const manyLongKeys = Object.fromEntries(Array.from({ length: 430 }, (_, index) => [`k${String(index).padStart(4, "0")}${"x".repeat(150)}`, "v"]));
  assert.throws(() => parseVocabularyPayload(JSON.stringify({ schemaVersion: 1, entries: manyLongKeys })), /total key-size/i);
  assert.throws(() => parseVocabularyPayload(JSON.stringify({ schemaVersion: 1, entries: { alpha: "v".repeat(1001) } })), /invalid or too long/i);
  assert.throws(() => parseVocabularyPayload('{"schemaVersion":1,"entries":{"alpha":4}}'), /invalid or too long/i);
});

test("persists only validated preferences and fails malformed state to defaults", () => {
  const storage = new MemoryStorage();
  assert.deepEqual(loadPreferences(storage), DEFAULT_PREFERENCES);
  const saved = savePreferences(storage, { schemaVersion: 1, languageMode: "yue", showDialogEmojis: true });
  assert.equal(saved.languageMode, "yue");
  assert.equal(JSON.parse(storage.getItem(PREFERENCE_STORAGE_KEY)).showDialogEmojis, true);
  storage.setItem(PREFERENCE_STORAGE_KEY, '{"schemaVersion":1,"languageMode":"unknown","showDialogEmojis":true}');
  assert.deepEqual(loadPreferences(storage), DEFAULT_PREFERENCES);
});

test("validates cached data before load and clear removes only its cache", () => {
  const storage = new MemoryStorage();
  assert.equal(loadVocabularyCache(storage), null);
  storeVocabularyCache(storage, JSON.parse(validVocabulary));
  assert.deepEqual(loadVocabularyCache(storage), JSON.parse(validVocabulary));
  storage.setItem(VOCABULARY_STORAGE_KEY, '{"schemaVersion":1,"entries":{"alpha":"x","alpha":"y"}}');
  assert.equal(loadVocabularyCache(storage), null);
  assert.equal(storage.getItem(VOCABULARY_STORAGE_KEY), null);
  storage.setItem(PREFERENCE_STORAGE_KEY, JSON.stringify(DEFAULT_PREFERENCES));
  storeVocabularyCache(storage, JSON.parse(validVocabulary));
  clearVocabularyCache(storage);
  assert.equal(storage.getItem(VOCABULARY_STORAGE_KEY), null);
  assert.notEqual(storage.getItem(PREFERENCE_STORAGE_KEY), null);
});

test("settings surface keeps the import local and exposes accessible controls", async () => {
  const source = await readFile(new URL("../components/site-settings.tsx", import.meta.url), "utf8");
  assert.match(source, /type="file"/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /aria-expanded=\{open\}/);
  assert.match(source, /t\("english"\)/);
  assert.match(source, /hasVocabulary \? "replace" : "choose"/);
  assert.match(source, /persistenceUnavailable/);
  assert.match(source, /Escape/);
  assert.doesNotMatch(source, /fetch\s*\(/);
});
