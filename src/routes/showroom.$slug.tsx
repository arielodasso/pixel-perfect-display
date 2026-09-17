import { createFileRoute, Link, notFound, Outlet, useRouterState } from "@tanstack/react-router";
import { ArrowUpRight, Check, MapPin, MessageCircle, Navigation, Play, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { BuildingExplorer } from "@/components/building/BuildingExplorer";
import { UnitDetailPanel } from "@/components/building/UnitDetailPanel";
import { ConstructionSection } from "@/components/construction/ConstructionSection";
import { LeadFormDialog } from "@/components/leads/LeadFormDialog";
import { UnitStatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { project as projectDemo, typologies } from "@/data/demo";
import { formatArea, formatPrice } from "@/lib/format";
import {
  buildGoogleMapsDirectionsUrl,
  buildGoogleMapsEmbedUrl,
  buildGoogleMapsLinkUrl,
} from "@/lib/maps";
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

export const Route = createFileRoute("/showroom/$slug")({
  loader: ({ params }) => {
    if (params.slug !== projectDemo.slug) throw notFound();
    return { slug: params.slug };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Showroom no encontrado" }, { name: "robots", content: "noindex" }],
      };
    }
    const title = `${projectDemo.name} — ${projectDemo.city} | Showroom digital`;
    const description = `${projectDemo.tagline} ${projectDemo.floors} pisos, unidades de 1 a 3 ambientes desde ${formatPrice(projectDemo.priceFrom, projectDemo.currency)}.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: Showroom,
});

const sections = [
  ["proyecto", "Proyecto"],
  ["unidades", "Unidades"],
  ["comparar", "Comparar"],
  ["financiacion", "Financiación"],
  ["obra", "Avance"],
  ["tour", "Tour virtual"],
  ["ubicacion", "Ubicación"],
] as const;

function Showroom() {
  const units = useUnits();
  const project = useProject();
  const organization = useOrganization();
  const settings = useSettings();
  const compare = useCompare();
  const stats = unitStats(units);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [selected, setSelected] = useState<Unit | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [presetUnit, setPresetUnit] = useState<string | null>(null);

  useEffect(() => {
    trackEvent("showroom_view", { project: project.slug });
  }, [project.slug]);

  const tourEnabled = Boolean(project.virtualTour?.enabled);
  const sectionVisibility: Record<string, boolean> = {
    proyecto: settings.showProject,
    unidades: settings.showUnits,
    comparar: settings.showCompare,
    financiacion: settings.showFinancing,
    obra: settings.showMilestones,
    ubicacion: settings.showLocation,
    tour: settings.showTour && tourEnabled,
  };
  const visibleSections = sections.filter(([id]) => sectionVisibility[id] ?? true);

  function selectUnit(unit: Unit) {
    setSelected(unit);
    trackEvent("unit_view", { unit: unit.code });
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
      description: "Te llevamos a la comparación.",
    });
    window.setTimeout(() => {
      document.getElementById("comparar")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  }

  function openForm(unitCode: string | null) {
    setPresetUnit(unitCode);
    setFormOpen(true);
  }

  const compareUnits = compare
    .map((code) => units.find((u) => u.code === code))
    .filter((u): u is Unit => Boolean(u));

  // Si la URL cae en una ruta hija (p. ej. /showroom/$slug/tour), la rendimos
  // directamente: el showroom es una página standalone sin <Outlet /> que
  // envuelva sus rutas anidadas.
  if (pathname !== `/showroom/${projectDemo.slug}`) {
    return <Outlet />;
  }

  return (
    <main className="min-h-screen pb-24">
      <header className="sticky top-0 z-40 glass">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{project.name}</p>
            <p className="truncate text-xs text-muted-foreground">{organization.name}</p>
          </div>
          <nav className="hidden items-center gap-5 text-xs text-muted-foreground lg:flex">
            {visibleSections.map(([id, label]) => (
              <a key={id} href={`#${id}`} className="transition-colors hover:text-foreground">
                {label}
              </a>
            ))}
          </nav>
          <Button size="sm" onClick={() => openForm(null)}>
            Consultar
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <img
          src={project.heroImage}
          alt={`Render de ${project.name} en ${project.city}`}
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/30" />
        <div className="relative mx-auto max-w-7xl px-5 py-24 sm:py-36">
          <p className="eyebrow">
            {project.status} · {project.city}, {project.province}
          </p>
          <h1 className="display-xl mt-5 max-w-[20ch] text-5xl sm:text-7xl">{project.name}</h1>
          <p className="mt-5 max-w-[46ch] text-lg text-muted-foreground">{project.tagline}</p>
          <dl className="mt-10 grid max-w-2xl grid-cols-2 gap-6 sm:grid-cols-4">
            {[
              ["Desde", formatPrice(project.priceFrom, project.currency)],
              ["Entrega", project.deliveryDate],
              ["Unidades", `${stats.available} disponibles`],
              ["Niveles", `${project.floors} pisos`],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="eyebrow">{label}</dt>
                <dd className="mt-1 text-lg font-light">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-10 flex flex-wrap gap-3">
            {tourEnabled && settings.showTour ? (
              <Button size="lg" asChild>
                <Link
                  to="/showroom/$slug/tour"
                  params={{ slug: project.slug }}
                  onClick={() => trackEvent("virtual_tour_view", { from: "hero" })}
                >
                  <Play className="size-4" /> Explorar Tour Virtual
                </Link>
              </Button>
            ) : (
              <Button size="lg" onClick={() => openForm(null)}>
                Solicitar información <ArrowUpRight className="size-4" />
              </Button>
            )}
            <Button size="lg" variant="outline" asChild>
              <a href="#unidades">Ver unidades</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Proyecto */}
      <Section
        id="proyecto"
        eyebrow="El proyecto"
        title="Arquitectura pensada para Tandil"
        hidden={!settings.showProject}
      >
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-base leading-relaxed text-muted-foreground">{project.description}</p>
            <div className="mt-8 grid gap-8 sm:grid-cols-2">
              <div>
                <p className="eyebrow">Amenities</p>
                <ul className="mt-3 space-y-2 text-sm">
                  {project.amenities.map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <Check className="size-3.5 text-primary" /> {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="eyebrow">Terminaciones</p>
                <ul className="mt-3 space-y-2 text-sm">
                  {project.features.map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <Check className="size-3.5 text-primary" /> {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          <div className="grid gap-3">
            {project.gallery.map((image) => (
              <figure key={image.id} className="overflow-hidden rounded-xl border border-border">
                <img
                  src={image.url}
                  alt={image.caption}
                  loading="lazy"
                  className="h-48 w-full object-cover transition-transform duration-700 hover:scale-105"
                />
                <figcaption className="bg-surface px-4 py-2 text-xs text-muted-foreground">
                  {image.caption}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>

        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {typologies.map((t) => (
            <div key={t.id} className="panel p-5">
              <p className="text-sm font-medium">{t.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatArea(t.areaFrom)} a {formatArea(t.areaTo)}
              </p>
              <p className="mt-4 text-2xl font-light text-primary">
                {units.filter((u) => u.typologyId === t.id && u.status === "disponible").length}
              </p>
              <p className="text-xs text-muted-foreground">disponibles</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Unidades */}
      <Section
        id="unidades"
        eyebrow="Disponibilidad"
        title="Elegí tu unidad"
        description={`${stats.available} disponibles · ${stats.reserved} reservadas · ${stats.sold} vendidas`}
        hidden={!settings.showUnits}
      >
        <div className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
          <BuildingExplorer
            units={units}
            selectedCode={selected?.code ?? null}
            compareCodes={compare}
            onSelect={selectUnit}
          />
          <UnitDetailPanel
            unit={selected}
            onConsult={(unit) => openForm(unit.code)}
            onCompare={toggleCompare}
            compareActive={selected ? compare.includes(selected.code) : false}
          />
        </div>
      </Section>

      {/* Comparar */}
      <Section
        id="comparar"
        eyebrow="Comparador"
        title="Compará hasta tres unidades"
        description="Sumá unidades desde el panel de detalle para verlas lado a lado."
        hidden={!settings.showCompare}
      >
        {compareUnits.length === 0 ? (
          <div className="panel p-10 text-center text-sm text-muted-foreground">
            Todavía no seleccionaste unidades para comparar.
          </div>
        ) : (
          <div className="panel overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="p-4 font-normal text-muted-foreground">Detalle</th>
                  {compareUnits.map((unit) => (
                    <th key={unit.id} className="p-4">
                      <div className="flex items-center justify-between gap-2">
                        <span>Unidad {unit.number}</span>
                        <button
                          type="button"
                          aria-label={`Quitar unidad ${unit.number}`}
                          onClick={() => toggleCompare(unit)}
                          className="text-muted-foreground transition-colors hover:text-foreground"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    ["Estado", (u: Unit) => <UnitStatusBadge status={u.status} />],
                    ["Tipología", (u: Unit) => u.typology],
                    ["Superficie", (u: Unit) => formatArea(u.area)],
                    ["Orientación", (u: Unit) => u.orientation],
                    ["Precio", (u: Unit) => formatPrice(u.price, u.currency)],
                    [
                      "Precio por m²",
                      (u: Unit) => formatPrice(Math.round(u.price / u.area), u.currency),
                    ],
                    ["Balcón", (u: Unit) => (u.balcony ? "Sí" : "No")],
                    ["Cochera", (u: Unit) => (u.parking ? "Opcional" : "No")],
                  ] as [string, (u: Unit) => React.ReactNode][]
                ).map(([label, render]) => (
                  <tr key={label} className="border-b border-border/60 last:border-0">
                    <td className="p-4 text-muted-foreground">{label}</td>
                    {compareUnits.map((unit) => (
                      <td key={unit.id} className="p-4">
                        {render(unit)}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <td className="p-4" />
                  {compareUnits.map((unit) => (
                    <td key={unit.id} className="p-4">
                      <Button size="sm" onClick={() => openForm(unit.code)}>
                        Consultar
                      </Button>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Financiación */}
      <Section
        id="financiacion"
        eyebrow="Condiciones"
        title="Financiación directa"
        hidden={!settings.showFinancing}
      >
        <div className="grid gap-5 lg:grid-cols-3">
          {[
            ["Anticipo", project.financing.advance],
            ["Cuotas", project.financing.installments],
            ["Saldo", project.financing.balance],
          ].map(([label, value]) => (
            <div key={label} className="panel p-6">
              <p className="eyebrow">{label}</p>
              <p className="mt-3 text-lg font-light">{value}</p>
            </div>
          ))}
        </div>
        <div className="panel mt-5 flex flex-wrap items-center justify-between gap-4 p-6">
          <div>
            <p className="eyebrow">Formas de pago</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {project.paymentMethods.join(" · ")}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              trackEvent("financing_view");
              openForm(null);
            }}
          >
            Pedir plan de pago
          </Button>
        </div>
      </Section>

      {/* Obra */}
      <Section
        id="obra"
        eyebrow="Avance de obra"
        title="Cómo va la construcción"
        description={`Seguimiento actualizado del desarrollo de ${project.name}.`}
        hidden={!settings.showMilestones}
      >
        <ConstructionSection project={project} />
      </Section>

      {/* Ubicación */}
      <Section
        id="ubicacion"
        eyebrow="Ubicación"
        title={project.address}
        description="Todo a distancia caminable del centro de Tandil."
        hidden={!settings.showLocation}
      >
        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="panel overflow-hidden">
            <iframe
              title={`Ubicación de ${project.name} en Google Maps`}
              src={buildGoogleMapsEmbedUrl(project.location)}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
              className="aspect-[4/3] w-full lg:aspect-auto lg:h-full lg:min-h-[420px]"
            />
          </div>
          <div className="flex flex-col gap-4">
            <ul className="panel divide-y divide-border">
              {project.pois
                .filter((p) => p.distance !== "—")
                .map((poi) => (
                  <li key={poi.id} className="flex items-center justify-between gap-3 p-4 text-sm">
                    <span>
                      {poi.name}
                      <span className="block text-xs text-muted-foreground">{poi.category}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">{poi.distance}</span>
                  </li>
                ))}
            </ul>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" asChild>
                <a
                  href={buildGoogleMapsDirectionsUrl(project.location)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Navigation className="size-4" /> Cómo llegar
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href={buildGoogleMapsLinkUrl(project.location)} target="_blank" rel="noreferrer">
                  <MapPin className="size-4" /> Ver en Google Maps
                </a>
              </Button>
            </div>
          </div>
        </div>
      </Section>

      {/* Tour virtual */}
      <Section
        id="tour"
        eyebrow="Tour virtual"
        title="Recorré el edificio por dentro"
        description={project.virtualTour?.description}
        hidden={!(settings.showTour && tourEnabled)}
      >
        <div className="panel relative overflow-hidden">
          <img
            src={project.heroImage}
            alt=""
            aria-hidden
            className="absolute inset-0 size-full object-cover opacity-25"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/40" />
          <div className="relative flex flex-col items-start gap-6 p-8 sm:p-12">
            <p className="max-w-[52ch] text-sm leading-relaxed text-muted-foreground">
              {project.virtualTour?.description ??
                `Explorá las plantas y unidades de ${project.name} y conocé los espacios comunes.`}
            </p>
            <Button size="lg" asChild>
              <Link
                to="/showroom/$slug/tour"
                params={{ slug: project.slug }}
                onClick={() => trackEvent("virtual_tour_view", { from: "section" })}
              >
                <Play className="size-4" /> Iniciar tour virtual
              </Link>
            </Button>
          </div>
        </div>
      </Section>

      {/* CTA final */}
      <section className="mx-auto max-w-7xl px-5 py-20">
        <div className="panel flex flex-wrap items-center justify-between gap-6 p-10">
          <div>
            <h2 className="text-3xl font-light tracking-tight">¿Hablamos de tu unidad?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {organization.name} · {organization.phone} · {organization.email}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" onClick={() => openForm(selected?.code ?? null)}>
              Solicitar información
            </Button>
            {settings.showWhatsappCta && (
              <Button size="lg" variant="outline" asChild>
                <a
                  href={`https://wa.me/${organization.whatsapp}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => trackEvent("whatsapp_click")}
                >
                  <MessageCircle className="size-4" /> WhatsApp
                </a>
              </Button>
            )}
          </div>
        </div>
      </section>

      <LeadFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        units={units}
        presetUnitCode={presetUnit}
        title={presetUnit ? `Consultar por ${presetUnit}` : "Solicitar información"}
      />
    </main>
  );
}

function Section({
  id,
  eyebrow,
  title,
  description,
  hidden = false,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description?: string | undefined;
  hidden?: boolean;
  children: React.ReactNode;
}) {
  if (hidden) return null;
  return (
    <section id={id} className="mx-auto max-w-7xl scroll-mt-20 px-5 py-16 sm:py-20">
      <header className="mb-10">
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="mt-3 text-3xl font-light tracking-tight sm:text-4xl">{title}</h2>
        {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
      </header>
      {children}
    </section>
  );
}
