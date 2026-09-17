import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { AdminPage, StatCard } from "@/components/admin/AdminPage";
import { UnitStatusBadge } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatArea, formatNumber, formatPrice, ordinalFloor } from "@/lib/format";
import { unitStats, updateUnitStatus, useUnits } from "@/services/store";
import type { Unit, UnitStatus } from "@/types/domain";

export const Route = createFileRoute("/admin/unidades")({
  component: AdminUnidades,
});

const statuses: UnitStatus[] = ["disponible", "reservada", "vendida"];

function AdminUnidades() {
  const units = useUnits();
  const stats = unitStats(units);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"todas" | UnitStatus>("todas");
  const [typology, setTypology] = useState("todas");
  const [floor, setFloor] = useState("todos");

  const typologyOptions = [...new Set(units.map((u) => u.typology))].sort();
  const floorOptions = [...new Set(units.map((u) => u.floor))].sort((a, b) => b - a);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return units
      .filter((unit) => status === "todas" || unit.status === status)
      .filter((unit) => typology === "todas" || unit.typology === typology)
      .filter((unit) => floor === "todos" || unit.floor === Number(floor))
      .filter((unit) => {
        if (!q) return true;
        return (
          unit.code.toLowerCase().includes(q) ||
          unit.number.toLowerCase().includes(q) ||
          unit.typology.toLowerCase().includes(q) ||
          unit.orientation.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.floor - a.floor || a.number.localeCompare(b.number));
  }, [units, search, status, typology, floor]);

  return (
    <AdminPage
      eyebrow="Inventario"
      title="Unidades"
      description={`${stats.total} unidades en total · ${stats.available} disponibles · ${stats.reserved} reservadas · ${stats.sold} vendidas`}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Disponibles" value={formatNumber(stats.available)} />
        <StatCard label="Reservadas" value={formatNumber(stats.reserved)} />
        <StatCard label="Vendidas" value={formatNumber(stats.sold)} />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código, piso, tipología…"
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as "todas" | UnitStatus)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todos los estados</SelectItem>
            {statuses.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typology} onValueChange={setTypology}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las tipologías</SelectItem>
            {typologyOptions.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={floor} onValueChange={setFloor}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los pisos</SelectItem>
            {floorOptions.map((f) => (
              <SelectItem key={f} value={String(f)}>
                {f}° piso
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="panel mt-5 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unidad</TableHead>
                <TableHead>Piso</TableHead>
                <TableHead>Tipología</TableHead>
                <TableHead>Superficie</TableHead>
                <TableHead>Orientación</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Precio / m²</TableHead>
                <TableHead>Vistas</TableHead>
                <TableHead className="text-right">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((unit) => (
                <TableRow key={unit.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{unit.code}</p>
                      <p className="text-xs text-muted-foreground">Unidad {unit.number}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {ordinalFloor(unit.floor)}
                  </TableCell>
                  <TableCell>{unit.typology}</TableCell>
                  <TableCell>{formatArea(unit.area)}</TableCell>
                  <TableCell className="text-muted-foreground">{unit.orientation}</TableCell>
                  <TableCell>{formatPrice(unit.price, unit.currency)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatPrice(Math.round(unit.price / unit.area), unit.currency)}
                  </TableCell>
                  <TableCell>{formatNumber(unit.views)}</TableCell>
                  <TableCell className="text-right">
                    <UnitEditor unit={unit} />
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    No hay unidades que coincidan con los filtros.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3 text-xs text-muted-foreground">
          <span>
            Mostrando {filtered.length} de {units.length} unidades
          </span>
          <UnitStatusBadge status="disponible" />
        </div>
      </div>

      <div className="mt-8">
        <p className="eyebrow mb-3">Cómo se usan los estados</p>
        <div className="panel grid gap-4 p-6 text-sm text-muted-foreground sm:grid-cols-3">
          <p>
            <span className="font-medium text-foreground">Disponible</span> — a la venta y visible
            para consulta en el showroom.
          </p>
          <p>
            <span className="font-medium text-foreground">Reservada</span> — apartada con seña, sin
            contacto directo desde el showroom.
          </p>
          <p>
            <span className="font-medium text-foreground">Vendida</span> — operación cerrada, se
            muestra sin precio en el corte del edificio.
          </p>
        </div>
      </div>
    </AdminPage>
  );
}

function UnitEditor({ unit }: { unit: Unit }) {
  return (
    <Select
      value={unit.status}
      onValueChange={(value) => updateUnitStatus(unit.id, value as UnitStatus)}
    >
      <SelectTrigger className="inline-flex h-8 w-auto gap-2">
        <UnitStatusBadge status={unit.status} className="pointer-events-none" />
        <span className="text-xs text-muted-foreground">cambiar</span>
      </SelectTrigger>
      <SelectContent>
        {statuses.map((status) => (
          <SelectItem key={status} value={status} className="capitalize">
            {status}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
