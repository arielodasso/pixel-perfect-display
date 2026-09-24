import { createFileRoute } from "@tanstack/react-router";
import { Download, Pencil, Plus, Search, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { AdminPage, StatCard } from "@/components/admin/AdminPage";
import { UnitStatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { downloadUnitsCsv, parseUnitsCsv } from "@/lib/units-csv";
import { unitStats, updateUnit, upsertUnits, useUnits } from "@/services/store";
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
  const [editing, setEditing] = useState<Unit | "new" | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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

  function handleExport() {
    downloadUnitsCsv(units);
    toast.success(`Exportadas ${units.length} unidades a CSV`);
  }

  async function handleImportFile(file: File) {
    const text = await file.text();
    const result = parseUnitsCsv(text, units);
    if (result.items.length > 0) upsertUnits(result.items);
    const messages = [
      result.created > 0 ? `${result.created} nuevas` : null,
      result.updated > 0 ? `${result.updated} actualizadas` : null,
      result.skipped > 0 ? `${result.skipped} omitidas` : null,
    ].filter(Boolean);
    toast.success(messages.length > 0 ? `Importación ok: ${messages.join(", ")}` : "Sin cambios");
    if (result.errors.length > 0) {
      toast.warning(`${result.errors.length} filas con problemas`, {
        description: result.errors.slice(0, 4).join(" · "),
      });
    }
  }

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

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            <Upload className="size-4" /> Importar CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="size-4" /> Exportar CSV
          </Button>
        </div>
        <Button size="sm" onClick={() => setEditing("new")}>
          <Plus className="size-4" /> Nueva unidad
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleImportFile(file);
            e.target.value = "";
          }}
        />
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
                <TableHead>Precio</TableHead>
                <TableHead>Vistas</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
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
                  <TableCell>
                    {formatPrice(unit.price, unit.currency)}
                    <p className="text-xs text-muted-foreground">
                      {formatPrice(Math.round(unit.price / unit.area), unit.currency)} / m²
                    </p>
                  </TableCell>
                  <TableCell>{formatNumber(unit.views)}</TableCell>
                  <TableCell>
                    <UnitStatusBadge status={unit.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Select
                        value={unit.status}
                        onValueChange={(value) =>
                          updateUnit(unit.id, { status: value as UnitStatus })
                        }
                      >
                        <SelectTrigger className="inline-flex h-8 w-auto gap-2">
                          <span className="text-xs text-muted-foreground">cambiar</span>
                        </SelectTrigger>
                        <SelectContent>
                          {statuses.map((s) => (
                            <SelectItem key={s} value={s} className="capitalize">
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Editar unidad ${unit.code}`}
                        onClick={() => setEditing(unit)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={8}
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

      <UnitEditorDialog
        key={editing !== null && editing !== "new" ? editing.id : "new"}
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        unit={editing !== null && editing !== "new" ? editing : null}
      />
    </AdminPage>
  );
}

const fieldClasses =
  "w-full rounded-lg border border-input bg-elevated px-3 py-2 text-sm text-foreground outline-none transition-colors hover:border-ring/40 focus:border-ring/60";

function UnitEditorDialog({
  open,
  onOpenChange,
  unit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unit: Unit | null;
}) {
  const [form, setForm] = useState(() => ({ ...getEmpty(unit) }));
  const isNew = !unit;

  function setValue<K extends keyof UnitForm>(key: K, value: UnitForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    const area = Number(form.area);
    const price = Number(form.price);
    const floor = Number(form.floor);
    const views = Number(form.views);
    if (!form.code.trim() || !form.number.trim()) {
      toast.error("El código y el número son obligatorios.");
      return;
    }
    if (!Number.isFinite(area) || !Number.isFinite(price) || !Number.isFinite(floor)) {
      toast.error("Revisá los valores numéricos.");
      return;
    }
    const patch: Unit = {
      id:
        unit?.id ??
        `unit_${form.code
          .trim()
          .replace(/[^a-zA-Z0-9_-]/g, "")
          .toLowerCase()}`,
      projectId: unit?.projectId ?? "prj_torre_horizonte",
      code: form.code.trim(),
      floor,
      number: form.number.trim(),
      typologyId:
        unit?.typologyId ??
        (form.typology
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") ||
          "tipologia"),
      typology: form.typology.trim(),
      rooms: form.rooms,
      area,
      orientation: form.orientation.trim(),
      price,
      currency: form.currency,
      status: form.status,
      views,
      floorplan: unit?.floorplan ?? "",
      balcony: form.balcony,
      parking: form.parking,
    };
    if (isNew) upsertUnits([patch]);
    else if (unit) updateUnit(unit.id, patch);
    toast.success(isNew ? `Unidad ${patch.code} creada` : `Unidad ${patch.code} actualizada`);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-light">
            {isNew ? "Nueva unidad" : `Editar ${unit.code}`}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <Label>Código</Label>
            <input
              className={fieldClasses}
              value={form.code}
              onChange={(e) => setValue("code", e.target.value)}
              placeholder="TH-203"
            />
          </label>
          <label className="block space-y-1.5">
            <Label>Número</Label>
            <input
              className={fieldClasses}
              value={form.number}
              onChange={(e) => setValue("number", e.target.value)}
              placeholder="203"
            />
          </label>
          <label className="block space-y-1.5">
            <Label>Piso</Label>
            <input
              className={fieldClasses}
              value={form.floor}
              type="number"
              onChange={(e) => setValue("floor", e.target.value)}
            />
          </label>
          <label className="block space-y-1.5">
            <Label>Tipología</Label>
            <input
              className={fieldClasses}
              value={form.typology}
              onChange={(e) => setValue("typology", e.target.value)}
              placeholder="2 ambientes"
            />
          </label>
          <label className="block space-y-1.5">
            <Label>Ambientes</Label>
            <input
              className={fieldClasses}
              value={form.rooms}
              type="number"
              min={1}
              max={4}
              onChange={(e) => setValue("rooms", Number(e.target.value) || 1)}
            />
          </label>
          <label className="block space-y-1.5">
            <Label>Superficie (m²)</Label>
            <input
              className={fieldClasses}
              value={form.area}
              type="number"
              step="0.5"
              onChange={(e) => setValue("area", e.target.value)}
            />
          </label>
          <label className="block space-y-1.5">
            <Label>Orientación</Label>
            <input
              className={fieldClasses}
              value={form.orientation}
              onChange={(e) => setValue("orientation", e.target.value)}
              placeholder="Frente / Norte"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5">
              <Label>Precio</Label>
              <input
                className={fieldClasses}
                value={form.price}
                type="number"
                onChange={(e) => setValue("price", e.target.value)}
              />
            </label>
            <label className="block space-y-1.5">
              <Label>Moneda</Label>
              <Select
                value={form.currency}
                onValueChange={(v) => setValue("currency", v as Unit["currency"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="ARS">ARS</SelectItem>
                </SelectContent>
              </Select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5">
              <Label>Estado</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setValue("status", v as UnitStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="block space-y-1.5">
              <Label>Vistas</Label>
              <input
                className={fieldClasses}
                value={form.views}
                type="number"
                onChange={(e) => setValue("views", e.target.value)}
              />
            </label>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-5">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={form.balcony}
              onCheckedChange={(c) => setValue("balcony", c === true)}
            />
            Balcón
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={form.parking}
              onCheckedChange={(c) => setValue("parking", c === true)}
            />
            Cochera opcional
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>{isNew ? "Crear unidad" : "Guardar cambios"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface UnitForm {
  code: string;
  number: string;
  floor: string;
  typology: string;
  rooms: number;
  area: string;
  orientation: string;
  price: string;
  currency: Unit["currency"];
  status: UnitStatus;
  views: string;
  balcony: boolean;
  parking: boolean;
}

function getEmpty(unit: Unit | null): UnitForm {
  return {
    code: unit?.code ?? "",
    number: unit?.number ?? "",
    floor: String(unit?.floor ?? 1),
    typology: unit?.typology ?? "2 ambientes",
    rooms: unit?.rooms ?? 2,
    area: String(unit?.area ?? 60),
    orientation: unit?.orientation ?? "Frente / Norte",
    price: String(unit?.price ?? 90000),
    currency: unit?.currency ?? "USD",
    status: unit?.status ?? "disponible",
    views: String(unit?.views ?? 0),
    balcony: unit?.balcony ?? false,
    parking: unit?.parking ?? true,
  };
}
