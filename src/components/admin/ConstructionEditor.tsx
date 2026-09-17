import { Plus, X } from "lucide-react";

import { Field } from "@/components/admin/fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ConstructionProgress } from "@/types/domain";

interface Props {
  value: ConstructionProgress;
  onChange: (next: ConstructionProgress) => void;
}

/** Editor del bloque de avance de obra que ve el público en el showroom. */
export function ConstructionEditor({ value, onChange }: Props) {
  function set<K extends keyof ConstructionProgress>(key: K, next: ConstructionProgress[K]) {
    onChange({ ...value, [key]: next });
  }

  function addPhoto() {
    onChange({
      ...value,
      gallery: [...value.gallery, { id: `ob_${Date.now()}`, url: "", caption: "" }],
    });
  }

  return (
    <div className="grid gap-6">
      <section className="panel grid gap-6 p-6 sm:grid-cols-2">
        <Field
          label="Avance general (%)"
          hint="Se refleja en el anillo y la barra de evolución del showroom."
        >
          <Input
            type="number"
            min={0}
            max={100}
            value={String(value.progress)}
            onChange={(e) =>
              set("progress", Math.min(100, Math.max(0, Number(e.target.value) || 0)))
            }
          />
        </Field>
        <Field label="Estado de obra">
          <Input
            value={value.status}
            onChange={(e) => set("status", e.target.value)}
            placeholder="Ej: En obra"
          />
        </Field>
        <Field label="Última actualización">
          <Input
            type="date"
            value={value.updatedAt.slice(0, 10)}
            onChange={(e) => {
              const next = e.target.value
                ? new Date(e.target.value).toISOString()
                : value.updatedAt;
              set("updatedAt", next);
            }}
          />
        </Field>
        <Field label="Entrega estimada">
          <Input
            value={value.estimatedCompletion}
            onChange={(e) => set("estimatedCompletion", e.target.value)}
            placeholder="Ej: Q1 2028"
          />
        </Field>
      </section>

      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <p className="eyebrow">Galería de avance</p>
            <h2 className="mt-1 text-base font-medium">Fotos reales de obra</h2>
          </div>
          <Button type="button" variant="outline" onClick={addPhoto}>
            <Plus className="size-4" /> Agregar foto
          </Button>
        </div>
        {value.gallery.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">Todavía no hay fotos cargadas.</p>
        ) : (
          <ul className="divide-y divide-border">
            {value.gallery.map((photo, index) => (
              <li
                key={photo.id}
                className="grid gap-4 p-6 sm:grid-cols-[1fr_1fr_36px] sm:items-end"
              >
                <div>
                  <Label className="text-xs text-muted-foreground">URL de la imagen</Label>
                  <Input
                    className="mt-1.5"
                    value={photo.url}
                    onChange={(e) =>
                      set(
                        "gallery",
                        value.gallery.map((p, i) =>
                          i === index ? { ...p, url: e.target.value } : p,
                        ),
                      )
                    }
                    placeholder="https://…"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Epígrafe</Label>
                  <Input
                    className="mt-1.5"
                    value={photo.caption}
                    onChange={(e) =>
                      set(
                        "gallery",
                        value.gallery.map((p, i) =>
                          i === index ? { ...p, caption: e.target.value } : p,
                        ),
                      )
                    }
                    placeholder="Ej: Estructura — nivel 5"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Quitar foto"
                  onClick={() =>
                    set(
                      "gallery",
                      value.gallery.filter((_, i) => i !== index),
                    )
                  }
                >
                  <X className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
