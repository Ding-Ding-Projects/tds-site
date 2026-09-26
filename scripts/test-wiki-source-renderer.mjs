import test from "node:test";
import assert from "node:assert/strict";
import { parseInline, parseWikiBlocks, splitWikiSections } from "../lib/wiki-source-renderer.mjs";
import { sanitizeWikiHtml, visibleTextFromWikiAst } from "../lib/wiki-html-sanitizer.mjs";

test("splits headings into addressable article sections", () => {
  const sections = splitWikiSections("Lead text\n== Strategy ==\n'''Opening'''\n=== Solo ===\nUse [[Scout|Scout tower]].");
  assert.equal(sections[0].source.trim(), "Lead text");
  assert.equal(sections[1].title, "Strategy");
  assert.match(sections[2].source, /Scout tower/);
});

test("parses emphasis and safe links while preserving unsafe schemes as text", () => {
  const tokens = parseInline("'''Bold''' and ''italic'' [[Scout|Scout tower]] [https://example.org guide] [javascript:alert(1) bad]");
  assert.equal(tokens.find((token) => token.type === "strong")?.type, "strong");
  assert.equal(tokens.find((token) => token.type === "emphasis")?.type, "emphasis");
  assert.equal(tokens.find((token) => token.type === "internal-link")?.label, "Scout tower");
  assert.equal(tokens.find((token) => token.type === "external-link")?.href, "https://example.org/");
  assert.ok(tokens.some((token) => token.type === "text" && token.value.includes("javascript:")));
});

test("keeps nested template parameters together and retains their source", () => {
  const [block] = parseWikiBlocks("{{Infobox|name={{small|Scout}}|note={{{note|a|b}}}}}\nAfter.");
  assert.equal(block.type, "template");
  assert.equal(block.params.length, 2);
  assert.equal(block.params[1].value, "{{{note|a|b}}}");
  assert.equal(block.source, "{{Infobox|name={{small|Scout}}|note={{{note|a|b}}}}}");
});

test("renders common tables and mixed list markers as structured blocks", () => {
  const blocks = parseWikiBlocks("{| class=wikitable\n! Tower !! Role\n|-\n| Scout || Starter\n|}\n* Scout\n# Upgrade Scout");
  assert.equal(blocks[0].type, "table");
  assert.equal(blocks[0].rows[0].header, true);
  assert.equal(blocks[0].rows[0].cells.length, 2);
  assert.equal(blocks[1].type, "list");
  assert.deepEqual(blocks[1].items.map((item) => item.marker), ["*", "#"]);
});

test("treats embedded HTML as text rather than executable markup", () => {
  const tokens = parseInline("<script>alert(1)</script><br/>safe");
  assert.deepEqual(tokens.map((token) => token.type), ["text", "break", "text"]);
  assert.equal(tokens[0].value, "<script>alert(1)</script>");
});

test("sanitizes revision HTML, retains article structure, and omits scripts and remote images", () => {
  const html = '<!doctype html><html><body><a aria-hidden="true" href="https://tds.wiki/cdn-cgi/content?id=private">challenge</a><section id="mwA"><h2 id="Strategy">Strategy</h2><p>Place a <strong>Scout</strong> near the path. <a href="./Scout">Scout page</a> <a href="javascript:alert(1)">unsafe</a></p><figure><a href="./File:Map.png"><img src="https://images.example/map.png" alt="Map overview"></a></figure><table><tbody><tr><th scope="col">Tower</th><td colspan="2">Scout</td></tr></tbody></table></section><script>window.privatePayload = true</script><style>body{display:none}</style></body></html>';
  const ast = sanitizeWikiHtml(html, "Test Page");
  const serialized = JSON.stringify(ast);
  const text = visibleTextFromWikiAst(ast.content);
  assert.ok(text.includes("Strategy"));
  assert.ok(text.includes("Map overview"));
  assert.ok(text.includes("Scout page"));
  assert.ok(serialized.includes('"href":"/w/Scout"'));
  assert.ok(!serialized.includes("javascript:"));
  assert.ok(!serialized.includes("images.example"));
  assert.ok(!serialized.includes("privatePayload"));
  assert.ok(!serialized.includes("cdn-cgi"));
});

test("rejects oversized or empty revision HTML", () => {
  assert.throws(() => sanitizeWikiHtml("x".repeat(6_000_001)), /6 MB limit/);
  assert.throws(() => sanitizeWikiHtml("<html><body><script>hidden</script></body></html>"), /no readable article content/);
});
