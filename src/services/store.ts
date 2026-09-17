import { useSyncExternalStore } from "react";

import {
  leads as demoLeads,
  organization as demoOrganization,
  project as demoProject,
  units as demoUnits,
} from "@/data/demo";
import type { Lead, LeadStatus, Organization, Project, Unit, UnitStatus } from "@/types/domain";

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

const initialState: State = {
  leads: demoLeads,
  units: demoUnits,
  project: demoProject,
  organization: demoOrganization,
  settings: defaultSettings,
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
}

export function createLead(input: NewLeadInput): Lead {
  const lead: Lead = {
    id: `lead_${Date.now()}`,
    projectId: state.project.id,
    projectName: state.project.name,
    status: "Nuevo",
    createdAt: new Date().toISOString(),
    source: "Showroom",
    activity: [
      {
        id: "a1",
        label: "Formulario enviado desde el showroom",
        date: new Date().toISOString(),
      },
    ],
    ...input,
  };
  setState({ ...state, leads: [lead, ...state.leads] });
  return lead;
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
  setState({
    ...state,
    units: state.units.map((unit) => (unit.id === id ? { ...unit, status } : unit)),
  });
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
    project: { ...demoProject, gallery: demoProject.gallery.map((g) => ({ ...g })) },
    organization: { ...demoOrganization },
    settings: { ...defaultSettings },
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
