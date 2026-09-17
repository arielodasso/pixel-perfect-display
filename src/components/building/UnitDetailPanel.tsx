import { ArrowUpRight, GitCompareArrows, Maximize2 } from "lucide-react";
import { useState } from "react";

import { FloorplanViewer } from "@/components/building/FloorplanViewer";
import { UnitStatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { formatArea, formatPrice, ordinalFloor } from "@/lib/format";
import { trackEvent } from "@/lib/tracking";
import { cn } from "@/lib/utils";
import type { Unit } from "@/types/domain";

interface Props {
  unit: Unit | null;
  onConsult?: (unit: Unit) => void;
  onCompare?: (unit: Unit) => void;
  compareActive?: boolean;
  className?: string;
  variant?: "public" | "admin";
}

export function UnitDetailPanel({
  unit,
  onConsult,
  onCompare,
  compareActive,
  className,
  variant = "public",
}: Props) {
  const [planOpen, setPlanOpen] = useState(false);

  if (!unit) {
    return (
      <div
        className={cn(
          "panel flex min-h-[320px] flex-col items-center justify-center gap-2 p-8 text-center",
          className,
        )}
      >
        <p className="text-sm font-medium">Elegí una unidad</p>
        <p className="max-w-[26ch] text-xs text-muted-foreground">
          Tocá cualquier unidad del edificio para ver superficie, precio y plano.
        </p>
      </div>
    );
  }

  const rows: [string, string][] = [
    ["Piso", ordinalFloor(unit.floor)],
    ["Tipología", unit.typology],
    ["Superficie", formatArea(unit.area)],
    ["Ambientes", `${unit.rooms}`],
    ["Orientación", unit.orientation],
    ["Balcón", unit.balcony ? "Sí" : "No"],
    ["Cochera", unit.parking ? "Opcional" : "No"],
  ];

  return (
    <div className={cn("panel flex flex-col overflow-hidden", className)}>
      <div className="flex items-start justify-between gap-4 border-b border-border p-5">
        <div>
          <p className="eyebrow">{unit.code}</p>
          <h3 className="mt-1 text-2xl font-light tracking-tight">Unidad {unit.number}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {ordinalFloor(unit.floor)} · {unit.typology}
          </p>
        </div>
        <UnitStatusBadge status={unit.status} />
      </div>

      <div className="border-b border-border p-5">
        <p className="eyebrow">Precio</p>
        <p className="mt-1 text-3xl font-light tracking-tight text-primary">
          {formatPrice(unit.price, unit.currency)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {formatPrice(Math.round(unit.price / unit.area), unit.currency)} por m²
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 p-5 text-sm">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-0.5">{value}</dd>
          </div>
        ))}
      </dl>

      <button
        type="button"
        onClick={() => {
          setPlanOpen(true);
          trackEvent("floorplan_view", { unit: unit.code });
        }}
        className="group relative mx-5 mb-5 overflow-hidden rounded-lg border border-border bg-white"
      >
        <img
          src={unit.floorplan}
          alt={`Plano de la unidad ${unit.number}`}
          loading="lazy"
          width={1280}
          height={960}
          className="h-40 w-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md bg-background/80 px-2 py-1 text-xs">
          <Maximize2 className="size-3" /> Ver plano
        </span>
      </button>

      {variant === "public" && (
        <div className="mt-auto space-y-2 border-t border-border p-5">
          <Button
            className="w-full"
            disabled={unit.status !== "disponible"}
            onClick={() => onConsult?.(unit)}
          >
            {unit.status === "disponible" ? "Quiero esta unidad" : "Unidad no disponible"}
            <ArrowUpRight className="size-4" />
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => onConsult?.(unit)}>
              Consultar
            </Button>
            <Button
              variant={compareActive ? "secondary" : "outline"}
              onClick={() => onCompare?.(unit)}
            >
              <GitCompareArrows className="size-4" />
              {compareActive ? "Quitar de comparar" : "Agregar a comparar"}
            </Button>
          </div>
        </div>
      )}

      <FloorplanViewer
        open={planOpen}
        onOpenChange={setPlanOpen}
        unit={unit}
        onConsult={onConsult}
        source="unit"
      />
    </div>
  );
}
