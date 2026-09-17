import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, Download, MessageCircle, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AdminPage, StatCard } from "@/components/admin/AdminPage";
import { LeadStatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { funnel } from "@/data/demo";
import { formatDateTime, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { deleteLead, updateLeadStatus, useLeads } from "@/services/store";
import type { Lead, LeadStatus } from "@/types/domain";

export const Route = createFileRoute("/admin/leads")({
  component: AdminLeads,
});

const leadStatuses: LeadStatus[] = [
  "Nuevo",
  "Contactado",
  "Calificado",
  "Visita",
  "Reserva",
  "Cerrado",
];

function AdminLeads() {
  const leads = useLeads();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"todos" | LeadStatus>("todos");
  const [expanded, setExpanded] = useState<string[]>([]);

  const maxFunnel = Math.max(...funnel.map((f) => f.value));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads
      .filter((lead) => status === "todos" || lead.status === status)
      .filter((lead) => {
        if (!q) return true;
        return (
          lead.name.toLowerCase().includes(q) ||
          lead.email.toLowerCase().includes(q) ||
          lead.phone.includes(q) ||
          (lead.unitCode?.toLowerCase().includes(q) ?? false) ||
          lead.message.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [leads, search, status]);

  const counts: Record<LeadStatus, number> = {
    Nuevo: 0,
    Contactado: 0,
    Calificado: 0,
    Visita: 0,
    Reserva: 0,
    Cerrado: 0,
  };
  leads.forEach((lead) => {
    counts[lead.status] += 1;
  });

  function toggle(rowId: string) {
    setExpanded((prev) =>
      prev.includes(rowId) ? prev.filter((id) => id !== rowId) : [...prev, rowId],
    );
  }

  function exportCsv() {
    const header = "Nombre,Email,Teléfono,Unidad,Mensaje,Estado,Fecha,Origen";
    const rows = filtered.map((lead) =>
      [
        lead.name,
        lead.email,
        lead.phone,
        lead.unitCode ?? "",
        `"${lead.message.replace(/"/g, '""')}"`,
        lead.status,
        lead.createdAt,
        lead.source,
      ].join(","),
    );
    const blob = new Blob([`${header}\n${rows.join("\n")}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado", { description: `${rows.length} leads descargados.` });
  }

  function removeLead(lead: Lead) {
    deleteLead(lead.id);
    toast.info("Lead eliminado", { description: `${lead.name} se quitó de la lista.` });
  }

  return (
    <AdminPage
      eyebrow="Pipeline"
      title="Leads"
      description={`${leads.length} consultas recibidas en el showroom de ${leads[0]?.projectName ?? ""}`.trim()}
      actions={
        <Button variant="outline" onClick={exportCsv} disabled={filtered.length === 0}>
          <Download className="size-4" /> Exportar CSV
        </Button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {leadStatuses.map((leadStatus) => (
          <StatCard
            key={leadStatus}
            label={leadStatus}
            value={formatNumber(counts[leadStatus])}
            className="cursor-pointer transition-colors hover:bg-elevated"
          />
        ))}
      </div>

      <div className="panel mt-6 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <p className="eyebrow">Embudo de conversión</p>
          <span className="text-xs text-muted-foreground">
            {formatNumber(funnel[0]?.value ?? 0)} visitas → {formatNumber(funnel[4]?.value ?? 0)}{" "}
            reservas
          </span>
        </div>
        <div className="space-y-3 p-5">
          {funnel.map((step) => (
            <div key={step.id}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span>{step.label}</span>
                <span className="text-muted-foreground">{formatNumber(step.value)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary/70 transition-all"
                  style={{ width: `${(step.value / maxFunnel) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, email, unidad…"
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as "todos" | LeadStatus)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            {leadStatuses.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="panel mt-5 overflow-hidden">
        <ul className="divide-y divide-border">
          {filtered.map((lead) => {
            const isOpen = expanded.includes(lead.id);
            return (
              <li key={lead.id}>
                <button
                  type="button"
                  onClick={() => toggle(lead.id)}
                  className="flex w-full flex-wrap items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-surface/60"
                >
                  <ChevronDown
                    className={cn(
                      "size-4 shrink-0 text-muted-foreground transition-transform",
                      isOpen && "rotate-180",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{lead.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {lead.email} · {lead.phone || "sin teléfono"}
                    </p>
                  </div>
                  <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
                    {lead.unitCode ? (
                      <span className="rounded-full border border-border px-2 py-0.5">
                        {lead.unitCode}
                      </span>
                    ) : (
                      <span>Sin unidad</span>
                    )}
                    <span>{formatDateTime(lead.createdAt)}</span>
                  </div>
                  <LeadStatusSelect lead={lead} />
                </button>

                {isOpen && (
                  <div className="border-t border-border bg-surface/40 px-6 py-5">
                    <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
                      <div>
                        {lead.message && (
                          <div className="panel p-4">
                            <p className="eyebrow">Mensaje</p>
                            <p className="mt-2 text-sm leading-relaxed">{lead.message}</p>
                          </div>
                        )}
                        <p className="eyebrow mt-5">Actividad</p>
                        <ol className="mt-2 space-y-2">
                          {lead.activity.map((event) => (
                            <li key={event.id} className="flex items-baseline gap-3 text-sm">
                              <span className="size-1.5 shrink-0 translate-y-[-1px] rounded-full bg-primary" />
                              <span>{event.label}</span>
                              <span className="ml-auto whitespace-nowrap text-xs text-muted-foreground">
                                {formatDateTime(event.date)}
                              </span>
                            </li>
                          ))}
                        </ol>
                      </div>
                      <div className="space-y-2">
                        <a
                          href={`mailto:${lead.email}`}
                          className="flex h-9 w-full items-center justify-center rounded-md border border-input bg-background px-3 text-sm transition-colors hover:bg-accent"
                        >
                          Responder por email
                        </a>
                        {lead.phone && (
                          <a
                            href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex h-9 w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-3 text-sm transition-colors hover:bg-accent"
                          >
                            <MessageCircle className="size-4" /> WhatsApp
                          </a>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-destructive hover:text-destructive"
                          onClick={() => removeLead(lead)}
                        >
                          <Trash2 className="size-4" /> Eliminar lead
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
          {filtered.length === 0 && (
            <li className="px-5 py-12 text-center text-sm text-muted-foreground">
              No hay leads que coincidan con los filtros.
            </li>
          )}
        </ul>
      </div>
    </AdminPage>
  );
}

function LeadStatusSelect({ lead }: { lead: Lead }) {
  return (
    <Select
      value={lead.status}
      onValueChange={(value) => updateLeadStatus(lead.id, value as LeadStatus)}
    >
      <SelectTrigger className="h-8 w-auto gap-2">
        <LeadStatusBadge status={lead.status} className="pointer-events-none" />
      </SelectTrigger>
      <SelectContent>
        {leadStatuses.map((status) => (
          <SelectItem key={status} value={status}>
            {status}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
