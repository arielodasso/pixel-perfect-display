/**
 * Motor de generación del Tour Virtual.
 *
 * LÍMITE AISLADO PARA EL PIPELINE AUTOMÁTICO:
 * -----------------------------------------------
 * Hoy el tour se genera en el acto a partir de la configuración manual
 * (plantas + posiciones + hotspots) y del dataset central de unidades.
 *
 * En una iteración futura, este módulo será el punto donde se enchufe el
 * procesamiento automático de planos — visión computacional, reconstrucción
 * geométrica, modelado 3D (Three.js/WebGL), panoramas, cámaras y escenas —
 * sin tocar el viewer ni la UI de administración. Todo lo que el viewer
 * necesita ya está abstraído en el `VirtualTour` generado.
 */

export interface FloorPlanProcessingResult {
  geometry: null;
  generated: false;
  message: string;
}

/**
 * Posiciones automáticas por defecto para un conjunto de unidades dentro del
 * plano de una planta (coordenadas en % del viewBox, 0-100).
 */
export function autoLayoutPositions(count: number, index: number): { x: number; y: number } {
  if (count <= 1) return { x: 50, y: 50 };
  if (count === 2) return index === 0 ? { x: 38, y: 50 } : { x: 62, y: 50 };
  const ys = [25, 50, 75];
  const y = ys[index] ?? 50;
  return { x: 50, y };
}

/**
 * Punto de extensión / límite aislado del motor automático de planos.
 *
 * Cuando exista el motor de procesamiento de planos (análisis de imagen,
 * extracción de geometría, etc.), esta función será el único lugar que
 * necesite cambiar para generar posiciones, hotspots y geometría de forma
 * automática. Hoy devuelve una respuesta explícita de "no disponible":
 * no se simula tecnología inexistente.
 */
export function processFloorPlan(
  floorPlanUrl: string | undefined,
  options: { existingPlacements: unknown[] } = { existingPlacements: [] },
): FloorPlanProcessingResult {
  void floorPlanUrl;
  void options;
  return {
    geometry: null,
    generated: false,
    message:
      "El motor automático de planos todavía no está disponible: las posiciones se definen manualmente en el panel.",
  };
}
