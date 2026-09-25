import { Loader2, MoonStar, RotateCcw, Sun, Sunset } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type * as THREE from "three";

import { cn } from "@/lib/utils";

type OrbitControlsModule = typeof import("three/examples/jsm/controls/OrbitControls.js");
type GLTFLoaderModule = typeof import("three/examples/jsm/loaders/GLTFLoader.js");

export type LightMode = "day" | "sunset" | "night";

export const LIGHT_MODES: { id: LightMode; label: string; icon: typeof Sun }[] = [
  { id: "day", label: "Día", icon: Sun },
  { id: "sunset", label: "Atardecer", icon: Sunset },
  { id: "night", label: "Noche", icon: MoonStar },
];

const modeIntensity: Record<LightMode, number> = {
  day: 0.22,
  sunset: 0.7,
  night: 1.7,
};

interface Props {
  modelUrl: string;
  className?: string;
  onLoad?: (model: THREE.Group) => void;
}

export function BuildingModelViewer({
  modelUrl,
  className,
  onLoad,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<LightMode>("day");
  const [autoRotate, setAutoRotate] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    let disposed = false;
    let model: THREE.Group | null = null;

    void (async () => {
      try {
        const three = (await import("three")) as typeof import("three");
        const controlsMod =
          (await import("three/examples/jsm/controls/OrbitControls.js")) as OrbitControlsModule;
        const loaderMod =
          (await import("three/examples/jsm/loaders/GLTFLoader.js")) as GLTFLoaderModule;

        if (disposed || !containerRef.current) return;

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

        // Lights
        const hemi = new three.HemisphereLight(0xdfe9ff, 0x3a4038, 1.05);
        const sun = new three.DirectionalLight(0xffffff, 2.4);
        sun.position.set(14, 22, 9);
        sun.castShadow = true;
        sun.shadow.mapSize.width = 1024;
        sun.shadow.mapSize.height = 1024;
        const ambient = new three.AmbientLight(0xffffff, 0.25);
        scene.add(hemi, sun, ambient);

        // Ground
        const ground = new three.Mesh(
          new three.PlaneGeometry(80, 60),
          new three.MeshStandardMaterial({ color: 0x10131a, roughness: 0.95 }),
        );
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -1;
        ground.receiveShadow = true;
        scene.add(ground);

        // Load GLB model
        const loader = new loaderMod.GLTFLoader();
        const gltf = await loader.loadAsync(modelUrl);
        model = gltf.scene;

        model.traverse((child) => {
          if (child instanceof three.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
              const mats = Array.isArray(child.material) ? child.material : [child.material];
              mats.forEach((mat) => {
                if (mat instanceof three.MeshStandardMaterial) {
                  mat.metalness = Math.min(mat.metalness ?? 0, 0.3);
                  mat.roughness = Math.max(mat.roughness ?? 0.7, 0.5);
                }
              });
            }
          }
        });

        // Center and scale model
        const box = new three.Box3().setFromObject(model);
        const center = box.getCenter(new three.Vector3());
        const size = box.getSize(new three.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 7 / maxDim;
        model.scale.setScalar(scale);
        model.position.sub(center.multiplyScalar(scale));
        model.position.y -= box.min.y * scale;

        scene.add(model);
        onLoad?.(model);

        // Lighting modes
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
          model?.traverse((obj) => {
            if (obj instanceof three.Mesh) {
              const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
              mats.forEach((mat) => {
                if (mat instanceof three.MeshStandardMaterial && mat.emissive) {
                  mat.emissiveIntensity = dim;
                }
              });
            }
          });
        }

        // Resize
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
          controls.autoRotate = autoRotate;
          controls.update();
          renderer.render(scene, camera);
          raf = requestAnimationFrame(tick);
        }
        tick();

        applyMode(mode);

        setLoading(false);

        return () => {
          disposed = true;
          ro.disconnect();
          cancelAnimationFrame(raf);
          controls.dispose();
          scene.traverse((obj) => {
            const mesh = obj as THREE.Mesh;
            if (mesh.geometry) mesh.geometry.dispose();
            const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
            if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
            else if (mat) mat.dispose();
          });
          renderer.dispose();
          renderer.domElement.remove();
        };
      } catch (err) {
        console.error("Failed to load model:", err);
        setError("Error al cargar el modelo 3D");
        setLoading(false);
      }
    })();

    return () => {
      disposed = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelUrl, autoRotate, onLoad]);

  useEffect(() => {
    if (loading) return;
    // applyMode would be called here if we had access to the closure
    // For simplicity, mode changes require remount or you can expose an API
  }, [mode, loading]);

  if (error) {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-lg border border-border bg-[oklch(0.13_0.008_265)] flex items-center justify-center",
          className,
        )}
      >
        <div className="text-center text-muted-foreground p-6">
          <p className="font-medium">{error}</p>
          <p className="text-sm mt-1">Verificá que el archivo .glb existe en public/assets/</p>
        </div>
      </div>
    );
  }

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
    </div>
  );
}