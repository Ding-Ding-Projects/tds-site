"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { createSceneRenderScheduler } from "@/lib/scene-render-scheduler.mjs";

export default function DefenseScene() {
  const host = useRef<HTMLDivElement>(null);
  const [webglAvailable, setWebglAvailable] = useState(true);
  const [viewMode, setViewMode] = useState<"3D" | "2D">("3D");
  useEffect(() => {
    const root = host.current;
    if (!root) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#0d171d");
    scene.fog = new THREE.Fog("#0d171d", 18, 48);
    const camera = new THREE.PerspectiveCamera(35, root.clientWidth / Math.max(root.clientHeight, 1), 0.1, 100);
    camera.position.set(13, 14, 17);
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false }); }
    catch {
      const fallbackTimer = window.setTimeout(() => { setWebglAvailable(false); setViewMode("2D"); }, 0);
      return () => window.clearTimeout(fallbackTimer);
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
    renderer.setSize(root.clientWidth, root.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    root.appendChild(renderer.domElement);
    const hemi = new THREE.HemisphereLight("#e3f6fb", "#102225", 2.1); scene.add(hemi);
    const sun = new THREE.DirectionalLight("#ffd7a3", 3.5); sun.position.set(-8, 14, 6); sun.castShadow = true; scene.add(sun);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(32, 22), new THREE.MeshStandardMaterial({ color: "#14252b", roughness: 0.92 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
    const grid = new THREE.GridHelper(28, 28, "#345058", "#20373e"); grid.position.y = 0.02; scene.add(grid);
    const points = [new THREE.Vector3(-13, .12, 7), new THREE.Vector3(-8, .12, 7), new THREE.Vector3(-8, .12, 2), new THREE.Vector3(1, .12, 2), new THREE.Vector3(1, .12, -5), new THREE.Vector3(9, .12, -5), new THREE.Vector3(9, .12, -8)];
    const curve = new THREE.CatmullRomCurve3(points);
    const path = new THREE.Mesh(new THREE.TubeGeometry(curve, 120, .38, 8, false), new THREE.MeshStandardMaterial({ color: "#e6a24b", emissive: "#6b3616", emissiveIntensity: .45, roughness: .7 })); scene.add(path);
    const lane = new THREE.Mesh(new THREE.TubeGeometry(curve, 120, .58, 7, false), new THREE.MeshBasicMaterial({ color: "#da8b36", transparent: true, opacity: .12 })); scene.add(lane);
    const towerPositions = [[-6, 0, 4], [-3, 0, -1], [3, 0, 0], [6, 0, -7], [-11, 0, -1]];
    const towerMats = ["#70d1c1", "#7eb6e8", "#dcaa6e", "#b49ce8", "#85c99d"];
    towerPositions.forEach(([x, y, z], i) => {
      const group = new THREE.Group(); group.position.set(x, y, z);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(.55, .7, .32, 7), new THREE.MeshStandardMaterial({ color: "#29434a", metalness: .4, roughness: .55 })); base.position.y = .18; base.castShadow = true; group.add(base);
      const body = new THREE.Mesh(new THREE.CylinderGeometry(.3, .42, 1.15, 7), new THREE.MeshStandardMaterial({ color: towerMats[i], metalness: .26, roughness: .4 })); body.position.y = .9; body.castShadow = true; group.add(body);
      const head = new THREE.Mesh(new THREE.BoxGeometry(.75, .25, .28), new THREE.MeshStandardMaterial({ color: "#e9f5e5", emissive: towerMats[i], emissiveIntensity: .35 })); head.position.set(.13, 1.48, 0); group.add(head);
      const range = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, .015, 48), new THREE.MeshBasicMaterial({ color: towerMats[i], transparent: true, opacity: .11, side: THREE.DoubleSide })); range.position.y = .035; group.add(range);
      scene.add(group);
    });
    const enemy = new THREE.Mesh(new THREE.IcosahedronGeometry(.38, 1), new THREE.MeshStandardMaterial({ color: "#f27668", emissive: "#63241f", emissiveIntensity: .7 })); enemy.castShadow = true; scene.add(enemy);
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduced = motionPreference.matches;
    let progress = 0; let dragging = false; let lastX = 0; let lastY = 0; let orbit = 0; let tilt = .72;
    const draw = () => { const p = curve.getPointAt(progress); enemy.position.copy(p); enemy.position.y = reduced ? .52 : .52 + Math.sin(progress * 120) * .06; camera.position.set(18 * Math.sin(orbit + .72), 12 + tilt * 3, 18 * Math.cos(orbit + .72)); camera.lookAt(0, .3, 0); renderer.render(scene, camera); };
    const render = () => { if (!reduced) progress = (progress + .0012) % 1; draw(); };
    let scheduler = createSceneRenderScheduler({ reducedMotion: reduced, render });
    const down = (e: PointerEvent) => { dragging = true; lastX = e.clientX; lastY = e.clientY; renderer.domElement.setPointerCapture(e.pointerId); };
    const move = (e: PointerEvent) => { if (!dragging) return; orbit += (e.clientX - lastX) * .008; tilt = THREE.MathUtils.clamp(tilt + (e.clientY - lastY) * .004, -.5, 1.2); lastX = e.clientX; lastY = e.clientY; scheduler.redraw(); };
    const up = () => { dragging = false; };
    const rotate = (event: Event) => { const direction = (event as CustomEvent<string>).detail; if (direction === "left") orbit -= .28; else if (direction === "right") orbit += .28; else if (direction === "reset") { orbit = 0; tilt = .72; } scheduler.redraw(); };
    const onMotionPreferenceChange = (event: MediaQueryListEvent) => { reduced = event.matches; scheduler.stop(); scheduler = createSceneRenderScheduler({ reducedMotion: reduced, render }); };
    const keydown = (event: KeyboardEvent) => { if (event.key === "ArrowLeft") orbit -= .12; else if (event.key === "ArrowRight") orbit += .12; else if (event.key === "ArrowUp") tilt = THREE.MathUtils.clamp(tilt + .08, -.5, 1.2); else if (event.key === "ArrowDown") tilt = THREE.MathUtils.clamp(tilt - .08, -.5, 1.2); else return; event.preventDefault(); scheduler.redraw(); };
    renderer.domElement.addEventListener("pointerdown", down); renderer.domElement.addEventListener("pointermove", move); renderer.domElement.addEventListener("pointerup", up); renderer.domElement.addEventListener("pointercancel", up);
    root.addEventListener("keydown", keydown); root.addEventListener("scene-rotate", rotate);
    motionPreference.addEventListener("change", onMotionPreferenceChange);
    const resize = () => { if (!root.isConnected) return; camera.aspect = root.clientWidth / Math.max(root.clientHeight, 1); camera.updateProjectionMatrix(); renderer.setSize(root.clientWidth, root.clientHeight); scheduler.redraw(); };
    const observer = new ResizeObserver(resize); observer.observe(root);
    return () => { scheduler.stop(); motionPreference.removeEventListener("change", onMotionPreferenceChange); observer.disconnect(); renderer.domElement.removeEventListener("pointerdown", down); renderer.domElement.removeEventListener("pointermove", move); renderer.domElement.removeEventListener("pointerup", up); renderer.domElement.removeEventListener("pointercancel", up); root.removeEventListener("keydown", keydown); root.removeEventListener("scene-rotate", rotate); scene.traverse((object) => { if (object instanceof THREE.Mesh) { object.geometry.dispose(); if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose()); else object.material.dispose(); } }); renderer.dispose(); renderer.domElement.remove(); };
  }, []);
  return <section className="scene-view" aria-label="Defense scene preview">
    <p id="defense-scene-description" className="sr-only">Illustrative defense scene: a winding path runs from the left side through the center to the lower right, and a red enemy marker is shown along it. Five towers stand beside the path, with translucent rings showing approximate attack range. In the 3D view, the marker travels along the path when scene motion is enabled. The 2D schematic is static. Neither view is a playable map; exact placement geometry and attack calculations are not represented.</p>
    <div className={`scene-canvas${viewMode === "2D" ? " scene-canvas-hidden" : ""}`} ref={host} tabIndex={webglAvailable && viewMode === "3D" ? 0 : -1} aria-hidden={viewMode === "2D"} aria-label="Interactive 3D defense scene. Drag to orbit, use arrow keys, or use the rotate controls below." aria-describedby="defense-scene-description">{webglAvailable ? <><span className="scene-wave">WAVE 28 <b>● DEMO</b></span><span className="scene-health">BASE HEALTH <b>100%</b></span><div className="scene-controls" aria-label="3D view controls"><button type="button" aria-label="Rotate view left" onClick={() => host.current?.dispatchEvent(new CustomEvent("scene-rotate", { detail: "left" }))}>←</button><button type="button" aria-label="Reset 3D view" onClick={() => host.current?.dispatchEvent(new CustomEvent("scene-rotate", { detail: "reset" }))}>↺</button><button type="button" aria-label="Rotate view right" onClick={() => host.current?.dispatchEvent(new CustomEvent("scene-rotate", { detail: "right" }))}>→</button></div></> : <div className="scene-fallback" role="status"><strong>3D view unavailable</strong><span>A route runs around five towers. The tower index, statistics, and text strategy remain usable without WebGL.</span></div>}</div>
    {viewMode === "2D" && <div className="scene-canvas scene-map-2d" role="img" aria-label="Static two-dimensional schematic of one winding enemy path and five towers with approximate range circles" aria-describedby="defense-scene-description"><svg viewBox="0 0 600 300" aria-hidden="true" focusable="false"><path className="scene-map-grid" d="M0 50H600M0 100H600M0 150H600M0 200H600M0 250H600M50 0V300M100 0V300M150 0V300M200 0V300M250 0V300M300 0V300M350 0V300M400 0V300M450 0V300M500 0V300M550 0V300"/><path className="scene-map-route" d="M20 225H145V145H310V230H470V275H590"/><g className="scene-map-tower"><circle cx="105" cy="175" r="48"/><rect x="92" y="162" width="26" height="26" rx="5"/><circle cx="230" cy="90" r="42"/><rect x="218" y="78" width="24" height="24" rx="5"/><circle cx="345" cy="183" r="46"/><rect x="332" y="170" width="26" height="26" rx="5"/><circle cx="478" cy="226" r="40"/><rect x="466" y="214" width="24" height="24" rx="5"/><circle cx="65" cy="74" r="38"/><rect x="54" y="63" width="22" height="22" rx="5"/></g><circle className="scene-map-enemy" cx="225" cy="145" r="8"/></svg><span className="scene-map-caption">Static schematic · not to scale</span></div>}
    <div className="scene-view-toggle" role="group" aria-label="Defense scene view">
      <button type="button" aria-pressed={viewMode === "3D"} disabled={!webglAvailable} title={webglAvailable ? "Show the 3D view" : "3D view unavailable"} onClick={() => setViewMode("3D")}>3D</button>
      <button type="button" aria-pressed={viewMode === "2D"} onClick={() => setViewMode("2D")}>2D map</button>
      <span className="scene-view-status" aria-live="polite">{viewMode === "2D" && !webglAvailable ? "WebGL is unavailable. Showing the 2D schematic." : `${viewMode} view`}</span>
    </div>
  </section>;
}
