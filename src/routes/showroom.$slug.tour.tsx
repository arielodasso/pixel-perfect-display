import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Compass } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { LeadFormDialog } from "@/components/leads/LeadFormDialog";
import { Button } from "@/components/ui/button";
import { project as projectDemo } from "@/data/demo";
import { generateVirtualTour } from "@/features/virtual-tour/generator";
import { TourViewer } from "@/features/virtual-tour/TourViewer";
import { trackEvent } from "@/lib/tracking";
import { useOrganization, useProject, useSettings, useUnits } from "@/services/store";
import type { Unit } from "@/types/domain";

export const Route = createFileRoute("/showroom/$slug/tour")({
  loader: ({ params }) => {
    if (params.slug !== projectDemo.slug) throw notFound();
    return { slug: params.slug };
  },
  head: ({ loaderData }) => {
    const title = `Tour virtual — ${projectDemo.name} | Sigma`;
    const description = `Recorré las plantas y unidades de ${projectDemo.name} en ${projectDemo.city}.`;
    if (!loaderData) {
      return {
        meta: [{ title: "Tour no disponible" }, { name: "robots", content: "noindex" }],
      };
    }
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: VirtualTourPage,
});

function VirtualTourPage() {
  const project = useProject();
  const organization = useOrganization();
  const units = useUnits();
  const settings = useSettings();
  const [formOpen, setFormOpen] = useState(false);
  const [presetUnit, setPresetUnit] = useState<string | null>(null);

  const config = project.virtualTour;
  const tour = useMemo(() => generateVirtualTour(project, units, config), [project, units, config]);

  useEffect(() => {
    if (tour) trackEvent("virtual_tour_view", { project: project.slug });
  }, [tour, project.slug]);

  function openConsult(unit: Unit | null) {
    setPresetUnit(unit?.code ?? null);
    setFormOpen(true);
  }

  if (!tour) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <Compass className="size-10 text-primary" />
        <h1 className="text-2xl font-light tracking-tight">Tour virtual no disponible</h1>
        <p className="max-w-[40ch] text-sm text-muted-foreground">
          {project.name} todavía no tiene el tour virtual habilitado. Mientras tanto podés recorrer
          el showroom completo.
        </p>
        <Button asChild variant="outline">
          <Link to="/showroom/$slug" params={{ slug: project.slug }}>
            <ArrowLeft className="size-4" /> Volver al showroom
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <TourViewer
        tour={tour}
        project={project}
        organization={organization}
        settings={settings}
        units={units}
        onConsult={openConsult}
        preview={!tour.published}
        autoStart360
      />
      <LeadFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        units={units}
        presetUnitCode={presetUnit}
        source="tour_virtual"
        title={presetUnit ? `Consultar por ${presetUnit}` : "Consultar desde el tour virtual"}
      />
    </>
  );
}
