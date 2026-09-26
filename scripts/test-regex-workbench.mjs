import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";

const workerSource = await readFile(new URL("../public/regex-worker.js", import.meta.url), "utf8");
const settingsSource = await readFile(new URL("../components/site-settings.tsx", import.meta.url), "utf8");
const docsSource = await readFile(new URL("../docs/settings/regex-workbench.md", import.meta.url), "utf8");
const inventorySource = await readFile(new URL("../docs/guide/completeness.md", import.meta.url), "utf8");

function run(payload) {
  let response;
  const self = { navigator: { userAgent: "Node test engine" }, postMessage: (value) => { response = value; } };
  vm.runInNewContext(workerSource, { self, TextEncoder, performance }, { timeout: 1000 });
  self.onmessage({ data: { requestId: 7, payload } });
  return response;
}

const base = { pattern: "(?<code>[A-Z]{3}-\\d{3})", flags: "g", sample: "ABC-123 XYZ-007", replacement: "<$<code>>", positiveCases: ["ABC-123"], negativeCases: ["INVALID"], searchItems: [{ id: "language", text: "Language mode" }, { id: "clear", text: "Clear local vocabulary" }] };

test("bounded worker returns captures, replacement, cases, and local Settings matches", () => {
  const response = run(base);
  assert.equal(response.requestId, 7);
  assert.equal(response.result.matches.length, 2);
  assert.equal(response.result.matches[0].namedGroups.code, "ABC-123");
  assert.equal(response.result.replacementPreview, "<ABC-123> <XYZ-007>");
  assert.deepEqual(Array.from(response.result.caseResults, (item) => item.expected === item.matched), [true, true]);
  assert.deepEqual(Array.from(response.result.searchMatches), []);
});

test("Settings pattern search returns only matching local labels", () => {
  const response = run({ ...base, pattern: "language", flags: "i", sample: "", positiveCases: [], negativeCases: [] });
  assert.deepEqual(Array.from(response.result.searchMatches), ["language"]);
});
test("lookbehind receives a specific token explanation", () => {
  const response = run({ ...base, pattern: "(?<=ABC)123", flags: "" });
  assert.ok(response.result.tokens.some((token) => token.kind === "positive lookbehind"));
  assert.ok(!response.result.tokens.some((token) => token.kind === "named capture"));
});

test("zero-width global matches advance and remain identifiable", () => {
  const response = run({ ...base, pattern: "(?=a)", flags: "g", sample: "aaa", positiveCases: [], negativeCases: [] });
  assert.equal(response.result.matches.length, 3);
  assert.ok(response.result.matches.every((match) => match.zeroWidth));
});

test("invalid syntax and over-limit input produce worker errors", () => {
  assert.match(run({ ...base, pattern: "(" }).error, /unterminated|parenth|regular expression/i);
  assert.match(run({ ...base, sample: "x".repeat(4097) }).error, /4,096/);
});

test("risky-looking patterns receive a heuristic warning without running adversarial input", () => {
  const response = run({ ...base, pattern: "(a+)+$", sample: "safe", positiveCases: [], negativeCases: [] });
  assert.ok(response.result.riskNotes.some((note) => note.includes("Nested repetition")));
});

test("Settings anchors the builder beside plain-text-first local search", () => {
  assert.match(settingsSource, /<RegexWorkbench/);
  assert.match(settingsSource, /toLocaleLowerCase\(\)\.includes/);
  assert.match(settingsSource, /id="settings-search"/);
  assert.match(docsSource, /Patterns and samples are not uploaded or persisted/);
  assert.match(inventorySource, /Search, regex builders, tabs\/groups, command palette, settings search.*\| partial \|/);
});
