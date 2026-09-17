import { createFileRoute, notFound } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Check,
  MapPin,
  MessageCircle,
  Play,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

import { BuildingExplorer } from "@/components/building/BuildingExplorer";
import { UnitDetailPanel } from "@/components/building/UnitDetailPanel";
import { LeadFormDialog } from "@/components/leads/LeadFormDialog";
import { UnitStatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { organization, project, typologies } from "@/data/demo";
import { formatArea, formatPrice } from "@/lib/format";
import { trackEvent } from "@/lib/tracking";
import { cn } from "@/lib/utils";
import { unitStats, useUnits } from "@/services/store";
import type { Unit } from "@/types/domain";

export const Route = createFileRoute("/showroom/$slug")({
  loader: ({ params }) => {
    if (params.slug !== project.slug) throw notFound();
    return { slug: params.slug };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Showroom no encontrado" }, { name: "robots", content: "noindex" }],
      };
    }
    const title = `${project.name} — ${project.city} | Showroom digital`;
    const description = `${project.tagline} ${project.floors} pisos, unidades de 1 a 3 ambientes desde ${formatPrice(project.priceFrom, project.currency)}.`;
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
  ["ubicacion", "Ubicación"],
] as const;

function Showroom() {
  const units = useUnits();
  const stats = unitStats(units);
  const [selected, setSelected] = useState<Unit | null>(null);
  const [compare, setCompare] = useState<string[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [presetUnit, setPresetUnit] = useState<string | null>(null);
  const [tourOpen, setTourOpen] = useState(false);

  useEffect(() => {
    trackEvent("showroom_view", { project: project.slug });
  }, []);

  function selectUnit(unit: Unit) {
    setSelected(unit);
    trackEvent("unit_view", { unit: unit.code });
  }

  function toggleCompare(unit: Unit) {
    setCompare((prev) => {
      if (prev.includes(unit.code)) return prev.filter((c) => c !== unit.code);
      const next = [...prev, unit.code].slice(-3);
      trackEvent("unit_compare", { units: next });
      return next;
    });
  }

  function openForm(unitCode: string | null) {
    setPresetUnit(unitCode);
    setFormOpen(true);
  }

  const compareUnits = compare
    .map((code) => units.find((u) => u.code === code))
    .filter((u): u is Unit => Boolean(u));

  return (
    <main className="min-h-screen pb-24">
      <header className="sticky top-0 z-40 glass">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{project.name}</p>
            <p className="truncate text-xs text-muted-foreground">{organization.name}</p>
          </div>
          <nav className="hidden items-center gap-5 text-xs text-muted-foreground lg:flex">
            {sections.map(([id, label]) => (
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
            <Button size="lg" onClick={() => openForm(null)}>
              Solicitar información <ArrowUpRight className="size-4" />
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#unidades">Ver unidades</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Proyecto */}
      <Section id="proyecto" eyebrow="El proyecto" title="Arquitectura pensada para Tandil">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-base leading-relaxed text-muted-foreground">
              {project.description}
            </p>
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
      <Section id="financiacion" eyebrow="Condiciones" title="Financiación directa">
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
      <Section id="obra" eyebrow="Avance de obra" title="Cómo va la construcción">
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {project.milestones.map((m) => (
            <li key={m.id} className="panel p-5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{m.name}</span>
                <span className="text-xs text-muted-foreground">{m.date}</span>
              </div>
              <Progress value={m.progress} className="mt-4" />
              <p
                className={cn(
                  "mt-2 text-xs capitalize",
                  m.status === "en progreso" ? "text-primary" : "text-muted-foreground",
                )}
              >
                {m.status} · {m.progress}%
              </p>
            </li>
          ))}
        </ol>
      </Section>

      {/* Ubicación */}
      <Section
        id="ubicacion"
        eyebrow="Ubicación"
        title={project.address}
        description="Todo a distancia caminable del centro de Tandil."
      >
        <div className="grid gap-5 lg:grid-cols-[1fr_0.7fr]">
          <div className="panel relative aspect-[4/3] overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,oklch(0.24_0.01_265),oklch(0.17_0.008_265))]" />
            {project.pois.map((poi) => (
              <div
                key={poi.id}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${poi.x}%`, top: `${poi.y}%` }}
              >
                <span
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border border-border bg-popover/90 px-2 py-1 text-[11px] whitespace-nowrap",
                    poi.distance === "—" && "border-primary/50 text-primary",
                  )}
                >
                  <MapPin className="size-3" />
                  {poi.name}
                </span>
              </div>
            ))}
          </div>
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
        </div>
      </Section>

      {/* Tour virtual */}
      <Section id="tour" eyebrow="Tour virtual" title="Recorré una unidad tipo">
        <div className="panel flex flex-col items-center gap-4 p-12 text-center">
          {tourOpen ? (
            <p className="max-w-[44ch] text-sm text-muted-foreground">
              El recorrido 360° de {project.name} está en producción. Dejanos tus datos y te
              avisamos cuando esté publicado.
            </p>
          ) : (
            <p className="max-w-[44ch] text-sm text-muted-foreground">
              Vista inmersiva de la unidad de 2 ambientes al frente.
            </p>
          )}
          <Button
            variant="outline"
            onClick={() => {
              setTourOpen(true);
              trackEvent("virtual_tour_view");
            }}
          >
            <Play className="size-4" /> Iniciar recorrido
          </Button>
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
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
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
