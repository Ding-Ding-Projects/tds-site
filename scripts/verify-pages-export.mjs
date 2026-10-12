import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "parse5";

export const pagesBasePath = "/tds-site";
export const pagesOutput = "dist/pages";

async function listFiles(directory, prefix = "") {
  const files = [];
  for (const entry of await readdir(path.join(directory, prefix), { withFileTypes: true })) {
    const relative = path.join(prefix, entry.name);
    assert(!entry.isSymbolicLink(), `Unexpected symbolic link: ${relative}`);
    if (entry.isDirectory()) files.push(...await listFiles(directory, relative));
    else if (entry.isFile()) files.push(relative);
  }
  return files.sort();
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

/** Validate the actual artifact, never infer success from the framework exit code. */
export async function verifyPagesExport(root, output = path.join(root, pagesOutput)) {
  const manifest = [];
  for (const relative of await listFiles(output)) {
    assert(!relative.split(path.sep).some((part) => [".openai", "server", ".git", ".wrangler"].includes(part) || part.startsWith(".env")), `Private/server output: ${relative}`);
    const bytes = await readFile(path.join(output, relative));
    manifest.push({ path: relative.split(path.sep).join("/"), bytes: bytes.length, sha256: sha256(bytes) });
  }
  const byPath = new Map(manifest.map((entry) => [entry.path, entry]));
  assert(byPath.has(".nojekyll"), "Missing Pages underscore-assets marker");
  for (const [file, marker] of [["index.html", "STRATEGY LAB"], ["encyclopedia/index.html", "Every article."]]) {
    const html = await readFile(path.join(output, file), "utf8");
    assert(html.includes(marker), `Missing application content: ${file}`);
    const references = [];
    function visit(node) {
      for (const attribute of node.attrs ?? []) {
        if (["src", "href"].includes(attribute.name) && attribute.value.startsWith("/")) references.push(attribute.value);
      }
      for (const child of node.childNodes ?? []) visit(child);
    }
    visit(parse(html));
    assert(references.some((url) => url.startsWith(`${pagesBasePath}/_next/static/`)), `Missing prefixed framework assets: ${file}`);
    for (const reference of references) {
      assert(reference.startsWith(`${pagesBasePath}/`), `Unprefixed reference in ${file}: ${reference}`);
      const url = new URL(reference, "https://pages.invalid");
      let relative = decodeURIComponent(url.pathname.slice(pagesBasePath.length + 1));
      if (!relative || relative.endsWith("/")) relative += "index.html";
      assert(byPath.has(relative), `Missing referenced output: ${reference}`);
    }
  }
  let publicBytes = 0;
  const publicFiles = await listFiles(path.join(root, "public"));
  for (const relative of publicFiles) {
    const bytes = await readFile(path.join(root, "public", relative));
    const artifact = byPath.get(relative.split(path.sep).join("/"));
    assert(artifact, `Missing public file: ${relative}`);
    assert.equal(artifact.sha256, sha256(bytes), `Changed public bytes: ${relative}`);
    publicBytes += bytes.length;
  }
  const index = JSON.parse(await readFile(path.join(output, "wiki/index.json"), "utf8"));
  const search = JSON.parse(await readFile(path.join(output, "wiki/search-index.json"), "utf8"));
  assert.equal(index.count, index.entries.length, "Incomplete article inventory");
  assert.equal(search.articleCount, index.count, "Incomplete search inventory");
  for (const entry of index.entries) {
    const article = JSON.parse(await readFile(path.join(output, `wiki/pages/${entry.pageid}.json`), "utf8"));
    assert.equal(article.revisionId, entry.revisionId, `Article revision mismatch: ${entry.pageid}`);
    if (entry.namespace === 0) {
      const rendered = JSON.parse(await readFile(path.join(output, `wiki/rendered/${entry.pageid}.json`), "utf8"));
      assert.equal(rendered.pageid, entry.pageid);
      assert.equal(rendered.revisionId, entry.revisionId, `Rendered revision mismatch: ${entry.pageid}`);
    }
  }
  return {
    basePath: pagesBasePath, output: path.relative(root, output),
    routes: [`${pagesBasePath}/`, `${pagesBasePath}/encyclopedia/`],
    files: manifest.length, bytes: manifest.reduce((sum, entry) => sum + entry.bytes, 0),
    publicFiles: publicFiles.length, publicBytes, articles: index.count,
    manifestSha256: sha256(JSON.stringify(manifest)),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL("../", import.meta.url));
  await stat(path.join(root, pagesOutput));
  console.log(JSON.stringify(await verifyPagesExport(root), null, 2));
}
