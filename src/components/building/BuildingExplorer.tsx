import { cn } from "@/lib/utils";
import { formatArea, formatPrice, ordinalFloor } from "@/lib/format";
import type { Unit } from "@/types/domain";

const statusRing: Record<Unit["status"], string> = {
  disponible: "border-available/50 bg-available/10 hover:bg-available/20 text-foreground",
  reservada: "border-reserved/50 bg-reserved/10 hover:bg-reserved/20 text-foreground",
  vendida: "border-border bg-muted/60 text-muted-foreground",
};

interface Props {
  units: Unit[];
  selectedCode?: string | null;
  compareCodes?: string[];
  onSelect: (unit: Unit) => void;
  className?: string;
}

export function BuildingExplorer({
  units,
  selectedCode,
  compareCodes = [],
  onSelect,
  className,
}: Props) {
  const floors = [...new Set(units.map((u) => u.floor))].sort((a, b) => b - a);

  return (
    <div className={cn("panel overflow-hidden", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <p className="eyebrow">Masterplan</p>
          <h3 className="text-base font-medium">Corte del edificio</h3>
        </div>
        <Legend />
      </div>

      <div className="space-y-2 p-4 sm:p-5">
        <div className="mx-auto h-2 w-[92%] rounded-t-md bg-elevated" aria-hidden />
        {floors.map((floor) => {
          const floorUnits = units
            .filter((u) => u.floor === floor)
            .sort((a, b) => a.number.localeCompare(b.number));
          return (
            <div key={floor} className="flex items-stretch gap-3">
              <div className="flex w-14 shrink-0 items-center justify-end text-xs text-muted-foreground">
                {floor}° piso
              </div>
              <div className="grid flex-1 grid-cols-3 gap-2">
                {floorUnits.map((unit) => {
                  const isSelected = unit.code === selectedCode;
                  const inCompare = compareCodes.includes(unit.code);
                  return (
                    <button
                      key={unit.id}
                      type="button"
                      onClick={() => onSelect(unit)}
                      aria-label={`Unidad ${unit.number}, ${unit.typology}, ${unit.status}`}
                      className={cn(
                        "group relative rounded-md border px-2 py-3 text-left transition-all duration-200",
                        statusRing[unit.status],
                        isSelected && "ring-2 ring-ring ring-offset-2 ring-offset-background",
                        inCompare && "outline outline-1 outline-primary/60",
                      )}
                    >
                      <span className="block text-sm font-medium tabular-nums">{unit.number}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {unit.typology}
                      </span>
                      <span className="pointer-events-none absolute inset-x-1 -top-14 z-10 hidden rounded-md border border-border bg-popover p-2 text-[11px] leading-tight shadow-panel group-hover:block">
                        {ordinalFloor(unit.floor)} · {formatArea(unit.area)}
                        <br />
                        {unit.status === "disponible"
                          ? formatPrice(unit.price, unit.currency)
                          : unit.status}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        <div className="flex items-stretch gap-3">
          <div className="flex w-14 shrink-0 items-center justify-end text-xs text-muted-foreground">
            PB
          </div>
          <div className="flex-1 rounded-md border border-dashed border-border px-3 py-4 text-xs text-muted-foreground">
            Acceso, lobby y locales comerciales
          </div>
        </div>
      </div>
    </div>
  );
}

export function Legend() {
  return (
    <ul className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
      {(
        [
          ["Disponible", "bg-available"],
          ["Reservada", "bg-reserved"],
          ["Vendida", "bg-sold"],
        ] as const
      ).map(([label, dot]) => (
        <li key={label} className="flex items-center gap-2">
          <span className={cn("size-2 rounded-full", dot)} />
          {label}
        </li>
      ))}
    </ul>
  );
}
