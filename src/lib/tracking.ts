import type { TrackingEvent } from "@/types/domain";

/**
 * Capa de eventos del showroom.
 * Hoy sólo registra en memoria/consola. La firma está pensada para enchufar
 * más adelante un backend de analytics sin tocar los componentes.
 */
export interface TrackedEvent {
  name: TrackingEvent;
  payload: Record<string, unknown>;
  at: string;
}

const buffer: TrackedEvent[] = [];
const listeners = new Set<(events: TrackedEvent[]) => void>();

export function trackEvent(name: TrackingEvent, payload: Record<string, unknown> = {}) {
  const event: TrackedEvent = { name, payload, at: new Date().toISOString() };
  buffer.unshift(event);
  if (buffer.length > 100) buffer.pop();
  if (import.meta.env.DEV) {
    console.info(`[sigma:event] ${name}`, payload);
  }
  listeners.forEach((listener) => listener([...buffer]));
}

export function getTrackedEvents() {
  return [...buffer];
}

export function subscribeToEvents(listener: (events: TrackedEvent[]) => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
