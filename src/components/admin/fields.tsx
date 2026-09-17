import { Plus, X } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label>{label}</Label>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function ChipEditor({
  items,
  onChange,
  placeholder,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
}) {
  const [value, setValue] = useState("");

  function add() {
    const item = value.trim();
    if (!item) return;
    if (items.includes(item)) {
      setValue("");
      return;
    }
    onChange([...items, item]);
    setValue("");
  }

  function remove(item: string) {
    onChange(items.filter((i) => i !== item));
  }

  return (
    <div>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder ?? "Agregar ítem"}
        />
        <Button type="button" variant="outline" size="icon" onClick={add} aria-label="Agregar ítem">
          <Plus className="size-4" />
        </Button>
      </div>
      {items.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {items.map((item) => (
            <li
              key={item}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-sm"
            >
              {item}
              <button
                type="button"
                aria-label={`Quitar ${item}`}
                onClick={() => remove(item)}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function PageActions({
  onSave,
  onReset,
  saving,
}: {
  onSave: () => void;
  onReset?: () => void;
  saving?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {onReset && (
        <Button type="button" variant="ghost" onClick={onReset}>
          Descartar cambios
        </Button>
      )}
      <Button type="button" onClick={onSave} disabled={saving}>
        Guardar cambios
      </Button>
    </div>
  );
}
