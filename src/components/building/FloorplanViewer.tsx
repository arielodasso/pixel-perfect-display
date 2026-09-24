import { ArrowUpRight } from "lucide-react";
import { useState } from "react";

import { DecoratedFloorplan } from "@/components/building/DecoratedFloorplan";
import { PanZoom } from "@/components/interactive/PanZoom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatArea } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Unit } from "@/types/domain";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unit: Unit | null;
  onConsult?: ((unit: Unit) => void) | undefined;
  source?: "unit" | "tour";
}

type PlanView = "arquitectura" | "decorado";

/**
 * Visor de planos en modo lightbox con zoom/pan profesional:
 * rueda del mouse, pinch-to-zoom, arrastre y controles +/−/restablecer.
 * Incluye toggle Arquitectura / Decorado (plano amoblado).
 */
export function FloorplanViewer({ open, onOpenChange, unit, onConsult, source = "unit" }: Props) {
  const [view, setView] = useState<PlanView>("arquitectura");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            Plano — Unidad {unit?.number} · {unit?.typology} · {unit ? formatArea(unit.area) : ""}
          </DialogTitle>
          <DialogDescription>
            Arrastrá para mover el plano · usá la rueda o pinch para acercar hasta el detalle ·
            restablecé el encuadre cuando quieras.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-border bg-background/60 p-0.5">
            {(["arquitectura", "decorado"] as const).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setView(id)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  view === id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {id === "arquitectura" ? "Arquitectura" : "Decorado"}
              </button>
            ))}
          </div>
          <span className="text-xs text-muted-foreground">
            {view === "decorado"
              ? "Plano amoblado orientativo — los muebles no se incluyen en la entrega."
              : "Plano técnico original de la unidad."}
          </span>
        </div>

        <PanZoom
          key={`${unit?.id ?? "plano"}-${view}`}
          className="h-[60vh] w-full rounded-lg border border-border bg-white"
          fit="contain"
          minScale={0.2}
          maxScale={6}
          hint="Arrastrá para mover · rueda o pinch para zoom"
        >
          {view === "decorado" && unit ? (
            <DecoratedFloorplan
              rooms={unit.rooms}
              balcony={unit.balcony}
              area={unit.area}
              className="h-auto max-w-none"
            />
          ) : (
            <img
              src={unit?.floorplan}
              alt={`Plano de la unidad ${unit?.number ?? ""}`}
              width={1280}
              height={960}
              draggable={false}
              className="h-auto max-w-none select-none"
            />
          )}
        </PanZoom>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">Zoom hasta 600% sin perder nitidez.</span>
          {source === "unit" && unit && onConsult ? (
            <Button onClick={() => onConsult(unit)}>
              Consultar por esta unidad <ArrowUpRight className="size-4" />
            </Button>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
