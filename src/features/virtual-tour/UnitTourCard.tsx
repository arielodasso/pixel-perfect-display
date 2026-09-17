import { ArrowUpRight, GitCompareArrows, MapPin, Ruler, Maximize2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { FloorplanViewer } from "@/components/building/FloorplanViewer";
import { UnitStatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { formatArea, formatPrice } from "@/lib/format";
import { useCompare, toggleCompareUnit } from "@/services/store";
import type { Project, Unit } from "@/types/domain";

interface Props {
  unit: Unit;
  project: Project;
  onConsult: (unit: Unit) => void;
}

/** Panel con el detalle comercial de una unidad dentro del Tour Virtual. */
export function UnitTourCard({ unit, project, onConsult }: Props) {
  const compare = useCompare();
  const [planOpen, setPlanOpen] = useState(false);
  const inCompare = compare.includes(unit.code);
  const available = unit.status === "disponible";

  function handleCompare() {
    const result = toggleCompareUnit(unit.code);
    if (result.removed) {
      toast.info("Unidad quitada del comparador");
      return;
    }
    if (result.isFull) {
      toast.error("Podés comparar hasta 3 unidades", {
        description: "Quitá alguna del comparador para poder agregar esta.",
      });
      return;
    }
    toast.success("Unidad agregada a comparar", {
      description: "La vas a poder comparar en el showroom.",
    });
  }

  const rows: [string, string][] = [
    ["Tipología", unit.typology],
    ["Superficie", formatArea(unit.area)],
    ["Ambientes", `${unit.rooms}`],
    ["Orientación", unit.orientation],
    ["Balcón", unit.balcony ? "Sí" : "No"],
    ["Cochera", unit.parking ? "Opcional" : "No"],
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-border p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow">{unit.code}</p>
            <h3 className="mt-1 text-2xl font-light tracking-tight">Unidad {unit.number}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {unit.floor === 0 ? "Planta baja" : `${unit.floor}° piso`} · {unit.typology}
            </p>
          </div>
          <UnitStatusBadge status={unit.status} />
        </div>
      </div>

      <div className="border-b border-border p-5">
        <p className="eyebrow">Precio</p>
        <p className="mt-1 text-3xl font-light tracking-tight text-primary">
          {unit.status === "vendida" ? "Vendida" : formatPrice(unit.price, unit.currency)}
        </p>
        {unit.status !== "vendida" && (
          <p className="mt-1 text-xs text-muted-foreground">
            {formatPrice(Math.round(unit.price / unit.area), unit.currency)} por m²
          </p>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 p-5 text-sm">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-0.5">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="border-b border-border px-5 py-4">
        <p className="eyebrow">Financiación</p>
        <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
          <li className="flex items-start gap-2">
            <Ruler className="mt-0.5 size-3.5 shrink-0 text-primary" />
            Anticipo: {project.financing.advance}
          </li>
          <li className="flex items-start gap-2">
            <MapPin className="mt-0.5 size-3.5 shrink-0 text-primary" />
            Cuotas: {project.financing.installments}
          </li>
          <li className="flex items-start gap-2">
            <Maximize2 className="mt-0.5 size-3.5 shrink-0 text-primary" />
            Saldo: {project.financing.balance}
          </li>
        </ul>
      </div>

      <div className="mt-auto space-y-2 p-5">
        <Button className="w-full" onClick={() => setPlanOpen(true)}>
          Ver unidad <Maximize2 className="size-4" />
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            disabled={!available}
            onClick={() => onConsult(unit)}
            title={available ? "Consultar por esta unidad" : "Unidad no disponible"}
          >
            {available ? "Consultar" : "No disponible"}
            <ArrowUpRight className="size-4" />
          </Button>
          <Button variant={inCompare ? "secondary" : "outline"} onClick={handleCompare}>
            <GitCompareArrows className="size-4" />
            {inCompare ? "Quitar" : "Comparar"}
          </Button>
        </div>
      </div>

      <FloorplanViewer open={planOpen} onOpenChange={setPlanOpen} unit={unit} source="tour" />
    </div>
  );
}
