import { createFileRoute } from "@tanstack/react-router";
import {
  Bell,
  Building2,
  Database,
  Palette,
  PlugZap,
  SlidersHorizontal,
  Webhook,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AdminPage } from "@/components/admin/AdminPage";
import { Field } from "@/components/admin/fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { organization as demoOrganization } from "@/data/demo";
import {
  resetDemoData,
  updateIntegrations,
  updateOrganization,
  updateSettings,
  useIntegrations,
  useOrganization,
  useSettings,
} from "@/services/store";
import type { ShowroomSettings } from "@/services/store";
import type { CrmType, Organization } from "@/types/domain";

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
  const integrations = useIntegrations();
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

        <section className="panel p-6">
          <div className="flex items-center gap-2 border-b border-border pb-4">
            <PlugZap className="size-4 text-primary" />
            <h2 className="text-base font-medium">Integraciones</h2>
          </div>
          <div className="mt-5 space-y-5">
            <Field label="CRM" hint="Enviar cada lead nuevo a tu CRM.">
              <Select
                value={integrations.crmType}
                onValueChange={(v) => updateIntegrations({ crmType: v as CrmType })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ninguno (gestión manual)</SelectItem>
                  <SelectItem value="hubspot">HubSpot</SelectItem>
                  <SelectItem value="salesforce">Salesforce</SelectItem>
                  <SelectItem value="pipedrive">Pipedrive</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {integrations.crmType !== "none" && (
              <Field
                label="API key del CRM"
                hint="Se guarda en las variables seguras del proyecto."
              >
                <Input
                  type="password"
                  value={integrations.crmApiKey}
                  onChange={(e) => updateIntegrations({ crmApiKey: e.target.value })}
                  placeholder="sk_live_…"
                />
              </Field>
            )}
            <Field label="Webhook de notificación" hint="Recibís un POST por cada lead o reserva.">
              <div className="flex gap-2">
                <Input
                  value={integrations.webhookUrl}
                  onChange={(e) => updateIntegrations({ webhookUrl: e.target.value })}
                  placeholder="https://tu-backend.com/hooks/leads"
                />
                <Button
                  variant="outline"
                  size="icon"
                  type="button"
                  aria-label="Probar webhook"
                  title="Enviar evento de prueba"
                  onClick={() => {
                    if (!integrations.webhookUrl.trim()) {
                      toast.error("Primero configura una URL de webhook.");
                      return;
                    }
                    toast.success("Webhook probado", {
                      description: "Simulación: POST con un lead de ejemplo (vista demo).",
                    });
                  }}
                >
                  <Webhook className="size-4" />
                </Button>
              </div>
            </Field>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              La integración se entrega a través de Lovable Cloud. En la vista demo se simula el
              envío en la consola del navegador.
            </p>
          </div>
        </section>

        <section className="panel p-6">
          <div className="flex items-center gap-2 border-b border-border pb-4">
            <Bell className="size-4 text-primary" />
            <h2 className="text-base font-medium">Notificaciones</h2>
          </div>
          <ul className="mt-5 space-y-4">
            <li className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Nuevo lead</p>
                <p className="text-xs text-muted-foreground">
                  Avisa cuando alguien deja un formulario en el showroom.
                </p>
              </div>
              <Switch
                checked={integrations.notifyOnLead}
                onCheckedChange={(checked) => updateIntegrations({ notifyOnLead: checked })}
                aria-label="Notificar nuevo lead"
              />
            </li>
            <li className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Reserva o venta</p>
                <p className="text-xs text-muted-foreground">
                  Avisa cuando una unidad cambia de estado en el inventario.
                </p>
              </div>
              <Switch
                checked={integrations.notifyOnReservation}
                onCheckedChange={(checked) => updateIntegrations({ notifyOnReservation: checked })}
                aria-label="Notificar reserva o venta"
              />
            </li>
            <li className="border-t border-border pt-4">
              <Field label="Email de destino" hint="Copias de las notificaciones.">
                <Input
                  type="email"
                  value={integrations.notifyEmail}
                  onChange={(e) => updateIntegrations({ notifyEmail: e.target.value })}
                  placeholder="ventas@horizonte.com.ar"
                />
              </Field>
            </li>
          </ul>
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
