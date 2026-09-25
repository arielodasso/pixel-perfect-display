import { ArrowLeft, Expand, Map as MapIcon, RotateCw, AlertTriangle } from "lucide-react";
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
import { Button } from "@/components/ui/button";

import { buildRoom, type RoomScene } from "./room";
import type { VirtualTourScene } from "./types";

interface Props {
  scenes: VirtualTourScene[];
  initialSceneId: string;
  unitLabel: string;
  onBackToPlan: () => void;
  onSceneChange?: (scene: VirtualTourScene) => void;
}

const MIN_FOV = 45;
const MAX_FOV = 95;
const EYE_HEIGHT = 1.62;
const DRAG_FACTOR = 0.0032;
const HOTSPOT_DISTANCE = 1.35;
const scratchVector = new THREE.Vector3();

/**
 * Visor del recorrido interior de la unidad.
 *
 * Cada ambiente es una escena 3D real (geometría, materiales y luz) generada
 * en el momento — ver `room.ts` — y no una textura: la cámara está dentro del
 * ambiente, con arrastre para mirar alrededor, zoom con rueda/pinch,
 * auto-rotación hasta que el visitante interactúa y hotspots que navegan entre
 * los ambientes de la unidad.
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
  const [interacted, setInteracted] = useState(false);
  const [webglFailed, setWebglFailed] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const hotspotHostRef = useRef<HTMLDivElement>(null);

  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererSceneRef = useRef<THREE.Scene | null>(null);
  const roomRef = useRef<RoomScene | null>(null);

  const yawRef = useRef(0);
  const pitchRef = useRef(-0.04);
  const autoRotateRef = useRef(true);
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStartRef = useRef<{ dist: number; fov: number } | null>(null);
  const activeSceneRef = useRef<VirtualTourScene | undefined>(undefined);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const movedRef = useRef(false);
  const dragMoveRef = useRef(0);

  const hotspotRefs = useRef<Map<string, HTMLButtonElement>>(new Map<string, HTMLButtonElement>());

  const activeScene = scenes.find((scene) => scene.id === activeSceneId) ?? scenes[0];
  activeSceneRef.current = activeScene;

  // Escena Three + loop de render.
  useEffect(() => {
    const container = containerRef.current;
    const host = hostRef.current;
    if (!container || !host) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    } catch {
      setWebglFailed(true);
      return;
    }
    setWebglFailed(false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    host.appendChild(renderer.domElement);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#0d1117");
    rendererSceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      72,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.05,
      60,
    );
    camera.position.set(0, EYE_HEIGHT, 0);
    camera.rotation.order = "YXZ";
    cameraRef.current = camera;

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
      if (autoRotateRef.current) yawRef.current += 0.0007;
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
      roomRef.current?.dispose();
      roomRef.current = null;
      renderer.dispose();
      host.removeChild(renderer.domElement);
      cameraRef.current = null;
      rendererSceneRef.current = null;
    };
  }, []);

  // Monta la geometría del ambiente activo.
  useEffect(() => {
    const scene = scenes.find((item) => item.id === activeSceneId) ?? scenes[0];
    if (!scene) return;

    roomRef.current?.dispose();
    roomRef.current = null;

    const room = buildRoom({
      kind: scene.kind,
      seed: scene.seed,
      exits: scene.hotspots.map((hotspot) => hotspot.yaw),
    });
    rendererSceneRef.current?.add(room.group);
    roomRef.current = room;

    setTransitioning(false);
    onSceneChange?.(scene);

    return () => {
      room.group.removeFromParent();
      if (roomRef.current === room) {
        room.dispose();
        roomRef.current = null;
      }
    };
  }, [activeSceneId, scenes, onSceneChange]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (webglFailed) {
    return (
      <div className="relative h-full w-full flex items-center justify-center bg-[oklch(0.11_0.008_265)]">
        <div className="text-center px-6">
          <AlertTriangle className="size-12 mx-auto text-reserved" />
          <h3 className="mt-4 text-lg font-medium text-white">Tu navegador no soporta WebGL</h3>
          <p className="mt-2 text-sm text-white/60">
            El recorrido interior requiere WebGL. Podés volver al plano para ver la planta.
          </p>
          <Button variant="outline" size="lg" className="mt-4" onClick={onBackToPlan}>
            <ArrowLeft className="size-4" /> Volver al plano
          </Button>
        </div>
      </div>
    );
  }

  function navigate(sceneId: string, source: "hotspot" | "nav") {
    if (sceneId === activeSceneId) return;
    trackEvent("virtual_tour_360_scene", { scene: sceneId, via: source });
    setTransitioning(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setActiveSceneId(sceneId);
    }, 240);
  }

  // ---- Interacción (drag / zoom / pinch) --------------------------------

  function stopAutoRotate() {
    if (autoRotateRef.current) {
      autoRotateRef.current = false;
      setInteracted(true);
    }
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    stopAutoRotate();
    movedRef.current = false;
    dragMoveRef.current = 0;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size === 2) {
      for (const pointerId of pointersRef.current.keys()) {
        capturePointer(event.currentTarget, pointerId);
      }
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
      if (dragMoveRef.current > 6) {
        movedRef.current = true;
        capturePointer(event.currentTarget, event.pointerId);
      }
      yawRef.current -= dx * DRAG_FACTOR;
      pitchRef.current = clamp(pitchRef.current - dy * DRAG_FACTOR, -1.2, 1.2);
    }
  }

  function endPointer(event: ReactPointerEvent<HTMLDivElement>) {
    const el = event.currentTarget;
    if (el.hasPointerCapture(event.pointerId)) el.releasePointerCapture(event.pointerId);
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) pinchStartRef.current = null;
  }

  function onWheel(event: ReactWheelEvent<HTMLDivElement>) {
    stopAutoRotate();
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
    pitchRef.current = -0.04;
    applyFov(72);
    stopAutoRotate();
  }

  // ---- Proyección de hotspots a pantalla -------------------------------

  function positionHotspots() {
    const camera = cameraRef.current;
    const host = containerRef.current;
    const elHost = hotspotHostRef.current;
    const active = activeSceneRef.current;
    if (!camera || !host || !elHost || !active) return;

    const width = host.clientWidth;
    const height = host.clientHeight;
    const v = scratchVector;

    for (const hotspot of active.hotspots) {
      const el = hotspotRefs.current.get(hotspot.id);
      if (!el) continue;
      const yaw = (hotspot.yaw * Math.PI) / 180;
      const pitch = (hotspot.pitch * Math.PI) / 180;
      v.set(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch))
        .multiplyScalar(HOTSPOT_DISTANCE)
        .add(camera.position)
        .project(camera);
      const visible = v.z < 1 && v.x >= -1 && v.x <= 1 && v.y >= -1 && v.y <= 1;
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

      {/* Hotspots sobre las puertas reales del ambiente */}
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
              Recorrido interior
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
      {!interacted && (
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

function capturePointer(element: HTMLElement, pointerId: number) {
  if (!element.hasPointerCapture(pointerId)) element.setPointerCapture(pointerId);
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
