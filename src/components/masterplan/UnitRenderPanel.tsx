import { ArrowUpRight, Box, GitCompareArrows, Maximize2 } from "lucide-react";
import { useState } from "react";

import { FloorplanViewer } from "@/components/building/FloorplanViewer";
import { UnitStatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { formatArea, formatPrice, ordinalFloor } from "@/lib/format";
import { unitHero } from "@/lib/renders";
import { cn } from "@/lib/utils";
import type { Project, Unit } from "@/types/domain";

import { RenderImage } from "./RenderImage";

interface Props {
  unit: Unit | null;
  project: Project;
  onConsult: (unit: Unit) => void;
  onCompare?: (unit: Unit) => void;
  compareActive?: boolean;
  onTour360?: (unit: Unit) => void;
  className?: string;
}

export function UnitRenderPanel({
  unit,
  project,
  onConsult,
  onCompare,
  compareActive = false,
  onTour360,
  className,
}: Props) {
  const [planOpen, setPlanOpen] = useState(false);

  if (!unit) {
    return (
      <div
        className={cn(
          "flex min-h-[280px] flex-col items-center justify-center gap-2 border border-white/10 bg-black/40 p-8 text-center backdrop-blur-sm",
          className,
        )}
      >
        <p className="text-sm font-medium text-white">Elegí una unidad</p>
        <p className="max-w-[26ch] text-xs text-white/60">
          Tocá cualquier unidad del edificio 3D para ver su render, superficie, precio y plano.
        </p>
      </div>
    );
  }

  const available = unit.status === "disponible";

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden border border-white/10 bg-black/55 text-white backdrop-blur-md",
        className,
      )}
    >
      <RenderImage
        cacheKey={`unit-${unit.code}`}
        factory={() => unitHero(unit.code)}
        alt={`Render de la unidad ${unit.number}`}
        className="aspect-[16/9] w-full"
      >
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/60">
                {unit.code}
              </p>
              <h3 className="text-2xl font-light tracking-tight">Unidad {unit.number}</h3>
              <p className="text-xs text-white/60">
                {ordinalFloor(unit.floor)} · {unit.typology}
              </p>
            </div>
            <UnitStatusBadge status={unit.status} />
          </div>
        </div>
      </RenderImage>

      <div className="border-b border-white/10 px-5 py-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/50">Precio</p>
        <p className="mt-1 text-3xl font-light tracking-tight text-primary">
          {unit.status === "vendida" ? "Vendida" : formatPrice(unit.price, unit.currency)}
        </p>
        {unit.status !== "vendida" && (
          <p className="mt-1 text-xs text-white/55">
            {formatPrice(Math.round(unit.price / unit.area), unit.currency)} por m²
          </p>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-b border-white/10 px-5 py-4 text-sm">
        {(
          [
            ["Superficie", formatArea(unit.area)],
            ["Ambientes", `${unit.rooms}`],
            ["Orientación", unit.orientation],
            ["Balcón", unit.balcony ? "Sí" : "No"],
            ["Cochera", unit.parking ? "Opcional" : "No"],
            ["Entrega", project.deliveryDate],
          ] as [string, string][]
        ).map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-white/50">{label}</dt>
            <dd className="mt-0.5">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="space-y-2 p-5">
        {onTour360 && (
          <Button className="w-full" size="lg" onClick={() => onTour360(unit)}>
            <Box className="size-4" /> Recorrer esta unidad en 360°
          </Button>
        )}
        <Button
          className="w-full"
          variant="outline"
          onClick={() => setPlanOpen(true)}
          disabled={!unit.floorplan}
        >
          Ver plano <Maximize2 className="size-4" />
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button disabled={!available} onClick={() => onConsult(unit)}>
            {available ? "Consultar" : "No disponible"}
            <ArrowUpRight className="size-4" />
          </Button>
          <Button
            variant={compareActive ? "secondary" : "outline"}
            onClick={() => onCompare?.(unit)}
          >
            <GitCompareArrows className="size-4" />
            {compareActive ? "Quitar" : "Comparar"}
          </Button>
        </div>
      </div>

      <FloorplanViewer open={planOpen} onOpenChange={setPlanOpen} unit={unit} source="tour" />
    </div>
  );
}
