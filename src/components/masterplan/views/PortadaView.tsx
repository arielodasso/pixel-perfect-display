import { Boxes, MessageCircle, Rotate3d } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { exteriorStill } from "@/lib/renders";
import { trackEvent } from "@/lib/tracking";
import { cn } from "@/lib/utils";
import type { Organization, Project } from "@/types/domain";

import { RenderImage } from "../RenderImage";
import type { ViewId } from "../nav";

interface Props {
  project: Project;
  organization: Organization;
  stats: { total: number; available: number; reserved: number; sold: number };
  showWhatsapp: boolean;
  onNavigate: (view: ViewId) => void;
  onConsult: () => void;
}

const QUICK_LINKS: { id: ViewId; label: string }[] = [
  { id: "masterplan", label: "Masterplan 3D" },
  { id: "unidades", label: "Unidades" },
  { id: "recorrido", label: "Recorrido 360°" },
  { id: "galeria", label: "Galería" },
];

export function PortadaView({
  project,
  organization,
  stats,
  showWhatsapp,
  onNavigate,
  onConsult,
}: Props) {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <RenderImage
        cacheKey="portada-exterior"
        factory={() => exteriorStill("golden")}
        alt={`Render de ${project.name}`}
        className="absolute inset-0"
        imgClassName="scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/10" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-transparent" />

      <div className="relative flex h-full flex-col justify-end overflow-y-auto px-6 pb-10 pt-24 sm:px-12 lg:px-16">
        <p className="eyebrow">
          {project.status} · {project.city}, {project.province}
        </p>
        <h1 className="display-xl mt-4 max-w-[16ch] text-5xl leading-[0.95] sm:text-7xl">
          {project.name}
        </h1>
        <p className="mt-4 max-w-[46ch] text-base text-muted-foreground sm:text-lg">
          {project.tagline}
        </p>

        <dl className="mt-8 grid max-w-2xl grid-cols-2 gap-5 sm:grid-cols-4">
          {[
            ["Desde", formatPrice(project.priceFrom, project.currency)],
            ["Entrega", project.deliveryDate],
            ["Disponibles", `${stats.available}`],
            ["Niveles", `${project.floors} pisos`],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="eyebrow">{label}</dt>
              <dd className="mt-1 text-lg font-light">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button
            size="lg"
            onClick={() => {
              onNavigate("masterplan");
            }}
          >
            <Boxes className="size-4" /> Ver el edificio en 3D
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => {
              onNavigate("recorrido");
            }}
          >
            <Rotate3d className="size-4" /> Recorrido 360°
          </Button>
          <Button size="lg" variant="outline" onClick={onConsult}>
            Solicitar información
          </Button>
          {showWhatsapp && (
            <Button size="lg" variant="ghost" asChild>
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

        <div className="mt-10 flex flex-wrap gap-2">
          {QUICK_LINKS.map((link) => (
            <button
              key={link.id}
              type="button"
              onClick={() => onNavigate(link.id)}
              className={cn(
                "rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium text-white/80 backdrop-blur-sm transition-colors hover:bg-white/10 hover:text-white",
              )}
            >
              {link.label}
            </button>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <StatusDot label={`${stats.available} disponibles`} className="bg-available" />
          <StatusDot label={`${stats.reserved} reservadas`} className="bg-reserved" />
          <StatusDot label={`${stats.sold} vendidas`} className="bg-sold" />
        </div>
      </div>
    </div>
  );
}

function StatusDot({ label, className }: { label: string; className: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className={cn("size-2 rounded-full", className)} />
      {label}
    </span>
  );
}
