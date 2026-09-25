import { ExternalLink, Layers, Plus, Sparkles, X } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { Field } from "@/components/admin/fields";
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
import { Switch } from "@/components/ui/switch";
import { autoLayoutPositions } from "@/features/virtual-tour/engine";
import type {
  Unit,
  VirtualTourConfig,
  VirtualTourFloorConfig,
  VirtualTourHotspotConfig,
  VirtualTourUnitPlacement,
} from "@/types/domain";

interface Props {
  value: VirtualTourConfig | undefined;
  projectName: string;
  projectSlug: string;
  units: Unit[];
  onChange: (next: VirtualTourConfig) => void;
}

/** Administración del Tour Virtual: habilitación, publicación, plantas y unidades. */
export function VirtualTourAdmin({ value, projectName, projectSlug, units, onChange }: Props) {
  if (!value) {
    return (
      <section className="panel flex flex-col items-start gap-4 p-8">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-primary" />
          <h2 className="text-lg font-medium">Tour virtual</h2>
        </div>
        <p className="max-w-[60ch] text-sm text-muted-foreground">
          Todavía no creaste el tour virtual de {projectName}. Al crearlo vas a poder definir las
          plantas, ubicar las unidades sobre el plano y publicarlas en el showroom.
        </p>
        <Button
          type="button"
          onClick={() =>
            onChange({
              enabled: true,
              published: false,
              title: `Tour virtual de ${projectName}`,
              floors: [],
            })
          }
        >
          <Plus className="size-4" /> Crear tour virtual
        </Button>
      </section>
    );
  }

  const tour = value;

  function patch(next: Partial<VirtualTourConfig>) {
    onChange({ ...tour, ...next });
  }

  function updateFloor(floorId: string, next: Partial<VirtualTourFloorConfig>) {
    patch({
      floors: tour.floors.map((floor) => (floor.id === floorId ? { ...floor, ...next } : floor)),
    });
  }

  function addFloor() {
    const nextLevel = tour.floors.reduce((max, floor) => Math.max(max, floor.level), 0) + 1;
    patch({
      floors: [
        ...tour.floors,
        {
          id: `tf_${Date.now()}`,
          name: `Piso ${nextLevel}`,
          level: nextLevel,
          unitPlacements: [],
          hotspots: [],
        },
      ],
    });
  }

  function removeFloor(floorId: string) {
    patch({ floors: tour.floors.filter((floor) => floor.id !== floorId) });
  }

  return (
    <div className="grid gap-6">
      <section className="panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <h2 className="text-base font-medium">Estado del tour</h2>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/showroom/$slug/tour" params={{ slug: projectSlug }} target="_blank">
              Previsualizar tour <ExternalLink className="size-3.5" />
            </Link>
          </Button>
        </div>

        <ul className="mt-5 space-y-3">
          <li className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Tour habilitado</p>
              <p className="text-xs text-muted-foreground">
                Habilita la sección y los accesos al tour en el showroom.
              </p>
            </div>
            <Switch
              checked={tour.enabled}
              onCheckedChange={(checked) => patch({ enabled: checked })}
              aria-label="Tour habilitado"
            />
          </li>
          <li className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Publicado</p>
              <p className="text-xs text-muted-foreground">
                Si está desactivado, sólo vos podés verlo en modo vista previa.
              </p>
            </div>
            <Switch
              checked={tour.published}
              onCheckedChange={(checked) => patch({ published: checked })}
              aria-label="Tour publicado"
            />
          </li>
        </ul>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <Field label="Título del tour" className="sm:col-span-2">
            <Input value={tour.title} onChange={(e) => patch({ title: e.target.value })} />
          </Field>
          <Field label="Descripción" className="sm:col-span-2">
            <Input
              value={tour.description ?? ""}
              onChange={(e) => patch({ description: e.target.value })}
              placeholder="Qué puede recorrer el visitante"
            />
          </Field>
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-primary" />
            <h2 className="text-base font-medium">Plantas</h2>
          </div>
          <Button type="button" variant="outline" onClick={addFloor}>
            <Plus className="size-4" /> Agregar planta
          </Button>
        </div>
        {tour.floors.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            Agregá al menos una planta para empezar a ubicar unidades.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {tour.floors.map((floor) => (
              <FloorEditor
                key={floor.id}
                floor={floor}
                units={units}
                onChange={(next) => updateFloor(floor.id, next)}
                onRemove={() => removeFloor(floor.id)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function FloorEditor({
  floor,
  units,
  onChange,
  onRemove,
}: {
  floor: VirtualTourFloorConfig;
  units: Unit[];
  onChange: (next: Partial<VirtualTourFloorConfig>) => void;
  onRemove: () => void;
}) {
  const floorUnits = units.filter((unit) => unit.floor === floor.level);
  const placedIds = new Set(floor.unitPlacements.map((placement) => placement.unitId));
  const availableToPlace = floorUnits.filter((unit) => !placedIds.has(unit.id));

  function addPlacement(unitId: string) {
    const index = floor.unitPlacements.length;
    const position = autoLayoutPositions(floorUnits.length || 1, index);
    const placement: VirtualTourUnitPlacement = { unitId, x: position.x, y: position.y };
    onChange({ unitPlacements: [...floor.unitPlacements, placement] });
  }

  function autoDistribute() {
    onChange({
      unitPlacements: floorUnits.map((unit, index) => {
        const position = autoLayoutPositions(floorUnits.length, index);
        return { unitId: unit.id, x: position.x, y: position.y };
      }),
    });
  }

  function addHotspot() {
    const hotspot: VirtualTourHotspotConfig = {
      id: `hs_${Date.now()}`,
      label: "",
      x: 50,
      y: 50,
    };
    onChange({ hotspots: [...floor.hotspots, hotspot] });
  }

  return (
    <li className="grid gap-5 p-6">
      <div className="grid items-end gap-4 sm:grid-cols-[1fr_100px_1fr_1fr_36px]">
        <div>
          <Label className="text-xs text-muted-foreground">Nombre</Label>
          <Input
            className="mt-1.5"
            value={floor.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Ej: Piso 1"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Nivel</Label>
          <Input
            className="mt-1.5"
            type="number"
            value={String(floor.level)}
            onChange={(e) => onChange({ level: Number(e.target.value) || 0 })}
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Plano (URL, opcional)</Label>
          <Input
            className="mt-1.5"
            value={floor.floorPlanUrl ?? ""}
            onChange={(e) => onChange({ floorPlanUrl: e.target.value })}
            placeholder="https://…"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Tour 360° por defecto</Label>
          <Input
            className="mt-1.5"
            value={floor.tour360Url ?? ""}
            onChange={(e) => onChange({ tour360Url: e.target.value })}
            placeholder="Vacío = interior 3D"
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Quitar planta"
          onClick={onRemove}
        >
          <X className="size-4" />
        </Button>
      </div>

      {/* Unidades de la planta */}
      <div className="rounded-lg border border-border">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <p className="text-sm font-medium">
            Unidades en la planta{" "}
            <span className="text-muted-foreground">
              ({floor.unitPlacements.length}/{floorUnits.length})
            </span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={autoDistribute}
              disabled={floorUnits.length === 0}
            >
              <Sparkles className="size-3.5" /> Distribuir automáticamente
            </Button>
            {availableToPlace.length > 0 && (
              <Select value="" onValueChange={addPlacement}>
                <SelectTrigger className="h-8 w-[190px]">
                  <SelectValue placeholder="Ubicar unidad…" />
                </SelectTrigger>
                <SelectContent>
                  {availableToPlace.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.code} · {unit.typology}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
        {floor.unitPlacements.length === 0 ? (
          <p className="px-4 py-3 text-xs text-muted-foreground">
            Ninguna unidad ubicada. Podés distribuir automáticamente o ubicarlas una por una.
          </p>
        ) : (
          <ul className="divide-y divide-border/60">
            {floor.unitPlacements.map((placement, index) => {
              const unit = units.find((u) => u.id === placement.unitId);
              return (
                <li key={placement.unitId} className="grid gap-3 px-4 py-3">
                  <div className="grid items-center gap-3 sm:grid-cols-[1fr_90px_90px_32px]">
                    <span className="truncate text-sm">
                      {unit ? `${unit.code} · Unidad ${unit.number}` : placement.unitId}
                    </span>
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      X
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        className="h-8"
                        value={String(placement.x)}
                        onChange={(e) =>
                          onChange({
                            unitPlacements: floor.unitPlacements.map((p, i) =>
                              i === index ? { ...p, x: Number(e.target.value) || 0 } : p,
                            ),
                          })
                        }
                      />
                    </label>
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      Y
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        className="h-8"
                        value={String(placement.y)}
                        onChange={(e) =>
                          onChange({
                            unitPlacements: floor.unitPlacements.map((p, i) =>
                              i === index ? { ...p, y: Number(e.target.value) || 0 } : p,
                            ),
                          })
                        }
                      />
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Quitar unidad"
                      onClick={() =>
                        onChange({
                          unitPlacements: floor.unitPlacements.filter((_, i) => i !== index),
                        })
                      }
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    Tour 360° real (Kuula / Matterport / urbania360)
                    <Input
                      className="h-8"
                      value={placement.tour360Url ?? ""}
                      onChange={(e) =>
                        onChange({
                          unitPlacements: floor.unitPlacements.map((p, i) =>
                            i === index ? { ...p, tour360Url: e.target.value } : p,
                          ),
                        })
                      }
                      placeholder="Vacío = interior 3D del proyecto"
                    />
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Hotspots */}
      <div className="rounded-lg border border-border">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-medium">Puntos de interés (espacios comunes)</p>
          <Button type="button" variant="outline" size="sm" onClick={addHotspot}>
            <Plus className="size-3.5" /> Agregar punto
          </Button>
        </div>
        {floor.hotspots.length === 0 ? (
          <p className="px-4 py-3 text-xs text-muted-foreground">
            Sin puntos cargados. Ej: pileta, coworking, SUM.
          </p>
        ) : (
          <ul className="divide-y divide-border/60">
            {floor.hotspots.map((hotspot, index) => (
              <li
                key={hotspot.id}
                className="grid items-center gap-3 px-4 py-3 sm:grid-cols-[1fr_90px_90px_32px]"
              >
                <Input
                  className="h-8"
                  value={hotspot.label}
                  placeholder="Ej: Pileta"
                  onChange={(e) =>
                    onChange({
                      hotspots: floor.hotspots.map((h, i) =>
                        i === index ? { ...h, label: e.target.value } : h,
                      ),
                    })
                  }
                />
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  X
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    className="h-8"
                    value={String(hotspot.x)}
                    onChange={(e) =>
                      onChange({
                        hotspots: floor.hotspots.map((h, i) =>
                          i === index ? { ...h, x: Number(e.target.value) || 0 } : h,
                        ),
                      })
                    }
                  />
                </label>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  Y
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    className="h-8"
                    value={String(hotspot.y)}
                    onChange={(e) =>
                      onChange({
                        hotspots: floor.hotspots.map((h, i) =>
                          i === index ? { ...h, y: Number(e.target.value) || 0 } : h,
                        ),
                      })
                    }
                  />
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Quitar punto"
                  onClick={() =>
                    onChange({
                      hotspots: floor.hotspots.filter((_, i) => i !== index),
                    })
                  }
                >
                  <X className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}
