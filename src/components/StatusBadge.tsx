import { cn } from "@/lib/utils";
import type { LeadStatus, UnitStatus } from "@/types/domain";

const unitStyles: Record<UnitStatus, string> = {
  disponible: "bg-available/15 text-available border-available/30",
  reservada: "bg-reserved/15 text-reserved border-reserved/30",
  vendida: "bg-muted text-muted-foreground border-border",
};

const leadStyles: Record<LeadStatus, string> = {
  Nuevo: "bg-available/15 text-available border-available/30",
  Contactado: "bg-chart-2/15 text-chart-2 border-chart-2/30",
  Calificado: "bg-chart-4/15 text-chart-4 border-chart-4/30",
  Visita: "bg-reserved/15 text-reserved border-reserved/30",
  Reserva: "bg-primary/20 text-primary border-primary/40",
  Cerrado: "bg-muted text-muted-foreground border-border",
};

export function UnitStatusBadge({
  status,
  className,
}: {
  status: UnitStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
        unitStyles[status],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

export function LeadStatusBadge({
  status,
  className,
}: {
  status: LeadStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        leadStyles[status],
        className,
      )}
    >
      {status}
    </span>
  );
}
