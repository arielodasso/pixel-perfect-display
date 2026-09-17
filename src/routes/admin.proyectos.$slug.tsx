import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowUpRight, ExternalLink, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ChipEditor, Field } from "@/components/admin/fields";
import { AdminPage } from "@/components/admin/AdminPage";
import { ConstructionEditor } from "@/components/admin/ConstructionEditor";
import { VirtualTourAdmin } from "@/components/admin/VirtualTourAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { project as projectDemo } from "@/data/demo";
import { unitStats, updateProject, useProject, useUnits } from "@/services/store";
import type { Milestone, Project, ProjectStatus } from "@/types/domain";

export const Route = createFileRoute("/admin/proyectos/$slug")({
  loader: ({ params }) => {
    if (params.slug !== projectDemo.slug) throw notFound();
    return { slug: params.slug };
  },
  component: ProjectEditor,
});

const projectStatuses: ProjectStatus[] = ["En preventa", "En obra", "Terminado", "Borrador"];
const milestoneStatuses = ["completado", "en progreso", "proximamente"] as const;

function ProjectEditor() {
  const project = useProject();
  const units = useUnits();
  const stats = unitStats(units);
  const [draft, setDraft] = useState<Project>(() => ({ ...project }));
  const [saving, setSaving] = useState(false);

  function setField<K extends keyof Project>(key: K, value: Project[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function save() {
    setSaving(true);
    updateProject({
      name: draft.name.trim() || project.name,
      tagline: draft.tagline.trim(),
      description: draft.description.trim(),
      type: draft.type.trim(),
      status: draft.status,
      city: draft.city.trim() || project.city,
      province: draft.province.trim() || project.province,
      address: draft.address.trim() || project.address,
      deliveryDate: draft.deliveryDate.trim(),
      priceFrom: Number(draft.priceFrom) || 0,
      currency: draft.currency,
      heroImage: draft.heroImage.trim() || project.heroImage,
      virtualTourUrl: draft.virtualTourUrl?.trim() || null,
      financing: {
        advance: draft.financing.advance.trim(),
        installments: draft.financing.installments.trim(),
        balance: draft.financing.balance.trim(),
      },
      paymentMethods: draft.paymentMethods.filter((p) => p.trim().length > 0),
      amenities: draft.amenities.filter((p) => p.trim().length > 0),
      features: draft.features.filter((p) => p.trim().length > 0),
      milestones: draft.milestones.filter((m) => m.name.trim().length > 0),
      construction: {
        ...draft.construction,
        gallery: draft.construction.gallery.filter((photo) => photo.url.trim().length > 0),
      },
      ...(draft.virtualTour ? { virtualTour: draft.virtualTour } : {}),
    });
    window.setTimeout(() => {
      setSaving(false);
      toast.success("Proyecto actualizado", {
        description: "Los cambios ya están reflejados en el showroom (vista demo).",
      });
    }, 400);
  }

  function resetDraft() {
    setDraft({ ...project });
    toast.info("Cambios descartados");
  }

  return (
    <AdminPage
      eyebrow="Editor"
      title={`Editar ${project.name}`}
      description={`${project.address} · ${stats.total} unidades · ${stats.available} disponibles`}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="ghost" onClick={resetDraft} disabled={saving}>
            Descartar
          </Button>
          <Button asChild variant="outline">
            <Link to="/showroom/$slug" params={{ slug: project.slug }}>
              Ver showroom <ExternalLink className="size-3.5" />
            </Link>
          </Button>
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      }
    >
      <Tabs defaultValue="ficha" className="mt-2">
        <TabsList className="mb-6 grid w-full max-w-3xl grid-cols-5">
          <TabsTrigger value="ficha">Ficha</TabsTrigger>
          <TabsTrigger value="dotacion">Dotación</TabsTrigger>
          <TabsTrigger value="financiacion">Financiación</TabsTrigger>
          <TabsTrigger value="obra">Obra</TabsTrigger>
          <TabsTrigger value="tour">Tour virtual</TabsTrigger>
        </TabsList>

        <TabsContent value="ficha">
          <section className="panel grid gap-6 p-6 sm:grid-cols-2">
            <Field
              label="Nombre del proyecto"
              className="sm:col-span-2"
              hint="Se muestra en el hero del showroom y en el panel."
            >
              <Input value={draft.name} onChange={(e) => setField("name", e.target.value)} />
            </Field>
            <Field label="Frase corta (tagline)">
              <Input value={draft.tagline} onChange={(e) => setField("tagline", e.target.value)} />
            </Field>
            <Field label="Estado del proyecto">
              <Select
                value={draft.status}
                onValueChange={(value) => setField("status", value as ProjectStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {projectStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Descripción" className="sm:col-span-2">
              <Textarea
                rows={4}
                value={draft.description}
                onChange={(e) => setField("description", e.target.value)}
              />
            </Field>
            <Field label="Tipo de emprendimiento">
              <Input value={draft.type} onChange={(e) => setField("type", e.target.value)} />
            </Field>
            <Field label="Moneda de precios">
              <Select
                value={draft.currency}
                onValueChange={(value) => setField("currency", value as "USD" | "ARS")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">Dólares (USD)</SelectItem>
                  <SelectItem value="ARS">Pesos (ARS)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Ciudad">
              <Input value={draft.city} onChange={(e) => setField("city", e.target.value)} />
            </Field>
            <Field label="Provincia">
              <Input
                value={draft.province}
                onChange={(e) => setField("province", e.target.value)}
              />
            </Field>
            <Field label="Dirección" className="sm:col-span-2">
              <Input value={draft.address} onChange={(e) => setField("address", e.target.value)} />
            </Field>
            <Field label="Precio desde">
              <Input
                type="number"
                min={0}
                value={String(draft.priceFrom)}
                onChange={(e) => setField("priceFrom", Number(e.target.value))}
              />
            </Field>
            <Field label="Fecha estimada de entrega">
              <Input
                value={draft.deliveryDate}
                onChange={(e) => setField("deliveryDate", e.target.value)}
                placeholder="2028"
              />
            </Field>
            <Field
              label="URL del render principal"
              className="sm:col-span-2"
              hint="Dejá la URL de la imagen hero del showroom."
            >
              <Input
                value={draft.heroImage}
                onChange={(e) => setField("heroImage", e.target.value)}
              />
            </Field>
            <Field
              label="URL del tour virtual 360°"
              className="sm:col-span-2"
              hint="Opcional. Si está vacío, el showroom muestra el aviso de 'en producción'."
            >
              <Input
                value={draft.virtualTourUrl ?? ""}
                onChange={(e) => setField("virtualTourUrl", e.target.value || null)}
                placeholder="https://…"
              />
            </Field>
          </section>
        </TabsContent>

        <TabsContent value="dotacion">
          <section className="grid gap-6">
            <div className="panel p-6">
              <Field label="Amenities">
                <ChipEditor
                  items={draft.amenities}
                  onChange={(items) => setField("amenities", items)}
                  placeholder="Ej: Rooftop con pileta"
                />
              </Field>
            </div>
            <div className="panel p-6">
              <Field label="Terminaciones y features">
                <ChipEditor
                  items={draft.features}
                  onChange={(items) => setField("features", items)}
                  placeholder="Ej: Aberturas de aluminio con DVH"
                />
              </Field>
            </div>
            <div className="panel p-6">
              <Field label="Galería del proyecto">
                <ul className="mt-3 grid gap-3 sm:grid-cols-3">
                  {project.gallery.map((image) => (
                    <figure
                      key={image.id}
                      className="overflow-hidden rounded-lg border border-border"
                    >
                      <img
                        src={image.url}
                        alt={image.caption}
                        className="h-28 w-full object-cover"
                      />
                      <figcaption className="bg-surface px-3 py-2 text-xs text-muted-foreground">
                        {image.caption}
                      </figcaption>
                    </figure>
                  ))}
                </ul>
              </Field>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="financiacion">
          <section className="grid gap-6">
            <div className="panel grid gap-6 p-6 sm:grid-cols-3">
              <Field label="Anticipo">
                <Input
                  value={draft.financing.advance}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      financing: { ...prev.financing, advance: e.target.value },
                    }))
                  }
                />
              </Field>
              <Field label="Cuotas">
                <Input
                  value={draft.financing.installments}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      financing: { ...prev.financing, installments: e.target.value },
                    }))
                  }
                />
              </Field>
              <Field label="Saldo">
                <Input
                  value={draft.financing.balance}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      financing: { ...prev.financing, balance: e.target.value },
                    }))
                  }
                />
              </Field>
            </div>
            <div className="panel p-6">
              <Field label="Formas de pago">
                <ChipEditor
                  items={draft.paymentMethods}
                  onChange={(items) => setField("paymentMethods", items)}
                  placeholder="Ej: Financiación directa"
                />
              </Field>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="obra">
          <div className="grid gap-6">
            <ConstructionEditor
              value={draft.construction}
              onChange={(next) => setField("construction", next)}
            />
            <section className="panel overflow-hidden">
              <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <div>
                  <p className="eyebrow">Hitos</p>
                  <h2 className="mt-1 text-base font-medium">Avance de obra</h2>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setDraft((prev) => ({
                      ...prev,
                      milestones: [
                        ...prev.milestones,
                        {
                          id: `m_${Date.now()}`,
                          name: "",
                          status: "proximamente",
                          date: "",
                          progress: 0,
                        },
                      ],
                    }))
                  }
                >
                  Agregar hito
                </Button>
              </div>
              <ul className="divide-y divide-border">
                {draft.milestones.map((milestone) => (
                  <MilestoneRow
                    key={milestone.id}
                    milestone={milestone}
                    onChange={(next) =>
                      setDraft((prev) => ({
                        ...prev,
                        milestones: prev.milestones.map((m) => (m.id === milestone.id ? next : m)),
                      }))
                    }
                    onRemove={() =>
                      setDraft((prev) => ({
                        ...prev,
                        milestones: prev.milestones.filter((m) => m.id !== milestone.id),
                      }))
                    }
                  />
                ))}
              </ul>
            </section>
          </div>
        </TabsContent>

        <TabsContent value="tour">
          <VirtualTourAdmin
            value={draft.virtualTour}
            projectName={project.name}
            projectSlug={project.slug}
            units={units}
            onChange={(next) => setField("virtualTour", next)}
          />
        </TabsContent>
      </Tabs>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Showroom en{" "}
          <Link
            to="/showroom/$slug"
            params={{ slug: project.slug }}
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            {project.slug} <ArrowUpRight className="size-3" />
          </Link>
        </p>
        <Button type="button" onClick={save} disabled={saving}>
          {saving ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </AdminPage>
  );
}

function MilestoneRow({
  milestone,
  onChange,
  onRemove,
}: {
  milestone: Milestone;
  onChange: (next: Milestone) => void;
  onRemove: () => void;
}) {
  return (
    <li className="grid gap-4 p-6 sm:grid-cols-[1fr_140px_120px_120px_36px] sm:items-center">
      <div>
        <Label className="text-xs text-muted-foreground">Nombre</Label>
        <Input
          className="mt-1.5"
          value={milestone.name}
          onChange={(e) => onChange({ ...milestone, name: e.target.value })}
          placeholder="Ej: Estructura"
        />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Fecha</Label>
        <Input
          className="mt-1.5"
          value={milestone.date}
          onChange={(e) => onChange({ ...milestone, date: e.target.value })}
          placeholder="2027"
        />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Estado</Label>
        <Select
          value={milestone.status}
          onValueChange={(value) =>
            onChange({
              ...milestone,
              status: value as (typeof milestoneStatuses)[number],
            })
          }
        >
          <SelectTrigger className="mt-1.5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {milestoneStatuses.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">%</Label>
        <Input
          className="mt-1.5"
          type="number"
          min={0}
          max={100}
          value={String(milestone.progress)}
          onChange={(e) =>
            onChange({
              ...milestone,
              progress: Math.min(100, Math.max(0, Number(e.target.value) || 0)),
            })
          }
        />
      </div>
      <Button type="button" variant="ghost" size="icon" onClick={onRemove} aria-label="Quitar hito">
        <X className="size-4" />
      </Button>
    </li>
  );
}
