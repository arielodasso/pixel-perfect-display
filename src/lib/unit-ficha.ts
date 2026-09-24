import { formatArea, formatNumber, formatPrice } from "@/lib/format";
import type { Unit } from "@/types/domain";

export interface FichaData {
  projectName: string;
  developer: string;
  address: string;
  brandColor: string;
  unit: Unit;
  /** Descripción de las condiciones de financiación vigentes. */
  financing: string;
  deliveryDate: string;
  contactEmail: string;
  contactPhone: string;
  whatsapp: string;
}

const ESCAPE_RE = /[&<>"']/g;
const ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function esc(value: string | number | null | undefined) {
  return String(value ?? "").replace(ESCAPE_RE, (ch) => ESCAPE_MAP[ch] ?? ch);
}

const STATUS_LABEL: Record<Unit["status"], string> = {
  disponible: "Disponible",
  reservada: "Reservada",
  vendida: "Vendida",
};

function unitRows(unit: Unit) {
  return [
    ["Código", unit.code],
    ["Tipología", unit.typology],
    ["Superficie", formatArea(unit.area)],
    ["Orientación", unit.orientation],
    ["Balcón", unit.balcony ? "Sí" : "No"],
    ["Cochera", unit.parking ? "Opcional" : "No"],
    ["Estado", STATUS_LABEL[unit.status]],
    ["Precio", formatPrice(unit.price, unit.currency)],
    ["Precio por m²", formatPrice(Math.round(unit.price / unit.area), unit.currency)],
  ] as const;
}

/**
 * Genera el HTML de la ficha técnica de una unidad (pensado para impresión → PDF).
 * Estilo claro y de una página para que se vea prolijo en pantalla y en papel.
 */
export function buildUnitFichaHtml(data: FichaData): string {
  const { unit } = data;
  const dBrand = unit.status === "disponible";
  const rows = unitRows(unit);

  const rowsHtml = rows
    .map(
      ([label, value]) => `<tr>
        <td style="padding:6px 14px;color:#64748b;">${esc(label)}</td>
        <td style="padding:6px 14px;color:#0f172a;font-weight:600;">${esc(value)}</td>
      </tr>`,
    )
    .join("\n");

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Ficha — ${esc(unit.code)}</title>
<style>
  * { box-sizing: border-box; }
  body { margin:0; font-family: "Segoe UI", Roboto, Arial, sans-serif; color:#0f172a; background:#f1f5f9; }
  .sheet { max-width:720px; margin:24px auto; background:#ffffff; border-radius:16px; padding:40px 44px; box-shadow:0 20px 60px -30px rgba(15,23,42,.4); }
  .head { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:4px solid ${esc(data.brandColor)}; padding-bottom:16px; }
  .head h1 { margin:0; font-size:22px; letter-spacing:-.02em; }
  .head .dev { color:#64748b; font-size:12px; margin-top:4px; }
  .badge { display:inline-block; padding:4px 10px; border-radius:999px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.08em;
    background:${dBrand ? "#e2fc03" : unit.status === "reservada" ? "#ffedd5" : "#e2e8f0"}; color:#0f172a; }
  .grid { display:grid; grid-template-columns:1.2fr .8fr; gap:20px; margin-top:22px; }
  .price { font-size:26px; font-weight:800; letter-spacing:-.02em; }
  .price small { display:block; font-size:11px; font-weight:400; color:#64748b; margin-top:2px; }
  table { width:100%; border-collapse:collapse; font-size:13px; }
  tr { border-bottom:1px solid #e2e8f0; }
  .unit-title { font-size:15px; font-weight:700; margin:0 0 10px; }
  .financing { margin-top:22px; border-top:1px solid #e2e8f0; padding-top:16px; font-size:12px; color:#475569; line-height:1.6; }
  .financing b { color:#0f172a; }
  .foot { margin-top:24px; text-align:center; font-size:11px; color:#94a3b8; }
</style>
</head>
<body>
<div class="sheet">
  <div class="head">
    <div>
      <h1>${esc(data.projectName)}</h1>
      <p class="dev">${esc(data.developer)} · ${esc(data.address)}</p>
    </div>
    <span class="badge">${esc(STATUS_LABEL[unit.status])}</span>
  </div>

  <div class="grid">
    <div>
      <p class="unit-title">Unidad ${esc(unit.number)} — ${ordinalFor(unit.floor)}</p>
      <p class="price">
        ${esc(formatPrice(unit.price, unit.currency))}
        <small>Contado &nbsp;·&nbsp; ${esc(formatNumber(Math.round(unit.price / unit.area)))} por m²</small>
      </p>
    </div>
    <div>
      <table>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>
  </div>

  <div class="financing">
    <b>Condiciones de financiación:</b><br />
    ${esc(data.financing)}<br />
    Entrega estimada: <b>${esc(data.deliveryDate)}</b>
  </div>

  <div class="foot">
    Ficha generada el ${esc(new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" }))}
    — Documento orientativo, no constituye oferta comercial.
    <br />${esc(data.developer)} · ${esc(data.contactPhone)} · ${esc(data.contactEmail)}
  </div>
</div>
<script>window.onload = function(){ window.print(); };</script>
</body>
</html>`;
}

function ordinalFor(floor: number) {
  return floor === 0 ? "planta baja" : `${floor}° piso`;
}

/** Abre una ventana de impresión con la ficha para guardarla como PDF. */
export function printUnitFicha(data: FichaData) {
  const html = buildUnitFichaHtml(data);
  const win = window.open("", "_blank", "width=860,height=1100");
  if (!win) {
    const hidden = document.createElement("iframe");
    hidden.style.position = "fixed";
    hidden.style.right = "0";
    hidden.style.bottom = "0";
    hidden.style.width = "0";
    hidden.style.height = "0";
    hidden.style.border = "0";
    document.body.appendChild(hidden);
    const doc = hidden.contentDocument;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
    }
    window.setTimeout(() => {
      hidden.contentWindow?.print();
      window.setTimeout(() => hidden.remove(), 1000);
    }, 300);
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
}
