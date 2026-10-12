import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { withSiteBasePath } from "../lib/site-path.mjs";
import { verifyPagesExport } from "./verify-pages-export.mjs";

test("public resource paths work from root and repository-prefixed routes", () => {
  for (const resource of ["/wiki/index.json", "/wiki/search-index.json", "/wiki/pages/1.json", "/wiki/rendered/1.json", "/regex-worker.js", "/favicon.svg", "/tds-mark.svg", "/encyclopedia/", "/"]) {
    assert.equal(withSiteBasePath(resource), resource);
    assert.equal(withSiteBasePath(resource, "/tds-site"), `/tds-site${resource}`);
  }
  for (const resource of ["https://other.invalid/file", "//other.invalid/file", "relative.json"]) {
    assert.throws(() => withSiteBasePath(resource, "/tds-site"));
  }
  assert.throws(() => withSiteBasePath("/wiki/index.json", "/tds-site/"));
});

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "tds-pages-test-"));
  const publicFiles = {
    "wiki/index.json": JSON.stringify({ count: 1, entries: [{ pageid: 1, revisionId: 2, namespace: 0 }] }),
    "wiki/search-index.json": JSON.stringify({ articleCount: 1 }),
    "wiki/pages/1.json": JSON.stringify({ pageid: 1, revisionId: 2 }),
    "wiki/rendered/1.json": JSON.stringify({ pageid: 1, revisionId: 2 }),
    "regex-worker.js": "self.onmessage = () => {};",
  };
  async function put(relative, text) {
    await mkdir(path.dirname(path.join(root, relative)), { recursive: true });
    await writeFile(path.join(root, relative), text);
  }
  for (const [name, text] of Object.entries(publicFiles)) {
    await put(`public/${name}`, text);
    await put(`dist/pages/${name}`, text);
  }
  for (const [name, text] of Object.entries({
    "index.html": '<html><h1>STRATEGY LAB</h1><script src="/tds-site/_next/static/app.js"></script><a href="/tds-site/encyclopedia/">Read</a></html>',
    "encyclopedia/index.html": '<html><h1>Every article.</h1><script src="/tds-site/_next/static/app.js"></script><a href="/tds-site/">Home</a></html>',
    "_next/static/app.js": "console.log('fixture');",
    ".nojekyll": "",
  })) await put(`dist/pages/${name}`, text);
  return { root, put };
}

for (const [name, mutate, pattern] of [
  ["complete artifact", async () => {}, null],
  ["missing encyclopedia route", ({ root }) => rm(path.join(root, "dist/pages/encyclopedia/index.html")), /Missing referenced output|ENOENT/],
  ["unprefixed asset URL", ({ put }) => put("dist/pages/index.html", '<h1>STRATEGY LAB</h1><script src="/_next/static/app.js"></script>'), /prefixed framework assets/],
  ["missing compiled asset", ({ root }) => rm(path.join(root, "dist/pages/_next/static/app.js")), /Missing referenced output/],
  ["missing article bytes", ({ root }) => rm(path.join(root, "dist/pages/wiki/pages/1.json")), /Missing public file/],
  ["changed article bytes", ({ put }) => put("dist/pages/wiki/pages/1.json", '{}'), /Changed public bytes/],
  ["missing underscore-assets marker", ({ root }) => rm(path.join(root, "dist/pages/.nojekyll")), /Missing Pages/],
  ["server output included", ({ put }) => put("dist/pages/server/index.js", "server code"), /Private\/server output/],
  ["stale render even when copied faithfully", async ({ put }) => {
    for (const folder of ["public", "dist/pages"]) await put(`${folder}/wiki/rendered/1.json`, '{"pageid":1,"revisionId":0}');
  }, /Rendered revision mismatch/],
]) {
  test(`export validation: ${name}`, async () => {
    const state = await fixture();
    try {
      await mutate(state);
      if (pattern) await assert.rejects(() => verifyPagesExport(state.root), pattern);
      else assert.equal((await verifyPagesExport(state.root)).articles, 1);
    } finally {
      await rm(state.root, { recursive: true, force: true });
    }
  });
}

test("static article fallback does not call the Worker endpoint", async () => {
  const source = await readFile(new URL("../components/wiki-rendered-article.tsx", import.meta.url), "utf8");
  const staticGuard = source.indexOf('process.env.NEXT_PUBLIC_STATIC_EXPORT === "true"');
  const workerFallback = source.indexOf("const fallbackResponse = await fetch");
  assert(staticGuard >= 0, "Missing static-export guard");
  assert(workerFallback >= 0, "Missing Worker fallback");
  assert(staticGuard < workerFallback, "Static guard must precede the Worker request");
  assert(source.includes('sitePath(`/wiki/rendered/${pageid}.json`)'));
});
