import { useMemo, useState } from "react";

import { UnitStatusBadge } from "@/components/StatusBadge";
import { formatArea, formatPrice } from "@/lib/format";
import { unitThumb } from "@/lib/renders";
import { trackEvent } from "@/lib/tracking";
import { cn } from "@/lib/utils";
import type { Project, Unit, UnitStatus } from "@/types/domain";

import { RenderImage } from "../RenderImage";
import { UnitRenderPanel } from "../UnitRenderPanel";

interface Props {
  project: Project;
  units: Unit[];
  selected: Unit | null;
  onSelect: (unit: Unit) => void;
  onConsult: (unit: Unit) => void;
  onCompare: (unit: Unit) => void;
  compareActive: (unit: Unit) => boolean;
  onTour360: (unit: Unit) => void;
}

const FILTERS: { id: "todas" | UnitStatus; label: string }[] = [
  { id: "todas", label: "Todas" },
  { id: "disponible", label: "Disponibles" },
  { id: "reservada", label: "Reservadas" },
  { id: "vendida", label: "Vendidas" },
];

const DOT: Record<UnitStatus, string> = {
  disponible: "bg-available",
  reservada: "bg-reserved",
  vendida: "bg-sold",
};

export function UnidadesView({
  project,
  units,
  selected,
  onSelect,
  onConsult,
  onCompare,
  compareActive,
  onTour360,
}: Props) {
  const [filter, setFilter] = useState<"todas" | UnitStatus>("todas");

  const filtered = useMemo(() => {
    const list = filter === "todas" ? units : units.filter((unit) => unit.status === filter);
    return [...list].sort((a, b) => b.floor - a.floor || a.number.localeCompare(b.number));
  }, [units, filter]);

  return (
    <div className="flex h-full min-h-0 flex-col lg:flex-row">
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Disponibilidad</p>
            <h2 className="mt-1 text-3xl font-light tracking-tight">Elegí tu unidad</h2>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((option) => {
              const count =
                option.id === "todas"
                  ? units.length
                  : units.filter((unit) => unit.status === option.id).length;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setFilter(option.id)}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                    filter === option.id
                      ? "border-primary/60 bg-primary/15 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {option.label}
                  <span className="ml-1.5 tabular-nums opacity-70">{count}</span>
                </button>
              );
            })}
          </div>
        </header>

        <div className="grid gap-4 pb-24 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((unit) => (
            <button
              key={unit.id}
              type="button"
              onClick={() => {
                onSelect(unit);
                trackEvent("unit_view", { unit: unit.code, from: "unidades" });
              }}
              className={cn(
                "group overflow-hidden rounded-xl border border-border bg-surface text-left transition-all hover:border-primary/50",
                selected?.code === unit.code && "border-primary/70 ring-1 ring-primary/40",
              )}
            >
              <RenderImage
                cacheKey={`thumb-${unit.code}`}
                factory={() => unitThumb("living", unit.code)}
                alt={`Render de la unidad ${unit.number}`}
                className="aspect-[16/10] w-full"
                imgClassName="transition-transform duration-700 group-hover:scale-105"
              >
                <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                  <span className={cn("size-2 rounded-full", DOT[unit.status])} />
                  Unidad {unit.number}
                </span>
              </RenderImage>
              <div className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{unit.typology}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatArea(unit.area)} · {unit.orientation}
                    </p>
                  </div>
                  <UnitStatusBadge status={unit.status} />
                </div>
                <p className="text-lg font-light text-primary">
                  {unit.status === "vendida" ? "Vendida" : formatPrice(unit.price, unit.currency)}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <aside className="hidden min-h-0 w-[368px] shrink-0 overflow-y-auto border-l border-border p-4 lg:block">
        <UnitRenderPanel
          unit={selected}
          project={project}
          onConsult={onConsult}
          onCompare={onCompare}
          compareActive={selected ? compareActive(selected) : false}
          onTour360={onTour360}
          className="rounded-xl"
        />
      </aside>

      {selected && (
        <div className="fixed inset-x-3 bottom-3 z-30 lg:hidden">
          <UnitRenderPanel
            unit={selected}
            project={project}
            onConsult={onConsult}
            onCompare={onCompare}
            compareActive={compareActive(selected)}
            onTour360={onTour360}
            className="max-h-[52vh] overflow-y-auto rounded-xl"
          />
        </div>
      )}
    </div>
  );
}
