const KUULE_HOSTS = ["kuula.co", "kuu.la"];

/**
 * Normaliza la URL de embed del proveedor: en Kuula se oculta el branding y
 * se fuerza el modo VR, igual que hace la plataforma de referencia.
 */
export function normaliseTourUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (
      KUULE_HOSTS.some((host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`))
    ) {
      parsed.searchParams.set("logo", "-1");
      parsed.searchParams.set("info", "0");
      parsed.searchParams.set("fs", "0");
      parsed.searchParams.set("vr", "1");
      return parsed.toString();
    }
    return url;
  } catch {
    return url;
  }
}

export function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}
