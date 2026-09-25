import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Box, Layers3, RotateCcw } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Project, Unit } from "@/types/domain";

interface Props {
  project: Project;
  units: Unit[];
  selectedCode?: string | null;
  onSelect?: (unit: Unit | null) => void;
  className?: string;
}

interface UnitMeshEntry {
  mesh: THREE.Mesh;
  material: THREE.MeshPhysicalMaterial;
  interiorMaterial: THREE.MeshStandardMaterial;
  labelMaterial: THREE.MeshBasicMaterial;
  baseColor: THREE.Color;
  unit: Unit;
}

const STATUS_COLOR: Record<Unit["status"], number> = {
  disponible: 0x36c98f,
  reservada: 0xe5a83b,
  vendida: 0x718087,
};

const STATUS_LABEL: Record<Unit["status"], string> = {
  disponible: "Disponible",
  reservada: "Reservada",
  vendida: "Vendida",
};

const FLOOR_HEIGHT = 2.85;
const BUILDING_WIDTH = 16.8;
const BUILDING_DEPTH = 8.2;
const GROUND_Y = 0.36;
const IDLE_EMISSIVE = 0.06;
const HOVER_EMISSIVE = 0.38;
const SELECTED_EMISSIVE = 0.82;
const WHITE = new THREE.Color(0xffffff);
const GLASS_TINT = new THREE.Color(0x7fa4ad);

export function Masterplan3D({ project, units, selectedCode, onSelect, className }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const focusRef = useRef<number | "overview" | null>(null);
  const meshesRef = useRef<UnitMeshEntry[]>([]);
  const hoverRef = useRef<string | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const [hover, setHover] = useState<Unit | null>(null);

  const levels = useMemo(() => {
    const unique = [...new Set(units.map((unit) => unit.floor))].sort((a, b) => a - b);
    return unique.length > 0 ? unique : [1];
  }, [units]);

  const refreshEmphasis = useCallback(() => {
    for (const entry of meshesRef.current) {
      const selected = entry.unit.code === selectedCode;
      const hovered = entry.unit.code === hoverRef.current;
      const emphasis = selected ? SELECTED_EMISSIVE : hovered ? HOVER_EMISSIVE : IDLE_EMISSIVE;

      entry.material.color
        .copy(entry.baseColor)
        .lerp(WHITE, selected ? 0.2 : hovered ? 0.12 : 0.04);
      entry.material.emissive.copy(entry.baseColor);
      entry.material.emissiveIntensity = emphasis;
      entry.material.opacity = selected ? 0.86 : hovered ? 0.72 : 0.54;
      entry.interiorMaterial.emissiveIntensity = selected ? 0.42 : hovered ? 0.24 : 0.04;
      entry.labelMaterial.opacity = selected || hovered ? 1 : 0.78;
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
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    renderer.domElement.style.cursor = "grab";

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xdce8e7);
    scene.fog = new THREE.Fog(0xdce8e7, 52, 125);

    const minLevel = levels[0] ?? 1;
    const buildingHeight = levels.length * FLOOR_HEIGHT;
    const buildingCenterY = GROUND_Y + ((levels.length - 1) * FLOOR_HEIGHT) / 2;
    const overviewPosition = new THREE.Vector3(25, buildingCenterY + 10, 31);

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 300);
    camera.position.copy(overviewPosition);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, buildingCenterY, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.065;
    controls.enablePan = false;
    controls.minDistance = 16;
    controls.maxDistance = 78;
    controls.minPolarAngle = 0.3;
    controls.maxPolarAngle = 1.46;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.32;
    controls.update();

    const hemisphere = new THREE.HemisphereLight(0xf4fbff, 0x9a8f78, 2.25);
    scene.add(hemisphere);

    const sun = new THREE.DirectionalLight(0xfff1d1, 3.2);
    sun.position.set(26, 42, 28);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -32;
    sun.shadow.camera.right = 32;
    sun.shadow.camera.top = 38;
    sun.shadow.camera.bottom = -18;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 100;
    sun.shadow.bias = -0.00015;
    scene.add(sun);

    const fill = new THREE.DirectionalLight(0x8ec5d8, 0.75);
    fill.position.set(-24, 18, 18);
    scene.add(fill);

    const disposables: { dispose: () => void }[] = [];
    const unitMeshes: UnitMeshEntry[] = [];
    const track = <T extends { dispose: () => void }>(item: T): T => {
      disposables.push(item);
      return item;
    };

    const addBox = (
      size: [number, number, number],
      position: [number, number, number],
      material: THREE.Material,
      castShadow = true,
      receiveShadow = true,
    ) => {
      const mesh = new THREE.Mesh(track(new THREE.BoxGeometry(...size)), material);
      mesh.position.set(...position);
      mesh.castShadow = castShadow;
      mesh.receiveShadow = receiveShadow;
      return mesh;
    };

    const addCylinder = (
      radiusTop: number,
      radiusBottom: number,
      height: number,
      position: [number, number, number],
      material: THREE.Material,
      segments = 12,
    ) => {
      const mesh = new THREE.Mesh(
        track(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments)),
        material,
      );
      mesh.position.set(...position);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      return mesh;
    };

    const stoneMaterial = track(
      new THREE.MeshStandardMaterial({ color: 0xe7e2d7, roughness: 0.78, metalness: 0.02 }),
    );
    const lightStoneMaterial = track(
      new THREE.MeshStandardMaterial({ color: 0xf4f0e8, roughness: 0.72, metalness: 0.01 }),
    );
    const concreteMaterial = track(
      new THREE.MeshStandardMaterial({ color: 0xc9c3b8, roughness: 0.86, metalness: 0.02 }),
    );
    const frameMaterial = track(
      new THREE.MeshStandardMaterial({ color: 0x30393a, roughness: 0.3, metalness: 0.68 }),
    );
    const warmMetalMaterial = track(
      new THREE.MeshStandardMaterial({ color: 0x8b6d4c, roughness: 0.34, metalness: 0.64 }),
    );
    const glassMaterial = track(
      new THREE.MeshPhysicalMaterial({
        color: 0x91b7bd,
        transparent: true,
        opacity: 0.28,
        roughness: 0.08,
        metalness: 0.04,
        transmission: 0.18,
        thickness: 0.12,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    const sideGlassMaterial = track(
      new THREE.MeshPhysicalMaterial({
        color: 0x6f979e,
        transparent: true,
        opacity: 0.22,
        roughness: 0.1,
        metalness: 0.08,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    const interiorMaterial = track(
      new THREE.MeshStandardMaterial({ color: 0xb7a58a, roughness: 0.82, metalness: 0.02 }),
    );
    const grassMaterial = track(
      new THREE.MeshStandardMaterial({ color: 0x7f9d70, roughness: 0.98 }),
    );
    const planterMaterial = track(
      new THREE.MeshStandardMaterial({ color: 0xa58a6f, roughness: 0.9 }),
    );
    const foliageMaterial = track(
      new THREE.MeshStandardMaterial({ color: 0x527b57, roughness: 0.96 }),
    );
    const foliageLightMaterial = track(
      new THREE.MeshStandardMaterial({ color: 0x71966b, roughness: 0.96 }),
    );
    const roadMaterial = track(
      new THREE.MeshStandardMaterial({ color: 0x566164, roughness: 0.96 }),
    );
    const pavementMaterial = track(
      new THREE.MeshStandardMaterial({ color: 0xc5c4bd, roughness: 0.94 }),
    );
    const laneMaterial = track(new THREE.MeshStandardMaterial({ color: 0xe9e5ce, roughness: 0.8 }));
    const waterMaterial = track(
      new THREE.MeshPhysicalMaterial({
        color: 0x45b9ca,
        emissive: 0x0a6272,
        emissiveIntensity: 0.16,
        transparent: true,
        opacity: 0.82,
        roughness: 0.08,
        metalness: 0.02,
        transmission: 0.18,
        thickness: 0.35,
      }),
    );
    const poolBorderMaterial = track(
      new THREE.MeshStandardMaterial({ color: 0x526267, roughness: 0.48, metalness: 0.18 }),
    );

    const group = new THREE.Group();
    scene.add(group);

    const ground = new THREE.Mesh(
      track(new THREE.PlaneGeometry(180, 180)),
      track(new THREE.MeshStandardMaterial({ color: 0xcbd3c4, roughness: 1 })),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.03;
    ground.receiveShadow = true;
    group.add(ground);

    group.add(addBox([34, 0.16, 24], [0, 0.04, 0], stoneMaterial, false, true));
    group.add(addBox([25, 0.08, 14], [0, 0.15, 1], grassMaterial, false, true));
    group.add(addBox([72, 0.12, 7.5], [0, 0.06, 15], roadMaterial, false, true));
    group.add(addBox([72, 0.2, 1.8], [0, 0.12, 10.35], pavementMaterial, false, true));
    group.add(addBox([72, 0.24, 0.28], [0, 0.18, 9.42], lightStoneMaterial, false, true));

    for (let x = -28; x <= 28; x += 5.5) {
      group.add(addBox([2.8, 0.025, 0.12], [x, 0.135, 15], laneMaterial, false, false));
    }

    for (let index = 0; index < 6; index += 1) {
      group.add(
        addBox([2.4, 0.08, 1.2], [0, 0.2, 6.8 + index * 0.7], pavementMaterial, false, true),
      );
    }

    const addTree = (x: number, z: number, scale = 1) => {
      const planter = addCylinder(0.72, 0.82, 0.48, [x, 0.32, z], planterMaterial, 16);
      group.add(planter);
      const trunk = addCylinder(0.12, 0.18, 1.7 * scale, [x, 1.1 * scale, z], warmMetalMaterial, 9);
      group.add(trunk);
      const crown = new THREE.Mesh(
        track(new THREE.IcosahedronGeometry(1.15 * scale, 1)),
        foliageMaterial,
      );
      crown.position.set(x, 2.45 * scale, z);
      crown.scale.set(0.9, 1.15, 0.9);
      crown.castShadow = true;
      group.add(crown);
      const crownLight = new THREE.Mesh(
        track(new THREE.IcosahedronGeometry(0.72 * scale, 1)),
        foliageLightMaterial,
      );
      crownLight.position.set(x + 0.48 * scale, 2.72 * scale, z - 0.18);
      crownLight.castShadow = true;
      group.add(crownLight);
    };

    [
      [-13, 8],
      [-9, 8],
      [9, 8],
      [13, 8],
      [-14, -6],
      [14, -6],
      [-15, 3],
      [15, 3],
    ].forEach(([x, z], index) => addTree(x ?? 0, z ?? 0, index % 2 === 0 ? 1 : 0.86));

    const addPerson = (x: number, z: number, color: number, rotation = 0) => {
      const personMaterial = track(new THREE.MeshStandardMaterial({ color, roughness: 0.82 }));
      const body = addCylinder(0.13, 0.16, 0.62, [x, 0.58, z], personMaterial, 8);
      const head = new THREE.Mesh(track(new THREE.SphereGeometry(0.15, 10, 8)), personMaterial);
      head.position.set(x, 1.02, z);
      body.rotation.y = rotation;
      group.add(body, head);
    };

    addPerson(-2.6, 7.1, 0x325d72);
    addPerson(3.8, 6.2, 0xa45b49);
    addPerson(8.5, 8.6, 0x6e5b85);

    const addCar = (x: number, color: number) => {
      const carMaterial = track(
        new THREE.MeshStandardMaterial({ color, roughness: 0.28, metalness: 0.55 }),
      );
      const car = new THREE.Group();
      car.position.set(x, 0.12, 15);
      const body = addBox([3.9, 0.62, 1.55], [0, 0.48, 0], carMaterial);
      const cabin = addBox([2.05, 0.55, 1.38], [-0.18, 0.94, 0], sideGlassMaterial);
      car.add(body, cabin);
      group.add(car);
    };

    addCar(-9, 0x9e3e3e);
    addCar(8, 0xe3e0d5);
    addCar(14, 0x365a70);

    const contextMaterial = track(
      new THREE.MeshStandardMaterial({ color: 0xb9b9ae, roughness: 0.92 }),
    );
    const contextAccentMaterial = track(
      new THREE.MeshStandardMaterial({ color: 0x9fa8a2, roughness: 0.88 }),
    );
    [
      [-22, 6.5, -18, 11, 9, 0],
      [21, 8.5, -20, 12, 10, 1],
      [-31, 4.2, 2, 8, 8, 0],
      [32, 5.4, 1, 9, 8, 1],
    ].forEach(([x, h, z, w, d, accent]) => {
      group.add(
        addBox(
          [w ?? 10, h ?? 6, d ?? 8],
          [x ?? 0, (h ?? 6) / 2, z ?? 0],
          accent === 1 ? contextAccentMaterial : contextMaterial,
        ),
      );
    });

    const roofY = GROUND_Y + buildingHeight;
    group.add(
      addBox([BUILDING_WIDTH + 1.5, 0.5, BUILDING_DEPTH + 1.2], [0, 0.25, 0], stoneMaterial),
    );
    group.add(
      addBox(
        [BUILDING_WIDTH - 1.1, 2.55, BUILDING_DEPTH - 0.45],
        [0, 1.52, -0.05],
        glassMaterial,
        false,
        false,
      ),
    );
    group.add(
      addBox(
        [3.45, buildingHeight + 0.25, BUILDING_DEPTH - 0.75],
        [0, buildingHeight / 2 + 0.25, -0.78],
        concreteMaterial,
      ),
    );

    for (let elevatorY = 1.1; elevatorY < roofY - 0.8; elevatorY += FLOOR_HEIGHT) {
      group.add(
        addBox(
          [2.25, 0.88, 0.12],
          [0, elevatorY, BUILDING_DEPTH / 2 - 1.18],
          frameMaterial,
          false,
          false,
        ),
      );
    }

    for (const side of [-1, 1]) {
      for (let floor = 0; floor < levels.length; floor += 1) {
        const levelY = GROUND_Y + floor * FLOOR_HEIGHT;
        group.add(
          addBox(
            [0.34, 1.2, BUILDING_DEPTH - 0.55],
            [side * (BUILDING_WIDTH / 2 - 0.16), levelY + 1.48, -0.08],
            sideGlassMaterial,
            false,
            false,
          ),
        );
        group.add(
          addBox(
            [0.42, 0.68, BUILDING_DEPTH + 0.22],
            [side * (BUILDING_WIDTH / 2 - 0.08), levelY + 0.2, 0],
            lightStoneMaterial,
          ),
        );
      }
    }

    const columnXs = [
      -BUILDING_WIDTH / 2 + 0.28,
      -BUILDING_WIDTH / 6,
      BUILDING_WIDTH / 6,
      BUILDING_WIDTH / 2 - 0.28,
    ];
    for (const x of columnXs) {
      group.add(
        addBox(
          [0.28, buildingHeight + 0.18, 0.36],
          [x, buildingHeight / 2 + 0.28, BUILDING_DEPTH / 2 + 0.16],
          frameMaterial,
        ),
      );
    }

    const levelY = (level: number) => GROUND_Y + (level - minLevel) * FLOOR_HEIGHT;
    const pickables: THREE.Mesh[] = [];

    for (const level of levels) {
      const baseY = levelY(level);
      const floorUnits = units
        .filter((unit) => unit.floor === level)
        .sort((a, b) => a.number.localeCompare(b.number));
      const count = floorUnits.length;

      group.add(
        addBox(
          [BUILDING_WIDTH + 0.72, 0.2, BUILDING_DEPTH + 0.76],
          [0, baseY - 0.08, 0],
          lightStoneMaterial,
        ),
      );
      group.add(
        addBox(
          [BUILDING_WIDTH + 0.2, 0.52, 0.32],
          [0, baseY + 0.24, BUILDING_DEPTH / 2 + 0.05],
          concreteMaterial,
        ),
      );
      group.add(
        addBox(
          [BUILDING_WIDTH - 0.2, 0.48, 0.28],
          [0, baseY + 0.23, -BUILDING_DEPTH / 2 - 0.02],
          stoneMaterial,
        ),
      );

      if (count === 0) continue;

      const slotWidth = (BUILDING_WIDTH - 1.05) / count;
      const startX = -((count - 1) * slotWidth) / 2;

      floorUnits.forEach((unit, index) => {
        const x = startX + index * slotWidth;
        const color = new THREE.Color(STATUS_COLOR[unit.status]);
        const facadeMaterial = track(
          new THREE.MeshPhysicalMaterial({
            color: color.clone().lerp(GLASS_TINT, 0.56),
            emissive: color,
            emissiveIntensity: IDLE_EMISSIVE,
            transparent: true,
            opacity: 0.54,
            roughness: 0.08,
            metalness: 0.05,
            transmission: 0.16,
            thickness: 0.1,
            side: THREE.DoubleSide,
            depthWrite: false,
          }),
        );
        const roomMaterial = track(
          new THREE.MeshStandardMaterial({
            color: color.clone().lerp(interiorMaterial.color, 0.58),
            emissive: color,
            emissiveIntensity: 0.04,
            transparent: true,
            opacity: 0.76,
            roughness: 0.86,
          }),
        );
        const panelWidth = slotWidth - 0.38;
        const panelHeight = FLOOR_HEIGHT - 0.82;
        const room = addBox(
          [panelWidth, panelHeight, 0.18],
          [x, baseY + 1.36, BUILDING_DEPTH / 2 - 0.23],
          roomMaterial,
          false,
          false,
        );
        const facade = addBox(
          [panelWidth, panelHeight, 0.12],
          [x, baseY + 1.36, BUILDING_DEPTH / 2 + 0.12],
          facadeMaterial,
          false,
          false,
        );
        facade.userData["unit"] = unit;
        group.add(room, facade);
        pickables.push(facade);

        group.add(
          addBox(
            [0.075, panelHeight + 0.08, 0.2],
            [x - panelWidth / 2, baseY + 1.36, BUILDING_DEPTH / 2 + 0.16],
            frameMaterial,
          ),
        );
        group.add(
          addBox(
            [0.075, panelHeight + 0.08, 0.2],
            [x + panelWidth / 2, baseY + 1.36, BUILDING_DEPTH / 2 + 0.16],
            frameMaterial,
          ),
        );
        group.add(
          addBox(
            [0.055, panelHeight + 0.06, 0.15],
            [x, baseY + 1.36, BUILDING_DEPTH / 2 + 0.18],
            frameMaterial,
            false,
            false,
          ),
        );

        if (unit.balcony) {
          group.add(
            addBox(
              [panelWidth + 0.1, 0.14, 1.22],
              [x, baseY + 0.08, BUILDING_DEPTH / 2 + 0.72],
              lightStoneMaterial,
            ),
          );
          group.add(
            addBox(
              [panelWidth, 0.72, 0.055],
              [x, baseY + 0.48, BUILDING_DEPTH / 2 + 1.27],
              glassMaterial,
              false,
              false,
            ),
          );
          for (const railX of [x - panelWidth / 2, x + panelWidth / 2]) {
            group.add(
              addBox(
                [0.06, 0.78, 0.07],
                [railX, baseY + 0.46, BUILDING_DEPTH / 2 + 1.27],
                frameMaterial,
              ),
            );
          }
        } else {
          group.add(
            addBox(
              [panelWidth, 0.62, 0.06],
              [x, baseY + 0.48, BUILDING_DEPTH / 2 + 0.15],
              glassMaterial,
              false,
              false,
            ),
          );
        }

        const { texture, dispose } = makeTextTexture(
          unit.number,
          "#ffffff",
          "rgba(29,36,37,0.78)",
          88,
        );
        disposables.push({ dispose });
        const labelMaterial = track(
          new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: 0.78,
            depthWrite: false,
          }),
        );
        const label = new THREE.Mesh(track(new THREE.PlaneGeometry(1.55, 0.62)), labelMaterial);
        label.position.set(x, baseY + 1.58, BUILDING_DEPTH / 2 + 0.25);
        group.add(label);

        unitMeshes.push({
          mesh: facade,
          material: facadeMaterial,
          interiorMaterial: roomMaterial,
          labelMaterial,
          baseColor: color,
          unit,
        });
      });

      const { texture, dispose } = makeTextTexture(
        `P${level}`,
        "#f7f4ed",
        "rgba(35,43,44,0.72)",
        82,
      );
      disposables.push({ dispose });
      const floorLabel = new THREE.Mesh(
        track(new THREE.PlaneGeometry(1.45, 0.64)),
        track(new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false })),
      );
      floorLabel.position.set(-BUILDING_WIDTH / 2 - 0.86, baseY + 1.34, 0.6);
      floorLabel.rotation.y = -Math.PI / 2;
      group.add(floorLabel);
    }

    group.add(addBox([5.2, 0.18, 2.25], [0, 2.83, BUILDING_DEPTH / 2 + 1.02], lightStoneMaterial));
    for (const x of [-1.7, 1.7]) {
      group.add(addBox([0.16, 2.35, 0.16], [x, 1.35, BUILDING_DEPTH / 2 + 1.75], frameMaterial));
    }
    group.add(
      addBox([3.5, 2.25, 0.12], [0, 1.42, BUILDING_DEPTH / 2 + 0.02], frameMaterial, false, false),
    );
    group.add(
      addBox([3.18, 2.02, 0.08], [0, 1.42, BUILDING_DEPTH / 2 + 0.11], glassMaterial, false, false),
    );

    const roofDeck = new THREE.Mesh(
      track(new THREE.BoxGeometry(BUILDING_WIDTH + 0.65, 0.24, BUILDING_DEPTH + 0.65)),
      stoneMaterial,
    );
    roofDeck.position.set(0, roofY - 0.06, 0);
    roofDeck.receiveShadow = true;
    group.add(roofDeck);

    group.add(
      addBox(
        [BUILDING_WIDTH + 0.7, 0.72, 0.22],
        [0, roofY + 0.35, BUILDING_DEPTH / 2 + 0.32],
        lightStoneMaterial,
      ),
    );
    group.add(
      addBox(
        [0.22, 0.72, BUILDING_DEPTH + 0.7],
        [-BUILDING_WIDTH / 2 - 0.25, roofY + 0.35, 0],
        lightStoneMaterial,
      ),
    );
    group.add(
      addBox(
        [0.22, 0.72, BUILDING_DEPTH + 0.7],
        [BUILDING_WIDTH / 2 + 0.25, roofY + 0.35, 0],
        lightStoneMaterial,
      ),
    );
    group.add(
      addBox(
        [BUILDING_WIDTH + 0.7, 0.72, 0.22],
        [0, roofY + 0.35, -BUILDING_DEPTH / 2 - 0.32],
        lightStoneMaterial,
      ),
    );

    group.add(addBox([5.6, 0.28, 3.35], [-4.45, roofY + 0.18, 0.35], poolBorderMaterial));
    group.add(addBox([5.08, 0.16, 2.83], [-4.45, roofY + 0.38, 0.35], waterMaterial, false, false));

    for (let chair = 0; chair < 3; chair += 1) {
      const x = 2.2 + chair * 1.65;
      group.add(addBox([0.72, 0.12, 1.45], [x, roofY + 0.4, 1.45], lightStoneMaterial));
      group.add(addBox([0.72, 0.72, 0.12], [x, roofY + 0.72, 0.82], lightStoneMaterial));
    }

    for (const x of [3.1, 6.7]) {
      for (const z of [-1.8, -0.1]) {
        group.add(addBox([0.12, 2.1, 0.12], [x, roofY + 1.28, z], frameMaterial));
      }
    }
    group.add(addBox([4.05, 0.12, 2.1], [4.9, roofY + 2.32, -0.95], warmMetalMaterial));
    for (let slat = 0; slat < 6; slat += 1) {
      group.add(
        addBox([0.12, 0.2, 2.1], [3.1 + slat * 0.72, roofY + 2.35, -0.95], warmMetalMaterial),
      );
    }

    group.add(addBox([3.5, 2.15, 2.2], [0, roofY + 1.22, -2.05], stoneMaterial));
    for (const x of [-7.1, -2.4, 2.4, 7.1]) {
      group.add(addBox([1.15, 0.75, 1.15], [x, roofY + 0.48, 2.5], planterMaterial));
      const shrub = new THREE.Mesh(track(new THREE.IcosahedronGeometry(0.55, 1)), foliageMaterial);
      shrub.position.set(x, roofY + 1.1, 2.5);
      shrub.castShadow = true;
      group.add(shrub);
    }

    const rooftopLabel = makeTextTexture(
      project.name.toUpperCase(),
      "#f8f4ec",
      "rgba(35,43,44,0.68)",
      58,
    );
    disposables.push({ dispose: rooftopLabel.dispose });
    const rooftopSign = new THREE.Mesh(
      track(new THREE.PlaneGeometry(5.2, 0.92)),
      track(
        new THREE.MeshBasicMaterial({
          map: rooftopLabel.texture,
          transparent: true,
          depthWrite: false,
        }),
      ),
    );
    rooftopSign.position.set(0, roofY + 0.42, BUILDING_DEPTH / 2 + 0.46);
    group.add(rooftopSign);

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
      return raycaster.intersectObjects(pickables, false)[0]?.object as THREE.Mesh | undefined;
    };

    const onPointerMove = (event: PointerEvent) => {
      const hit = pick(event.clientX, event.clientY);
      const entry = hit ? unitMeshes.find((item) => item.mesh === hit) : undefined;
      const code = entry?.unit.code ?? null;
      if (code === hoverRef.current) return;
      hoverRef.current = code;
      renderer.domElement.style.cursor = code ? "pointer" : "grab";
      setHover(entry?.unit ?? null);
      refreshRef.current();
    };

    const onPointerDown = (event: PointerEvent) => {
      downAt = { x: event.clientX, y: event.clientY };
      controls.autoRotate = false;
      focusRef.current = null;
    };

    const onPointerUp = (event: PointerEvent) => {
      const start = downAt;
      downAt = null;
      if (!start || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 6) return;
      const hit = pick(event.clientX, event.clientY);
      const entry = hit ? unitMeshes.find((item) => item.mesh === hit) : undefined;
      onSelectRef.current?.(entry?.unit ?? null);
    };

    const onPointerLeave = () => {
      hoverRef.current = null;
      setHover(null);
      refreshRef.current();
      renderer.domElement.style.cursor = "grab";
    };

    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("pointerleave", onPointerLeave);

    const desiredTarget = new THREE.Vector3();
    const desiredPosition = new THREE.Vector3();
    let frame = 0;

    const animate = () => {
      const focus = focusRef.current;
      if (focus === "overview") {
        desiredTarget.set(0, buildingCenterY, 0);
        desiredPosition.copy(overviewPosition);
      } else if (focus != null) {
        const selectedLevel = levels.findIndex((level) => level === focus);
        const y = levelY(focus) + FLOOR_HEIGHT / 2;
        desiredTarget.set(0, y, 0);
        desiredPosition.set(14, y + 5.5, 22);
        if (selectedLevel < 0) focusRef.current = null;
      }

      if (focus != null) {
        controls.target.lerp(desiredTarget, 0.085);
        camera.position.lerp(desiredPosition, 0.085);
        if (camera.position.distanceTo(desiredPosition) < 0.25) {
          focusRef.current = null;
          controls.autoRotate = true;
        }
      }

      controls.update();
      renderer.render(scene, camera);
      frame = requestAnimationFrame(animate);
    };

    const resize = () => {
      const nextWidth = mount.clientWidth;
      const nextHeight = mount.clientHeight;
      if (!nextWidth || !nextHeight) return;
      renderer.setSize(nextWidth, nextHeight, false);
      camera.aspect = nextWidth / nextHeight;
      camera.updateProjectionMatrix();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    meshesRef.current = unitMeshes;
    refreshRef.current();
    frame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointerleave", onPointerLeave);
      controls.dispose();
      for (const item of disposables) item.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === mount) mount.removeChild(renderer.domElement);
      meshesRef.current = [];
      setHover(null);
    };
  }, [levels, project.name, units]);

  return (
    <div className={cn("relative h-full min-h-0 w-full overflow-hidden", className)}>
      <div ref={mountRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/25 to-transparent" />

      <div className="pointer-events-auto absolute left-4 top-4 max-w-[340px] rounded-xl border border-white/20 bg-[#263233]/75 px-4 py-3 text-white shadow-panel backdrop-blur-md">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">
              <Layers3 className="size-3.5" /> Masterplan arquitectónico
            </div>
            <p className="text-base font-medium leading-tight">{project.name}</p>
          </div>
          <button
            type="button"
            aria-label="Volver a la vista general"
            onClick={() => {
              focusRef.current = "overview";
            }}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1.5 text-[10px] font-medium text-white/80 transition-colors hover:bg-white/15 hover:text-white"
          >
            <RotateCcw className="size-3.5" />
            <span className="hidden sm:inline">Vista general</span>
          </button>
        </div>
        <p className="mt-1 text-[11px] text-white/60">
          {project.address} · {project.city}
        </p>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5 border-t border-white/10 pt-2 text-[10px] text-white/75">
          {(Object.keys(STATUS_COLOR) as Unit["status"][]).map((status) => (
            <span key={status} className="flex items-center gap-1.5">
              <span
                className="size-2 rounded-full"
                style={{
                  backgroundColor: `#${STATUS_COLOR[status].toString(16).padStart(6, "0")}`,
                }}
              />
              {STATUS_LABEL[status]}
            </span>
          ))}
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-[10px] text-white/45">
          <Box className="size-3.5" /> Arrastrá para girar · rueda para zoom
        </p>
      </div>

      {hover && (
        <div className="pointer-events-none absolute right-4 top-4 rounded-full border border-white/20 bg-[#263233]/75 px-4 py-2 text-xs font-medium text-white shadow-panel backdrop-blur-md lg:left-1/2 lg:right-auto lg:-translate-x-1/2">
          <span className="mr-2 text-white/55">Unidad</span>
          {hover.number} · {hover.typology}
          <span className="mx-2 text-white/30">|</span>
          {STATUS_LABEL[hover.status]}
        </div>
      )}

      <div className="absolute left-4 top-44 flex max-h-[30vh] flex-col gap-1 overflow-y-auto rounded-xl border border-white/20 bg-[#263233]/70 p-1.5 shadow-panel backdrop-blur-md lg:bottom-4 lg:top-auto lg:max-h-[38vh]">
        {[...levels].reverse().map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => {
              focusRef.current = level;
            }}
            className="flex items-center justify-between gap-4 rounded-lg px-3 py-1.5 text-left text-[11px] font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <span>Piso {level}</span>
            <span className="text-white/35">
              {units.filter((unit) => unit.floor === level).length}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function makeTextTexture(text: string, color: string, background: string, fontSize: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (!context) return { texture: new THREE.Texture(), dispose: () => undefined };

  if (!background.includes(",0)")) {
    context.fillStyle = background;
    context.beginPath();
    context.roundRect(16, 28, 736, 200, 46);
    context.fill();
  }

  context.fillStyle = color;
  context.font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, canvas.width / 2, canvas.height / 2 + 4, 680);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return { texture, dispose: () => texture.dispose() };
}
