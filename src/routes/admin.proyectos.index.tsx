import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Eye, Users } from "lucide-react";

import { AdminPage } from "@/components/admin/AdminPage";
import { Button } from "@/components/ui/button";
import { project } from "@/data/demo";
import { formatNumber, formatPrice } from "@/lib/format";
import { unitStats, useUnits } from "@/services/store";

export const Route = createFileRoute("/admin/proyectos/")({
  component: AdminProjects,
});

function AdminProjects() {
  const units = useUnits();
  const stats = unitStats(units);

  return (
    <AdminPage
      eyebrow="Cartera"
      title="Proyectos"
      description="Un proyecto publicado. Podés editar su ficha y su showroom."
    >
      <article className="panel overflow-hidden">
        <div className="grid sm:grid-cols-[240px_1fr]">
          <img
            src={project.heroImage}
            alt={`Render de ${project.name}`}
            className="h-44 w-full object-cover sm:h-full"
          />
          <div className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="eyebrow">{project.status}</p>
                <h2 className="mt-2 text-2xl font-light tracking-tight">{project.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{project.address}</p>
              </div>
              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link to="/showroom/$slug" params={{ slug: project.slug }}>
                    Showroom <ArrowUpRight className="size-3.5" />
                  </Link>
                </Button>
                <Button asChild size="sm">
                  <Link to="/admin/proyectos/$slug" params={{ slug: project.slug }}>
                    Editar
                  </Link>
                </Button>
              </div>
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-4">
              {[
                ["Desde", formatPrice(project.priceFrom, project.currency)],
                ["Unidades", `${stats.available}/${stats.total} libres`],
                ["Entrega", project.deliveryDate],
                ["Tipo", project.type],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="eyebrow">{label}</dt>
                  <dd className="mt-1 text-sm">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-6 flex flex-wrap gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Eye className="size-4" /> {formatNumber(project.visits)} visitas
              </span>
              <span className="flex items-center gap-2">
                <Users className="size-4" /> {formatNumber(project.leads)} leads
              </span>
            </div>
          </div>
        </div>
      </article>
    </AdminPage>
  );
}
