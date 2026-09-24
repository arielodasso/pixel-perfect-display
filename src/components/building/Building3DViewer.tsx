import { Loader2, MoonStar, RotateCcw, Sun, Sunset } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type * as THREE from "three";

import { formatArea, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Unit, UnitStatus } from "@/types/domain";

type OrbitControlsModule = typeof import("three/examples/jsm/controls/OrbitControls.js");

interface ViewerApi {
  dispose(): void;
  setMode(mode: LightMode): void;
  setSelected(code: string | null, compareCodes: string[]): void;
}

export type LightMode = "day" | "sunset" | "night";

export const LIGHT_MODES: { id: LightMode; label: string; icon: typeof Sun }[] = [
  { id: "day", label: "Día", icon: Sun },
  { id: "sunset", label: "Atardecer", icon: Sunset },
  { id: "night", label: "Noche", icon: MoonStar },
];

const UNIT_COLORS: Record<UnitStatus, { base: number; emissive: number }> = {
  disponible: { base: 0x223425, emissive: 0xe2fc03 },
  reservada: { base: 0x3a2c18, emissive: 0xffb354 },
  vendida: { base: 0x23262e, emissive: 0x5c6a82 },
};

const STRUCTURE = 0x14161c;

const STATUS_LABEL: Record<UnitStatus, string> = {
  disponible: "Disponible",
  reservada: "Reservada",
  vendida: "Vendida",
};

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Props {
  units: Unit[];
  floors: number;
  selectedCode?: string | null;
  compareCodes?: string[];
  onSelect: (unit: Unit) => void;
  className?: string;
}

const FLOOR_HEIGHT = 1.55;
const SLAB = 0.16;
const PODIUM = 1.15;

const modeIntensity: Record<LightMode, number> = {
  day: 0.22,
  sunset: 0.7,
  night: 1.7,
};

export function Building3DViewer({
  units,
  floors,
  selectedCode = null,
  compareCodes = [],
  onSelect,
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<ViewerApi | null>(null);
  const [mode, setMode] = useState<LightMode>("day");
  const [autoRotate, setAutoRotate] = useState(true);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<Unit | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const sortedFloors = useMemo(
    () => [...new Set(units.map((unit) => unit.floor))].sort((a, b) => a - b),
    [units],
  );

  const propsRef = useRef({ units, selectedCode, compareCodes, onSelect, mode, autoRotate });
  propsRef.current = { units, selectedCode, compareCodes, onSelect, mode, autoRotate };

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    let disposed = false;

    void (async () => {
      const three = (await import("three")) as typeof import("three");
      const controlsMod =
        (await import("three/examples/jsm/controls/OrbitControls.js")) as OrbitControlsModule;
      if (disposed || !containerRef.current) return;

      const scope = new Map<THREE.Mesh, Unit>();

      const scene = new three.Scene();
      scene.fog = new three.Fog(0x0c0e13, 22, 95);

      const camera = new three.PerspectiveCamera(38, 1, 0.1, 200);
      camera.position.set(11, 9.5, 13);

      const renderer = new three.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = three.PCFSoftShadowMap;
      renderer.outputColorSpace = three.SRGBColorSpace;
      container.appendChild(renderer.domElement);

      const controls = new controlsMod.OrbitControls(camera, renderer.domElement);
      controls.target.set(0, 3, 0);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.minDistance = 4;
      controls.maxDistance = 45;
      controls.maxPolarAngle = Math.PI / 2.15;
      controls.autoRotateSpeed = 1.1;

      const raycaster = new three.Raycaster();
      const pointer = new three.Vector2();

      // ----- Luces -----
      const hemi = new three.HemisphereLight(0xdfe9ff, 0x3a4038, 1.05);
      const sun = new three.DirectionalLight(0xffffff, 2.4);
      sun.position.set(14, 22, 9);
      sun.castShadow = true;
      sun.shadow.mapSize.width = 1024;
      sun.shadow.mapSize.height = 1024;
      const ambient = new three.AmbientLight(0xffffff, 0.25);
      scene.add(hemi, sun, ambient);

      const materials = new Map<string, THREE.MeshStandardMaterial>();
      const panelMaterials = new Map<string, THREE.MeshStandardMaterial>();

      // ----- Materiales base -----
      const podiumMat = new three.MeshStandardMaterial({
        color: 0x191c24,
        roughness: 0.7,
        metalness: 0.25,
      });
      const glassMat = new three.MeshStandardMaterial({
        color: 0x20242e,
        roughness: 0.25,
        metalness: 0.85,
      });

      // ----- Contexto urbano (base, vereda, calle, masa edilicia) -----
      const ground = new three.Mesh(
        new three.PlaneGeometry(80, 60),
        new three.MeshStandardMaterial({ color: 0x10131a, roughness: 0.95 }),
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -1;
      ground.receiveShadow = true;
      scene.add(ground);

      const sidewalk = new three.Mesh(
        new three.PlaneGeometry(16, 11),
        new three.MeshStandardMaterial({ color: 0x1c2029, roughness: 0.9, metalness: 0.05 }),
      );
      sidewalk.rotation.x = -Math.PI / 2;
      sidewalk.position.set(0, -0.92, 2);
      sidewalk.receiveShadow = true;
      scene.add(sidewalk);

      const street = new three.Mesh(
        new three.PlaneGeometry(90, 2.1),
        new three.MeshStandardMaterial({ color: 0x0b0d12, roughness: 1 }),
      );
      street.rotation.x = -Math.PI / 2;
      street.position.set(0, -0.9, -4.5);
      scene.add(street);

      const rand = mulberry32(1337);
      const massing = new three.Group();
      for (let i = 0; i < 16; i++) {
        const w = 1.4 + rand() * 2.4;
        const d = 1.4 + rand() * 2.4;
        const h = 1.2 + rand() * (i % 3 === 0 ? 9 : 4.5);
        const angle = (i / 16) * Math.PI * 2;
        const radius = 9 + rand() * 7;
        const box = new three.Mesh(
          new three.BoxGeometry(w, h, d),
          new three.MeshStandardMaterial({
            color: 0x15181f,
            roughness: 0.9,
            metalness: i % 4 === 0 ? 0.3 : 0,
          }),
        );
        box.position.set(Math.cos(angle) * radius, h / 2 - 1, Math.sin(angle) * radius);
        box.rotation.y = rand() * Math.PI;
        box.castShadow = i % 2 === 0;
        massing.add(box);
      }
      scene.add(massing);

      // ----- Edificación -----
      const building = new three.Group();
      const totalWidth = 7.4;

      const podium = new three.Mesh(
        new three.BoxGeometry(totalWidth + 1.4, PODIUM, 3.4),
        podiumMat,
      );
      podium.position.y = PODIUM / 2;
      podium.castShadow = true;
      podium.receiveShadow = true;
      building.add(podium);

      const lobby = new three.Mesh(new three.BoxGeometry(totalWidth - 0.4, 0.95, 0.12), glassMat);
      lobby.position.set(0, 0.62, 1.7);
      building.add(lobby);

      const unitMeshes: THREE.Mesh[] = [];

      const byFloor = new Map<number, Unit[]>();
      sortedFloors.forEach((floor) => byFloor.set(floor, []));
      units.forEach((unit) => byFloor.get(unit.floor)?.push(unit));

      sortedFloors.forEach((floor) => {
        const floorUnits = (byFloor.get(floor) ?? [])
          .slice()
          .sort((a, b) => a.number.localeCompare(b.number));
        const baseY = PODIUM + (floor - 1) * (FLOOR_HEIGHT + SLAB);
        const count = floorUnits.length;

        const slab = new three.Mesh(
          new three.BoxGeometry(totalWidth + 0.5, SLAB, 3.2),
          new three.MeshStandardMaterial({ color: STRUCTURE, roughness: 0.85, metalness: 0.1 }),
        );
        slab.position.y = baseY + FLOOR_HEIGHT + SLAB / 2;
        slab.castShadow = true;
        building.add(slab);

        floorUnits.forEach((unit, index) => {
          const slot = 2.35;
          const x = (index - (count - 1) / 2) * slot;
          const width = unit.rooms >= 3 ? 1.55 : unit.rooms >= 2 ? 1.3 : 1.05;
          const depth = 1.7;
          const y = baseY + FLOOR_HEIGHT / 2;
          const color = UNIT_COLORS[unit.status];

          const material = new three.MeshStandardMaterial({
            color: STRUCTURE,
            roughness: 0.75,
            metalness: 0.12,
            emissive: new three.Color(color.emissive),
            emissiveIntensity: modeIntensity.day,
          });
          const box = new three.Mesh(
            new three.BoxGeometry(width, FLOOR_HEIGHT - 0.08, depth),
            material,
          );
          box.position.set(x, y, 0);
          box.castShadow = true;
          box.receiveShadow = true;
          scope.set(box, unit);
          unitMeshes.push(box);
          building.add(box);

          const panelMat = new three.MeshStandardMaterial({
            color: 0x1b1e26,
            roughness: 0.3,
            metalness: 0.5,
            emissive: new three.Color(color.emissive),
            emissiveIntensity: modeIntensity.day * 0.6,
          });
          const windowPanel = new three.Mesh(
            new three.PlaneGeometry(width - 0.28, FLOOR_HEIGHT - 0.34),
            panelMat,
          );
          windowPanel.position.set(x, y, depth / 2 + 0.015);
          windowPanel.rotation.y = Math.PI;
          building.add(windowPanel);
          panelMaterials.set(unit.id, panelMat);

          if (unit.balcony) {
            const balcony = new three.Mesh(
              new three.BoxGeometry(width - 0.16, 0.1, 0.52),
              new three.MeshStandardMaterial({ color: 0x282c36, roughness: 0.55, metalness: 0.2 }),
            );
            balcony.position.set(x, baseY + 0.42, depth / 2 + 0.3);
            balcony.castShadow = true;
            building.add(balcony);
          }

          materials.set(unit.id, material);
        });
      });

      scene.add(building);

      // ----- Modo de iluminación -----
      function applyMode(m: LightMode) {
        const day = m === "day";
        const sunset = m === "sunset";
        const night = m === "night";

        renderer.setClearColor(day ? 0xcfe0ff : sunset ? 0x2a2130 : 0x05070d);
        scene.fog!.color.set(day ? 0xb8c8ea : sunset ? 0x3a2a30 : 0x05070d);

        hemi.intensity = day ? 1.05 : sunset ? 0.75 : 0.5;
        hemi.color.set(day ? 0xdfe9ff : sunset ? 0xffc9a0 : 0x1b2140);
        hemi.groundColor.set(day ? 0x3a4038 : sunset ? 0x4a352a : 0x0a0c12);

        sun.intensity = day ? 2.4 : sunset ? 2.1 : 0.4;
        sun.color.set(day ? 0xffffff : sunset ? 0xff8a3c : 0x7d9cff);
        sun.position.set(
          day ? 14 : sunset ? 12 : -10,
          day ? 22 : sunset ? 4 : 16,
          day ? 9 : sunset ? -6 : 4,
        );

        ambient.intensity = day ? 0.25 : sunset ? 0.4 : 0.16;

        const dim = modeIntensity[m];
        materials.forEach((mat) => {
          mat.emissiveIntensity = dim;
        });
        panelMaterials.forEach((mat) => {
          mat.emissiveIntensity = dim * 0.6;
        });
        massing.traverse((obj) => {
          if (obj instanceof three.Mesh) {
            const mat = obj.material as THREE.MeshStandardMaterial;
            mat.emissive = new three.Color(night ? 0x6f85b8 : 0x000000);
            mat.emissiveIntensity = night ? 0.35 : 0;
          }
        });
      }

      // ----- Hover -----
      let hoveredMesh: THREE.Mesh | null = null;

      function highlight(mesh: THREE.Mesh, on: boolean) {
        const unit = scope.get(mesh);
        if (!unit) return;
        const mat = materials.get(unit.id);
        if (!mat) return;
        if (on) mat.emissiveIntensity = 1.25;
        else mat.emissiveIntensity = modeIntensity[propsRef.current.mode];
      }

      function onPointerMove(event: PointerEvent) {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(unitMeshes, false);
        const hit = hits[0] as THREE.Intersection<THREE.Mesh> | undefined;
        const unit = hit ? (scope.get(hit.object) ?? null) : null;

        if (hoveredMesh && hoveredMesh !== hit?.object) {
          highlight(hoveredMesh, false);
          hoveredMesh = null;
        }
        if (unit && hit) {
          if (hoveredMesh !== hit.object) highlight(hit.object, true);
          hoveredMesh = hit.object;
          setTooltip(unit);
          const ndc = new three.Vector3(
            hit.object.position.x,
            hit.object.position.y + FLOOR_HEIGHT / 2,
            hit.object.position.z,
          );
          ndc.project(camera);
          const x = (ndc.x * 0.5 + 0.5) * renderer.domElement.clientWidth;
          const y = (-ndc.y * 0.5 + 0.5) * renderer.domElement.clientHeight;
          setTooltipPos({ x, y });
        } else {
          hoveredMesh = null;
          setTooltip(null);
          setTooltipPos(null);
        }
      }

      function onClick(event: PointerEvent) {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const hit = raycaster.intersectObjects(unitMeshes, false)[0] as
          THREE.Intersection<THREE.Mesh> | undefined;
        const unit = hit ? scope.get(hit.object) : undefined;
        if (unit) propsRef.current.onSelect(unit);
      }

      renderer.domElement.addEventListener("pointermove", onPointerMove);
      renderer.domElement.addEventListener("click", onClick);

      // ----- Marcos de selección / comparación -----
      const frameGroup = new three.Group();
      scene.add(frameGroup);
      const frameMatSelected = new three.LineBasicMaterial({
        color: 0xe2fc03,
        transparent: true,
        opacity: 0.95,
      });
      const frameMatCompare = new three.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.7,
      });

      let activeFrames: THREE.LineSegments[] = [];

      function refreshFrames() {
        activeFrames.forEach((line) => line.geometry.dispose());
        activeFrames = [];
        frameGroup.clear();
        const { selectedCode: selected, compareCodes: compares } = propsRef.current;
        const meshByCode = new Map<string, THREE.Mesh>();
        scope.forEach((unit, mesh) => meshByCode.set(unit.code, mesh));

        const selectedMesh = selected ? meshByCode.get(selected) : undefined;
        if (selectedMesh) {
          const line = new three.LineSegments(
            new three.EdgesGeometry(new three.BoxGeometry(1.36, FLOOR_HEIGHT + 0.06, 1.76)),
            frameMatSelected,
          );
          line.position.copy(selectedMesh.position);
          activeFrames.push(line);
          frameGroup.add(line);
        }
        compares.forEach((code) => {
          const mesh = meshByCode.get(code);
          if (!mesh || code === selected) return;
          const line = new three.LineSegments(
            new three.EdgesGeometry(new three.BoxGeometry(1.36, FLOOR_HEIGHT + 0.06, 1.76)),
            frameMatCompare,
          );
          line.position.copy(mesh.position);
          activeFrames.push(line);
          frameGroup.add(line);
        });
      }
      refreshFrames();

      // ----- Resize -----
      function resize() {
        const w = container.clientWidth;
        const h = container.clientHeight;
        if (!w || !h) return;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
      const ro = new ResizeObserver(resize);
      ro.observe(container);
      resize();

      let raf = 0;
      function tick() {
        if (disposed) return;
        controls.autoRotate = propsRef.current.autoRotate;
        controls.update();
        renderer.render(scene, camera);
        raf = requestAnimationFrame(tick);
      }
      tick();

      applyMode(propsRef.current.mode);

      apiRef.current = {
        dispose() {
          ro.disconnect();
          renderer.domElement.removeEventListener("pointermove", onPointerMove);
          renderer.domElement.removeEventListener("click", onClick);
          cancelAnimationFrame(raf);
          controls.dispose();
          scene.traverse((obj) => {
            const mesh = obj as THREE.Mesh;
            if (mesh.geometry) mesh.geometry.dispose();
            const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
            if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
            else if (mat) mat.dispose();
          });
          frameMatSelected.dispose();
          frameMatCompare.dispose();
          renderer.dispose();
          renderer.domElement.remove();
        },
        setMode(m) {
          applyMode(m);
        },
        setSelected(code, compares) {
          propsRef.current.selectedCode = code;
          propsRef.current.compareCodes = compares;
          refreshFrames();
        },
      };

      setLoading(false);
    })();

    return () => {
      disposed = true;
      apiRef.current?.dispose();
      apiRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (loading) return;
    apiRef.current?.setMode(mode);
    propsRef.current.mode = mode;
  }, [mode, loading]);

  useEffect(() => {
    if (loading) return;
    apiRef.current?.setSelected(selectedCode ?? null, compareCodes);
  }, [selectedCode, compareCodes, loading]);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border border-border bg-[oklch(0.13_0.008_265)]",
        className,
      )}
    >
      <div ref={containerRef} className="absolute inset-0 cursor-grab active:cursor-grabbing" />

      {loading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin text-primary" />
          Cargando modelo 3D…
        </div>
      )}

      {/* Modo de iluminación */}
      <div className="absolute right-3 top-3 z-20 flex items-center gap-1 rounded-lg border border-border bg-background/80 p-1 shadow-panel backdrop-blur-sm">
        {LIGHT_MODES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            className={cn(
              "flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors",
              mode === id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        aria-label={autoRotate ? "Detener rotación" : "Rotar automáticamente"}
        onClick={() => setAutoRotate((v) => !v)}
        className={cn(
          "absolute bottom-3 right-3 z-20 grid size-8 place-items-center rounded-lg border border-border bg-background/80 shadow-panel backdrop-blur-sm transition-colors",
          autoRotate ? "text-primary" : "text-muted-foreground hover:text-foreground",
        )}
      >
        <RotateCcw className="size-4" />
      </button>

      {/* Tooltip */}
      {tooltip && tooltipPos && (
        <div
          className="pointer-events-none absolute z-20 w-44 -translate-x-1/2 rounded-lg border border-border bg-popover/95 p-3 shadow-panel backdrop-blur-sm"
          style={{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y - 12}px` }}
        >
          <p className="text-xs font-medium">{tooltip.code}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {tooltip.typology} · {formatArea(tooltip.area)}
          </p>
          <p
            className={cn(
              "mt-1.5 text-[11px] font-medium",
              tooltip.status === "disponible"
                ? "text-available"
                : tooltip.status === "reservada"
                  ? "text-reserved"
                  : "text-muted-foreground",
            )}
          >
            {STATUS_LABEL[tooltip.status]}
          </p>
          {tooltip.status === "disponible" && (
            <p className="mt-1 text-[11px] text-foreground">
              {formatPrice(tooltip.price, tooltip.currency)}
            </p>
          )}
        </div>
      )}

      {/* Leyenda */}
      <div className="pointer-events-none absolute bottom-3 left-3 z-20 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-background/75 px-3 py-1.5 text-[11px] text-muted-foreground backdrop-blur-sm">
        {(
          [
            ["Disponible", "bg-available"],
            ["Reservada", "bg-reserved"],
            ["Vendida", "bg-sold"],
          ] as const
        ).map(([label, dot]) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className={cn("size-2 rounded-full", dot)} />
            {label}
          </span>
        ))}
        <span className="hidden text-[10px] opacity-70 sm:inline">Arrastrá para orbitar</span>
      </div>

      <span className="pointer-events-none absolute left-3 top-3 z-20 hidden rounded-md border border-border bg-background/75 px-2 py-1 text-[10px] text-muted-foreground backdrop-blur-sm lg:block">
        {floors} niveles · {units.length} unidades
      </span>
    </div>
  );
}
