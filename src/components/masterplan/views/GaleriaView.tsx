import { useState } from "react";

import { GALLERY_SCENES, exteriorStill, galleryStill, interiorStill } from "@/lib/renders";
import { cn } from "@/lib/utils";
import type { Project } from "@/types/domain";

import { RenderImage } from "../RenderImage";

interface Props {
  project: Project;
}

interface Item {
  key: string;
  caption: string;
  factory: () => string;
  wide?: boolean;
}

export function GaleriaView({ project }: Props) {
  const [active, setActive] = useState<Item | null>(null);

  const items: Item[] = [
    {
      key: "ext-golden",
      caption: "Fachada al atardecer — Av. Avellaneda",
      factory: () => exteriorStill("golden"),
      wide: true,
    },
    { key: "ext-day", caption: "Volumetría y entorno diurno", factory: () => exteriorStill("day") },
    ...GALLERY_SCENES.map((scene) => ({
      key: `gal-${scene.id}`,
      caption: scene.label,
      factory: () => galleryStill(scene.id),
    })),
    {
      key: "int-living",
      caption: "Living tipo — 2 ambientes",
      factory: () => interiorStill("living", "galeria-living"),
    },
    {
      key: "int-bedroom",
      caption: "Dormitorio principal",
      factory: () => interiorStill("bedroom", "galeria-bedroom"),
    },
    {
      key: "int-kitchen",
      caption: "Cocina integrada",
      factory: () => interiorStill("kitchen", "galeria-kitchen"),
    },
    {
      key: "ext-dusk",
      caption: `${project.name} de noche`,
      factory: () => exteriorStill("dusk"),
    },
    {
      key: "int-bath",
      caption: "Baño completo",
      factory: () => interiorStill("bath", "galeria-bath"),
    },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <header className="px-6 pt-8 sm:px-10">
        <p className="eyebrow">Galería</p>
        <h2 className="mt-2 text-3xl font-light tracking-tight">Renders del proyecto</h2>
        <p className="mt-2 max-w-[60ch] text-sm text-muted-foreground">
          Una recorrida visual por la arquitectura, los espacios comunes y las tipologías de{" "}
          {project.name}.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 px-6 py-8 sm:grid-cols-2 sm:px-10 lg:grid-cols-3">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setActive(item)}
            className={cn(
              "group overflow-hidden rounded-xl border border-border text-left transition-colors hover:border-primary/50",
              item.wide && "sm:col-span-2",
            )}
          >
            <RenderImage
              cacheKey={item.key}
              factory={item.factory}
              alt={item.caption}
              className={cn("w-full", item.wide ? "aspect-[16/8]" : "aspect-[4/3]")}
              imgClassName="transition-transform duration-700 group-hover:scale-105"
            />
            <p className="bg-surface px-4 py-2.5 text-xs text-muted-foreground">{item.caption}</p>
          </button>
        ))}
      </div>

      {active && (
        <div
          role="dialog"
          aria-modal
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setActive(null)}
        >
          <div className="max-h-full w-full max-w-5xl overflow-hidden rounded-xl border border-white/10">
            <RenderImage
              cacheKey={`lg-${active.key}`}
              factory={active.factory}
              alt={active.caption}
              className="aspect-video w-full"
            />
            <div className="flex items-center justify-between bg-black/70 px-4 py-3">
              <p className="text-sm text-white/85">{active.caption}</p>
              <button
                type="button"
                className="text-xs text-white/60 hover:text-white"
                onClick={() => setActive(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
