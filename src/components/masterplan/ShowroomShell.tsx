import { Menu, MessageCircle, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { LeadFormDialog } from "@/components/leads/LeadFormDialog";
import { Button } from "@/components/ui/button";
import { generateVirtualTour } from "@/features/virtual-tour/generator";
import { trackEvent } from "@/lib/tracking";
import { cn } from "@/lib/utils";
import {
  MAX_COMPARE,
  toggleCompareUnit,
  unitStats,
  useCompare,
  useOrganization,
  useProject,
  useSettings,
  useUnits,
} from "@/services/store";
import type { Unit } from "@/types/domain";

import { VIEWS, type ViewId } from "./nav";
import { ContactoView } from "./views/ContactoView";
import { GaleriaView } from "./views/GaleriaView";
import { MasterplanView } from "./views/MasterplanView";
import { ModelView } from "./views/ModelView";
import { PlantasView } from "./views/PlantasView";
import { PortadaView } from "./views/PortadaView";
import { ProyectoView } from "./views/ProyectoView";
import { RecorridoView } from "./views/RecorridoView";
import { UnidadesView } from "./views/UnidadesView";

/**
 * Shell estilo Urbania3D: menú vertical + vistas de pantalla completa
 * (portada, proyecto, masterplan 3D, plantas, unidades, recorrido 360°,
 * galería y contacto) sobre los datos reales del proyecto.
 */
export function ShowroomShell() {
  const units = useUnits();
  const project = useProject();
  const organization = useOrganization();
  const settings = useSettings();
  const compare = useCompare();
  const stats = unitStats(units);

  const [view, setView] = useState<ViewId>("portada");
  const [selected, setSelected] = useState<Unit | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [presetUnit, setPresetUnit] = useState<string | null>(null);
  const [presetMessage, setPresetMessage] = useState<string | null>(null);

  const config = project.virtualTour;
  const tour = useMemo(() => generateVirtualTour(project, units, config), [project, units, config]);

  const available: Record<ViewId, boolean> = {
    portada: true,
    proyecto:
      settings.showProject ||
      settings.showFinancing ||
      settings.showMilestones ||
      settings.showLocation,
    masterplan: settings.showUnits,
    modelo: true,
    plantas: settings.showUnits && Boolean(tour),
    unidades: settings.showUnits,
    recorrido: settings.showTour && Boolean(tour),
    galeria: true,
    contacto: true,
  };
  const views = VIEWS.filter((item) => available[item.id]);

  useEffect(() => {
    if (!available[view]) setView("portada");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.showUnits, settings.showTour, settings.showProject, view]);

  useEffect(() => {
    trackEvent("showroom_view", { project: project.slug, view });
  }, [project.slug, view]);

  function navigate(next: ViewId) {
    setView(next);
    setMenuOpen(false);
  }

  function openForm(unit: Unit | null, message: string | null = null) {
    setPresetUnit(unit?.code ?? null);
    setPresetMessage(message);
    setFormOpen(true);
  }

  function selectUnit(unit: Unit | null) {
    setSelected(unit);
    if (unit) trackEvent("unit_view", { unit: unit.code, view });
  }

  function toggleCompare(unit: Unit) {
    const result = toggleCompareUnit(unit.code);
    if (result.isFull) {
      toast.error(`Podés comparar hasta ${MAX_COMPARE} unidades`, {
        description: "Quitá una unidad del comparador para sumar esta.",
      });
      return;
    }
    if (result.removed) {
      toast.info("Unidad quitada del comparador");
      return;
    }
    toast.success(`${unit.code} agregada al comparador`, {
      description: "La vas a poder comparar en el panel de unidades.",
    });
  }

  const onTour360 = (unit: Unit) => {
    setSelected(unit);
    navigate("recorrido");
  };

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background text-foreground">
      {/* Menú lateral */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface/50 lg:flex">
        <MenuContent
          active={view}
          views={views}
          projectName={project.name}
          organizationName={organization.name}
          onNavigate={navigate}
          stats={stats}
          showWhatsapp={settings.showWhatsappCta}
          whatsapp={organization.whatsapp}
          onConsult={() => openForm(null)}
        />
      </aside>

      {/* Drawer mobile */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            className="absolute inset-0 bg-black/60"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-border bg-background">
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="absolute right-3 top-3 z-10 grid size-8 place-items-center rounded-md text-muted-foreground hover:text-foreground"
              aria-label="Cerrar menú"
            >
              <X className="size-4" />
            </button>
            <MenuContent
              active={view}
              views={views}
              projectName={project.name}
              organizationName={organization.name}
              onNavigate={navigate}
              stats={stats}
              showWhatsapp={settings.showWhatsappCta}
              whatsapp={organization.whatsapp}
              onConsult={() => openForm(null)}
            />
          </div>
        </div>
      )}

      {/* Contenido */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-background/80 px-4 py-2.5 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="inline-flex items-center gap-2 text-sm font-medium"
          >
            <Menu className="size-4" /> {project.name}
          </button>
          <Button size="sm" onClick={() => openForm(selected)}>
            Consultar
          </Button>
        </header>

        <section className="relative min-h-0 flex-1">
          {view === "portada" && (
            <PortadaView
              project={project}
              organization={organization}
              stats={stats}
              showWhatsapp={settings.showWhatsappCta}
              onNavigate={navigate}
              onConsult={() => openForm(null)}
            />
          )}

          {view === "proyecto" && (
            <ProyectoView
              project={project}
              units={units}
              settings={settings}
              onConsult={() => openForm(null)}
              onPlanRequest={(message) => openForm(null, message)}
            />
          )}

          {view === "masterplan" && (
            <MasterplanView
              project={project}
              units={units}
              selected={selected}
              onSelect={selectUnit}
              onConsult={openForm}
              onCompare={toggleCompare}
              compareActive={selected ? compare.includes(selected.code) : false}
              onTour360={onTour360}
            />
          )}

          {view === "modelo" && (
            <ModelView project={project} />
          )}

          {view === "plantas" && tour && (
            <PlantasView
              tour={tour}
              project={project}
              units={units}
              compare={compare}
              onConsult={openForm}
              onCompare={toggleCompare}
              onTour360={onTour360}
              goToRecorrido={() => navigate("recorrido")}
            />
          )}

          {view === "unidades" && (
            <UnidadesView
              project={project}
              units={units}
              selected={selected}
              onSelect={selectUnit}
              onConsult={openForm}
              onCompare={toggleCompare}
              compareActive={(unit) => compare.includes(unit.code)}
              onTour360={onTour360}
            />
          )}

          {view === "recorrido" && tour && (
            <RecorridoView
              tour={tour}
              project={project}
              organization={organization}
              settings={settings}
              units={units}
              onConsult={(unit) => openForm(unit)}
            />
          )}

          {view === "galeria" && <GaleriaView project={project} />}

          {view === "contacto" && (
            <ContactoView
              project={project}
              organization={organization}
              showWhatsapp={settings.showWhatsappCta}
              onConsult={() => openForm(null)}
            />
          )}
        </section>
      </div>

      <LeadFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        units={units}
        presetUnitCode={presetUnit}
        presetMessage={presetMessage}
        title={presetUnit ? `Consultar por ${presetUnit}` : "Solicitar información"}
      />
    </div>
  );
}

interface MenuContentProps {
  active: ViewId;
  views: typeof VIEWS;
  projectName: string;
  organizationName: string;
  onNavigate: (view: ViewId) => void;
  stats: { total: number; available: number; reserved: number; sold: number };
  showWhatsapp: boolean;
  whatsapp: string;
  onConsult: () => void;
}

function MenuContent({
  active,
  views,
  projectName,
  organizationName,
  onNavigate,
  stats,
  showWhatsapp,
  whatsapp,
  onConsult,
}: MenuContentProps) {
  return (
    <>
      <div className="border-b border-border px-5 py-5">
        <p className="eyebrow">Showroom digital</p>
        <p className="mt-1 text-lg font-medium leading-tight">{projectName}</p>
        <p className="text-xs text-muted-foreground">{organizationName}</p>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {views.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === active;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                    isActive
                      ? "bg-primary/15 text-foreground"
                      : "text-muted-foreground hover:bg-surface hover:text-foreground",
                  )}
                >
                  <Icon className={cn("mt-0.5 size-4 shrink-0", isActive ? "text-primary" : "")} />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{item.label}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {item.hint}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-6 rounded-lg border border-border bg-background/60 p-3">
          <p className="eyebrow">Disponibilidad</p>
          <div className="mt-2 space-y-1.5 text-xs text-muted-foreground">
            <p className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-available" /> Disponibles
              </span>
              <span className="tabular-nums">{stats.available}</span>
            </p>
            <p className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-reserved" /> Reservadas
              </span>
              <span className="tabular-nums">{stats.reserved}</span>
            </p>
            <p className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-sold" /> Vendidas
              </span>
              <span className="tabular-nums">{stats.sold}</span>
            </p>
          </div>
        </div>
      </nav>

      <div className="space-y-2 border-t border-border p-4">
        <Button className="w-full" onClick={onConsult}>
          Consultar
        </Button>
        {showWhatsapp && (
          <Button className="w-full" variant="outline" asChild>
            <a
              href={`https://wa.me/${whatsapp}`}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackEvent("whatsapp_click")}
            >
              <MessageCircle className="size-4" /> WhatsApp
            </a>
          </Button>
        )}
      </div>
    </>
  );
}
