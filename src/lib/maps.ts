import type { ProjectLocation } from "@/types/domain";

/**
 * Helpers de Google Maps.
 *
 * Si se provee `VITE_GOOGLE_MAPS_API_KEY`, se usa la Google Maps Embed API
 * oficial (modo `view`, sin exponer la clave en el bundle: posteriormente la
 * lectura de la clave debería delegarse a un server function / Lovable Cloud).
 * Sin clave, se usa la URL pública de Maps con `output=embed`, que funciona
 * sin API key y sin comprometer seguridad.
 *
 * Nunca acceder a la API key desde componentes; usar este módulo.
 */
export function getGoogleMapsApiKey(): string | undefined {
  const key = import.meta.env["VITE_GOOGLE_MAPS_API_KEY"];
  return typeof key === "string" && key.length > 0 ? key : undefined;
}

function encodeCoords(lat: number, lng: number) {
  return `${lat.toFixed(6)},${lng.toFixed(6)}`;
}

export function buildGoogleMapsEmbedUrl(
  location: Pick<ProjectLocation, "latitude" | "longitude">,
  zoom = 16,
): string {
  const key = getGoogleMapsApiKey();
  const center = encodeCoords(location.latitude, location.longitude);
  if (key) {
    const params = new URLSearchParams({ key, center, zoom: String(zoom) });
    return `https://www.google.com/maps/embed/v1/view?${params.toString()}`;
  }
  const params = new URLSearchParams({ q: center, z: String(zoom), hl: "es", output: "embed" });
  return `https://maps.google.com/maps?${params.toString()}`;
}

export function buildGoogleMapsDirectionsUrl(
  location: Pick<ProjectLocation, "latitude" | "longitude">,
): string {
  const params = new URLSearchParams({
    api: "1",
    destination: encodeCoords(location.latitude, location.longitude),
    hl: "es",
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function buildGoogleMapsLinkUrl(
  location: Pick<ProjectLocation, "latitude" | "longitude">,
): string {
  const params = new URLSearchParams({
    q: encodeCoords(location.latitude, location.longitude),
    hl: "es",
  });
  return `https://www.google.com/maps?${params.toString()}`;
}
