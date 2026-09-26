import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

function hasMinimumTouchTarget(source) {
  const rule = source.match(/\.scene-controls button\s*\{([^}]*)\}/)?.[1];
  return Boolean(rule && /min-width\s*:\s*44px/.test(rule) && /min-height\s*:\s*44px/.test(rule));
}

test("3D scene controls meet the 44px minimum touch target", () => {
  assert.equal(hasMinimumTouchTarget(css), true);
});

test("the 3D control check catches a reduced touch target", () => {
  const reducedTarget = css.replace("min-width:44px; min-height:44px;", "min-width:36px; min-height:36px;");
  assert.equal(hasMinimumTouchTarget(reducedTarget), false);
});
