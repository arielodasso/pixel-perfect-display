import { Expand, Map as MapIcon, RotateCw } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import * as THREE from "three";

import { trackEvent } from "@/lib/tracking";
import { cn } from "@/lib/utils";

import { renderPanorama } from "./panorama";
import type { VirtualTourScene, VirtualTourSceneHotspot } from "./types";

interface Props {
  scenes: VirtualTourScene[];
  initialSceneId: string;
  unitLabel: string;
  onBackToPlan: () => void;
  onSceneChange?: (scene: VirtualTourScene) => void;
}

const MIN_FOV = 42;
const MAX_FOV = 100;
const DRAG_FACTOR = 0.0032;

/** Caché de texturas generadas (una por escena). */
const textureCache = new Map<string, string>();

/**
 * Visor de recorrido 360° de la unidad.
 *
 * Renderiza cada ambiente como una esfera equirectangular (Three.js/WebGL)
 * con arrastre para mirar alrededor, zoom con rueda/pinch, auto-rotación
 * hasta que el visitante interactúa, y hotspots 3D que navegan entre los
 * ambientes de la unidad.
 */
export function PanoramaViewer({
  scenes,
  initialSceneId,
  unitLabel,
  onBackToPlan,
  onSceneChange,
}: Props) {
  const [activeSceneId, setActiveSceneId] = useState(initialSceneId);
  const [transitioning, setTransitioning] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const hotspotHostRef = useRef<HTMLDivElement>(null);

  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial | null>(null);

  const yawRef = useRef(0);
  const pitchRef = useRef(-0.12);
  const autoRotateRef = useRef(true);
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStartRef = useRef<{ dist: number; fov: number } | null>(null);
  const activeSceneRef = useRef<VirtualTourScene | undefined>(undefined);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const movedRef = useRef(false);
  const dragMoveRef = useRef(0);

  const activeScene = scenes.find((scene) => scene.id === activeSceneId) ?? scenes[0];
  activeSceneRef.current = activeScene;

  // Inicialización de Three + loop de render.
  useEffect(() => {
    const container = containerRef.current;
    const host = hostRef.current;
    if (!container || !host) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    host.appendChild(renderer.domElement);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    rendererRef.current = renderer;

    const camera = new THREE.PerspectiveCamera(
      72,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.1,
      120,
    );
    camera.position.set(0, 0, 0);
    camera.rotation.order = "YXZ";
    cameraRef.current = camera;

    const scene = new THREE.Scene();
    const geometry = new THREE.SphereGeometry(50, 64, 48);
    const material = new THREE.MeshBasicMaterial({
      side: THREE.BackSide,
      color: 0xffffff,
    });
    materialRef.current = material;
    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);

    let raf = 0;

    const resize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();

    function frame() {
      if (autoRotateRef.current) yawRef.current += 0.0006;
      camera.rotation.x = pitchRef.current;
      camera.rotation.y = yawRef.current;
      camera.updateMatrixWorld();

      renderer.render(scene, camera);
      positionHotspots();

      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      geometry.dispose();
      material.map?.dispose();
      material.dispose();
      renderer.dispose();
      host.removeChild(renderer.domElement);
      rendererRef.current = null;
      cameraRef.current = null;
      materialRef.current = null;
    };
  }, []);

  // Carga la textura del ambiente activo y desbloquea la transición.
  useEffect(() => {
    const material = materialRef.current;
    const scene = scenes.find((item) => item.id === activeSceneId) ?? scenes[0];
    if (!material || !scene) {
      setTransitioning(false);
      return;
    }
    let dataUrl = textureCache.get(scene.id);
    if (!dataUrl) {
      dataUrl = renderPanorama(scene);
      textureCache.set(scene.id, dataUrl);
    }
    let cancelled = false;
    const image = new Image();
    image.onload = () => {
      if (cancelled) return;
      const texture = new THREE.Texture(image);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
      if (material.map) material.map.dispose();
      material.map = texture;
      material.needsUpdate = true;
      setTransitioning(false);
    };
    image.src = dataUrl;
    onSceneChange?.(scene);
    return () => {
      cancelled = true;
    };
  }, [activeSceneId, scenes, onSceneChange]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function navigate(sceneId: string, source: "hotspot" | "nav") {
    if (sceneId === activeSceneId) return;
    trackEvent("virtual_tour_360_scene", { scene: sceneId, via: source });
    setTransitioning(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setActiveSceneId(sceneId);
    }, 260);
  }

  // ---- Interacción (drag / zoom / pinch) --------------------------------

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    autoRotateRef.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
    movedRef.current = false;
    dragMoveRef.current = 0;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size === 2) {
      const values = [...pointersRef.current.values()];
      const a = values[0]!;
      const b = values[1]!;
      pinchStartRef.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        fov: cameraRef.current?.fov ?? 72,
      };
    }
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const pointers = pointersRef.current;
    if (!pointers.has(event.pointerId)) return;
    const prev = pointers.get(event.pointerId)!;
    const current = { x: event.clientX, y: event.clientY };
    pointers.set(event.pointerId, current);

    if (pointers.size === 2 && pinchStartRef.current) {
      const values = [...pointers.values()];
      const a = values[0]!;
      const b = values[1]!;
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const start = pinchStartRef.current;
      const fov = Math.min(MAX_FOV, Math.max(MIN_FOV, start.fov * (start.dist / dist)));
      applyFov(fov);
      return;
    }

    if (pointers.size === 1) {
      const dx = current.x - prev.x;
      const dy = current.y - prev.y;
      dragMoveRef.current += Math.abs(dx) + Math.abs(dy);
      if (dragMoveRef.current > 6) movedRef.current = true;
      yawRef.current -= dx * DRAG_FACTOR;
      pitchRef.current = clamp(pitchRef.current - dy * DRAG_FACTOR, -1.35, 1.35);
    }
  }

  function endPointer(event: ReactPointerEvent<HTMLDivElement>) {
    // Liberamos el pointer capture para que el click posterior alcance los
    // hotspots/controles bajo el puntero.
    const el = event.currentTarget;
    if (el.hasPointerCapture(event.pointerId)) el.releasePointerCapture(event.pointerId);
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) pinchStartRef.current = null;
  }

  function onWheel(event: ReactWheelEvent<HTMLDivElement>) {
    autoRotateRef.current = false;
    const camera = cameraRef.current;
    if (!camera) return;
    applyFov(clamp(camera.fov + Math.sign(event.deltaY) * 7, MIN_FOV, MAX_FOV));
  }

  function applyFov(fov: number) {
    const camera = cameraRef.current;
    if (!camera) return;
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }

  function resetView() {
    yawRef.current = 0;
    pitchRef.current = -0.12;
    applyFov(72);
    autoRotateRef.current = false;
  }

  // ---- Proyección de hotspots a pantalla -------------------------------

  const hotspotRefs = useRef<Map<string, HTMLButtonElement>>(new Map<string, HTMLButtonElement>());

  function positionHotspots() {
    const camera = cameraRef.current;
    const host = containerRef.current;
    const elHost = hotspotHostRef.current;
    const active = activeSceneRef.current;
    if (!camera || !host || !elHost || !active) return;

    const width = host.clientWidth;
    const height = host.clientHeight;
    const v = new THREE.Vector3();

    for (const hotspot of active.hotspots) {
      const el = hotspotRefs.current.get(hotspot.id);
      if (!el) continue;
      const yaw = (hotspot.yaw * Math.PI) / 180;
      const pitch = (hotspot.pitch * Math.PI) / 180;
      v.set(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch))
        .multiplyScalar(48)
        .project(camera);
      const visible = v.z < 1 && v.z > -1 && v.x >= -1 && v.x <= 1 && v.y >= -1 && v.y <= 1;
      if (!visible) {
        el.style.opacity = "0";
        el.style.pointerEvents = "none";
        continue;
      }
      const x = (v.x * 0.5 + 0.5) * width;
      const y = (-v.y * 0.5 + 0.5) * height;
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      el.style.opacity = "1";
      el.style.pointerEvents = "auto";
    }
  }

  function setHotspotRef(id: string, el: HTMLButtonElement | null) {
    if (el) hotspotRefs.current.set(id, el);
    else hotspotRefs.current.delete(id);
  }

  const sceneHotspots = activeScene?.hotspots ?? [];
  const visibleScenes = scenes.slice(0, 5);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-[oklch(0.11_0.008_265)]"
      style={{ touchAction: "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      onWheel={onWheel}
      onClickCapture={(event) => {
        if (movedRef.current) {
          movedRef.current = false;
          dragMoveRef.current = 0;
          event.preventDefault();
          event.stopPropagation();
        }
      }}
    >
      <div ref={hostRef} className="absolute inset-0" />

      {/* Hotspots 3D */}
      <div ref={hotspotHostRef} className="pointer-events-none absolute inset-0 overflow-hidden">
        {activeScene &&
          sceneHotspots.map((hotspot) => (
            <button
              key={hotspot.id}
              ref={(el) => setHotspotRef(hotspot.id, el)}
              type="button"
              onClick={() => navigate(hotspot.targetSceneId, "hotspot")}
              className="pointer-events-none absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 opacity-0 transition-opacity duration-200"
            >
              <Hotspot label={hotspot.label} />
            </button>
          ))}
      </div>

      {/* Encabezado */}
      <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/55 to-transparent px-4 pb-10 pt-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/60">
              Recorrido 360°
            </p>
            <p className="mt-0.5 truncate text-base font-medium text-white">
              {unitLabel} · {activeScene?.label}
            </p>
          </div>
          <button
            type="button"
            onClick={resetView}
            className="pointer-events-auto rounded-lg border border-white/15 bg-black/35 p-2 text-white/80 transition-colors hover:bg-black/55 hover:text-white"
            aria-label="Restablecer vista"
            title="Restablecer vista"
          >
            <RotateCw className="size-4" />
          </button>
        </div>
      </div>

      {/* Ayuda inicial */}
      {autoRotateRef.current && (
        <div className="pointer-events-none absolute bottom-28 left-1/2 -translate-x-1/2 rounded-full border border-white/15 bg-black/40 px-4 py-1.5 text-center text-[11px] text-white/75 backdrop-blur-sm sm:bottom-24">
          Arrastrá para explorar · rueda o pinch para acercar
        </div>
      )}

      {/* Controles */}
      <div className="absolute bottom-4 right-4 z-10 flex items-center gap-2 rounded-lg border border-white/15 bg-black/35 p-1.5 backdrop-blur-sm">
        <button
          type="button"
          onClick={() => containerRef.current?.requestFullscreen?.().catch(() => undefined)}
          className="grid size-8 place-items-center rounded-md text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Pantalla completa"
          title="Pantalla completa"
        >
          <Expand className="size-4" />
        </button>
        <button
          type="button"
          onClick={onBackToPlan}
          className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-white/90 transition-colors hover:bg-white/10"
        >
          <MapIcon className="size-4" /> Volver al plano
        </button>
      </div>

      {/* Navegador de ambientes */}
      <div className="absolute bottom-4 left-4 right-20 z-10 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2">
        <div className="no-scrollbar flex max-w-full items-center gap-1.5 overflow-x-auto rounded-xl border border-white/15 bg-black/40 p-1.5 backdrop-blur-sm">
          {visibleScenes.map((scene) => {
            const isActive = scene.id === activeSceneId;
            return (
              <button
                key={scene.id}
                type="button"
                onClick={() => navigate(scene.id, "nav")}
                className={cn(
                  "shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  isActive
                    ? "bg-foreground/90 text-background"
                    : "text-white/75 hover:bg-white/10 hover:text-white",
                )}
              >
                {scene.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Transición entre ambientes */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 bg-black transition-opacity duration-300",
          transitioning ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function Hotspot({ label }: { label: string }) {
  return (
    <span className="flex flex-col items-center gap-1.5">
      <span className="relative grid size-11 place-items-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-white/10" />
        <span className="absolute inset-0 rounded-full border-2 border-white/70" />
        <span className="size-2.5 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.9)]" />
      </span>
      <span className="rounded-full border border-white/20 bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
        {label}
      </span>
    </span>
  );
}
