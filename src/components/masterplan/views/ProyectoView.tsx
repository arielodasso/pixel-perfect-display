import { Check, MapPin, Navigation } from "lucide-react";

import { ConstructionSection } from "@/components/construction/ConstructionSection";
import { FinancingSimulator } from "@/components/financing/FinancingSimulator";
import { Button } from "@/components/ui/button";
import { typologies } from "@/data/demo";
import { formatArea, formatPrice } from "@/lib/format";
import {
  buildGoogleMapsDirectionsUrl,
  buildGoogleMapsEmbedUrl,
  buildGoogleMapsLinkUrl,
} from "@/lib/maps";
import { exteriorStill } from "@/lib/renders";
import type { Project, Unit } from "@/types/domain";

import type { ShowroomSettings } from "@/services/store";

import { RenderImage } from "../RenderImage";

interface Props {
  project: Project;
  units: Unit[];
  settings: ShowroomSettings;
  onConsult: () => void;
  /** Abre el formulario de leads con el resultado de un simulador precargado. */
  onPlanRequest: (message: string) => void;
}

export function ProyectoView({ project, units, settings, onConsult, onPlanRequest }: Props) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="relative h-[38vh] min-h-[260px] w-full">
        <RenderImage
          cacheKey="proyecto-exterior"
          factory={() => exteriorStill("day")}
          alt={`Render de ${project.name}`}
          className="absolute inset-0"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 px-6 pb-8 sm:px-12">
          <p className="eyebrow">El proyecto</p>
          <h2 className="mt-2 max-w-[24ch] text-4xl font-light tracking-tight">
            Arquitectura pensada para {project.city}
          </h2>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-14 px-6 py-12 sm:px-12">
        <p className="max-w-[70ch] text-base leading-relaxed text-muted-foreground">
          {project.description}
        </p>

        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <p className="eyebrow">Amenities</p>
            <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
              {project.amenities.map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm">
                  <Check className="size-3.5 text-primary" /> {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="eyebrow">Terminaciones</p>
            <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
              {project.features.map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm">
                  <Check className="size-3.5 text-primary" /> {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div>
          <p className="eyebrow">Tipologías</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
        </div>

        {settings.showFinancing && (
          <div>
            <p className="eyebrow">Financiación</p>
            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              {(
                [
                  ["Anticipo", project.financing.advance],
                  ["Cuotas", project.financing.installments],
                  ["Saldo", project.financing.balance],
                ] as [string, string][]
              ).map(([label, value]) => (
                <div key={label} className="panel p-6">
                  <p className="eyebrow">{label}</p>
                  <p className="mt-3 text-lg font-light">{value}</p>
                </div>
              ))}
            </div>
            <div className="panel mt-3 flex flex-wrap items-center justify-between gap-4 p-6">
              <div>
                <p className="eyebrow">Formas de pago</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {project.paymentMethods.join(" · ")}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  Desde {formatPrice(project.priceFrom, project.currency)}
                </span>
                <Button variant="outline" onClick={onConsult}>
                  Pedir plan de pago
                </Button>
              </div>
            </div>
            <div className="mt-3">
              <FinancingSimulator
                initialPrice={project.priceFrom}
                units={units}
                onRequestQuote={(summary) => {
                  const message = [
                    "Me interesa un plan de financiación personalizado.",
                    `Precio de referencia: ${formatPrice(summary.referencePrice)}`,
                    `Anticipo: ${formatPrice(summary.advance)} · Cuotas: ${formatPrice(summary.installments)} en ${summary.termMonths} meses · Saldo: ${formatPrice(summary.balance)}`,
                  ].join(".\n");
                  onPlanRequest(message);
                }}
              />
            </div>
          </div>
        )}

        {settings.showMilestones && (
          <div>
            <p className="eyebrow">Avance de obra</p>
            <h3 className="mt-2 text-2xl font-light tracking-tight">Cómo va la construcción</h3>
            <div className="mt-5">
              <ConstructionSection project={project} />
            </div>
          </div>
        )}

        {settings.showLocation && (
          <div>
            <p className="eyebrow">Ubicación</p>
            <h3 className="mt-2 text-2xl font-light tracking-tight">{project.address}</h3>
            <div className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="panel overflow-hidden">
                <iframe
                  title={`Ubicación de ${project.name} en Google Maps`}
                  src={buildGoogleMapsEmbedUrl(project.location)}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                  className="aspect-[4/3] w-full lg:aspect-auto lg:h-full lg:min-h-[380px]"
                />
              </div>
              <div className="flex flex-col gap-4">
                <ul className="panel divide-y divide-border">
                  {project.pois
                    .filter((p) => p.distance !== "—")
                    .map((poi) => (
                      <li
                        key={poi.id}
                        className="flex items-center justify-between gap-3 p-4 text-sm"
                      >
                        <span>
                          {poi.name}
                          <span className="block text-xs text-muted-foreground">
                            {poi.category}
                          </span>
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
                    <a
                      href={buildGoogleMapsLinkUrl(project.location)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MapPin className="size-4" /> Ver en Google Maps
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
