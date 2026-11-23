"use client";

/**
 * VIJAYA 360° experience — Insta360 equirectangular viewer.
 *
 * Built on three.js: drag to look around, wheel/pinch zoom, hotspots that jump
 * between scenes, fullscreen, gyroscope support, loading progress and a calm
 * fallback when WebGL or the asset is unavailable.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Expand, Loader2, Move3d, Shrink, Smartphone, AlertTriangle } from "lucide-react";

export interface Scene360 {
  id: string;
  name: string;
  image: string;
  initialYaw: number;
  hotspots: { yaw: number; pitch: number; label: string; target: string }[];
}

const FOV_MIN = 45;
const FOV_MAX = 95;

export function PanoramaViewer({ scenes }: { scenes: Scene360[] }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sphereRef = useRef<THREE.Mesh | null>(null);
  const stateRef = useRef({ lon: 0, lat: 0, downLon: 0, downLat: 0, pointerDown: false, startX: 0, startY: 0, fov: 75 });
  const framesRef = useRef<number>(0);

  const [activeId, setActiveId] = useState(scenes[0]?.id);
  const [loaded, setLoaded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [failed, setFailed] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [gyroOn, setGyroOn] = useState(false);
  const gyroRef = useRef(false);
  const [hint, setHint] = useState(true);

  const activeScene = scenes.find((s) => s.id === activeId) || scenes[0];

  /** Load an equirectangular texture into the sphere. */
  const loadScene = useCallback((scene: Scene360) => {
    const loader = new THREE.TextureLoader();
    setLoaded(false);
    setProgress(0);
    setFailed(false);
    loader.load(
      scene.image,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        const sphere = sphereRef.current;
        const mat = sphere?.material as THREE.MeshBasicMaterial | undefined;
        if (mat) {
          mat.map = texture;
          mat.needsUpdate = true;
        }
        if (cameraRef.current) {
          cameraRef.current.fov = 75;
          cameraRef.current.updateProjectionMatrix();
          stateRef.current.fov = 75;
        }
        stateRef.current.lon = scene.initialYaw;
        stateRef.current.lat = 0;
        setLoaded(true);
      },
      (evt) => {
        if (evt.total) setProgress(Math.round((evt.loaded / evt.total) * 100));
      },
      () => setFailed(true)
    );
  }, []);

  // One-time three.js setup ---------------------------------------------------
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    } catch {
      // Defer so the effect body never sets state synchronously.
      const id = setTimeout(() => setFailed(true), 0);
      return () => clearTimeout(id);
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, mount.clientWidth / mount.clientHeight, 0.1, 1100);
    cameraRef.current = camera;

    const geometry = new THREE.SphereGeometry(500, 64, 48);
    geometry.scale(-1, 1, 1);
    const material = new THREE.MeshBasicMaterial();
    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);
    sphereRef.current = sphere;

    // Interaction -------------------------------------------------------------
    const el = renderer.domElement;
    const st = stateRef.current;
    let pinchStart = 0;

    const onPointerDown = (e: PointerEvent) => {
      st.pointerDown = true;
      st.startX = e.clientX;
      st.startY = e.clientY;
      st.downLon = st.lon;
      st.downLat = st.lat;
      el.setPointerCapture(e.pointerId);
      setHint(false);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!st.pointerDown || gyroRef.current) return;
      const k = (75 / st.fov) * 0.18;
      st.lon = st.downLon - (e.clientX - st.startX) * k;
      st.lat = st.downLat + (e.clientY - st.startY) * k;
    };
    const onPointerUp = () => {
      st.pointerDown = false;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      st.fov = THREE.MathUtils.clamp(st.fov + e.deltaY * 0.05, FOV_MIN, FOV_MAX);
      camera.fov = st.fov;
      camera.updateProjectionMatrix();
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const d = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        if (pinchStart) {
          st.fov = THREE.MathUtils.clamp(st.fov - (d - pinchStart) * 0.08, FOV_MIN, FOV_MAX);
          camera.fov = st.fov;
          camera.updateProjectionMatrix();
        }
        pinchStart = d;
      }
    };
    const onTouchEnd = () => {
      pinchStart = 0;
    };

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd);
    el.style.touchAction = "none";
    el.style.cursor = "grab";

    // Render loop --------------------------------------------------------------
    const animate = () => {
      framesRef.current = requestAnimationFrame(animate);
      if (gyroRef.current && (window as unknown as { __vijGyro?: { alpha: number; beta: number; gamma: number } }).__vijGyro) {
        const g = (window as unknown as { __vijGyro: { alpha: number; beta: number; gamma: number } }).__vijGyro;
        st.lon = 90 - g.alpha;
        st.lat = THREE.MathUtils.clamp(g.beta - 90, -85, 85);
      }
      const phi = THREE.MathUtils.degToRad(90 - st.lat);
      const theta = THREE.MathUtils.degToRad(st.lon);
      const target = new THREE.Vector3(
        500 * Math.sin(phi) * Math.cos(theta),
        500 * Math.cos(phi),
        500 * Math.sin(phi) * Math.sin(theta)
      );
      camera.lookAt(target);
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(framesRef.current);
      window.removeEventListener("resize", onResize);
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      if (el.parentElement === mount) mount.removeChild(el);
    };
  }, []);

  // Scene switching -----------------------------------------------------------
  useEffect(() => {
    if (!activeScene) return;
    const id = setTimeout(() => loadScene(activeScene), 0);
    return () => clearTimeout(id);
  }, [activeScene, loadScene]);

  // Fullscreen ----------------------------------------------------------------
  const toggleFullscreen = () => {
    const wrap = mountRef.current?.parentElement;
    if (!document.fullscreenElement && wrap) {
      wrap.requestFullscreen?.().catch(() => undefined);
      setFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => undefined);
      setFullscreen(false);
    }
  };

  // Gyroscope -----------------------------------------------------------------
  const enableGyro = async () => {
    const DOE = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> } | undefined;
    try {
      if (DOE && typeof DOE.requestPermission === "function") {
        const res = await DOE.requestPermission();
        if (res !== "granted") return;
      }
      if (!window.DeviceOrientationEvent) return;
      window.addEventListener("deviceorientation", (e) => {
        (window as unknown as { __vijGyro?: { alpha: number; beta: number; gamma: number } }).__vijGyro = {
          alpha: e.alpha ?? 0,
          beta: e.beta ?? 0,
          gamma: e.gamma ?? 0,
        };
      });
      gyroRef.current = true;
      setGyroOn(true);
    } catch {
      /* gyro unsupported — silent */
    }
  };

  // Hotspot screen projection --------------------------------------------------
  const [hotspotPos, setHotspotPos] = useState<{ id: string; x: number; y: number; label: string; target: string }[]>([]);
  useEffect(() => {
    let raf = 0;
    const project = () => {
      raf = requestAnimationFrame(project);
      const camera = cameraRef.current;
      const st = stateRef.current;
      if (!camera || !activeScene || !loaded) return;
      const w = mountRef.current?.clientWidth || 1;
      const h = mountRef.current?.clientHeight || 1;
      const out: typeof hotspotPos = [];
      for (const hpt of activeScene.hotspots) {
        const phi = THREE.MathUtils.degToRad(90 - THREE.MathUtils.radToDeg(hpt.pitch));
        const theta = THREE.MathUtils.degToRad(THREE.MathUtils.radToDeg(hpt.yaw) + st.lon);
        const v = new THREE.Vector3(
          100 * Math.sin(phi) * Math.cos(theta),
          100 * Math.cos(phi),
          100 * Math.sin(phi) * Math.sin(theta)
        );
        v.project(camera);
        if (v.z < 1) {
          out.push({
            id: hpt.label,
            x: ((v.x + 1) / 2) * w,
            y: ((1 - v.y) / 2) * h,
            label: hpt.label,
            target: hpt.target,
          });
        }
      }
      setHotspotPos(out);
    };
    raf = requestAnimationFrame(project);
    return () => cancelAnimationFrame(raf);
     
  }, [activeScene, loaded]);

  if (!activeScene) return null;

  return (
    <div className="relative bg-ink rounded-sm overflow-hidden select-none" style={{ aspectRatio: "16/9" }}>
      {/* 3D mount */}
      <div ref={mountRef} className="absolute inset-0" aria-label="360 degree panorama viewer. Drag to look around." role="application" />

      {/* Fallback */}
      {failed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8 bg-ivory-deep">
          <AlertTriangle className="h-8 w-8 text-gold" aria-hidden />
          <p className="mt-4 text-sm font-medium text-ink">360 experience unavailable right now</p>
          <p className="mt-2 max-w-sm text-[13px] text-stone">
            The panoramic asset could not be loaded in your browser. Please try again later, or explore the gallery instead.
          </p>
        </div>
      )}

      {/* Loading */}
      {!loaded && !failed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-ink/90 text-ivory">
          <Loader2 className="h-6 w-6 animate-spin text-gold" aria-hidden />
          <p className="mt-4 text-[11px] uppercase tracking-[0.24em] text-ivory/60">
            {progress > 0 ? `Loading ${activeScene.name} — ${progress}%` : "Preparing 360° experience"}
          </p>
        </div>
      )}

      {/* Hotspots */}
      {loaded && !failed && hotspotPos.map((h) => (
        <button
          key={h.id}
          onClick={() => setActiveId(h.target)}
          className="absolute z-10 -translate-x-1/2 -translate-y-1/2 group"
          style={{ left: h.x, top: h.y }}
          aria-label={`Go to ${h.label}`}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-gold/70 bg-ink/50 backdrop-blur-sm transition-all duration-300 group-hover:scale-110 group-hover:bg-gold group-hover:text-ink text-gold">
            <Move3d className="h-4 w-4" />
          </span>
          <span className="mt-2 block whitespace-nowrap text-[11px] uppercase tracking-[0.14em] text-ivory bg-ink/60 px-2 py-1 rounded-sm backdrop-blur-sm">
            {h.label}
          </span>
        </button>
      ))}

      {/* Drag hint */}
      {loaded && hint && !failed && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <p className="text-ivory/80 text-sm bg-ink/60 px-5 py-3 rounded-sm backdrop-blur-sm animate-pulse">
            Drag to look around · Scroll to zoom
          </p>
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 overflow-x-auto" role="tablist" aria-label="360 scenes">
          {scenes.map((s) => (
            <button
              key={s.id}
              role="tab"
              aria-selected={s.id === activeId}
              onClick={() => setActiveId(s.id)}
              className={`px-4 py-2 text-[11px] uppercase tracking-[0.16em] rounded-sm backdrop-blur-sm transition-all duration-300 whitespace-nowrap ${
                s.id === activeId ? "bg-gold text-ink" : "bg-ink/60 text-ivory/80 hover:text-ivory border border-ivory/15"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {!gyroOn && (
            <button onClick={enableGyro} className="p-2.5 bg-ink/60 border border-ivory/15 text-ivory/80 hover:text-gold rounded-sm backdrop-blur-sm transition-colors" aria-label="Enable gyroscope">
              <Smartphone className="h-4 w-4" />
            </button>
          )}
          <button onClick={toggleFullscreen} className="p-2.5 bg-ink/60 border border-ivory/15 text-ivory/80 hover:text-gold rounded-sm backdrop-blur-sm transition-colors" aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}>
            {fullscreen ? <Shrink className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
