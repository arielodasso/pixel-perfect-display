import type { Unit, UnitStatus } from "@/types/domain";

const STATUSES: UnitStatus[] = ["disponible", "reservada", "vendida"];
const CURRENCIES: Unit["currency"][] = ["USD", "ARS"];

const HEADERS = [
  "code",
  "floor",
  "number",
  "typology",
  "rooms",
  "area",
  "orientation",
  "price",
  "currency",
  "status",
  "views",
  "balcony",
  "parking",
] as const;

type CsvRow = Partial<Record<(typeof HEADERS)[number], string>>;

function escapeCell(value: string | number | boolean): string {
  const s = String(value);
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Genera el contenido CSV de un listado de unidades (delimitador punto y coma). */
export function unitsToCsv(units: Unit[]): string {
  const lines = [HEADERS.join(";")];
  units.forEach((unit) => {
    lines.push(
      [
        unit.code,
        unit.floor,
        unit.number,
        unit.typology,
        unit.rooms,
        unit.area,
        unit.orientation,
        unit.price,
        unit.currency,
        unit.status,
        unit.views,
        unit.balcony ? "1" : "0",
        unit.parking ? "1" : "0",
      ]
        .map((value) => escapeCell(value))
        .join(";"),
    );
  });
  return lines.join("\n");
}

/** Descarga el CSV como archivo en el navegador. */
export function downloadUnitsCsv(units: Unit[], filename = "unidades.csv") {
  const blob = new Blob(["\uFEFF", unitsToCsv(units)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  const cleanup = () => {
    URL.revokeObjectURL(url);
    anchor.remove();
  };
  window.setTimeout(cleanup, 500);
}

function parseCsv(text: string): CsvRow[] {
  const lines = text
    .replace(/\r/g, "")
    .split("\n")
    .filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const header = lines[0]!.split(";").map((h) => h.trim().toLowerCase());
  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i]!.split(";");
    const row: CsvRow = {};
    header.forEach((key, index) => {
      row[key as (typeof HEADERS)[number]] = (cells[index] ?? "").trim();
    });
    rows.push(row);
  }
  return rows;
}

const BOOL_TRUE = /^(1|true|si|sí|yes)$/i;

export interface CsvImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
  items: Unit[];
}

/**
 * Parsea un CSV de unidades y lo convierte en unidades listas para `upsertUnits`.
 * - Las filas con `code` existente se consideran actualizaciones (se conserva su id).
 * - El resto se crean con un id nuevo.
 */
export function parseUnitsCsv(text: string, existing: Unit[]): CsvImportResult {
  const rows = parseCsv(text);
  const byCode = new Map(existing.map((unit) => [unit.code, unit]));
  const result: CsvImportResult = { created: 0, updated: 0, skipped: 0, errors: [], items: [] };

  rows.forEach((row, index) => {
    const line = index + 2;
    if (!row.code || !row.number) {
      result.skipped += 1;
      result.errors.push(`Línea ${line}: falta código o número.`);
      return;
    }
    const floor = Number(row.floor);
    const area = Number(row.area);
    const price = Number(row.price);
    const rooms = Number(row.rooms);
    if (!Number.isFinite(floor) || !Number.isFinite(area) || !Number.isFinite(price)) {
      result.skipped += 1;
      result.errors.push(`Línea ${line}: piso, área o precio no numéricos.`);
      return;
    }

    const status = STATUSES.includes(row.status?.toLowerCase() as UnitStatus)
      ? (row.status!.toLowerCase() as UnitStatus)
      : "disponible";
    const currency = CURRENCIES.includes(row.currency?.toUpperCase() as Unit["currency"])
      ? (row.currency!.toUpperCase() as Unit["currency"])
      : "USD";

    const existingUnit = byCode.get(row.code);
    if (existingUnit) {
      result.updated += 1;
      result.items.push({
        ...existingUnit,
        floor,
        number: row.number,
        typology: row.typology || existingUnit.typology,
        rooms: Number.isFinite(rooms) ? rooms : existingUnit.rooms,
        area,
        orientation: row.orientation || existingUnit.orientation,
        price,
        currency,
        status,
        views: Number.isFinite(Number(row.views)) ? Number(row.views) : existingUnit.views,
        balcony: row.balcony ? BOOL_TRUE.test(row.balcony) : existingUnit.balcony,
        parking: row.parking ? BOOL_TRUE.test(row.parking) : existingUnit.parking,
      });
    } else {
      result.created += 1;
      const typologyName = row.typology || `${rooms || 2} ambientes`;
      result.items.push({
        id: `unit_${row.code.replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase()}`,
        projectId: existing[0]?.projectId ?? "prj_torre_horizonte",
        code: row.code,
        floor,
        number: row.number,
        typologyId:
          typologyName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "") || "tipologia",
        typology: typologyName,
        rooms: Number.isFinite(rooms) ? rooms : 2,
        area,
        orientation: row.orientation || "Frente / Norte",
        price,
        currency,
        status,
        views: Number.isFinite(Number(row.views)) ? Number(row.views) : 0,
        floorplan: existing[0]?.floorplan ?? "",
        balcony: row.balcony ? BOOL_TRUE.test(row.balcony) : false,
        parking: row.parking ? BOOL_TRUE.test(row.parking) : false,
      });
    }
  });

  const unique = new Set(result.items.map((unit) => unit.id));
  if (unique.size !== result.items.length) {
    result.errors.push(
      "Se detectaron códigos repetidos; las unidades duplicadas se importaron una sola vez.",
    );
  }
  return { ...result, items: [...new Map(result.items.map((unit) => [unit.id, unit])).values()] };
}
