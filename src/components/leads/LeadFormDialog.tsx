import { CheckCircle2, Download, MessageCircle, UserRound } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/tracking";
import { printUnitFicha } from "@/lib/unit-ficha";
import { createLead, useOrganization, useProject } from "@/services/store";
import type { LeadSource, Unit } from "@/types/domain";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  units: Unit[];
  presetUnitCode?: string | null;
  /** Mensaje precargado (ej. resultado de un simulador financiero). */
  presetMessage?: string | null;
  /** Origen del lead; por defecto "showroom". */
  source?: LeadSource;
  title?: string;
}

const NONE = "sin-unidad";

/**
 * Captura de leads en dos pasos:
 *  1. Datos de contacto básicos (nombre + WhatsApp).
 *  2. Acciones de seguimiento: ficha PDF de la unidad + consulta por WhatsApp.
 */
export function LeadFormDialog({
  open,
  onOpenChange,
  units,
  presetUnitCode,
  presetMessage,
  source = "showroom",
  title = "Solicitar información",
}: Props) {
  const organization = useOrganization();
  const project = useProject();
  const [step, setStep] = useState<1 | 2>(1);
  const [error, setError] = useState<string | null>(null);
  const [createdLeadId, setCreatedLeadId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    unitCode: presetUnitCode ?? NONE,
    message: "",
    newsletter: true,
  });

  useEffect(() => {
    if (open) {
      setStep(1);
      setError(null);
      setCreatedLeadId(null);
      setForm((prev) => ({
        ...prev,
        unitCode: presetUnitCode ?? NONE,
        message: presetMessage ?? "",
      }));
      trackEvent("lead_form_open", { unit: presetUnitCode ?? null });
    }
  }, [open, presetUnitCode, presetMessage]);

  const selectedUnit = units.find((u) => u.code === form.unitCode) ?? null;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) {
      setError("Necesitamos tu nombre para contactarte.");
      return;
    }
    if (!form.phone.trim() && !form.email.trim()) {
      setError("Dejanos tu WhatsApp o tu email para que puedan responderte.");
      return;
    }
    const lead = createLead({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      unitCode: form.unitCode === NONE ? null : form.unitCode,
      message: form.message.trim(),
      newsletter: form.newsletter,
      source,
    });
    trackEvent("lead_created", { leadId: lead.id, unit: lead.unitCode });
    setCreatedLeadId(lead.id);
    setError(null);
    setStep(2);
  }

  function openWhatsapp() {
    trackEvent("whatsapp_click", { lead: createdLeadId });
    const text = [
      `Hola, soy ${form.name.trim()}`,
      form.unitCode !== NONE
        ? `Quiero consultar por la unidad ${form.unitCode}.`
        : "Quiero consultar por unidades disponibles.",
      form.message.trim() ? `\n${form.message.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    window.open(
      `https://wa.me/${organization.whatsapp}?text=${encodeURIComponent(text)}`,
      "_blank",
    );
  }

  function downloadFicha() {
    if (!selectedUnit) return;
    trackEvent("unit_view", { unit: selectedUnit.code, action: "ficha_pdf" });
    const whatsappClean = organization.whatsapp.replace(/[^\d]/g, "");
    printUnitFicha({
      projectName: project.name,
      developer: organization.name,
      address: project.address,
      brandColor: organization.brandColor,
      unit: selectedUnit,
      financing: [
        project.financing.advance,
        project.financing.installments,
        project.financing.balance,
      ].join(" · "),
      deliveryDate: project.deliveryDate,
      contactEmail: organization.email,
      contactPhone: organization.phone,
      whatsapp: whatsappClean,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        {/* Indicador de pasos */}
        <div className="flex items-center gap-2">
          {([1, 2] as const).map((s) => (
            <div
              key={s}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-2.5 py-1 text-[11px] font-medium",
                step === s
                  ? "border-primary/40 text-foreground"
                  : "border-border text-muted-foreground",
              )}
            >
              {s === 1 ? <UserRound className="size-3.5" /> : <CheckCircle2 className="size-3.5" />}
              {s === 1 ? "Tus datos" : "Seguimiento"}
            </div>
          ))}
        </div>

        {step === 2 ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <CheckCircle2 className="size-12 text-primary" />
            <DialogHeader>
              <DialogTitle className="text-center text-xl font-light">
                Gracias, {form.name.trim().split(" ")[0]}. Tu consulta quedó guardada.
              </DialogTitle>
            </DialogHeader>
            <p className="max-w-[38ch] text-sm text-muted-foreground">
              El equipo comercial responde en el día. Mientras tanto, llevate la ficha de la unidad
              o consultanos directo por WhatsApp.
            </p>

            {selectedUnit && (
              <Button size="lg" variant="outline" className="w-full" onClick={downloadFicha}>
                <Download className="size-4" /> Descargar ficha de la unidad (PDF)
              </Button>
            )}
            <Button size="lg" className="w-full" onClick={openWhatsapp}>
              <MessageCircle className="size-4" /> Consultar por WhatsApp
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => onOpenChange(false)}
            >
              Volver al showroom
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-light">{title}</DialogTitle>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleSubmit} noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="lead-name">Nombre y apellido</Label>
                <Input
                  id="lead-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Nombre y apellido"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lead-phone">WhatsApp</Label>
                <Input
                  id="lead-phone"
                  inputMode="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+54 9 249 ..."
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lead-email">
                  Email <span className="font-normal text-muted-foreground">(opcional)</span>
                </Label>
                <Input
                  id="lead-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="tu@email.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lead-unit">Unidad de interés</Label>
                <Select
                  value={form.unitCode}
                  onValueChange={(value) => setForm({ ...form, unitCode: value })}
                >
                  <SelectTrigger id="lead-unit">
                    <SelectValue placeholder="Elegí una unidad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Todavía no lo definí</SelectItem>
                    {units
                      .filter((unit) => unit.status === "disponible")
                      .map((unit) => (
                        <SelectItem key={unit.id} value={unit.code}>
                          Unidad {unit.number} · {unit.typology}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lead-message">Mensaje</Label>
                <Textarea
                  id="lead-message"
                  rows={3}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Contanos qué estás buscando"
                />
              </div>
              <label className="flex items-start gap-3 text-sm text-muted-foreground">
                <Checkbox
                  checked={form.newsletter}
                  onCheckedChange={(checked) => setForm({ ...form, newsletter: checked === true })}
                />
                Quiero recibir información del proyecto.
              </label>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full">
                Continuar
              </Button>
              <p className="text-center text-[11px] text-muted-foreground">
                Paso siguiente: ficha PDF de la unidad + consulta por WhatsApp.
              </p>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
