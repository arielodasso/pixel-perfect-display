import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, Eye, TrendingUp, Users } from "lucide-react";

import { AdminPage, StatCard } from "@/components/admin/AdminPage";
import { LeadStatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { analyticsSummary, recentActivity, visitsSeries } from "@/data/demo";
import { formatDate, formatNumber, formatPrice } from "@/lib/format";
import { unitStats, useLeads, useProject, useUnits } from "@/services/store";

export const Route = createFileRoute("/admin/")({
  component: AdminOverview,
});

const activityIcon = {
  lead: Users,
  unit: Building2,
  visit: Eye,
} as const;

function AdminOverview() {
  const units = useUnits();
  const leads = useLeads();
  const project = useProject();
  const stats = unitStats(units);
  const maxVisits = Math.max(...visitsSeries.map((d) => d.visits));

  return (
    <AdminPage
      eyebrow="Panel"
      title="Resumen"
      description="Estado general de tus proyectos publicados."
      actions={
        <Button asChild>
          <Link to="/admin/proyectos/$slug" params={{ slug: project.slug }}>
            Editar {project.name}
          </Link>
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Visitas al showroom"
          value={formatNumber(analyticsSummary.sessions)}
          hint="Últimos 30 días"
        />
        <StatCard label="Leads" value={formatNumber(leads.length)} hint="Total acumulado" />
        <StatCard
          label="Unidades disponibles"
          value={`${stats.available}/${stats.total}`}
          hint={`${stats.reserved} reservadas · ${stats.sold} vendidas`}
        />
        <StatCard
          label="Conversión"
          value={`${analyticsSummary.conversion}%`}
          hint="Visitas que dejan datos"
        />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.4fr_0.6fr]">
        <section className="panel p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">Tráfico</p>
              <h2 className="mt-1 text-base font-medium">Visitas diarias</h2>
            </div>
            <TrendingUp className="size-4 text-primary" />
          </div>
          <div className="mt-6 flex h-40 items-end gap-1">
            {visitsSeries.map((day) => (
              <div
                key={day.date}
                title={`${day.label}: ${day.visits} visitas`}
                className="flex-1 rounded-t-sm bg-primary/25 transition-colors hover:bg-primary/60"
                style={{ height: `${(day.visits / maxVisits) * 100}%` }}
              />
            ))}
          </div>
          <div className="mt-3 flex justify-between text-xs text-muted-foreground">
            <span>{visitsSeries[0]?.label}</span>
            <span>{visitsSeries[visitsSeries.length - 1]?.label}</span>
          </div>
        </section>

        <section className="panel p-5">
          <p className="eyebrow">Actividad reciente</p>
          <ul className="mt-4 space-y-4">
            {recentActivity.map((item) => {
              const Icon = activityIcon[item.kind];
              return (
                <li key={item.id} className="flex gap-3">
                  <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div>
                    <p className="text-sm">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <section className="panel mt-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-medium">Últimos leads</h2>
          <Button asChild variant="ghost" size="sm">
            <Link to="/admin/leads">Ver todos</Link>
          </Button>
        </div>
        <ul className="divide-y divide-border">
          {leads.slice(0, 5).map((lead) => (
            <li
              key={lead.id}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{lead.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {lead.unitCode ?? "Sin unidad"} · {formatDate(lead.createdAt)}
                </p>
              </div>
              <LeadStatusBadge status={lead.status} />
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-6 text-xs text-muted-foreground">
        Precio de lista desde {formatPrice(project.priceFrom, project.currency)}.
      </p>
    </AdminPage>
  );
}
