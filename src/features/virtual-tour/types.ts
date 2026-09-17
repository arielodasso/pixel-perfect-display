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
