export function createSceneRenderScheduler({ reducedMotion, render, requestFrame = requestAnimationFrame, cancelFrame = cancelAnimationFrame }) {
  let frame;
  let stopped = false;

  const redraw = () => {
    if (!stopped) render();
  };

  const tick = () => {
    if (stopped) return;
    render();
    frame = requestFrame(tick);
  };

  if (reducedMotion) render();
  else frame = requestFrame(tick);

  return {
    redraw,
    stop() {
      stopped = true;
      if (frame !== undefined) cancelFrame(frame);
    },
  };
}
