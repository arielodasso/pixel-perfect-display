import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { buildGoogleMapsDirectionsUrl, buildGoogleMapsEmbedUrl } from "@/lib/maps";
import { exteriorStill } from "@/lib/renders";
import { trackEvent } from "@/lib/tracking";
import type { Organization, Project } from "@/types/domain";

import { RenderImage } from "../RenderImage";

interface Props {
  project: Project;
  organization: Organization;
  showWhatsapp: boolean;
  onConsult: () => void;
}

export function ContactoView({ project, organization, showWhatsapp, onConsult }: Props) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="grid min-h-full lg:grid-cols-2">
        <div className="relative min-h-[240px]">
          <RenderImage
            cacheKey="contacto-exterior"
            factory={() => exteriorStill("dusk")}
            alt={`Render nocturno de ${project.name}`}
            className="absolute inset-0"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent lg:bg-gradient-to-r" />
        </div>

        <div className="flex flex-col justify-center gap-8 px-6 py-12 sm:px-12">
          <div>
            <p className="eyebrow">Contacto</p>
            <h2 className="mt-2 text-4xl font-light tracking-tight">Hablamos cuando quieras</h2>
            <p className="mt-3 max-w-[46ch] text-sm text-muted-foreground">
              {project.name} · {project.address}. Nuestro equipo comercial te asesora sobre
              disponibilidad, financiación y formas de pago.
            </p>
          </div>

          <ul className="space-y-4 text-sm">
            <li className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-lg border border-border bg-surface">
                <Phone className="size-4 text-primary" />
              </span>
              <a
                href={`tel:${organization.phone.replace(/\s/g, "")}`}
                className="hover:text-primary"
              >
                {organization.phone}
              </a>
            </li>
            <li className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-lg border border-border bg-surface">
                <Mail className="size-4 text-primary" />
              </span>
              <a href={`mailto:${organization.email}`} className="hover:text-primary">
                {organization.email}
              </a>
            </li>
            <li className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-lg border border-border bg-surface">
                <MapPin className="size-4 text-primary" />
              </span>
              <span>{project.address}</span>
            </li>
          </ul>

          <div className="flex flex-wrap gap-3">
            <Button size="lg" onClick={onConsult}>
              Solicitar información
            </Button>
            {showWhatsapp && (
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
            <Button size="lg" variant="outline" asChild>
              <a
                href={buildGoogleMapsDirectionsUrl(project.location)}
                target="_blank"
                rel="noreferrer"
              >
                <MapPin className="size-4" /> Cómo llegar
              </a>
            </Button>
          </div>

          <div className="overflow-hidden rounded-xl border border-border">
            <iframe
              title={`Ubicación de ${project.name} en Google Maps`}
              src={buildGoogleMapsEmbedUrl(project.location)}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
              className="aspect-[16/10] w-full"
            />
          </div>

          <p className="text-xs text-muted-foreground">
            {organization.name} · Showroom digital operado con Sigma.
          </p>
        </div>
      </div>
    </div>
  );
}
