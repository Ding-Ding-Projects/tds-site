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
  return (source.match(/aria-describedby="defense-scene-description"/g) ?? []).length === 2
    && ["red enemy marker", "winding path", "Five towers", "attack range", "travels along the path when scene motion is enabled", "neither view is a playable map"]
      .every((detail) => description.toLowerCase().includes(detail.toLowerCase()));
}

function hasSchematicView(source) {
  const schematic = source.match(/<div className="scene-canvas scene-map-2d"[\s\S]*?<\/div>/)?.[0] ?? "";
  return Boolean(schematic)
    && schematic.includes("<svg viewBox=\"0 0 600 300\"")
    && schematic.includes('className="scene-map-route"')
    && (schematic.match(/className="scene-map-tower"/g) ?? []).length === 1
    && (schematic.match(/<rect x=/g) ?? []).length === 5
    && source.includes('onClick={() => setViewMode("2D")}')
    && source.includes('onClick={() => setViewMode("3D")}')
    && source.includes('disabled={!webglAvailable}');
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

test("the scene offers a switchable static 2D route schematic with five towers", () => {
  assert.equal(hasSchematicView(component), true);
  assert.match(component, /WebGL is unavailable\. Showing the 2D schematic\./);
});

test("the 2D schematic check catches a missing route or view switch", () => {
  assert.equal(hasSchematicView(component.replace('className="scene-map-route"', "")), false);
  assert.equal(hasSchematicView(component.replace('onClick={() => setViewMode("2D")}', "")), false);
});

test("2D and 3D view controls meet the 44px minimum touch target", () => {
  const rule = css.match(/\.scene-view-toggle button\s*\{([^}]*)\}/)?.[1];
  assert.ok(rule && /min-width\s*:\s*44px/.test(rule) && /min-height\s*:\s*44px/.test(rule));
});

test("the 3D switch is disabled when WebGL is unavailable", () => {
  assert.match(component, /disabled=\{!webglAvailable\}/);
  assert.equal(hasSchematicView(component.replace('disabled={!webglAvailable}', "")), false);
});
