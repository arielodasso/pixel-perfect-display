export function formatPrice(value: number, currency: "USD" | "ARS" = "USD") {
  const formatted = new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 0,
  }).format(value);
  return `${currency} ${formatted}`;
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("es-AR").format(value);
}

export function formatArea(value: number) {
  return `${new Intl.NumberFormat("es-AR").format(value)} m²`;
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function ordinalFloor(floor: number) {
  return floor === 0 ? "Planta baja" : `${floor}° piso`;
}
