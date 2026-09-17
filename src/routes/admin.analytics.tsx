import { createFileRoute } from "@tanstack/react-router";
import { Clock, Lightbulb, Sparkles } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AdminPage, StatCard } from "@/components/admin/AdminPage";
import { aiInsights, analyticsSummary, funnel, typologyInterest, visitsSeries } from "@/data/demo";
import { formatNumber, formatPrice } from "@/lib/format";
import { unitStats, useLeads, useUnits } from "@/services/store";

export const Route = createFileRoute("/admin/analytics")({
  component: AdminAnalytics,
});

const TOOLTIP_STYLE = {
  backgroundColor: "oklch(0.2 0.008 265)",
  border: "1px solid oklch(1 0 0 / 10%)",
  borderRadius: "12px",
  fontSize: "12px",
} as const;

function AdminAnalytics() {
  const units = useUnits();
  const leads = useLeads();
  const stats = unitStats(units);
  const maxFunnel = Math.max(...funnel.map((f) => f.value));
  const maxInterest = Math.max(...typologyInterest.map((t) => t.views));

  const topUnits = [...units].sort((a, b) => b.views - a.views).slice(0, 6);
  const topViewsMax = topUnits[0]?.views ?? 1;

  return (
    <AdminPage
      eyebrow="Analytics"
      title="Métricas del showroom"
      description="Últimos 30 días de Torre Horizonte."
    >
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Sesiones" value={formatNumber(analyticsSummary.sessions)} />
        <StatCard label="Visitantes" value={formatNumber(analyticsSummary.visitors)} />
        <StatCard label="Leads" value={formatNumber(analyticsSummary.leads)} />
        <StatCard label="Conversión" value={`${analyticsSummary.conversion}%`} />
        <StatCard label="Tiempo promedio" value={analyticsSummary.avgTime} />
      </div>

      <section className="panel mt-6 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow">Tráfico</p>
            <h2 className="mt-1 text-base font-medium">Visitas y consultas diarias</h2>
          </div>
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="size-3.5" /> Picos entre las 20 y las 23 h
          </span>
        </div>
        <div className="mt-5 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={visitsSeries} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="fillVisits" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#E2FC03" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#E2FC03" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="oklch(1 0 0 / 6%)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: "oklch(0.68 0.01 265)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: "oklch(0.68 0.01 265)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={36}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                itemStyle={{ color: "oklch(0.97 0.002 265)" }}
                labelStyle={{ color: "oklch(0.68 0.01 265)" }}
                formatter={(value: number, name: string) => [
                  formatNumber(value),
                  name === "visits" ? "Visitas" : "Leads",
                ]}
              />
              <Area
                type="monotone"
                dataKey="visits"
                stroke="#E2FC03"
                strokeWidth={2}
                fill="url(#fillVisits)"
              />
              <Area
                type="monotone"
                dataKey="leads"
                stroke="oklch(0.72 0.12 190)"
                strokeWidth={2}
                fill="transparent"
                strokeDasharray="4 4"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="panel p-5">
          <p className="eyebrow">Embudo</p>
          <h2 className="mt-1 text-base font-medium">De visita a reserva</h2>
          <div className="mt-5 space-y-4">
            {funnel.map((step, index) => (
              <div key={step.id}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{step.label}</span>
                  <span>{formatNumber(step.value)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary/70"
                    style={{ width: `${(step.value / maxFunnel) * 100}%` }}
                  />
                </div>
                {index < funnel.length - 1 && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {Math.round((funnel[index + 1]!.value / step.value) * 100)}% avanza
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="panel p-5">
          <p className="eyebrow">Interés</p>
          <h2 className="mt-1 text-base font-medium">Tipologías más vistas</h2>
          <div className="mt-5 space-y-4">
            {typologyInterest.map((item) => (
              <div key={item.typology}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>{item.typology}</span>
                  <span className="text-muted-foreground">{formatNumber(item.views)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-chart-2/80"
                    style={{ width: `${(item.views / maxInterest) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel flex flex-col">
          <div className="flex items-center gap-2 border-b border-border p-5">
            <Sparkles className="size-4 text-primary" />
            <p className="eyebrow">AI Insights</p>
          </div>
          <ul className="flex-1 space-y-4 p-5">
            {aiInsights.map((insight) => (
              <li key={insight} className="flex gap-3 text-sm leading-relaxed">
                <Lightbulb className="mt-0.5 size-4 shrink-0 text-primary" />
                {insight}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="panel mt-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <p className="eyebrow">Unidades</p>
            <h2 className="mt-1 text-base font-medium">Las más vistas</h2>
          </div>
          <span className="text-xs text-muted-foreground">
            {stats.available} disponibles · {stats.reserved} reservadas · {stats.sold} vendidas
          </span>
        </div>
        <ul className="divide-y divide-border">
          {topUnits.map((unit) => (
            <li key={unit.id} className="flex items-center gap-4 px-5 py-3">
              <span className="w-8 shrink-0 text-xs text-muted-foreground">{unit.number}</span>
              <span className="w-28 shrink-0 text-sm">{unit.typology}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-reserved/70"
                  style={{ width: `${Math.round((unit.views / topViewsMax) * 100)}%` }}
                />
              </div>
              <span className="w-14 shrink-0 text-right text-sm tabular-nums">
                {formatNumber(unit.views)}
              </span>
              <span className="hidden w-32 shrink-0 text-right text-sm text-muted-foreground sm:block">
                {formatPrice(unit.price, unit.currency)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </AdminPage>
  );
}
