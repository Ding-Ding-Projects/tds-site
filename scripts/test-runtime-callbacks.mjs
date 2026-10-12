import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { withSiteBasePath } from "../lib/site-path.mjs";
import { wikiTitleKey } from "../lib/wiki-source-renderer.mjs";
import { applyVocabularyText } from "../lib/settings-preferences.mjs";

const require = createRequire(import.meta.url);
// Execute the real TSX and event handlers with deterministic hook state. This is
// a component regression harness, not a browser, hydration, or effect scheduler test.
async function componentHarness(file, name, { basePath = "", fetch, globals = {} } = {}) {
  const states = [];
  const effects = [];
  let cursor = 0;
  let initial = true;
  const hooks = {
    ...React,
    useState(value) {
      const index = cursor++;
      if (!(index in states)) states[index] = typeof value === "function" ? value() : value;
      return [states[index], (next) => { states[index] = typeof next === "function" ? next(states[index]) : next; }];
    },
    useRef(value) { return hooks.useState({ current: value })[0]; },
    useMemo: (fn) => fn(),
    useCallback: (fn) => fn,
    useEffect: (fn) => { if (initial) effects.push(fn); },
  };
  const imports = {
    react: hooks,
    "@/lib/site-path.mjs": { sitePath: (path) => withSiteBasePath(path, basePath) },
    "@/lib/wiki-source-renderer.mjs": { wikiTitleKey },
    "@/lib/settings-preferences.mjs": { applyVocabularyText },
    "@/components/wiki-article-body": { WikiArticleBody: () => null },
  };
  const source = await readFile(new URL(`../components/${file}`, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports, require: (id) => imports[id] ?? require(id), URL, AbortController, TextEncoder, fetch, process: { env: { NEXT_PUBLIC_STATIC_EXPORT: "true" } }, ...globals }, { filename: file });
  return {
    render(props) { cursor = 0; const result = exports[name](props); initial = false; return result; },
    async load() { for (const effect of effects) effect(); await new Promise((resolve) => setImmediate(resolve)); },
  };
}

function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!React.isValidElement(tree)) return [];
  return [tree, ...nodes(tree.props.children)];
}
function text(tree) {
  if (Array.isArray(tree)) return tree.map(text).join("");
  return React.isValidElement(tree) ? text(tree.props.children) : tree == null ? "" : String(tree);
}
function button(tree, label) {
  const found = nodes(tree).find((node) => node.type === "button" && text(node) === label);
  assert.ok(found, `Missing button: ${label}`);
  return found;
}
const wikiNode = (type, props, ...children) => ({ type, props, children });

for (const basePath of ["", "/tds-site"]) {
  test(`known wiki links keep nested labels and local callbacks under '${basePath}'`, async () => {
    const current = { pageid: 1, title: "Current Page" };
    const other = { pageid: 2, title: "Other Page" };
    const requests = [];
    const opened = [];
    const content = [
      wikiNode("a", { href: "/w/Other_Page" }, wikiNode("strong", {}, "Other <script> & label")),
      wikiNode("a", { href: "/w/Current_Page#Section_Name" }, wikiNode("em", {}, "Section")),
      wikiNode("a", { href: "/w/Current_Page" }, "Current"),
      wikiNode("a", { href: "https://example.com/?q=a&x=b" }, "External"),
      wikiNode("a", { href: "javascript:alert(1)" }, "Unsafe"),
      wikiNode("a", { href: "/w/%ZZ" }, "Malformed"),
    ];
    const harness = await componentHarness("wiki-rendered-article.tsx", "WikiRenderedArticle", { basePath, fetch: async (url) => {
      requests.push(url);
      return { ok: true, json: async () => ({ schemaVersion: 1, pageid: 1, revisionId: 10, content }) };
    } });
    const props = { ...current, namespace: 0, revisionId: 10, plainText: "", sourceMarkup: "", entries: [current, other], onOpenArticle: (entry) => opened.push(entry) };
    harness.render(props);
    await harness.load();
    const tree = harness.render(props);
    assert.deepEqual(requests, [`${basePath}/wiki/rendered/1.json`]);
    const link = button(tree, "Other <script> & label");
    assert.equal(link.props.children[0].type, "strong");
    link.props.onClick();
    assert.deepEqual(opened, [other]);
    const all = nodes(tree);
    assert.equal(all.find((node) => node.type === "a" && text(node) === "Section").props.href, "#wiki-section-Section-Name");
    assert.ok(all.some((node) => node.type === "span" && text(node) === "Current"));
    const external = all.find((node) => node.type === "a" && text(node) === "External");
    assert.equal(external.props.target, "_blank");
    assert.equal(external.props.rel, "noreferrer");
    assert.equal(external.props.href, "https://example.com/?q=a&x=b");
    assert.equal(all.find((node) => node.type === "a" && text(node) === "Unsafe").props.href, "#wiki-section-");
    assert.equal(all.find((node) => node.type === "a" && text(node) === "Malformed").props.href, "https://tds.wiki/w/%ZZ");
    const html = renderToStaticMarkup(tree);
    assert.match(html, /Other &lt;script&gt; &amp; label/);
    assert.doesNotMatch(html, /<script|javascript:/);
  });
}

async function regexHarness(options) {
  const calls = [];
  const harness = await componentHarness("regex-workbench.tsx", "RegexWorkbench", options);
  const props = { open: true, languageMode: "en", vocabulary: null, pattern: "old", regexEnabled: false, flags: "g", searchItems: [], onEvaluation: () => {}, onPatternChange: (value) => calls.push(["pattern", value]), onFlagsChange: (value) => calls.push(["flags", value]), onRegexEnabledChange: (value) => calls.push(["enabled", value]), onInsertPattern: (...args) => calls.push(["insert", ...args]) };
  return { harness, props, calls };
}

test("valid regex import enables the parent and reports success", async () => {
  const { harness, props, calls } = await regexHarness();
  let tree = harness.render(props);
  nodes(tree).find((node) => node.type === "textarea" && node.props.maxLength === 16384).props.onChange({ target: { value: JSON.stringify({ pattern: "a+", flags: "ggi?", replacement: "<$&>" }) } });
  tree = harness.render(props);
  button(tree, "Load pattern").props.onClick();
  tree = harness.render(props);
  assert.deepEqual(calls, [["pattern", "a+"], ["flags", "gi"], ["enabled", true]]);
  assert.ok(nodes(tree).some((node) => node.props.role === "status" && text(node) === "Pattern loaded from the pasted JSON."));
  assert.ok(nodes(tree).some((node) => node.type === "input" && node.props.value === "<$&>"));
});

test("invalid regex import leaves parent values untouched", async () => {
  const { harness, props, calls } = await regexHarness();
  let tree = harness.render(props);
  nodes(tree).find((node) => node.type === "textarea" && node.props.maxLength === 16384).props.onChange({ target: { value: '{"pattern": 1}' } });
  tree = harness.render(props);
  button(tree, "Load pattern").props.onClick();
  assert.deepEqual(calls, []);
  assert.match(text(harness.render(props)), /That JSON object is invalid/);
});

test("open state and insert controls preserve the controlled callback contract", async () => {
  const { harness, props, calls } = await regexHarness();
  assert.equal(harness.render({ ...props, open: false }).props.hidden, true);
  let tree = harness.render(props);
  assert.equal(tree.props.hidden, false);
  nodes(tree).find((node) => node.type === "input" && node.props.maxLength === 7).props.onChange({ target: { value: "U+1f600" } });
  tree = harness.render(props);
  const pointButton = nodes(tree).find((node) => node.type === "div" && node.props.className === "regex-workbench__codepoint");
  nodes(pointButton).find((node) => node.type === "button").props.onClick();
  const tokens = nodes(tree).find((node) => node.props.className === "regex-workbench__tokens");
  nodes(tokens).find((node) => node.type === "button").props.onClick();
  nodes(tree).find((node) => node.type === "input" && node.props.type === "checkbox").props.onChange({ target: { checked: true } });
  assert.deepEqual(calls.slice(0, 2), [["insert", "\\u{1F600}"], ["flags", "gu"]]);
  assert.equal(calls[2][0], "insert");
  assert.deepEqual(calls[3], ["enabled", true]);
});


test("exported regex JSON can be imported through the real callbacks", async () => {
  let blob;
  const downloads = [];
  const revoked = [];
  const link = { click() { downloads.push([this.href, this.download]); } };
  const { harness, props, calls } = await regexHarness({ globals: {
    Blob,
    URL: { createObjectURL(value) { blob = value; return "blob:regex-test"; }, revokeObjectURL(value) { revoked.push(value); } },
    document: { createElement(tag) { assert.equal(tag, "a"); return link; } },
  } });
  let tree = harness.render(props);
  button(tree, "Export pattern JSON").props.onClick();
  assert.deepEqual(downloads, [["blob:regex-test", "regex-pattern.json"]]);
  assert.deepEqual(revoked, ["blob:regex-test"]);
  assert.equal(blob.type, "application/json");
  const exported = await blob.text();
  assert.equal(JSON.parse(exported).schemaVersion, 1);
  nodes(tree).find((node) => node.type === "textarea" && node.props.maxLength === 16384).props.onChange({ target: { value: exported } });
  tree = harness.render(props);
  button(tree, "Load pattern").props.onClick();
  assert.deepEqual(calls, [["pattern", "old"], ["flags", "g"], ["enabled", true]]);
  assert.match(text(harness.render(props)), /Pattern loaded from the pasted JSON/);
});

for (const [label, payload] of [
  ["unsupported version", { schemaVersion: 2, pattern: "a", flags: "g", replacement: "" }],
  ["string version", { schemaVersion: "1", pattern: "a", flags: "g", replacement: "" }],
  ["null version", { schemaVersion: null, pattern: "a", flags: "g", replacement: "" }],
  ["unknown field", { schemaVersion: 1, pattern: "a", flags: "g", replacement: "", extra: true }],
  ["oversized pattern", { schemaVersion: 1, pattern: "a".repeat(513), flags: "g", replacement: "" }],
  ["oversized replacement", { schemaVersion: 1, pattern: "a", flags: "g", replacement: "a".repeat(4097) }],
  ["oversized UTF-8 input", { schemaVersion: 1, pattern: "a", flags: "g", replacement: "😀".repeat(4096) }],
]) {
  test(`regex import rejects ${label} without parent changes`, async () => {
    const { harness, props, calls } = await regexHarness();
    let tree = harness.render(props);
    nodes(tree).find((node) => node.type === "textarea" && node.props.maxLength === 16384).props.onChange({ target: { value: JSON.stringify(payload) } });
    tree = harness.render(props);
    button(tree, "Load pattern").props.onClick();
    assert.deepEqual(calls, []);
    assert.match(text(harness.render(props)), /That JSON object is invalid/);
  });
}
