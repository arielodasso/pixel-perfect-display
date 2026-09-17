import { Link } from "@tanstack/react-router";
import { ArrowLeft, Box, Compass, MessageCircle } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { PanZoom } from "@/components/interactive/PanZoom";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/tracking";
import { cn } from "@/lib/utils";
import type { ShowroomSettings } from "@/services/store";
import { useCompare } from "@/services/store";
import type { Organization, Project, Unit } from "@/types/domain";

import { FloorScene } from "./FloorScene";
import { PanoramaViewer } from "./PanoramaViewer";
import { UnitTourCard } from "./UnitTourCard";
import type { VirtualTour, VirtualTourScene, VirtualTourUnit } from "./types";

interface Props {
  tour: VirtualTour;
  project: Project;
  organization: Organization;
  settings: ShowroomSettings;
  units: Unit[];
  onConsult: (unit: Unit | null) => void;
  /** Vista previa (tour aún no publicado). */
  preview?: boolean;
}

const STATUS_DOT: Record<Unit["status"], string> = {
  disponible: "bg-available",
  reservada: "bg-reserved",
  vendida: "bg-sold",
};

export function TourViewer({
  tour,
  project,
  organization,
  settings,
  units,
  onConsult,
  preview = false,
}: Props) {
  const compare = useCompare();
  const unitByCode = useMemo(() => new Map(units.map((unit) => [unit.code, unit])), [units]);

  const firstFloorWithUnits = tour.floors.findIndex((floor) => floor.units.length > 0);
  const [activeIndex, setActiveIndex] = useState(
    firstFloorWithUnits >= 0 ? firstFloorWithUnits : 0,
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tour360, setTour360] = useState(false);

  const floor = tour.floors[activeIndex];
  const selectedTourUnit = floor?.units.find((unit) => unit.id === selectedId) ?? null;
  const selectedUnit = selectedTourUnit ? (unitByCode.get(selectedTourUnit.code) ?? null) : null;

  function selectFloor(index: number) {
    if (index === activeIndex) return;
    setActiveIndex(index);
    setSelectedId(null);
    setTour360(false);
    const nextFloor = tour.floors[index];
    trackEvent("tour_floor_select", {
      floor: nextFloor?.name ?? "",
      level: nextFloor?.level ?? -1,
    });
  }

  function selectUnit(unit: VirtualTourUnit) {
    setSelectedId(unit.id);
    setTour360(false);
    trackEvent("tour_unit_select", { unit: unit.code, floor: floor?.name ?? "" });
  }

  function startTour360() {
    if (!selectedTourUnit || selectedTourUnit.scenes.length === 0) return;
    setTour360(true);
    trackEvent("virtual_tour_360_enter", { unit: selectedTourUnit.code });
  }

  function exitTour360() {
    setTour360(false);
    trackEvent("virtual_tour_360_exit", { unit: selectedTourUnit?.code ?? "" });
  }

  const handleSceneChange = useCallback((scene: VirtualTourScene) => {
    trackEvent("virtual_tour_360_scene_view", { scene: scene.kind });
  }, []);

  if (!floor) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <Compass className="size-10 text-primary" />
        <p className="text-sm text-muted-foreground">
          Este proyecto todavía no tiene plantas cargadas en el tour virtual.
        </p>
        <Button asChild variant="outline">
          <Link to="/showroom/$slug" params={{ slug: project.slug }}>
            <ArrowLeft className="size-4" /> Volver al proyecto
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      {/* Header */}
      <header className="z-30 shrink-0 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1500px] items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/showroom/$slug" params={{ slug: project.slug }}>
              <ArrowLeft className="size-4" /> Volver
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{project.name}</p>
            <p className="truncate text-xs text-muted-foreground">Tour virtual · {tour.title}</p>
          </div>
          {preview && (
            <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-reserved/40 bg-reserved/10 px-3 py-1 text-[11px] font-medium text-reserved sm:inline-flex">
              <span className="size-1.5 rounded-full bg-reserved" />
              Vista previa — no publicado
            </span>
          )}
          {settings.showWhatsappCta && (
            <Button variant="outline" size="sm" asChild>
              <a
                href={`https://wa.me/${organization.whatsapp}`}
                target="_blank"
                rel="noreferrer"
                onClick={() => trackEvent("whatsapp_click")}
              >
                <MessageCircle className="size-4" /> WhatsApp
              </a>
            </Button>
          )}
          <Button size="sm" onClick={() => onConsult(null)}>
            Consultar
          </Button>
        </div>
      </header>

      {/* Navegación de plantas */}
      <nav className="z-20 shrink-0 border-b border-border bg-background/70 backdrop-blur">
        <div className="no-scrollbar mx-auto flex w-full max-w-[1500px] items-center gap-2 overflow-x-auto px-4 py-2.5">
          {tour.floors.map((theFloor, index) => (
            <button
              key={theFloor.id}
              type="button"
              onClick={() => selectFloor(index)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium transition-colors",
                index === activeIndex
                  ? "border-primary/60 bg-primary/15 text-primary"
                  : "border-border bg-background/50 text-muted-foreground hover:text-foreground",
              )}
            >
              {theFloor.name}
              {theFloor.units.length > 0 && (
                <span className="tabular-nums opacity-70">{theFloor.units.length}</span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Contenido */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Escena */}
        <div
          className="relative h-[52vh] min-h-[300px] shrink-0 lg:h-auto lg:flex-1"
          role="region"
          aria-label={
            tour360 ? `Recorrido 360° ${selectedTourUnit?.name ?? ""}` : `Planta ${floor.name}`
          }
        >
          {tour360 && selectedTourUnit && selectedTourUnit.scenes.length > 0 ? (
            <PanoramaViewer
              key={selectedTourUnit.id}
              scenes={selectedTourUnit.scenes}
              initialSceneId={selectedTourUnit.scenes[0]?.id ?? ""}
              unitLabel={selectedTourUnit.name}
              onBackToPlan={exitTour360}
              onSceneChange={handleSceneChange}
            />
          ) : (
            <>
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

              {/* Leyenda */}
              <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-background/75 px-3 py-1.5 text-[11px] text-muted-foreground backdrop-blur-sm">
                {(
                  [
                    ["Disponible", "disponible"],
                    ["Reservada", "reservada"],
                    ["Vendida", "vendida"],
                  ] as const
                ).map(([label, status]) => (
                  <span key={status} className="flex items-center gap-1.5">
                    <span className={cn("size-2 rounded-full", STATUS_DOT[status])} />
                    {label}
                  </span>
                ))}
              </div>
            </>
          )}

          {/* Acceso al recorrido 360° de la unidad seleccionada */}
          {!tour360 && selectedTourUnit && selectedTourUnit.scenes.length > 0 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
              <Button size="lg" onClick={startTour360} className="shadow-panel shadow-black/30">
                <Box className="size-4" /> Recorrer esta unidad en 360°
              </Button>
            </div>
          )}
        </div>

        {/* Panel de unidad */}
        <aside className="flex min-h-0 flex-1 flex-col border-t border-border bg-background/40 lg:w-[360px] lg:flex-none lg:border-l lg:border-t-0">
          <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3">
            <p className="eyebrow">
              {selectedUnit ? `Unidad ${selectedUnit.number}` : `Unidades — ${floor.name}`}
            </p>
            {floor.units.filter((u) => u.status === "disponible").length > 0 && selectedUnit && (
              <span className="text-[11px] text-muted-foreground">
                {floor.units.filter((u) => u.status === "disponible").length} dispon.
              </span>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {selectedUnit ? (
              <UnitTourCard
                unit={selectedUnit}
                project={project}
                onConsult={onConsult}
                onTour360={startTour360}
                touring={tour360}
              />
            ) : (
              <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-2 px-6 text-center">
                <Compass className="size-8 text-primary/70" />
                <p className="text-sm font-medium">Elegí una unidad en la planta</p>
                <p className="max-w-[30ch] text-xs text-muted-foreground">
                  Tocá cualquier unidad para ver superficie, precio, financiación y disponibilidad.
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
