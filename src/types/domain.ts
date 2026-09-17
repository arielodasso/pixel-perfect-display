export type UnitStatus = "disponible" | "reservada" | "vendida";

/** Origen de un lead. Lista base, extensible con cualquier origen futuro. */
export const LEAD_SOURCES = ["showroom", "tour_virtual", "whatsapp", "email"] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number] | (string & {});

export type ProjectStatus = "En preventa" | "En obra" | "Terminado" | "Borrador";

export type LeadStatus = "Nuevo" | "Contactado" | "Calificado" | "Visita" | "Reserva" | "Cerrado";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string;
  whatsapp: string;
  brandColor: string;
}

export interface Typology {
  id: string;
  name: string;
  rooms: number;
  areaFrom: number;
  areaTo: number;
}

export interface Milestone {
  id: string;
  name: string;
  status: "completado" | "en progreso" | "proximamente";
  date: string;
  progress: number;
  description?: string;
  images?: string[];
}

export interface ConstructionProgress {
  /** Porcentaje general de avance de obra (0-100). */
  progress: number;
  /** Estado textual: "En obra", "En preparación", "Terminado"… */
  status: string;
  /** Última actualización reportada (ISO). */
  updatedAt: string;
  /** Fecha estimada de finalización (texto libre, ej "Q1 2028"). */
  estimatedCompletion: string;
  /** Fotografías del avance real de la obra. */
  gallery: { id: string; url: string; caption: string }[];
}

export interface ProjectLocation {
  address: string;
  latitude: number;
  longitude: number;
  /** Link para abrir la ubicación en Google Maps. */
  googleMapsUrl?: string;
}

export interface VirtualTourHotspotConfig {
  id: string;
  label: string;
  /** Posición en % del plano de la planta (0-100). */
  x: number;
  y: number;
}

export interface VirtualTourUnitPlacement {
  /** Id de la unidad del inventario central. */
  unitId: string;
  /** Posición en % del plano de la planta (0-100). */
  x: number;
  y: number;
}

export interface VirtualTourFloorConfig {
  id: string;
  name: string;
  /** Nivel numérico (0 = planta baja). */
  level: number;
  floorPlanUrl?: string;
  unitPlacements: VirtualTourUnitPlacement[];
  hotspots: VirtualTourHotspotConfig[];
}

/**
 * Configuración persistida del Tour Virtual de un proyecto.
 * Es lo que se administra en el panel; el viewer consume el tour generado
 * (ver src/features/virtual-tour/generator.ts), que fusiona esta configuración
 * con el dataset de unidades en vivo.
 */
export interface VirtualTourConfig {
  enabled: boolean;
  published: boolean;
  title: string;
  description?: string;
  floors: VirtualTourFloorConfig[];
}

export interface PointOfInterest {
  id: string;
  name: string;
  category: "Transporte" | "Comercios" | "Colegios" | "Interés";
  distance: string;
  x: number;
  y: number;
}

export interface Project {
  id: string;
  orgId: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  city: string;
  province: string;
  address: string;
  coordinates: { lat: number; lng: number };
  location: ProjectLocation;
  type: string;
  status: ProjectStatus;
  developer: string;
  deliveryDate: string;
  priceFrom: number;
  currency: "USD" | "ARS";
  financing: { advance: string; installments: string; balance: string };
  paymentMethods: string[];
  amenities: string[];
  features: string[];
  heroImage: string;
  gallery: { id: string; url: string; caption: string }[];
  virtualTourUrl: string | null;
  virtualTour?: VirtualTourConfig | undefined;
  floors: number;
  unitsPerFloor: number;
  milestones: Milestone[];
  construction: ConstructionProgress;
  pois: PointOfInterest[];
  visits: number;
  leads: number;
}

export interface Unit {
  id: string;
  projectId: string;
  code: string;
  floor: number;
  number: string;
  typologyId: string;
  typology: string;
  area: number;
  rooms: number;
  orientation: string;
  price: number;
  currency: "USD" | "ARS";
  status: UnitStatus;
  views: number;
  floorplan: string;
  balcony: boolean;
  parking: boolean;
}

export interface Lead {
  id: string;
  projectId: string;
  projectName: string;
  name: string;
  email: string;
  phone: string;
  unitCode: string | null;
  message: string;
  newsletter: boolean;
  status: LeadStatus;
  createdAt: string;
  source: LeadSource;
  activity: { id: string; label: string; date: string }[];
}

export type TrackingEvent =
  | "showroom_view"
  | "unit_view"
  | "unit_compare"
  | "floorplan_view"
  | "virtual_tour_view"
  | "tour_floor_select"
  | "tour_unit_select"
  | "financing_view"
  | "lead_form_open"
  | "lead_created"
  | "whatsapp_click";
