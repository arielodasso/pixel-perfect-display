import { CheckCircle2 } from "lucide-react";
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
import { trackEvent } from "@/lib/tracking";
import { createLead } from "@/services/store";
import type { LeadSource, Unit } from "@/types/domain";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  units: Unit[];
  presetUnitCode?: string | null;
  /** Origen del lead; por defecto "showroom". */
  source?: LeadSource;
  title?: string;
}

const NONE = "sin-unidad";

export function LeadFormDialog({
  open,
  onOpenChange,
  units,
  presetUnitCode,
  source = "showroom",
  title = "Solicitar información",
}: Props) {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      setSent(false);
      setError(null);
      setForm((prev) => ({ ...prev, unitCode: presetUnitCode ?? NONE }));
      trackEvent("lead_form_open", { unit: presetUnitCode ?? null });
    }
  }, [open, presetUnitCode]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      setError("Necesitamos tu nombre y tu email para contactarte.");
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
    setError(null);
    setSent(true);
    setForm({ name: "", email: "", phone: "", unitCode: NONE, message: "", newsletter: true });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        {sent ? (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <CheckCircle2 className="size-12 text-primary" />
            <DialogHeader>
              <DialogTitle className="text-center text-xl font-light">
                Gracias. La desarrolladora se pondrá en contacto con vos.
              </DialogTitle>
            </DialogHeader>
            <p className="max-w-[34ch] text-sm text-muted-foreground">
              Guardamos tu consulta y el equipo comercial responde en el día.
            </p>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Volver al showroom
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-light">{title}</DialogTitle>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleSubmit} noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="lead-name">Nombre</Label>
                  <Input
                    id="lead-name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Nombre y apellido"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lead-phone">Teléfono</Label>
                  <Input
                    id="lead-phone"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+54 249 ..."
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lead-email">Email</Label>
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
                  onCheckedChange={(checked) =>
                    setForm({ ...form, newsletter: checked === true })
                  }
                />
                Quiero recibir información del proyecto.
              </label>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full">
                Solicitar información
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
