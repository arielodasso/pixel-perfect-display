import { useSyncExternalStore } from "react";

import {
  leads as demoLeads,
  organization as demoOrganization,
  project as demoProject,
  units as demoUnits,
} from "@/data/demo";
import type {
  IntegrationConfig,
  Lead,
  LeadSource,
  LeadStatus,
  Notification,
  Organization,
  Project,
  Unit,
  UnitStatus,
} from "@/types/domain";
import { trackEvent } from "@/lib/tracking";

/**
 * Store en memoria del MVP. Reemplazable por Lovable Cloud sin tocar la UI:
 * las pantallas sólo consumen los hooks y las acciones de este módulo.
 */
export interface ShowroomSettings {
  showProject: boolean;
  showUnits: boolean;
  showCompare: boolean;
  showFinancing: boolean;
  showMilestones: boolean;
  showLocation: boolean;
  showTour: boolean;
  showWhatsappCta: boolean;
}

interface State {
  leads: Lead[];
  units: Unit[];
  project: Project;
  organization: Organization;
  settings: ShowroomSettings;
  /** Códigos de unidades en el comparador (hasta 3). Estado global compartido. */
  compare: string[];
  /** Integraciones CRM / webhooks / notificaciones. */
  integrations: IntegrationConfig;
  /** Notificaciones internas del panel (se simulan desde la demo). */
  notifications: Notification[];
}

const defaultSettings: ShowroomSettings = {
  showProject: true,
  showUnits: true,
  showCompare: true,
  showFinancing: true,
  showMilestones: true,
  showLocation: true,
  showTour: true,
  showWhatsappCta: true,
};

const defaultIntegrations: IntegrationConfig = {
  crmType: "none",
  crmApiKey: "",
  webhookUrl: "",
  notifyEmail: demoOrganization.email,
  notifyOnLead: true,
  notifyOnReservation: true,
};

const initialState: State = {
  leads: demoLeads,
  units: demoUnits,
  project: demoProject,
  organization: demoOrganization,
  settings: defaultSettings,
  compare: [],
  integrations: defaultIntegrations,
  notifications: demoLeads.slice(0, 3).map((lead, index) => ({
    id: `notif_seed_${index}`,
    title: `Nuevo lead — ${lead.name}`,
    body: lead.unitCode ? `Consultó por la unidad ${lead.unitCode}.` : "Consulta general.",
    date: lead.createdAt,
    read: false,
    leadId: lead.id,
  })),
};

let state: State = initialState;
const listeners = new Set<() => void>();

function setState(next: State) {
  state = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

export function useStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useLeads() {
  return useStore().leads;
}

export function useUnits() {
  return useStore().units;
}

export function useProject() {
  return useStore().project;
}

export function useOrganization() {
  return useStore().organization;
}

export function useSettings() {
  return useStore().settings;
}

export function useCompare() {
  return useStore().compare;
}

export function useIntegrations() {
  return useStore().integrations;
}

export function useNotifications() {
  return useStore().notifications;
}

export function useUnit(code: string | null) {
  const units = useUnits();
  return code ? (units.find((unit) => unit.code === code) ?? null) : null;
}

export interface NewLeadInput {
  name: string;
  email: string;
  phone: string;
  unitCode: string | null;
  message: string;
  newsletter: boolean;
  source?: LeadSource;
}

export function createLead(input: NewLeadInput): Lead {
  const lead: Lead = {
    id: `lead_${Date.now()}`,
    projectId: state.project.id,
    projectName: state.project.name,
    status: "Nuevo",
    createdAt: new Date().toISOString(),
    source: input.source ?? "showroom",
    activity: [
      {
        id: "a1",
        label:
          input.source === "tour_virtual"
            ? "Formulario enviado desde el tour virtual"
            : "Formulario enviado desde el showroom",
        date: new Date().toISOString(),
      },
    ],
    ...input,
  };
  setState({ ...state, leads: [lead, ...state.leads] });

  const { integrations } = state;
  if (integrations.notifyOnLead) {
    pushNotification({
      title: `Nuevo lead — ${lead.name}`,
      body: lead.unitCode ? `Consultó por la unidad ${lead.unitCode}.` : "Consulta general.",
      leadId: lead.id,
    });
    notifyIntegrations("lead.created", { ...lead });
  }
  return lead;
}

/** Registra una notificación interna del panel. */
export function pushNotification(notification: Omit<Notification, "id" | "date" | "read">) {
  setState({
    ...state,
    notifications: [
      {
        ...notification,
        id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        date: new Date().toISOString(),
        read: false,
      },
      ...state.notifications,
    ].slice(0, 50),
  });
}

export function markAllNotificationsRead() {
  setState({
    ...state,
    notifications: state.notifications.map((n) => ({ ...n, read: true })),
  });
}

/**
 * Simula el envío hacia CRM / webhooks configurados. En producción este
 * hook se reemplaza por llamadas reales (Lovable Cloud / Edge Function).
 */
export function notifyIntegrations(event: string, data: Record<string, unknown>) {
  const { integrations, organization } = state;
  if (integrations.crmType !== "none") {
    console.info(`[CRM:${integrations.crmType}] ${event}`, data);
  }
  if (integrations.webhookUrl.trim()) {
    console.info(`[Webhook] POST ${integrations.webhookUrl}`, data);
  }

  console.info(`[${organization.name}] ${event}`, data);
}

export function updateIntegrations(patch: Partial<IntegrationConfig>) {
  setState({ ...state, integrations: { ...state.integrations, ...patch } });
}

export const MAX_COMPARE = 3;

export interface CompareResult {
  added: boolean;
  removed: boolean;
  isFull: boolean;
}

/**
 * Alterna una unidad en el comparador global.
 * - Nunca permite superar MAX_COMPARE unidades.
 * - Si la unidad ya está, la quita.
 */
export function toggleCompareUnit(code: string): CompareResult {
  const current = state.compare;
  if (current.includes(code)) {
    setState({ ...state, compare: current.filter((c) => c !== code) });
    return { added: false, removed: true, isFull: false };
  }
  if (current.length >= MAX_COMPARE) {
    return { added: false, removed: false, isFull: true };
  }
  const next = [...current, code];
  setState({ ...state, compare: next });
  trackEvent("unit_compare", { units: next });
  return { added: true, removed: false, isFull: false };
}

export function clearCompare() {
  setState({ ...state, compare: [] });
}

export function updateLeadStatus(id: string, status: LeadStatus) {
  setState({
    ...state,
    leads: state.leads.map((lead) =>
      lead.id === id
        ? {
            ...lead,
            status,
            activity: [
              {
                id: `a_${Date.now()}`,
                label: `Estado actualizado a “${status}”`,
                date: new Date().toISOString(),
              },
              ...lead.activity,
            ],
          }
        : lead,
    ),
  });
}

export function deleteLead(id: string) {
  setState({ ...state, leads: state.leads.filter((lead) => lead.id !== id) });
}

export function updateUnitStatus(id: string, status: UnitStatus) {
  const unit = state.units.find((u) => u.id === id);
  setState({
    ...state,
    units: state.units.map((item) => (item.id === id ? { ...item, status } : item)),
  });
  if (unit && (status === "reservada" || status === "vendida") && unit.status !== status) {
    if (state.integrations.notifyOnReservation) {
      pushNotification({
        title: `Unidad ${unit.code} ${status === "reservada" ? "reservada" : "vendida"}`,
        body: `La unidad ${unit.number} cambió a estado "${status}".`,
      });
      notifyIntegrations(`unit.${status}`, { unitCode: unit.code });
    }
  }
}

export function updateUnit(id: string, patch: Partial<Unit>) {
  setState({
    ...state,
    units: state.units.map((unit) => (unit.id === id ? { ...unit, ...patch } : unit)),
  });
}

/** Inserta o reemplaza unidades por id (usado por importación CSV). */
export function upsertUnits(units: Unit[]) {
  const next = new Map(state.units.map((unit) => [unit.id, unit]));
  units.forEach((unit) => next.set(unit.id, unit));
  setState({ ...state, units: [...next.values()] });
}

export function updateProject(patch: Partial<Project>) {
  setState({ ...state, project: { ...state.project, ...patch } });
}

export function updateOrganization(patch: Partial<Organization>) {
  setState({ ...state, organization: { ...state.organization, ...patch } });
}

export function updateSettings(patch: Partial<ShowroomSettings>) {
  setState({ ...state, settings: { ...state.settings, ...patch } });
}

export function resetDemoData() {
  setState({
    leads: demoLeads.map((lead) => ({ ...lead })),
    units: demoUnits.map((unit) => ({ ...unit })),
    project: {
      ...demoProject,
      gallery: demoProject.gallery.map((g) => ({ ...g })),
      construction: {
        ...demoProject.construction,
        gallery: demoProject.construction.gallery.map((g) => ({ ...g })),
      },
      milestones: demoProject.milestones.map((m) => ({ ...m })),
      virtualTour: demoProject.virtualTour
        ? {
            ...demoProject.virtualTour,
            floors: demoProject.virtualTour.floors.map((f) => ({
              ...f,
              unitPlacements: f.unitPlacements.map((p) => ({ ...p })),
              hotspots: f.hotspots.map((h) => ({ ...h })),
            })),
          }
        : undefined,
    },
    organization: { ...demoOrganization },
    settings: { ...defaultSettings },
    compare: [],
    integrations: { ...defaultIntegrations, notifyEmail: demoOrganization.email },
    notifications: demoLeads.slice(0, 3).map((lead, index) => ({
      id: `notif_seed_${index}`,
      title: `Nuevo lead — ${lead.name}`,
      body: lead.unitCode ? `Consultó por la unidad ${lead.unitCode}.` : "Consulta general.",
      date: lead.createdAt,
      read: false,
      leadId: lead.id,
    })),
  });
}

export function unitStats(units: Unit[]) {
  return {
    total: units.length,
    available: units.filter((u) => u.status === "disponible").length,
    reserved: units.filter((u) => u.status === "reservada").length,
    sold: units.filter((u) => u.status === "vendida").length,
  };
}
