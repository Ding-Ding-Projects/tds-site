import assert from "node:assert/strict";
import test from "node:test";
import { createSceneRenderScheduler } from "../lib/scene-render-scheduler.mjs";

test("reduced motion renders a static scene without scheduling animation frames", () => {
  let renders = 0;
  let scheduled = 0;
  const scheduler = createSceneRenderScheduler({
    reducedMotion: true,
    render: () => { renders += 1; },
    requestFrame: () => { scheduled += 1; return scheduled; },
    cancelFrame: () => {},
  });

  assert.equal(renders, 1);
  assert.equal(scheduled, 0);
  scheduler.redraw();
  assert.equal(renders, 2);
  assert.equal(scheduled, 0);
  scheduler.stop();
});

test("animated mode schedules frames and stop cancels the pending frame", () => {
  let callback;
  let cancelled;
  let renders = 0;
  const scheduler = createSceneRenderScheduler({
    reducedMotion: false,
    render: () => { renders += 1; },
    requestFrame: (next) => { callback = next; return 42; },
    cancelFrame: (id) => { cancelled = id; },
  });

  assert.equal(renders, 0);
  callback();
  assert.equal(renders, 1);
  scheduler.stop();
  assert.equal(cancelled, 42);
});

test("a stopped scheduler ignores manual redraw requests", () => {
  let renders = 0;
  const scheduler = createSceneRenderScheduler({
    reducedMotion: true,
    render: () => { renders += 1; },
    requestFrame: () => 1,
    cancelFrame: () => {},
  });
  scheduler.stop();
  scheduler.redraw();
  assert.equal(renders, 1);
});
