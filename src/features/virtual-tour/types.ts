import type { UnitStatus } from "@/types/domain";

/**
 * Tour Virtual (runtime).
 *
 * Estos tipos representan el tour YA GENERADO que consume el viewer: el
 * `VirtualTourConfig` persistido (ver types/domain.ts) se fusiona con el
 * dataset de unidades en vivo para construir esto. La UI nunca debe leer la
 * configuración directamente para mostrar el tour.
 */

export interface VirtualTourUnit {
  /** Id interno del tour (stable). */
  id: string;
  /** Id de la unidad en el inventario central. */
  unitId: string;
  code: string;
  name: string;
  type: string;
  area: number;
  rooms: number;
  orientation: string;
  price: number;
  currency: "USD" | "ARS";
  status: UnitStatus;
  floorplan?: string;
  /** Posición en % del plano de la planta. */
  x: number;
  y: number;
  /**
   * A futuro: geometría 3D propia de la unidad, material, url de modelo,
   * cámara por defecto, etc.
   */
  modelUrl?: string;
  /**
   * Tour 360° real de la unidad (Kuula, Matterport, urbania360, etc.).
   * Cuando existe, el recorrido se embebe en lugar de usar el interior 3D.
   */
  tour360Url?: string;
  /** Escenas 360° del interior de la unidad (recorrido virtual). */
  scenes: VirtualTourScene[];
}

/** Ambientes que componen el recorrido 360° de una unidad. */
export type VirtualTourSceneKind = "living" | "kitchen" | "bedroom" | "bath" | "balcony";

/** Hotspot 3D dentro de una escena 360° (en grados de yaw/pitch). */
export interface VirtualTourSceneHotspot {
  id: string;
  label: string;
  /** Azimut en grados (0 = frente de la escena), -180..180 o 0..360. */
  yaw: number;
  /** Elevación en grados (-90 = abajo, 90 = arriba). */
  pitch: number;
  /** Escena a la que navega. */
  targetSceneId: string;
}

/**
 * Escena de recorrido 360° de un ambiente de la unidad. La geometría del
 * ambiente se construye en el momento con Three.js (ver `room.ts`) a partir
 * de `kind` y `seed`, así el tour funciona sin assets externos.
 */
export interface VirtualTourScene {
  id: string;
  /** Id de la unidad a la que pertenece. */
  unitId: string;
  kind: VirtualTourSceneKind;
  /** Etiqueta para el navegador de ambientes. */
  label: string;
  seed: number;
  hotspots: VirtualTourSceneHotspot[];
}

export interface VirtualTourHotspot {
  id: string;
  label: string;
  x: number;
  y: number;
  /** A futuro: id de la escena/panorama al que apunta este hotspot. */
  targetSceneId?: string;
}

export interface VirtualTourFloor {
  id: string;
  name: string;
  level: number;
  floorPlanUrl?: string;
  units: VirtualTourUnit[];
  hotspots: VirtualTourHotspot[];
  /**
   * A futuro: campos de escena 3D — panoramas, cámaras, geometría, luz,
   * navegación entre ambientes.
   */
}

export interface VirtualTour {
  id: string;
  projectId: string;
  projectSlug: string;
  projectName: string;
  title: string;
  description?: string;
  published: boolean;
  floors: VirtualTourFloor[];
}
