import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
const component = await readFile(new URL("../components/defense-scene.tsx", import.meta.url), "utf8");

function hasMinimumTouchTarget(source) {
  const rule = source.match(/\.scene-controls button\s*\{([^}]*)\}/)?.[1];
  return Boolean(rule && /min-width\s*:\s*44px/.test(rule) && /min-height\s*:\s*44px/.test(rule));
}

function hasAccessibleSceneDescription(source) {
  const description = source.match(/<p id="defense-scene-description" className="sr-only">([\s\S]*?)<\/p>/)?.[1] ?? "";
  return source.includes('aria-describedby="defense-scene-description"')
    && ["red enemy marker", "winding path", "Five towers", "attack range", "travels along the path when scene motion is enabled", "not a playable map"]
      .every((detail) => description.toLowerCase().includes(detail.toLowerCase()));
}

test("3D scene controls meet the 44px minimum touch target", () => {
  assert.equal(hasMinimumTouchTarget(css), true);
});

test("the 3D control check catches a reduced touch target", () => {
  const reducedTarget = css.replace("min-width:44px; min-height:44px;", "min-width:36px; min-height:36px;");
  assert.equal(hasMinimumTouchTarget(reducedTarget), false);
});

test("the 3D scene exposes a descriptive text alternative to assistive technology", () => {
  assert.equal(hasAccessibleSceneDescription(component), true);
});

test("the scene accessibility check catches a disconnected description", () => {
  const disconnected = component.replace('aria-describedby="defense-scene-description"', "");
  assert.equal(hasAccessibleSceneDescription(disconnected), false);
});
