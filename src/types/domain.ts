export type UnitStatus = "disponible" | "reservada" | "vendida";

export type ProjectStatus = "En preventa" | "En obra" | "Terminado" | "Borrador";

export type LeadStatus =
  | "Nuevo"
  | "Contactado"
  | "Calificado"
  | "Visita"
  | "Reserva"
  | "Cerrado";

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
  floors: number;
  unitsPerFloor: number;
  milestones: Milestone[];
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
  source: string;
  activity: { id: string; label: string; date: string }[];
}

export type TrackingEvent =
  | "showroom_view"
  | "unit_view"
  | "unit_compare"
  | "floorplan_view"
  | "virtual_tour_view"
  | "financing_view"
  | "lead_form_open"
  | "lead_created"
  | "whatsapp_click";
