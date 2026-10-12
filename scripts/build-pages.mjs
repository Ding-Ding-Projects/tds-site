import { spawnSync } from "node:child_process";
import { cp, mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pagesOutput, verifyPagesExport } from "./verify-pages-export.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = path.join(root, pagesOutput);
await rm(output, { recursive: true, force: true });
// Call the portable compiler directly: no Sites credentials, Worker, or deployment.
const build = spawnSync(process.execPath, [path.join(root, "node_modules/vinext/dist/cli.js"), "build"], {
  cwd: root, stdio: "inherit", env: { ...process.env, TDS_BUILD_TARGET: "pages" },
});
if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status ?? 1);
// Vinext 1.0.0-beta.5 emits export files in dist/client. Its trailingSlash
// prerender requests redirect, so normalize the emitted HTML after rendering.
try {
  await cp(path.join(root, "dist/client"), output, { recursive: true });
  await mkdir(path.join(output, "encyclopedia"), { recursive: true });
  await rename(path.join(output, "encyclopedia.html"), path.join(output, "encyclopedia/index.html"));
  await writeFile(path.join(output, ".nojekyll"), "");
  console.log(JSON.stringify(await verifyPagesExport(root, output), null, 2));
} catch (error) {
  await rm(output, { recursive: true, force: true });
  throw error;
}
