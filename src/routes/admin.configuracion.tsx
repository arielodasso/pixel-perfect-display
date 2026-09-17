import { createFileRoute } from "@tanstack/react-router";
import { Building2, Database, Palette, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AdminPage } from "@/components/admin/AdminPage";
import { Field } from "@/components/admin/fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { organization as demoOrganization } from "@/data/demo";
import {
  resetDemoData,
  updateOrganization,
  updateSettings,
  useOrganization,
  useSettings,
} from "@/services/store";
import type { ShowroomSettings } from "@/services/store";
import type { Organization } from "@/types/domain";

export const Route = createFileRoute("/admin/configuracion")({
  component: AdminConfiguracion,
});

const sectionSwitches: { key: keyof ShowroomSettings; label: string; hint: string }[] = [
  {
    key: "showProject",
    label: "Sección proyecto",
    hint: "Descripción, amenities y terminaciones.",
  },
  {
    key: "showUnits",
    label: "Explorador de unidades",
    hint: "Corte del edificio y panel de detalle.",
  },
  { key: "showCompare", label: "Comparador", hint: "Hasta tres unidades lado a lado." },
  { key: "showFinancing", label: "Financiación", hint: "Anticipo, cuotas y formas de pago." },
  { key: "showMilestones", label: "Avance de obra", hint: "Hitos y porcentaje de avance." },
  { key: "showLocation", label: "Ubicación", hint: "Mapa con puntos de interés." },
  { key: "showTour", label: "Tour virtual", hint: "Bloque de recorrido 360°." },
  {
    key: "showWhatsappCta",
    label: "CTA por WhatsApp",
    hint: "Botón de contacto directo al final.",
  },
];

function AdminConfiguracion() {
  const organization = useOrganization();
  const settings = useSettings();
  const [draft, setDraft] = useState<Organization>({ ...organization });
  const [saving, setSaving] = useState(false);

  function setField<K extends keyof Organization>(key: K, value: Organization[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function save() {
    setSaving(true);
    updateOrganization({
      name: draft.name.trim() || organization.name,
      email: draft.email.trim(),
      phone: draft.phone.trim(),
      whatsapp: draft.whatsapp.replace(/\D/g, ""),
      brandColor: draft.brandColor,
    });
    window.setTimeout(() => {
      setSaving(false);
      toast.success("Configuración guardada", {
        description: "La organización y la marca quedaron actualizadas (vista demo).",
      });
    }, 400);
  }

  return (
    <AdminPage
      eyebrow="Configuración"
      title="Configuración"
      description="Datos de tu organización, marca y visibilidad de las secciones del showroom."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel p-6">
          <div className="flex items-center gap-2 border-b border-border pb-4">
            <Building2 className="size-4 text-primary" />
            <h2 className="text-base font-medium">Organización</h2>
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <Field label="Nombre" className="sm:col-span-2">
              <Input value={draft.name} onChange={(e) => setField("name", e.target.value)} />
            </Field>
            <Field label="Email de ventas" className="sm:col-span-2">
              <Input
                type="email"
                value={draft.email}
                onChange={(e) => setField("email", e.target.value)}
                placeholder="ventas@horizonte.com.ar"
              />
            </Field>
            <Field label="Teléfono">
              <Input value={draft.phone} onChange={(e) => setField("phone", e.target.value)} />
            </Field>
            <Field label="WhatsApp" hint="Sólo números, con código de país.">
              <Input
                value={draft.whatsapp}
                onChange={(e) => setField("whatsapp", e.target.value)}
                placeholder="5492494441234"
              />
            </Field>
          </div>
        </section>

        <section className="panel p-6">
          <div className="flex items-center gap-2 border-b border-border pb-4">
            <Palette className="size-4 text-primary" />
            <h2 className="text-base font-medium">Marca</h2>
          </div>
          <div className="mt-5 space-y-5">
            <Field
              label="Color de marca"
              hint="Se usa en el showroom de tu proyecto. Actualmente lime #E2FC03."
            >
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={draft.brandColor}
                  onChange={(e) => setField("brandColor", e.target.value)}
                  className="size-10 cursor-pointer rounded-md border border-input bg-transparent p-1"
                />
                <Input
                  className="w-32 font-mono uppercase"
                  value={draft.brandColor}
                  onChange={(e) => setField("brandColor", e.target.value)}
                />
              </div>
            </Field>
          </div>
        </section>

        <section className="panel p-6 lg:col-span-2">
          <div className="flex items-center gap-2 border-b border-border pb-4">
            <SlidersHorizontal className="size-4 text-primary" />
            <h2 className="text-base font-medium">Secciones del showroom</h2>
          </div>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {sectionSwitches.map(({ key, label, hint }) => (
              <li key={key} className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{hint}</p>
                </div>
                <Switch
                  checked={settings[key]}
                  onCheckedChange={(checked) => updateSettings({ [key]: checked })}
                  aria-label={label}
                />
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Database className="size-4" />
          Vista demo: los cambios se guardan en memoria y se reinician al recargar la página.
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              resetDemoData();
              setDraft({ ...demoOrganization });
              toast.info("Datos demo restablecidos");
            }}
          >
            Restablecer demo
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      </div>
    </AdminPage>
  );
}
