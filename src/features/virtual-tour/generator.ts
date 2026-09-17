import type { Project, Unit, VirtualTourConfig, VirtualTourFloorConfig } from "@/types/domain";

import { autoLayoutPositions } from "./engine";
import type { VirtualTour, VirtualTourFloor, VirtualTourUnit } from "./types";

/**
 * Genera el `VirtualTour` consumible por el viewer a partir de:
 * - la configuración de tour del proyecto (plantas, posiciones, hotspots);
 * - el dataset central de unidades (estado, tipología, superficie, precio).
 *
 * El tour SIEMPRE refleja el estado en vivo de las unidades: si una unidad
 * cambia de estado/precio, el viewer lo ve automáticamente porque se resuelve
 * aquí contra `units`.
 */
export function generateVirtualTour(
  project: Project,
  units: Unit[],
  config: VirtualTourConfig | undefined,
): VirtualTour | null {
  if (!config || !config.enabled) return null;

  const floors = config.floors.map((floorConfig) => buildFloor(floorConfig, units));

  const tour: VirtualTour = {
    id: `vt_${project.slug}`,
    projectId: project.id,
    projectSlug: project.slug,
    projectName: project.name,
    title: config.title || `${project.name} — Tour virtual`,
    published: config.published,
    floors,
  };
  if (config.description) tour.description = config.description;
  return tour;
}

function buildFloor(floorConfig: VirtualTourFloorConfig, units: Unit[]): VirtualTourFloor {
  const byId = new Map(units.map((unit) => [unit.id, unit]));

  const configured = floorConfig.unitPlacements.flatMap((placement) => {
    const unit = byId.get(placement.unitId);
    if (!unit) return [];
    return [toTourUnit(unit, placement.x, placement.y)];
  });

  // Unidades del mismo nivel que no están posicionadas aún: se colocan
  // automáticamente para que la navegación siempre esté completa.
  const placedIds = new Set(configured.map((unit) => unit.unitId));
  const auto = units
    .filter((unit) => unit.floor === floorConfig.level && !placedIds.has(unit.id))
    .map((unit, index, arr) => {
      const position = autoLayoutPositions(arr.length, index);
      return toTourUnit(unit, position.x, position.y);
    });

  const floor: VirtualTourFloor = {
    id: floorConfig.id,
    name: floorConfig.name,
    level: floorConfig.level,
    units: [...configured, ...auto],
    hotspots: floorConfig.hotspots ?? [],
  };
  if (floorConfig.floorPlanUrl) floor.floorPlanUrl = floorConfig.floorPlanUrl;
  return floor;
}

function toTourUnit(unit: Unit, x: number, y: number): VirtualTourUnit {
  const tourUnit: VirtualTourUnit = {
    id: `${unit.id}__${Math.round(x)}_${Math.round(y)}`,
    unitId: unit.id,
    code: unit.code,
    name: `Unidad ${unit.number}`,
    type: unit.typology,
    area: unit.area,
    rooms: unit.rooms,
    orientation: unit.orientation,
    price: unit.price,
    currency: unit.currency,
    status: unit.status,
    x,
    y,
  };
  tourUnit.floorplan = unit.floorplan;
  return tourUnit;
}
