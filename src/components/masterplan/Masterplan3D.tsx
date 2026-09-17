import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import { cn } from "@/lib/utils";
import type { Project, Unit } from "@/types/domain";

/**
 * Masterplan 3D — el edificio volumétrico generado a partir de los datos del
 * proyecto: una caja de vidrio por piso, las unidades reales coloreadas por
 * estado, terraza con amenities y órbita de cámara. Se puede rotar/zoom y
 * tocar cada unidad para seleccionarla.
 */

interface Props {
  project: Project;
  units: Unit[];
  selectedCode?: string | null;
  onSelect?: (unit: Unit | null) => void;
  className?: string;
}

interface UnitMeshEntry {
  mesh: THREE.Mesh;
  material: THREE.MeshStandardMaterial;
  unit: Unit;
}

const STATUS_COLOR: Record<Unit["status"], number> = {
  disponible: 0x34d399,
  reservada: 0xf0b429,
  vendida: 0x64748b,
};

const FLOOR_H = 3.3;
const UNIT_W = 3.1;
const UNIT_D = 2.5;
const GAP = 0.35;
const STEP = UNIT_W + GAP;
const TERRACE = 9;
const IDLE_EMISSIVE = 0.12;
const HOVER_EMISSIVE = 0.5;
const SELECTED_EMISSIVE = 0.62;

export function Masterplan3D({ project, units, selectedCode, onSelect, className }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const focusRef = useRef<number | null>(null);
  const meshesRef = useRef<UnitMeshEntry[]>([]);
  const hoverRef = useRef<string | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const [hover, setHover] = useState<Unit | null>(null);

  const levels = useMemo(() => {
    const set = [...new Set(units.map((u) => u.floor))].sort((a, b) => a - b);
    return set.length > 0 ? set : [1];
  }, [units]);
  const floorCount = levels.length;

  const refreshEmphasis = useCallback(() => {
    for (const entry of meshesRef.current) {
      entry.material.emissiveIntensity =
        entry.unit.code === selectedCode
          ? SELECTED_EMISSIVE
          : entry.unit.code === hoverRef.current
            ? HOVER_EMISSIVE
            : IDLE_EMISSIVE;
    }
  }, [selectedCode]);
  const refreshRef = useRef(refreshEmphasis);
  refreshRef.current = refreshEmphasis;

  useEffect(() => {
    refreshRef.current();
  }, [selectedCode]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 640;
    const height = mount.clientHeight || 480;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height, false);
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    renderer.domElement.style.cursor = "grab";

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070b16);
    scene.fog = new THREE.Fog(0x070b16, 70, 200);

    const camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 500);
    const center = (floorCount * FLOOR_H) / 2;
    camera.position.set(26, center + 8, 34);
    camera.lookAt(0, center, 0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, center, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 16;
    controls.maxDistance = 95;
    controls.minPolarAngle = 0.35;
    controls.maxPolarAngle = 1.42;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.4;
    controls.update();

    scene.add(new THREE.HemisphereLight(0x9dc4ff, 0x131a2a, 0.85));
    const sun = new THREE.DirectionalLight(0xffd9a0, 1.5);
    sun.position.set(22, 44, 26);
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0x6ea8ff, 0.5);
    fill.position.set(-26, 16, -18);
    scene.add(fill);

    const group = new THREE.Group();
    scene.add(group);

    const disposables: { dispose: () => void }[] = [];
    const unitMeshes: UnitMeshEntry[] = [];
    const track = <T extends { dispose: () => void }>(item: T): T => {
      disposables.push(item);
      return item;
    };

    const bw = Math.max(
      levels.reduce(
        (acc, level) => {
          const count = units.filter((u) => u.floor === level).length || 3;
          return Math.max(acc, count * STEP + 0.6);
        },
        STEP * 3 + 0.6,
      ),
      STEP * 3 + 0.6,
    );
    const bd = UNIT_D + 0.7;
    const totalH = (floorCount + 1) * FLOOR_H;

    // Suelo.
    const ground = new THREE.Mesh(
      track(new THREE.CircleGeometry(72, 64)),
      track(new THREE.MeshStandardMaterial({ color: 0x0c1220, roughness: 0.95 })),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    group.add(ground);

    // Núcleo interno.
    const core = new THREE.Mesh(
      track(new THREE.BoxGeometry(bw - 0.6, totalH, bd)),
      track(
        new THREE.MeshStandardMaterial({
          color: 0x1b2438,
          roughness: 0.5,
          metalness: 0.35,
          transparent: true,
          opacity: 0.94,
        }),
      ),
    );
    core.position.set(0, totalH / 2, -0.45);
    group.add(core);

    const slabMat = track(
      new THREE.MeshStandardMaterial({ color: 0x2b3648, roughness: 0.7, metalness: 0.15 }),
    );
    const pillarMat = track(
      new THREE.MeshStandardMaterial({ color: 0x39445a, roughness: 0.55, metalness: 0.3 }),
    );

    // Losas + pilares.
    for (let level = 0; level <= floorCount + 1; level++) {
      const slab = new THREE.Mesh(track(new THREE.BoxGeometry(bw + 0.5, 0.24, bd + 0.5)), slabMat);
      slab.position.set(0, level * FLOOR_H - 0.12, 0);
      group.add(slab);
    }
    for (const px of [-bw / 2, bw / 2]) {
      for (const pz of [-bd / 2, bd / 2]) {
        const pillar = new THREE.Mesh(track(new THREE.BoxGeometry(0.3, totalH, 0.3)), pillarMat);
        pillar.position.set(px, totalH / 2 - FLOOR_H * 0.5, pz);
        group.add(pillar);
      }
    }

    // Unidades reales.
    for (const level of levels) {
      const floorUnits = units
        .filter((u) => u.floor === level)
        .sort((a, b) => a.number.localeCompare(b.number));
      const count = floorUnits.length;
      if (count === 0) continue;
      const startX = -((count - 1) / 2) * STEP;

      floorUnits.forEach((unit, index) => {
        const color = STATUS_COLOR[unit.status];
        const material = track(
          new THREE.MeshStandardMaterial({
            color,
            roughness: 0.42,
            metalness: 0.28,
            emissive: color,
            emissiveIntensity: IDLE_EMISSIVE,
          }),
        );
        const mesh = new THREE.Mesh(
          track(new THREE.BoxGeometry(UNIT_W, FLOOR_H - 0.34, UNIT_D)),
          material,
        );
        mesh.position.set(startX + index * STEP, level * FLOOR_H + (FLOOR_H - 0.34) / 2 + 0.1, 0.1);
        mesh.userData["unit"] = unit;
        group.add(mesh);
        unitMeshes.push({ mesh, material, unit });

        const { texture, dispose } = makeTextTexture(unit.number, "#ffffff", "rgba(9,13,22,0.72)");
        disposables.push({ dispose });
        const label = new THREE.Mesh(
          track(new THREE.PlaneGeometry(1.5, 0.62)),
          track(
            new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }),
          ),
        );
        label.position.set(mesh.position.x, mesh.position.y + 0.45, UNIT_D / 2 + 0.13);
        group.add(label);
      });

      // Halo del piso.
      const halo = new THREE.Mesh(
        track(new THREE.PlaneGeometry(bw + 0.6, FLOOR_H - 0.3)),
        track(
          new THREE.MeshBasicMaterial({
            color: 0x8ab4ff,
            transparent: true,
            opacity: 0.06,
            side: THREE.DoubleSide,
            depthWrite: false,
          }),
        ),
      );
      halo.position.set(0, level * FLOOR_H + FLOOR_H / 2, bd / 2 + 0.22);
      halo.rotation.y = Math.PI;
      group.add(halo);

      // Etiqueta de piso.
      const { texture, dispose } = makeTextTexture(`${level}`, "#dbe6ff", "rgba(255,255,255,0)");
      disposables.push({ dispose });
      const fLabel = new THREE.Mesh(
        track(new THREE.PlaneGeometry(1.3, 1.1)),
        track(new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false })),
      );
      fLabel.position.set(-bw / 2 - 1.1, level * FLOOR_H + FLOOR_H / 2, 0);
      fLabel.rotation.y = -Math.PI / 2;
      group.add(fLabel);
    }

    // Fachada de vidrio lateral.
    const glassGeo = track(new THREE.PlaneGeometry(bw, totalH));
    const glassMat = track(
      new THREE.MeshStandardMaterial({
        color: 0x7fb6e0,
        transparent: true,
        opacity: 0.1,
        side: THREE.DoubleSide,
        roughness: 0.1,
        metalness: 0.6,
      }),
    );
    for (const side of [-1, 1]) {
      const glass = new THREE.Mesh(glassGeo, glassMat);
      glass.position.set((side * bw) / 2, totalH / 2, 0);
      glass.rotation.y = side * (Math.PI / 2);
      group.add(glass);
    }

    // Lobby (PB).
    const lobby = new THREE.Mesh(
      track(new THREE.BoxGeometry(bw - 0.4, FLOOR_H - 0.6, bd - 0.3)),
      track(
        new THREE.MeshStandardMaterial({
          color: 0x8fd3ff,
          transparent: true,
          opacity: 0.22,
          roughness: 0.1,
          metalness: 0.5,
          side: THREE.DoubleSide,
        }),
      ),
    );
    lobby.position.set(0, (FLOOR_H - 0.6) / 2 + 0.1, 0.1);
    group.add(lobby);

    const door = new THREE.Mesh(
      track(new THREE.BoxGeometry(2.4, FLOOR_H - 1.4, 0.15)),
      track(
        new THREE.MeshStandardMaterial({
          color: 0xffd98c,
          emissive: 0xffd98c,
          emissiveIntensity: 0.9,
          transparent: true,
          opacity: 0.85,
        }),
      ),
    );
    door.position.set(0, (FLOOR_H - 1.4) / 2 + 0.1, bd / 2 - 0.05);
    group.add(door);
    const doorLight = new THREE.PointLight(0xffd98c, 8, 14, 2);
    doorLight.position.set(0, 1.4, bd / 2 + 1.4);
    group.add(doorLight);

    // Terraza.
    const terraceY = TERRACE * FLOOR_H;
    const deck = new THREE.Mesh(
      track(new THREE.BoxGeometry(bw + 0.6, 0.28, bd + 0.6)),
      track(new THREE.MeshStandardMaterial({ color: 0x3b3a36, roughness: 0.9 })),
    );
    deck.position.set(0, terraceY - 0.14, 0);
    group.add(deck);

    const pool = new THREE.Mesh(
      track(new THREE.BoxGeometry(bw * 0.44, 0.18, bd * 0.5)),
      track(
        new THREE.MeshStandardMaterial({
          color: 0x22a7d6,
          emissive: 0x1189b8,
          emissiveIntensity: 0.5,
          roughness: 0.15,
          metalness: 0.2,
        }),
      ),
    );
    pool.position.set(-bw * 0.2, terraceY + 0.05, 0.1);
    group.add(pool);

    const railGeo = track(new THREE.BoxGeometry(bw + 0.6, 1, 0.08));
    const railMat = track(
      new THREE.MeshStandardMaterial({
        color: 0x9fd4ff,
        transparent: true,
        opacity: 0.28,
        roughness: 0.1,
        metalness: 0.4,
      }),
    );
    for (const pz of [-bd / 2, bd / 2]) {
      const rail = new THREE.Mesh(railGeo, railMat);
      rail.position.set(0, terraceY + 0.5, pz);
      group.add(rail);
    }

    const greenMat = track(new THREE.MeshStandardMaterial({ color: 0x3f7a4a, roughness: 0.9 }));
    for (const px of [bw * 0.22, bw * 0.36]) {
      const planter = new THREE.Mesh(track(new THREE.BoxGeometry(1.4, 0.9, 1.4)), greenMat);
      planter.position.set(px, terraceY + 0.45, bd * 0.18);
      group.add(planter);
    }
    const pergolaMat = track(
      new THREE.MeshStandardMaterial({ color: 0x2a3346, roughness: 0.6, metalness: 0.3 }),
    );
    const pergola = new THREE.Mesh(track(new THREE.BoxGeometry(3.4, 0.2, 2.6)), pergolaMat);
    pergola.position.set(bw * 0.24, terraceY + 2.2, 0);
    group.add(pergola);
    const colGeo = track(new THREE.BoxGeometry(0.16, 2.2, 0.16));
    for (const px of [bw * 0.24 - 1.5, bw * 0.24 + 1.5]) {
      const col = new THREE.Mesh(colGeo, pergolaMat);
      col.position.set(px, terraceY + 1.1, 0);
      group.add(col);
    }

    // Cartel del proyecto.
    const { texture: signTexture, dispose: disposeSign } = makeTextTexture(
      project.name.toUpperCase(),
      "#ffffff",
      "rgba(255,255,255,0)",
    );
    disposables.push({ dispose: disposeSign });
    const sign = new THREE.Mesh(
      track(new THREE.PlaneGeometry(6.4, 1.5)),
      track(
        new THREE.MeshBasicMaterial({ map: signTexture, transparent: true, depthWrite: false }),
      ),
    );
    sign.position.set(0, terraceY + 1.9, bd / 2 - 0.2);
    group.add(sign);

    // ---- Interacción ------------------------------------------------------

    const pickables = unitMeshes.map((entry) => entry.mesh);
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let downAt: { x: number; y: number } | null = null;

    const pick = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(pickables, false)[0]?.object as THREE.Mesh | undefined;
      return hit;
    };

    const onPointerMove = (event: PointerEvent) => {
      const hit = pick(event.clientX, event.clientY);
      const entry = hit ? unitMeshes.find((item) => item.mesh === hit) : undefined;
      const code = entry?.unit.code ?? null;
      if (code !== hoverRef.current) {
        hoverRef.current = code;
        renderer.domElement.style.cursor = code ? "pointer" : "grab";
        setHover(entry?.unit ?? null);
        refreshRef.current();
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      downAt = { x: event.clientX, y: event.clientY };
      controls.autoRotate = false;
    };

    const onPointerUp = (event: PointerEvent) => {
      const start = downAt;
      downAt = null;
      if (!start) return;
      if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 6) return;
      const hit = pick(event.clientX, event.clientY);
      const entry = hit ? unitMeshes.find((item) => item.mesh === hit) : undefined;
      onSelectRef.current?.(entry?.unit ?? null);
    };

    const onLeave = () => {
      hoverRef.current = null;
      setHover(null);
      refreshRef.current();
      renderer.domElement.style.cursor = "grab";
    };

    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("pointerleave", onLeave);

    // ---- Loop -------------------------------------------------------------

    let raf = 0;
    const tmpTarget = new THREE.Vector3();
    const tmpCamera = new THREE.Vector3();

    const frame = () => {
      if (focusRef.current != null) {
        const y = focusRef.current * FLOOR_H + FLOOR_H / 2;
        tmpTarget.set(0, y, 0);
        tmpCamera.set(13, y + 6, 24);
        controls.target.lerp(tmpTarget, 0.08);
        camera.position.lerp(tmpCamera, 0.08);
        if (camera.position.distanceTo(tmpCamera) < 0.6) focusRef.current = null;
      }
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const resize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);

    meshesRef.current = unitMeshes;
    refreshRef.current();

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointerleave", onLeave);
      controls.dispose();
      for (const item of disposables) item.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === mount) mount.removeChild(renderer.domElement);
      meshesRef.current = [];
    };
    // La escena se reconstruye sólo si cambia el dataset o el proyecto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [units, floorCount, project.name]);

  return (
    <div className={cn("relative h-full w-full overflow-hidden", className)}>
      <div ref={mountRef} className="absolute inset-0" />

      {hover && (
        <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full border border-white/15 bg-black/60 px-3.5 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
          Unidad {hover.number} · {hover.typology} · {hover.status}
        </div>
      )}

      <div className="pointer-events-none absolute left-4 top-4 flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-black/45 px-3 py-1.5 text-[11px] text-white/75 backdrop-blur-sm">
        {(
          [
            ["Disponible", "bg-[#34d399]"],
            ["Reservada", "bg-[#f0b429]"],
            ["Vendida", "bg-[#64748b]"],
          ] as const
        ).map(([label, dot]) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className={cn("size-2 rounded-full", dot)} />
            {label}
          </span>
        ))}
      </div>

      <div className="absolute right-4 top-4 flex flex-col items-end gap-1.5">
        <p className="pointer-events-none text-right text-[11px] text-white/50">
          Arrastrá para girar · rueda para zoom
        </p>
        <div className="pointer-events-auto flex max-h-[38vh] flex-col gap-1 overflow-y-auto rounded-lg border border-white/10 bg-black/45 p-1.5 backdrop-blur-sm">
          {[...levels].reverse().map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => {
                focusRef.current = level;
              }}
              className="rounded-md px-3 py-1 text-left text-[11px] font-medium text-white/75 transition-colors hover:bg-white/10 hover:text-white"
            >
              Piso {level}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Genera una textura de texto para carteles y etiquetas 3D. */
function makeTextTexture(text: string, color: string, background: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  if (!background.includes(",0)")) {
    ctx.fillStyle = background;
    const radius = 36;
    const w = canvas.width - 24;
    const h = canvas.height - 80;
    const x = 12;
    const y = 40;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = color;
  ctx.font = "bold 96px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 4);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return { texture, dispose: () => texture.dispose() };
}
