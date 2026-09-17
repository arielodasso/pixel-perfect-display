import { useState } from "react";

import { PanZoom } from "@/components/interactive/PanZoom";
import { trackEvent } from "@/lib/tracking";
import { cn } from "@/lib/utils";
import type { Project, Unit } from "@/types/domain";
import type { VirtualTour, VirtualTourUnit } from "@/features/virtual-tour/types";
import { FloorScene } from "@/features/virtual-tour/FloorScene";

import { UnitRenderPanel } from "../UnitRenderPanel";

interface Props {
  tour: VirtualTour;
  project: Project;
  units: Unit[];
  compare: string[];
  onConsult: (unit: Unit) => void;
  onCompare: (unit: Unit) => void;
  onTour360: (unit: Unit) => void;
  goToRecorrido: () => void;
}

export function PlantasView({
  tour,
  project,
  units,
  compare,
  onConsult,
  onCompare,
  onTour360,
  goToRecorrido,
}: Props) {
  const firstWithUnits = tour.floors.findIndex((floor) => floor.units.length > 0);
  const [activeIndex, setActiveIndex] = useState(firstWithUnits >= 0 ? firstWithUnits : 0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const floor = tour.floors[activeIndex];
  const unitByCode = new Map(units.map((unit) => [unit.code, unit]));
  const selectedTourUnit = floor?.units.find((unit) => unit.id === selectedId) ?? null;
  const selectedUnit = selectedTourUnit ? (unitByCode.get(selectedTourUnit.code) ?? null) : null;

  function selectUnit(unit: VirtualTourUnit) {
    setSelectedId(unit.id);
    trackEvent("tour_unit_select", { unit: unit.code, floor: floor?.name ?? "" });
  }

  return (
    <div className="flex h-full flex-col">
      <nav className="shrink-0 border-b border-border bg-background/60 backdrop-blur">
        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto px-4 py-2.5">
          {tour.floors.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (index === activeIndex) return;
                setActiveIndex(index);
                setSelectedId(null);
                trackEvent("tour_floor_select", { floor: item.name, level: item.level });
              }}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium transition-colors",
                index === activeIndex
                  ? "border-primary/60 bg-primary/15 text-primary"
                  : "border-border bg-background/50 text-muted-foreground hover:text-foreground",
              )}
            >
              {item.name}
              {item.units.length > 0 && (
                <span className="tabular-nums opacity-70">{item.units.length}</span>
              )}
            </button>
          ))}
        </div>
      </nav>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="relative h-[46vh] shrink-0 lg:h-auto lg:flex-1">
          {floor && (
            <PanZoom
              key={`${tour.id}-${floor.id}`}
              fit="contain"
              minScale={0.4}
              maxScale={8}
              showControls
              className="h-full w-full"
              hint="Arrastrá para mover · rueda o pinch para zoom"
            >
              <div className="h-[820px] w-[820px]">
                <FloorScene
                  floor={floor}
                  selectedId={selectedId}
                  compareCodes={compare}
                  onSelect={selectUnit}
                  className="bg-[oklch(0.16_0.008_265)]"
                />
              </div>
            </PanZoom>
          )}

          {!selectedUnit && (
            <div className="pointer-events-none absolute bottom-3 left-3 max-w-[34ch] rounded-lg border border-border bg-background/80 px-3 py-2 text-[11px] text-muted-foreground backdrop-blur-sm">
              Tocá una unidad del plano para ver su detalle. También podés recorrer el edificio en
              360°.
            </div>
          )}
        </div>

        <aside className="min-h-0 flex-1 overflow-y-auto border-t border-border p-4 lg:w-[368px] lg:flex-none lg:border-l lg:border-t-0">
          <UnitRenderPanel
            unit={selectedUnit}
            project={project}
            onConsult={onConsult}
            onCompare={onCompare}
            compareActive={selectedUnit ? compare.includes(selectedUnit.code) : false}
            onTour360={onTour360}
            className="rounded-xl"
          />
          <button
            type="button"
            onClick={goToRecorrido}
            className="mt-3 w-full rounded-xl border border-dashed border-border px-4 py-3 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
          >
            ¿Buscás el recorrido inmersivo? Ir al Recorrido 360°
          </button>
        </aside>
      </div>
    </div>
  );
}
