import * as THREE from "three";

import { hashCode, mulberry32, pick } from "@/lib/random";

import type { VirtualTourSceneKind } from "./types";

type WallKey = "front" | "back" | "left" | "right";
type OpeningKind = "door" | "slider" | "window";

interface Opening {
  /** Distancia al centro de la pared, en metros. */
  center: number;
  width: number;
  bottom: number;
  top: number;
  kind: OpeningKind;
}

interface RoomSize {
  width: number;
  depth: number;
  height: number;
}

const ROOM_SIZE: Record<VirtualTourSceneKind, RoomSize> = {
  living: { width: 5.2, depth: 4.4, height: 2.7 },
  kitchen: { width: 3.4, depth: 2.9, height: 2.6 },
  bedroom: { width: 3.9, depth: 3.5, height: 2.6 },
  bath: { width: 2.5, depth: 2.2, height: 2.4 },
  balcony: { width: 3.8, depth: 1.8, height: 2.5 },
};

interface InteriorPalette {
  wall: string;
  wallAccent: string;
  ceiling: string;
  floor: string;
  floorDark: string;
  tiled: boolean;
  skirting: string;
  wood: string;
  woodDark: string;
  stone: string;
  fabric: string;
  fabricAlt: string;
  accent: string;
  greenery: string;
}

const INTERIOR: Record<VirtualTourSceneKind, InteriorPalette> = {
  living: {
    wall: "#ece5dc",
    wallAccent: "#d9cfbf",
    ceiling: "#f8f6f2",
    floor: "#b9885a",
    floorDark: "#8a613c",
    tiled: false,
    skirting: "#fbf9f5",
    wood: "#8d6440",
    woodDark: "#5f4429",
    stone: "#d9d3c9",
    fabric: "#9aa7ad",
    fabricAlt: "#c3b4a0",
    accent: "#7d5a4f",
    greenery: "#5d7f52",
  },
  kitchen: {
    wall: "#e8e6e0",
    wallAccent: "#cfd4d2",
    ceiling: "#f7f7f4",
    floor: "#b8b2a6",
    floorDark: "#8d877c",
    tiled: true,
    skirting: "#f3f2ee",
    wood: "#7c6a52",
    woodDark: "#54462f",
    stone: "#2f3335",
    fabric: "#a9b0ae",
    fabricAlt: "#d0ccc2",
    accent: "#3f5d55",
    greenery: "#5f8354",
  },
  bedroom: {
    wall: "#e7e0d6",
    wallAccent: "#cfc3b4",
    ceiling: "#f8f5f0",
    floor: "#ad8054",
    floorDark: "#835b38",
    tiled: false,
    skirting: "#fbf8f3",
    wood: "#8b6a45",
    woodDark: "#5c442c",
    stone: "#ddd7cd",
    fabric: "#b9a894",
    fabricAlt: "#8f9ba3",
    accent: "#6b5b73",
    greenery: "#5b7d51",
  },
  bath: {
    wall: "#dfe6e6",
    wallAccent: "#c3cfd0",
    ceiling: "#f6f8f7",
    floor: "#cfcac1",
    floorDark: "#a29c92",
    tiled: true,
    skirting: "#f4f7f7",
    wood: "#9a7a52",
    woodDark: "#6a5136",
    stone: "#eef1f0",
    fabric: "#d7d2c6",
    fabricAlt: "#7fa39a",
    accent: "#41716a",
    greenery: "#5d8a5c",
  },
  balcony: {
    wall: "#e4ded4",
    wallAccent: "#cfc7ba",
    ceiling: "#eeeae3",
    floor: "#a9a296",
    floorDark: "#837c70",
    tiled: true,
    skirting: "#f2eee7",
    wood: "#8a6a48",
    woodDark: "#5b452e",
    stone: "#c9c3b8",
    fabric: "#9fa89f",
    fabricAlt: "#c6b79f",
    accent: "#6f7f6a",
    greenery: "#4f7c46",
  },
};

export interface RoomScene {
  group: THREE.Group;
  dispose: () => void;
}

export interface RoomOptions {
  kind: VirtualTourSceneKind;
  seed: number;
  /** Yaw (grados) de cada puerta de salida, según los hotspots de la escena. */
  exits: number[];
}

const WALL_THICKNESS = 0.14;
const DOOR_WIDTH = 0.95;
const DOOR_TOP = 2.05;

export function buildRoom({ kind, seed, exits }: RoomOptions): RoomScene {
  const size = ROOM_SIZE[kind];
  const halfW = size.width / 2;
  const halfD = size.depth / 2;
  const height = size.height;
  const rand = mulberry32((hashCode(kind) ^ Math.imul(seed, 2654435761)) >>> 0);

  const group = new THREE.Group();
  const palette = INTERIOR[kind];
  const mat = createMaterials(palette, rand);
  const cityTexture = createCityTexture(rand);

  const openings = createOpenings(kind, exits, halfW, halfD, height);
  const byWall: Record<WallKey, Opening[]> = { front: [], back: [], left: [], right: [] };
  for (const entry of openings) byWall[entry.wall].push(entry.opening);

  const floorTexture = palette.tiled
    ? createTileTexture(rand, palette)
    : createPlankTexture(rand, palette);
  floorTexture.wrapS = THREE.RepeatWrapping;
  floorTexture.wrapT = THREE.RepeatWrapping;
  const floorMaterial = new THREE.MeshStandardMaterial({
    map: floorTexture,
    roughness: 0.55,
    metalness: 0,
  });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(size.width, size.depth), floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);

  if (kind !== "balcony") {
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(size.width, size.depth), mat.ceiling);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = height;
    ceiling.receiveShadow = true;
    group.add(ceiling);
  }

  for (const opening of wallSpecs(halfW, halfD, height, byWall)) {
    const wall = buildWall(opening, mat, kind, height);
    group.add(wall);
  }

  if (kind === "balcony") {
    buildRailing(group, size, mat);
    buildPergola(group, size, mat);
  }

  addCove(group, size, height, mat.skirting);
  addCeilingLight(group, size, height, mat);

  const backdrop = new THREE.Mesh(
    new THREE.CylinderGeometry(
      kind === "balcony" ? 13 : 20,
      kind === "balcony" ? 13 : 20,
      26,
      40,
      1,
      true,
    ),
    new THREE.MeshBasicMaterial({ map: cityTexture, side: THREE.BackSide, fog: false }),
  );
  backdrop.position.y = 5;
  group.add(backdrop);

  addSun(group, kind === "balcony" ? 1.5 : 2.3);
  addAmbient(group);

  buildFurniture(group, kind, size, mat, rand);

  return {
    group,
    dispose() {
      group.traverse((object) => {
        const mesh = object as THREE.Mesh;
        mesh.geometry?.dispose();
        const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(material)) material.forEach((item) => item.dispose());
        else material?.dispose();
      });
      floorTexture.dispose();
      cityTexture.dispose();
    },
  };
}

interface RoomMaterials {
  wall: THREE.MeshStandardMaterial;
  wallAccent: THREE.MeshStandardMaterial;
  ceiling: THREE.MeshStandardMaterial;
  skirting: THREE.MeshStandardMaterial;
  wood: THREE.MeshStandardMaterial;
  woodDark: THREE.MeshStandardMaterial;
  stone: THREE.MeshStandardMaterial;
  fabric: THREE.MeshStandardMaterial;
  fabricAlt: THREE.MeshStandardMaterial;
  accent: THREE.MeshStandardMaterial;
  greenery: THREE.MeshStandardMaterial;
  metal: THREE.MeshStandardMaterial;
  darkMetal: THREE.MeshStandardMaterial;
  glass: THREE.MeshStandardMaterial;
  mirror: THREE.MeshStandardMaterial;
  lamp: THREE.MeshStandardMaterial;
  artwork: THREE.MeshStandardMaterial;
}

function createMaterials(palette: InteriorPalette, rand: () => number): RoomMaterials {
  return {
    wall: new THREE.MeshStandardMaterial({ color: palette.wall, roughness: 0.94 }),
    wallAccent: new THREE.MeshStandardMaterial({ color: palette.wallAccent, roughness: 0.92 }),
    ceiling: new THREE.MeshStandardMaterial({ color: palette.ceiling, roughness: 0.98 }),
    skirting: new THREE.MeshStandardMaterial({ color: palette.skirting, roughness: 0.7 }),
    wood: new THREE.MeshStandardMaterial({ color: palette.wood, roughness: 0.62 }),
    woodDark: new THREE.MeshStandardMaterial({ color: palette.woodDark, roughness: 0.55 }),
    stone: new THREE.MeshStandardMaterial({
      color: palette.stone,
      roughness: 0.35,
      metalness: 0.05,
    }),
    fabric: new THREE.MeshStandardMaterial({ color: palette.fabric, roughness: 0.96 }),
    fabricAlt: new THREE.MeshStandardMaterial({ color: palette.fabricAlt, roughness: 0.96 }),
    accent: new THREE.MeshStandardMaterial({
      color: pick(rand, [palette.accent, "#3f5d72", "#7a4f42"]),
      roughness: 0.8,
    }),
    greenery: new THREE.MeshStandardMaterial({ color: palette.greenery, roughness: 0.88 }),
    metal: new THREE.MeshStandardMaterial({ color: "#c3c7cb", roughness: 0.28, metalness: 0.85 }),
    darkMetal: new THREE.MeshStandardMaterial({ color: "#4a4e53", roughness: 0.4, metalness: 0.7 }),
    glass: new THREE.MeshStandardMaterial({
      color: "#dceaf2",
      roughness: 0.06,
      metalness: 0.1,
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
    mirror: new THREE.MeshStandardMaterial({ color: "#c9d6dc", roughness: 0.04, metalness: 1 }),
    lamp: new THREE.MeshStandardMaterial({
      color: "#fff0d2",
      emissive: new THREE.Color("#ffdfa8"),
      emissiveIntensity: 1.5,
      roughness: 0.6,
    }),
    artwork: new THREE.MeshStandardMaterial({
      color: pick(rand, ["#c8b39a", "#9fb0b8", "#b9a2a6"]),
      roughness: 0.85,
    }),
  };
}

function createOpenings(
  kind: VirtualTourSceneKind,
  exits: number[],
  halfW: number,
  halfD: number,
  height: number,
): { wall: WallKey; opening: Opening }[] {
  const entries: { wall: WallKey; opening: Opening }[] = [];
  const used: Record<WallKey, number> = { front: 0, back: 0, left: 0, right: 0 };

  for (const yaw of exits) {
    const hit = wallHit(yaw, halfW, halfD);
    const wide = kind !== "kitchen" && kind !== "bath";
    const width = wide ? DOOR_WIDTH + 0.35 : DOOR_WIDTH;
    const isFront = hit.wall === "front" || hit.wall === "back";
    const opening: Opening = {
      center: clampCenter(hit.center, (isFront ? halfW : halfD) * 2, width),
      width,
      bottom: 0,
      top: Math.min(DOOR_TOP, height - 0.15),
      kind: isFront && wide ? "slider" : "door",
    };
    entries.push({ wall: hit.wall, opening });
    used[hit.wall] += 1;
  }

  const windowFor: Record<VirtualTourSceneKind, { width: number; bottom: number; top: number }> = {
    living: { width: 2.7, bottom: 0.42, top: height - 0.32 },
    kitchen: { width: 1.35, bottom: 0.95, top: height - 0.42 },
    bedroom: { width: 1.5, bottom: 0.8, top: height - 0.4 },
    bath: { width: 0.72, bottom: 1.25, top: height - 0.45 },
    balcony: { width: 1.2, bottom: 0.95, top: height - 0.4 },
  };

  for (const wall of ["front", "left", "right", "back"] as WallKey[]) {
    if (used[wall] > 0) continue;
    if (wall === "back" && used.front === 0) continue;
    const span = (wall === "front" || wall === "back" ? halfW : halfD) * 2;
    const spec = windowFor[kind];
    const width = Math.min(spec.width, span - 0.8);
    entries.push({
      wall,
      opening: { center: 0, width, bottom: spec.bottom, top: spec.top, kind: "window" },
    });
  }

  return entries;
}

function wallHit(yaw: number, halfW: number, halfD: number) {
  const rad = (yaw * Math.PI) / 180;
  const dirX = -Math.sin(rad);
  const dirZ = -Math.cos(rad);
  if (Math.abs(dirX) >= Math.abs(dirZ)) {
    const positive = dirX >= 0;
    const t = halfW / Math.max(0.0001, Math.abs(dirX));
    const z = dirZ * t;
    return {
      wall: (positive ? "right" : "left") as WallKey,
      center: positive ? z : -z,
    };
  }
  const positive = dirZ >= 0;
  const t = halfD / Math.max(0.0001, Math.abs(dirZ));
  const x = dirX * t;
  return { wall: (positive ? "back" : "front") as WallKey, center: positive ? -x : x };
}

function clampCenter(center: number, span: number, width: number) {
  const limit = Math.max(0, span / 2 - width / 2 - 0.12);
  return Math.max(-limit, Math.min(limit, center));
}

interface WallSpec {
  key: WallKey;
  x: number;
  z: number;
  rotation: number;
  length: number;
  openings: Opening[];
}

function wallSpecs(
  halfW: number,
  halfD: number,
  height: number,
  byWall: Record<WallKey, Opening[]>,
): WallSpec[] {
  const keys: WallKey[] = ["front", "back", "left", "right"];
  return keys.map((key) => {
    const isX = key === "front" || key === "back";
    const positive = key === "back" || key === "right";
    return {
      key,
      x: positive ? halfW : -halfW,
      z: positive ? halfD : -halfD,
      rotation:
        key === "front" ? 0 : key === "back" ? Math.PI : positive ? -Math.PI / 2 : Math.PI / 2,
      length: (isX ? halfW : halfD) * 2,
      openings: byWall[key],
    };
  });
}

function buildWall(
  spec: WallSpec,
  mat: RoomMaterials,
  kind: VirtualTourSceneKind,
  height: number,
): THREE.Group {
  const group = new THREE.Group();
  group.position.set(spec.x, 0, spec.z);
  group.rotation.y = spec.rotation;

  for (const [start, end] of freeSpans(spec.length, spec.openings)) {
    const panel = box(end - start, height, WALL_THICKNESS, mat.wall);
    panel.position.set((start + end) / 2, height / 2, 0);
    group.add(panel);
  }

  for (const opening of spec.openings) {
    const left = opening.center - opening.width / 2;
    const right = opening.center + opening.width / 2;
    if (opening.bottom > 0.01) {
      const sill = box(opening.width, opening.bottom, WALL_THICKNESS, mat.wall);
      sill.position.set(opening.center, opening.bottom / 2, 0);
      group.add(sill);
    }
    if (opening.top < height - 0.01) {
      const header = box(opening.width, height - opening.top, WALL_THICKNESS, mat.wall);
      header.position.set(opening.center, (height + opening.top) / 2, 0);
      group.add(header);
    }
    group.add(buildOpeningDetail(opening, mat, kind, height));
  }

  for (const [start, end] of freeSpans(spec.length, spec.openings)) {
    const base = box(end - start, 0.1, 0.04, mat.skirting);
    base.position.set((start + end) / 2, 0.05, WALL_THICKNESS / 2 + 0.01);
    group.add(base);
  }

  if (spec.key === "front" || spec.key === "back") {
    const crown = box(spec.length, 0.06, 0.05, mat.skirting);
    crown.position.set(0, height - 0.05, WALL_THICKNESS / 2 + 0.01);
    group.add(crown);
  }

  return group;
}

function buildOpeningDetail(
  opening: Opening,
  mat: RoomMaterials,
  kind: VirtualTourSceneKind,
  height: number,
): THREE.Group {
  const group = new THREE.Group();
  const frameMaterial = mat.skirting;
  const left = opening.center - opening.width / 2;
  const right = opening.center + opening.width / 2;
  const frameDepth = 0.08;

  for (const x of [left + 0.03, right - 0.03]) {
    const side = box(0.06, opening.top - opening.bottom, frameDepth, frameMaterial);
    side.position.set(x, (opening.top + opening.bottom) / 2, 0);
    group.add(side);
  }
  const lintel = box(opening.width, 0.06, frameDepth, frameMaterial);
  lintel.position.set(opening.center, opening.top - 0.03, 0);
  group.add(lintel);

  if (opening.kind === "window" || opening.kind === "slider") {
    const glassHeight = opening.top - opening.bottom;
    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(opening.width - 0.1, glassHeight - 0.06),
      mat.glass,
    );
    glass.position.set(opening.center, (opening.top + opening.bottom) / 2, 0);
    group.add(glass);

    const mullionCount = opening.width > 1.6 ? 2 : 1;
    for (let i = 1; i <= mullionCount; i++) {
      const mullion = box(0.05, glassHeight, frameDepth, frameMaterial);
      mullion.position.set(
        left + (opening.width / (mullionCount + 1)) * i,
        opening.top - glassHeight / 2,
        0,
      );
      group.add(mullion);
    }
    if (opening.kind === "window") {
      const sill = box(opening.width + 0.1, 0.05, 0.16, mat.stone);
      sill.position.set(opening.center, opening.bottom - 0.02, 0.04);
      group.add(sill);
    }
    return group;
  }

  const hallWidth = opening.width;
  const hallDepth = 1.5;
  const hallMaterial = new THREE.MeshStandardMaterial({ color: "#c9c1b4", roughness: 0.95 });
  const back = box(hallWidth, opening.top, 0.1, hallMaterial);
  back.position.set(opening.center, opening.top / 2, -hallDepth);
  group.add(back);
  for (const x of [left - 0.05, right + 0.05]) {
    const side = box(0.1, opening.top, hallDepth, hallMaterial);
    side.position.set(x, opening.top / 2, -hallDepth / 2);
    group.add(side);
  }
  const hallCeiling = box(hallWidth, 0.1, hallDepth, hallMaterial);
  hallCeiling.position.set(opening.center, opening.top + 0.05, -hallDepth / 2);
  group.add(hallCeiling);

  if (kind !== "bath" && kind !== "kitchen") {
    const hallLight = new THREE.PointLight(0xffd9a5, 5, 3.4, 2);
    hallLight.position.set(opening.center, opening.top - 0.35, -0.7);
    group.add(hallLight);
  }

  return group;
}

function freeSpans(length: number, openings: Opening[]): [number, number][] {
  const sorted = [...openings].sort((a, b) => a.center - b.center);
  const spans: [number, number][] = [];
  let cursor = -length / 2;
  for (const opening of sorted) {
    const start = Math.max(-length / 2, opening.center - opening.width / 2);
    const end = Math.min(length / 2, opening.center + opening.width / 2);
    if (start - cursor > 0.01) spans.push([cursor, start]);
    cursor = Math.max(cursor, end);
  }
  if (length / 2 - cursor > 0.01) spans.push([cursor, length / 2]);
  return spans;
}

function addCove(group: THREE.Group, size: RoomSize, height: number, material: THREE.Material) {
  for (const z of [-size.depth / 2 + 0.06, size.depth / 2 - 0.06]) {
    const cove = box(size.width, 0.09, 0.09, material);
    cove.position.set(0, height - 0.09, z);
    group.add(cove);
  }
  for (const x of [-size.width / 2 + 0.06, size.width / 2 - 0.06]) {
    const cove = box(0.09, 0.09, size.depth, material);
    cove.position.set(x, height - 0.09, 0);
    group.add(cove);
  }
}

function addCeilingLight(group: THREE.Group, size: RoomSize, height: number, mat: RoomMaterials) {
  const plate = new THREE.Mesh(new THREE.CircleGeometry(0.19, 32), mat.skirting);
  plate.rotation.x = Math.PI / 2;
  plate.position.set(0, height - 0.015, 0);
  group.add(plate);

  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.15, 32), mat.lamp);
  disc.rotation.x = Math.PI / 2;
  disc.position.set(0, height - 0.03, 0);
  group.add(disc);

  const light = new THREE.PointLight(0xffe0b4, 9, Math.max(size.width, size.depth) * 1.7, 2);
  light.position.set(0, height - 0.25, 0);
  group.add(light);
}

function addSun(group: THREE.Group, intensity: number) {
  const sun = new THREE.DirectionalLight(0xfff1dc, intensity);
  sun.position.set(2.6, 4.4, -7);
  sun.target.position.set(0, 0.6, 1.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 22;
  sun.shadow.camera.left = -6;
  sun.shadow.camera.right = 6;
  sun.shadow.camera.top = 6;
  sun.shadow.camera.bottom = -6;
  sun.shadow.bias = -0.0009;
  sun.shadow.normalBias = 0.02;
  group.add(sun);
  group.add(sun.target);

  const sky = new THREE.HemisphereLight(0xdcebf7, 0x8d7c68, 0.75);
  group.add(sky);

  const bounce = new THREE.DirectionalLight(0xdce7f2, 0.35);
  bounce.position.set(-3, 2.4, 3.5);
  group.add(bounce);
}

function addAmbient(group: THREE.Group) {
  group.add(new THREE.AmbientLight(0xffffff, 0.22));
}

function buildFurniture(
  group: THREE.Group,
  kind: VirtualTourSceneKind,
  size: RoomSize,
  mat: RoomMaterials,
  rand: () => number,
) {
  const halfW = size.width / 2;
  const halfD = size.depth / 2;

  if (kind === "living") {
    addRug(group, 1.5, 0, 0.15, mat.fabricAlt);
    addSofa(group, -halfW + 0.75, 0.05, Math.PI / 2, mat);
    addCoffeeTable(group, 0.1, -0.25, mat);
    addArmchair(group, halfW - 0.75, -0.85, -1.15, mat);
    addMediaWall(group, halfW - 0.14, 0.55, mat);
    addFloorLamp(group, -halfW + 0.35, halfD - 0.7, mat);
    addPlant(group, halfW - 0.55, -halfD + 0.6, 1.15, mat);
    addArtwork(group, 0, halfD - 0.09, 1.62, 1.15, 0.78, mat, 0);
    addPendant(group, 0.1, -0.25, 2.05, mat);
    addCurtains(group, size);
  } else if (kind === "kitchen") {
    addKitchenRun(group, size, mat);
    addKitchenIsland(group, size, mat);
    addFridge(group, halfW - 0.36, halfD - 0.45, mat);
    addPlant(group, -halfW + 0.5, -halfD + 0.5, 0.85, mat);
    addArtwork(group, 0, halfD - 0.09, 1.95, 0.8, 0.6, mat, 0);
  } else if (kind === "bedroom") {
    addRug(group, 1.6, 0.25, -0.1, mat.fabricAlt);
    addBed(group, 0.55, mat);
    addNightstand(group, -1.05, 1.42, mat, true);
    addNightstand(group, 1.05, 1.42, mat, false);
    addWardrobe(group, -halfW + 0.32, -0.45, mat);
    addBench(group, -0.75, mat);
    addPlant(group, halfW - 0.45, -halfD + 0.5, 0.95, mat);
    addArtwork(group, halfW - 0.09, 0.2, 1.65, 0.62, 0.85, mat, Math.PI / 2);
  } else if (kind === "bath") {
    addVanity(group, halfW - 0.26, 0, mat);
    addBathtub(group, -halfW + 0.42, 0.15, mat);
    addShower(group, halfW - 0.55, halfD - 0.55, mat);
    addTowelRail(group, 0, halfD - 0.12, mat);
    addPlant(group, -halfW + 0.35, -halfD + 0.4, 0.5, mat);
  } else {
    addBalconyDeck(group, size, mat);
    addLoungeChair(group, -halfW + 0.8, -0.35, -Math.PI / 2, mat);
    addLoungeChair(group, -halfW + 0.8, 0.45, -Math.PI / 2, mat);
    addBistroTable(group, 0.6, 0.05, mat);
    addPlanter(group, halfW - 0.45, -halfD + 0.35, mat);
    addPendant(group, 0, 0, 2.15, mat);
  }

  void rand;
}

function addRug(
  group: THREE.Group,
  radius: number,
  x: number,
  z: number,
  material: THREE.Material,
) {
  const rug = new THREE.Mesh(new THREE.CircleGeometry(radius, 48), material);
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(x, 0.012, z);
  rug.receiveShadow = true;
  group.add(rug);
  const border = new THREE.Mesh(
    new THREE.RingGeometry(radius - 0.1, radius, 48),
    new THREE.MeshStandardMaterial({ color: "#a79880", roughness: 0.95 }),
  );
  border.rotation.x = -Math.PI / 2;
  border.position.set(x, 0.016, z);
  group.add(border);
}

function addSofa(group: THREE.Group, x: number, z: number, rotation: number, mat: RoomMaterials) {
  const sofa = new THREE.Group();
  for (const [lx, lz] of pairs([-0.9, -0.35], [0.9, -0.35], [-0.9, 0.35], [0.9, 0.35])) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.02, 0.16, 10), mat.woodDark);
    leg.position.set(lx, 0.08, lz);
    leg.castShadow = true;
    sofa.add(leg);
  }
  const base = box(2.0, 0.3, 0.92, mat.fabric);
  base.position.set(0, 0.31, 0);
  sofa.add(base);
  for (const sx of [-0.48, 0.48]) {
    const cushion = box(0.9, 0.15, 0.8, mat.fabric);
    cushion.position.set(sx, 0.53, 0.04);
    sofa.add(cushion);
  }
  const back = box(2.0, 0.66, 0.2, mat.fabric);
  back.position.set(0, 0.72, -0.36);
  sofa.add(back);
  for (const sx of [-0.48, 0.48]) {
    const pillow = box(0.42, 0.42, 0.14, mat.fabricAlt);
    pillow.position.set(sx, 0.86, -0.24);
    pillow.rotation.z = sx > 0 ? 0.12 : -0.12;
    sofa.add(pillow);
  }
  for (const sx of [-0.92, 0.92]) {
    const arm = box(0.16, 0.36, 0.92, mat.fabric);
    arm.position.set(sx, 0.66, 0);
    sofa.add(arm);
  }
  sofa.position.set(x, 0, z);
  sofa.rotation.y = rotation;
  group.add(sofa);
}

function addCoffeeTable(group: THREE.Group, x: number, z: number, mat: RoomMaterials) {
  const table = new THREE.Group();
  const top = box(1.1, 0.06, 0.6, mat.wood);
  top.position.y = 0.4;
  table.add(top);
  for (const [lx, lz] of pairs([-0.48, -0.24], [0.48, -0.24], [-0.48, 0.24], [0.48, 0.24])) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.018, 0.4, 10), mat.darkMetal);
    leg.position.set(lx, 0.2, lz);
    leg.castShadow = true;
    table.add(leg);
  }
  const bowl = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 18, 12, 0, Math.PI * 2, 0, 1.1),
    mat.accent,
  );
  bowl.position.set(0.1, 0.46, 0);
  bowl.rotation.x = Math.PI;
  bowl.castShadow = true;
  table.add(bowl);
  table.position.set(x, 0, z);
  group.add(table);
}

function addArmchair(
  group: THREE.Group,
  x: number,
  z: number,
  rotation: number,
  mat: RoomMaterials,
) {
  const chair = new THREE.Group();
  for (const [lx, lz] of pairs([-0.3, -0.28], [0.3, -0.28], [-0.3, 0.28], [0.3, 0.28])) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.016, 0.34, 8), mat.woodDark);
    leg.position.set(lx, 0.17, lz);
    chair.add(leg);
  }
  const seat = box(0.76, 0.18, 0.72, mat.fabricAlt);
  seat.position.y = 0.42;
  chair.add(seat);
  const back = box(0.76, 0.6, 0.14, mat.fabricAlt);
  back.position.set(0, 0.72, -0.3);
  back.rotation.x = -0.12;
  chair.add(back);
  chair.position.set(x, 0, z);
  chair.rotation.y = rotation;
  group.add(chair);
}

function addMediaWall(group: THREE.Group, x: number, z: number, mat: RoomMaterials) {
  const console_ = box(0.42, 0.44, 1.9, mat.woodDark);
  console_.position.set(x, 0.24, z);
  group.add(console_);
  const drawerGap = box(0.44, 0.02, 1.86, mat.darkMetal);
  drawerGap.position.set(x, 0.34, z);
  group.add(drawerGap);
  const screen = box(0.05, 0.72, 1.26, mat.darkMetal);
  screen.position.set(x + 0.12, 1.12, z);
  group.add(screen);
  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(1.18, 0.64),
    new THREE.MeshStandardMaterial({
      color: "#14181d",
      roughness: 0.18,
      metalness: 0.3,
      emissive: new THREE.Color("#0b1016"),
      emissiveIntensity: 0.6,
    }),
  );
  panel.rotation.y = Math.PI / 2;
  panel.position.set(x + 0.15, 1.12, z);
  group.add(panel);
}

function addFloorLamp(group: THREE.Group, x: number, z: number, mat: RoomMaterials) {
  const lamp = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.03, 20), mat.darkMetal);
  base.position.y = 0.015;
  lamp.add(base);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 1.45, 10), mat.darkMetal);
  pole.position.y = 0.74;
  pole.castShadow = true;
  lamp.add(pole);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.26, 24, 1, true), mat.lamp);
  shade.position.y = 1.53;
  shade.castShadow = true;
  lamp.add(shade);
  const light = new THREE.PointLight(0xffdcac, 6, 4.5, 2);
  light.position.y = 1.42;
  lamp.add(light);
  lamp.position.set(x, 0, z);
  group.add(lamp);
}

function addPlant(group: THREE.Group, x: number, z: number, scale: number, mat: RoomMaterials) {
  const plant = new THREE.Group();
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.15, 0.3, 20), mat.stone);
  pot.position.y = 0.15;
  pot.castShadow = true;
  plant.add(pot);
  const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.02, 20), mat.woodDark);
  soil.position.y = 0.3;
  plant.add(soil);
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), mat.greenery);
    leaf.scale.set(1, 0.55, 0.5);
    leaf.position.set(Math.cos(angle) * 0.13, 0.44 + (i % 2) * 0.12, Math.sin(angle) * 0.13);
    leaf.rotation.z = Math.cos(angle) * 0.5;
    leaf.castShadow = true;
    plant.add(leaf);
  }
  plant.position.set(x, 0, z);
  plant.scale.setScalar(scale);
  group.add(plant);
}

function addArtwork(
  group: THREE.Group,
  x: number,
  z: number,
  y: number,
  width: number,
  height: number,
  mat: RoomMaterials,
  rotation: number,
) {
  const art = new THREE.Group();
  const frame = box(width, height, 0.05, mat.woodDark);
  art.add(frame);
  const canvasPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(width - 0.1, height - 0.1),
    mat.artwork,
  );
  canvasPlane.position.z = 0.03;
  art.add(canvasPlane);
  const shape = new THREE.Mesh(
    new THREE.CircleGeometry(Math.min(width, height) * 0.22, 24),
    mat.accent,
  );
  shape.position.set(width * 0.12, height * 0.08, 0.035);
  art.add(shape);
  art.position.set(x, y, z);
  art.rotation.y = rotation;
  group.add(art);
}

function addPendant(group: THREE.Group, x: number, z: number, y: number, mat: RoomMaterials) {
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.5, 6), mat.darkMetal);
  cord.position.set(x, y + 0.25, z);
  group.add(cord);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.22, 24, 1, true), mat.lamp);
  shade.position.set(x, y, z);
  shade.castShadow = true;
  group.add(shade);
  const light = new THREE.PointLight(0xffe1b8, 5, 3.6, 2);
  light.position.set(x, y - 0.12, z);
  group.add(light);
}

function addCurtains(group: THREE.Group, size: RoomSize) {
  const fabric = new THREE.MeshStandardMaterial({ color: "#efe7da", roughness: 0.98 });
  for (const side of [-1, 1]) {
    const curtain = box(0.3, size.height - 0.12, 0.1, fabric);
    curtain.position.set(
      side * (size.width / 2 - 0.42),
      (size.height - 0.12) / 2,
      -size.depth / 2 + 0.16,
    );
    group.add(curtain);
  }
}

function addKitchenRun(group: THREE.Group, size: RoomSize, mat: RoomMaterials) {
  const halfD = size.depth / 2;
  const halfW = size.width / 2;
  const backRun = box(size.width - 0.5, 0.86, 0.62, mat.wood);
  backRun.position.set(0.1, 0.43, halfD - 0.31);
  group.add(backRun);
  const backTop = box(size.width - 0.44, 0.05, 0.66, mat.stone);
  backTop.position.set(0.1, 0.88, halfD - 0.33);
  group.add(backTop);

  const leftRun = box(0.62, 0.86, size.depth - 1.1, mat.wood);
  leftRun.position.set(-halfW + 0.31, 0.43, -0.1);
  group.add(leftRun);
  const leftTop = box(0.66, 0.05, size.depth - 1.06, mat.stone);
  leftTop.position.set(-halfW + 0.33, 0.88, -0.1);
  group.add(leftTop);

  const uppers = box(size.width - 0.9, 0.7, 0.34, mat.wallAccent);
  uppers.position.set(0.1, 1.78, halfD - 0.17);
  group.add(uppers);
  const handle = box(size.width - 0.94, 0.03, 0.03, mat.darkMetal);
  handle.position.set(0.1, 1.46, halfD - 0.35);
  group.add(handle);

  const backsplash = box(size.width - 0.5, 0.52, 0.03, mat.wallAccent);
  backsplash.position.set(0.1, 1.15, halfD - 0.63);
  group.add(backsplash);

  const sink = box(0.52, 0.06, 0.42, mat.darkMetal);
  sink.position.set(0.55, 0.9, halfD - 0.35);
  group.add(sink);
  const faucet = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.3, 10), mat.metal);
  faucet.position.set(0.55, 1.06, halfD - 0.56);
  group.add(faucet);
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.22, 10), mat.metal);
  spout.rotation.x = Math.PI / 2;
  spout.position.set(0.55, 1.2, halfD - 0.46);
  group.add(spout);

  const cooktop = box(0.62, 0.02, 0.5, mat.darkMetal);
  cooktop.position.set(-0.45, 0.91, halfD - 0.35);
  group.add(cooktop);
  for (const [bx, bz] of pairs([-0.15, -0.1], [0.15, -0.1], [-0.15, 0.1], [0.15, 0.1])) {
    const burner = new THREE.Mesh(
      new THREE.CylinderGeometry(0.075, 0.075, 0.015, 18),
      mat.darkMetal,
    );
    burner.position.set(-0.45 + bx, 0.93, halfD - 0.35 + bz);
    group.add(burner);
  }
  const hood = box(0.72, 0.14, 0.48, mat.metal);
  hood.position.set(-0.45, 1.58, halfD - 0.34);
  group.add(hood);
  const chimney = box(0.3, 0.6, 0.28, mat.metal);
  chimney.position.set(-0.45, 1.95, halfD - 0.2);
  group.add(chimney);
}

function addKitchenIsland(group: THREE.Group, size: RoomSize, mat: RoomMaterials) {
  const top = box(Math.min(1.5, size.width - 1.2), 0.05, 0.7, mat.stone);
  top.position.set(0.15, 0.92, -0.5);
  group.add(top);
  const body = box(Math.min(1.4, size.width - 1.3), 0.86, 0.6, mat.woodDark);
  body.position.set(0.15, 0.45, -0.5);
  group.add(body);
  for (const dx of [-0.5, 0, 0.5]) {
    const stool = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.07, 20), mat.fabricAlt);
    seat.position.y = 0.66;
    seat.castShadow = true;
    stool.add(seat);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.62, 10), mat.darkMetal);
    stem.position.y = 0.33;
    stool.add(stem);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.02, 16), mat.darkMetal);
    foot.position.y = 0.01;
    stool.add(foot);
    stool.position.set(0.15 + dx, 0, -1.05);
    group.add(stool);
  }
  const pendants = size.width > 3 ? 2 : 1;
  for (let i = 0; i < pendants; i++) {
    const x = 0.15 + (i - (pendants - 1) / 2) * 0.5;
    addPendant(group, x, -0.5, 1.85, mat);
  }
}

function addFridge(group: THREE.Group, x: number, z: number, mat: RoomMaterials) {
  const fridge = box(0.72, 1.85, 0.68, mat.metal);
  fridge.position.set(x, 0.93, z);
  group.add(fridge);
  const split = box(0.74, 0.02, 0.7, mat.darkMetal);
  split.position.set(x, 1.28, z);
  group.add(split);
  for (const hy of [0.8, 1.5]) {
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 8), mat.darkMetal);
    handle.position.set(x - 0.37, hy, z);
    group.add(handle);
  }
}

function addBed(group: THREE.Group, z: number, mat: RoomMaterials) {
  const bed = new THREE.Group();
  const base = box(1.72, 0.26, 2.05, mat.woodDark);
  base.position.y = 0.16;
  bed.add(base);
  const mattress = box(1.66, 0.26, 2.0, mat.skirting);
  mattress.position.y = 0.42;
  bed.add(mattress);
  const duvet = box(1.7, 0.14, 1.25, mat.fabric);
  duvet.position.set(0, 0.6, -0.32);
  bed.add(duvet);
  const runner = box(1.72, 0.06, 0.5, mat.fabricAlt);
  runner.position.set(0, 0.68, -0.7);
  bed.add(runner);
  const headboard = box(1.82, 1.05, 0.12, mat.fabricAlt);
  headboard.position.set(0, 0.62, 1.02);
  bed.add(headboard);
  for (const px of [-0.42, 0.42]) {
    const pillow = box(0.66, 0.16, 0.4, mat.skirting);
    pillow.position.set(px, 0.62, 0.72);
    pillow.rotation.x = -0.14;
    bed.add(pillow);
  }
  bed.position.z = z;
  group.add(bed);
}

function addNightstand(
  group: THREE.Group,
  x: number,
  z: number,
  mat: RoomMaterials,
  lamp: boolean,
) {
  const stand = box(0.46, 0.42, 0.4, mat.wood);
  stand.position.set(x, 0.24, z);
  group.add(stand);
  const drawer = box(0.4, 0.02, 0.02, mat.darkMetal);
  drawer.position.set(x, 0.32, z - 0.21);
  group.add(drawer);
  if (!lamp) return;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.22, 8), mat.darkMetal);
  stem.position.set(x, 0.56, z);
  group.add(stem);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.18, 20, 1, true), mat.lamp);
  shade.position.set(x, 0.74, z);
  group.add(shade);
  const light = new THREE.PointLight(0xffdcb0, 4.5, 3, 2);
  light.position.set(x, 0.68, z);
  group.add(light);
}

function addWardrobe(group: THREE.Group, x: number, z: number, mat: RoomMaterials) {
  const wardrobe = box(0.6, 2.2, 1.7, mat.wood);
  wardrobe.position.set(x, 1.1, z);
  group.add(wardrobe);
  for (const dz of [-0.42, 0.42]) {
    const door = box(0.62, 2.1, 0.82, mat.wallAccent);
    door.position.set(x + 0.01, 1.1, z + dz);
    group.add(door);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.4, 8), mat.darkMetal);
    handle.position.set(x + 0.34, 1.1, z + dz + (dz > 0 ? -0.34 : 0.34));
    group.add(handle);
  }
}

function addBench(group: THREE.Group, z: number, mat: RoomMaterials) {
  const seat = box(1.24, 0.12, 0.44, mat.fabricAlt);
  seat.position.set(0, 0.44, z);
  group.add(seat);
  for (const bx of [-0.52, 0.52]) {
    for (const bz of [-0.16, 0.16]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.016, 0.38, 8), mat.woodDark);
      leg.position.set(bx, 0.19, z + bz);
      group.add(leg);
    }
  }
}

function addVanity(group: THREE.Group, x: number, z: number, mat: RoomMaterials) {
  const cabinet = box(0.5, 0.8, 1.3, mat.wood);
  cabinet.position.set(x, 0.42, z);
  group.add(cabinet);
  const counter = box(0.54, 0.05, 1.36, mat.stone);
  counter.position.set(x - 0.01, 0.85, z);
  group.add(counter);
  const basin = new THREE.Mesh(
    new THREE.CylinderGeometry(0.19, 0.14, 0.14, 24),
    new THREE.MeshStandardMaterial({ color: "#f6f7f7", roughness: 0.12, metalness: 0.05 }),
  );
  basin.position.set(x, 0.94, z);
  basin.castShadow = true;
  group.add(basin);
  const faucet = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.24, 10), mat.metal);
  faucet.position.set(x + 0.16, 1.0, z);
  group.add(faucet);
  const mirror = box(0.04, 0.78, 0.92, mat.mirror);
  mirror.position.set(x + 0.22, 1.5, z);
  group.add(mirror);
  const frame = box(0.05, 0.86, 1.0, mat.skirting);
  frame.position.set(x + 0.24, 1.5, z);
  group.add(frame);
  for (const dz of [-0.3, 0.3]) {
    const sconce = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 10), mat.lamp);
    sconce.position.set(x + 0.14, 1.6, z + dz);
    group.add(sconce);
  }
  const light = new THREE.PointLight(0xfff0d8, 4, 2.6, 2);
  light.position.set(x, 1.85, z);
  group.add(light);
}

function addBathtub(group: THREE.Group, x: number, z: number, mat: RoomMaterials) {
  const shell = new THREE.MeshStandardMaterial({
    color: "#f7f8f8",
    roughness: 0.14,
    metalness: 0.04,
  });
  const tub = box(0.78, 0.56, 1.55, shell);
  tub.position.set(x, 0.28, z);
  group.add(tub);
  const inner = box(
    0.62,
    0.3,
    1.36,
    new THREE.MeshStandardMaterial({ color: "#e4ecef", roughness: 0.08 }),
  );
  inner.position.set(x, 0.4, z);
  group.add(inner);
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(0.58, 1.3),
    new THREE.MeshStandardMaterial({
      color: "#bcd9e4",
      roughness: 0.05,
      metalness: 0.2,
      transparent: true,
      opacity: 0.75,
    }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(x, 0.52, z);
  group.add(water);
  const tap = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.2, 10), mat.metal);
  tap.position.set(x + 0.42, 0.66, z - 0.6);
  group.add(tap);
}

function addShower(group: THREE.Group, x: number, z: number, mat: RoomMaterials) {
  const tray = box(
    0.92,
    0.06,
    0.92,
    new THREE.MeshStandardMaterial({ color: "#eceff0", roughness: 0.2 }),
  );
  tray.position.set(x, 0.03, z);
  group.add(tray);
  const glassPanel = box(0.03, 1.95, 0.92, mat.glass);
  glassPanel.castShadow = false;
  glassPanel.position.set(x - 0.46, 1.0, z);
  group.add(glassPanel);
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.03, 20), mat.metal);
  head.position.set(x, 2.0, z - 0.3);
  group.add(head);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.3, 8), mat.metal);
  arm.rotation.z = Math.PI / 2;
  arm.position.set(x + 0.15, 2.05, z - 0.3);
  group.add(arm);
}

function addTowelRail(group: THREE.Group, x: number, z: number, mat: RoomMaterials) {
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.6, 10), mat.metal);
  rail.rotation.z = Math.PI / 2;
  rail.position.set(x, 1.15, z);
  group.add(rail);
  const towel = box(0.34, 0.5, 0.05, mat.fabricAlt);
  towel.position.set(x, 0.94, z - 0.04);
  group.add(towel);
}

function buildRailing(group: THREE.Group, size: RoomSize, mat: RoomMaterials) {
  const height = 1.05;
  const sides: [number, number, number][] = [
    [0, -size.depth / 2, size.width],
    [0, size.depth / 2, size.width],
    [-size.width / 2, 0, size.depth],
    [size.width / 2, 0, size.depth],
  ];
  for (const [x, z, span] of sides) {
    const glass = box(x === 0 ? span : 0.04, height - 0.12, x === 0 ? 0.04 : span, mat.glass);
    glass.position.set(x, height / 2, z);
    group.add(glass);
    const rail = box(x === 0 ? span : 0.07, 0.07, x === 0 ? 0.07 : span, mat.darkMetal);
    rail.position.set(x, height, z);
    group.add(rail);
    const count = Math.max(2, Math.round(span / 1.3));
    for (let i = 0; i <= count; i++) {
      const offset = -span / 2 + (span / count) * i;
      const post = box(0.06, height, 0.06, mat.darkMetal);
      post.position.set(x === 0 ? offset : x, height / 2, x === 0 ? z : offset);
      group.add(post);
    }
  }
}

function buildPergola(group: THREE.Group, size: RoomSize, mat: RoomMaterials) {
  for (const x of [-size.width / 2 + 0.12, size.width / 2 - 0.12]) {
    for (const z of [-size.depth / 2 + 0.12, size.depth / 2 - 0.12]) {
      const post = box(0.12, size.height, 0.12, mat.wood);
      post.position.set(x, size.height / 2, z);
      post.castShadow = true;
      group.add(post);
    }
  }
  const beams = 5;
  for (let i = 0; i < beams; i++) {
    const z = -size.depth / 2 + (size.depth / (beams - 1)) * i;
    const beam = box(size.width, 0.1, 0.08, mat.wood);
    beam.position.set(0, size.height + 0.05, z);
    group.add(beam);
  }
  for (const x of [-size.width / 2 + 0.1, size.width / 2 - 0.1]) {
    const rail = box(0.08, 0.1, size.depth, mat.wood);
    rail.position.set(x, size.height + 0.05, 0);
    group.add(rail);
  }
}

function addBalconyDeck(group: THREE.Group, size: RoomSize, mat: RoomMaterials) {
  const deck = box(size.width, 0.06, size.depth, mat.stone);
  deck.position.y = 0.03;
  group.add(deck);
}

function addLoungeChair(
  group: THREE.Group,
  x: number,
  z: number,
  rotation: number,
  mat: RoomMaterials,
) {
  const chair = new THREE.Group();
  for (const [lx, lz] of pairs([-0.24, -0.28], [0.24, -0.28], [-0.24, 0.28], [0.24, 0.28])) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.014, 0.36, 8), mat.darkMetal);
    leg.position.set(lx, 0.18, lz);
    chair.add(leg);
  }
  const seat = box(0.62, 0.09, 0.68, mat.fabricAlt);
  seat.position.y = 0.4;
  chair.add(seat);
  const cushion = box(0.58, 0.09, 0.6, mat.fabric);
  cushion.position.y = 0.48;
  chair.add(cushion);
  const back = box(0.62, 0.08, 0.44, mat.fabric);
  back.position.set(0, 0.62, 0.42);
  back.rotation.x = 0.55;
  chair.add(back);
  chair.position.set(x, 0, z);
  chair.rotation.y = rotation;
  group.add(chair);
}

function addBistroTable(group: THREE.Group, x: number, z: number, mat: RoomMaterials) {
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.04, 24), mat.wood);
  top.position.set(x, 0.62, z);
  top.castShadow = true;
  group.add(top);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.6, 10), mat.darkMetal);
  stem.position.set(x, 0.31, z);
  group.add(stem);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.02, 20), mat.darkMetal);
  base.position.set(x, 0.01, z);
  group.add(base);
}

function addPlanter(group: THREE.Group, x: number, z: number, mat: RoomMaterials) {
  const box_ = box(0.5, 0.42, 0.9, mat.wood);
  box_.position.set(x, 0.21, z);
  group.add(box_);
  for (let i = 0; i < 4; i++) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), mat.greenery);
    leaf.scale.set(1, 0.6, 0.55);
    leaf.position.set(x, 0.52 + (i % 2) * 0.14, z - 0.3 + i * 0.2);
    leaf.castShadow = true;
    group.add(leaf);
  }
}

function createPlankTexture(rand: () => number, palette: InteriorPalette): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = palette.floor;
    ctx.fillRect(0, 0, 512, 512);
    const planks = 7;
    const plankWidth = 512 / planks;
    for (let i = 0; i < planks; i++) {
      ctx.fillStyle = shade(palette.floor, (rand() - 0.5) * 0.16);
      ctx.fillRect(i * plankWidth, 0, plankWidth, 512);
      ctx.fillStyle = palette.floorDark;
      ctx.globalAlpha = 0.55;
      ctx.fillRect(i * plankWidth, 0, 1.5, 512);
      const joint = 120 + Math.floor(rand() * 300);
      ctx.fillRect(i * plankWidth, joint, plankWidth, 1.5);
      ctx.globalAlpha = 0.12;
      for (let g = 0; g < 14; g++) {
        ctx.fillStyle = g % 2 === 0 ? "#ffffff" : palette.floorDark;
        ctx.fillRect(
          i * plankWidth + rand() * plankWidth * 0.8,
          rand() * 512,
          1,
          40 + rand() * 120,
        );
      }
      ctx.globalAlpha = 1;
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createTileTexture(rand: () => number, palette: InteriorPalette): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = palette.floorDark;
    ctx.fillRect(0, 0, 512, 512);
    const tiles = 6;
    const size = 512 / tiles;
    for (let y = 0; y < tiles; y++) {
      for (let x = 0; x < tiles; x++) {
        ctx.fillStyle = shade(palette.floor, (rand() - 0.5) * 0.1);
        ctx.fillRect(x * size + 1.5, y * size + 1.5, size - 3, size - 3);
      }
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createCityTexture(rand: () => number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const sky = ctx.createLinearGradient(0, 0, 0, 1024);
    sky.addColorStop(0, "#5b93cf");
    sky.addColorStop(0.45, "#a8cbe8");
    sky.addColorStop(0.72, "#e6eef2");
    sky.addColorStop(0.78, "#cfd8dc");
    sky.addColorStop(1, "#8e959a");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 2048, 1024);

    const sun = ctx.createRadialGradient(430, 640, 20, 430, 640, 420);
    sun.addColorStop(0, "rgba(255, 248, 224, 0.95)");
    sun.addColorStop(0.25, "rgba(255, 240, 205, 0.35)");
    sun.addColorStop(1, "rgba(255, 240, 205, 0)");
    ctx.fillStyle = sun;
    ctx.fillRect(0, 200, 900, 700);

    const horizon = 800;
    const layers = [
      { count: 46, min: 60, max: 210, color: "#b9c8d6", alpha: 0.55 },
      { count: 34, min: 90, max: 300, color: "#8ea3b6", alpha: 0.75 },
      { count: 22, min: 130, max: 430, color: "#5f7086", alpha: 0.95 },
    ];
    for (const layer of layers) {
      for (let i = 0; i < layer.count; i++) {
        const width = (2048 / layer.count) * (0.5 + rand() * 0.6);
        const height = layer.min + rand() * (layer.max - layer.min);
        const x = rand() * 2048;
        ctx.globalAlpha = layer.alpha;
        ctx.fillStyle = layer.color;
        ctx.fillRect(x, horizon - height, width, height + 40);
        ctx.globalAlpha = layer.alpha * 0.5;
        ctx.fillStyle = "#ffffff";
        for (let wy = horizon - height + 12; wy < horizon - 12; wy += 16) {
          for (let wx = x + 6; wx < x + width - 8; wx += 14) {
            if (rand() > 0.45) ctx.fillRect(wx, wy, 7, 9);
          }
        }
        ctx.globalAlpha = 1;
      }
    }

    const haze = ctx.createLinearGradient(0, horizon - 160, 0, horizon + 10);
    haze.addColorStop(0, "rgba(233, 240, 244, 0)");
    haze.addColorStop(1, "rgba(233, 240, 244, 0.9)");
    ctx.fillStyle = haze;
    ctx.fillRect(0, horizon - 160, 2048, 180);

    ctx.fillStyle = "#6f767b";
    ctx.fillRect(0, horizon, 2048, 224);
    ctx.globalAlpha = 0.35;
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = rand() > 0.5 ? "#8b9296" : "#5b6165";
      ctx.fillRect(rand() * 2048, horizon + rand() * 224, 3, 3);
    }
    ctx.globalAlpha = 1;
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function shade(hex: string, amount: number) {
  const value = hex.replace("#", "");
  const num = parseInt(value, 16);
  const r = clampChannel(((num >> 16) & 255) * (1 + amount));
  const g = clampChannel(((num >> 8) & 255) * (1 + amount));
  const b = clampChannel((num & 255) * (1 + amount));
  return `rgb(${r}, ${g}, ${b})`;
}

function clampChannel(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function box(width: number, height: number, depth: number, material: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function pairs(...values: [number, number][]): [number, number][] {
  return values;
}
