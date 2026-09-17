import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";
import type { UnitStatus } from "@/types/domain";

import type { VirtualTourFloor, VirtualTourHotspot, VirtualTourUnit } from "./types";

const statusFill: Record<UnitStatus, string> = {
  disponible: "fill-available/10",
  reservada: "fill-reserved/10",
  vendida: "fill-muted/60",
};

const statusStroke: Record<UnitStatus, string> = {
  disponible: "stroke-available/80",
  reservada: "stroke-reserved/70",
  vendida: "stroke-border",
};

const statusText: Record<UnitStatus, string> = {
  disponible: "fill-foreground",
  reservada: "fill-reserved/90",
  vendida: "fill-muted-foreground/80",
};

const BAND_W = 82;
const BAND_H = 24;

interface Props {
  floor: VirtualTourFloor;
  selectedId: string | null;
  compareCodes: string[];
  onSelect: (unit: VirtualTourUnit) => void;
  className?: string;
}

/**
 * Planta interactiva del Tour Virtual. Renderiza el plano (imagen si existe
 * o esquema generado) con las unidades como zonas clicables y hotspots.
 * A futuro este componente es el candidato natural a migrar a Three.js/WebGL
 * sin cambiar su API: recibe el VirtualTourFloor ya generado.
 */
export function FloorScene({ floor, selectedId, compareCodes, onSelect, className }: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const unitById = useMemo(() => new Map(floor.units.map((u) => [u.id, u])), [floor.units]);
  const hovered = hoveredId ? (unitById.get(hoveredId) ?? null) : null;

  return (
    <svg
      viewBox="0 0 100 100"
      className={cn("h-full w-full", className)}
      role="img"
      aria-label={`Planta ${floor.name}`}
    >
      <defs>
        <radialGradient id={`bg-${floor.id}`} cx="50%" cy="42%" r="75%">
          <stop offset="0%" stopColor="oklch(0.27 0.01 265)" />
          <stop offset="100%" stopColor="oklch(0.17 0.008 265)" />
        </radialGradient>
        <pattern id={`grid-${floor.id}`} width="5" height="5" patternUnits="userSpaceOnUse">
          <path d="M5 0H0V5" fill="none" stroke="oklch(1 0 0 / 5%)" strokeWidth="0.3" />
        </pattern>
      </defs>

      <rect x="0" y="0" width="100" height="100" fill={`url(#bg-${floor.id})`} />
      <rect x="0" y="0" width="100" height="100" fill={`url(#grid-${floor.id})`} />

      {floor.floorPlanUrl && (
        <image
          href={floor.floorPlanUrl}
          x="0"
          y="0"
          width="100"
          height="100"
          preserveAspectRatio="xMidYMid slice"
          opacity="0.4"
        />
      )}

      {/* Marco del edificio */}
      <rect
        x="5"
        y="5"
        width="90"
        height="90"
        rx="3"
        fill="oklch(1 0 0 / 3%)"
        stroke="oklch(1 0 0 / 12%)"
        strokeWidth="0.4"
      />

      {/* Indicador norte */}
      <g transform="translate(92 10)">
        <path d="M0 2 L-2.6 8 A3 3 0 0 0 2.6 8 Z" fill="oklch(0.945 0.215 108.5 / 80%)" />
        <text y="12.5" textAnchor="middle" fontSize="4.5" className="fill-muted-foreground/80">
          N
        </text>
      </g>

      {/* Hotspots */}
      {floor.hotspots.map((hotspot) => (
        <HotspotMarker key={hotspot.id} hotspot={hotspot} />
      ))}

      {/* Unidades */}
      {floor.units.map((unit) => {
        const isSelected = unit.id === selectedId;
        const inCompare = compareCodes.includes(unit.code);
        const isHovered = unit.id === hoveredId;
        const centerX = unit.x;
        const centerY = unit.y;
        const x = centerX - BAND_W / 2;
        const y = centerY - BAND_H / 2;
        return (
          <g
            key={unit.id}
            transform={`translate(0 0)`}
            onClick={() => onSelect(unit)}
            onMouseEnter={() => setHoveredId(unit.id)}
            onMouseLeave={() => setHoveredId(null)}
            className="cursor-pointer"
          >
            <rect
              x={x}
              y={y}
              width={BAND_W}
              height={BAND_H}
              rx={3}
              className={cn(statusFill[unit.status], statusStroke[unit.status])}
              strokeWidth={isSelected ? 1.6 : isHovered ? 1.1 : 0.6}
              style={
                isSelected
                  ? { filter: "drop-shadow(0 0 6px oklch(0.945 0.215 108.5 / 55%))" }
                  : undefined
              }
            />
            {inCompare && (
              <rect
                x={x - 0.8}
                y={y - 0.8}
                width={BAND_W + 1.6}
                height={BAND_H + 1.6}
                rx={3.5}
                fill="none"
                stroke="oklch(0.945 0.215 108.5 / 90%)"
                strokeWidth="0.5"
                strokeDasharray="2 1.5"
              />
            )}
            <text
              x={centerX}
              y={centerY - 0.5}
              textAnchor="middle"
              fontSize="6.5"
              fontWeight={600}
              className={statusText[unit.status]}
            >
              {unit.name}
            </text>
            <text
              x={centerX}
              y={centerY + 6}
              textAnchor="middle"
              fontSize="4"
              className={cn(
                "fill-muted-foreground/80",
                unit.status === "vendida" && "fill-muted-foreground/60",
              )}
            >
              {unit.type} · {Math.round(unit.area)} m²
            </text>
          </g>
        );
      })}

      {hovered && (
        <g pointerEvents="none">
          <rect
            x="77"
            y="24"
            width="20"
            height="15"
            rx="2"
            fill="oklch(0.14 0.008 265 / 96%)"
            stroke="oklch(1 0 0 / 16%)"
          />
          <text x="87" y="30" textAnchor="middle" fontSize="3.6" className="fill-foreground">
            {hovered.orientation}
          </text>
          <text x="87" y="34" textAnchor="middle" fontSize="3.6" className="fill-muted-foreground">
            {hovered.status}
          </text>
        </g>
      )}
    </svg>
  );
}

function HotspotMarker({ hotspot }: { hotspot: VirtualTourHotspot }) {
  return (
    <g transform={`translate(${hotspot.x} ${hotspot.y})`} className="pointer-events-none">
      <circle r="4.5" fill="oklch(0.945 0.215 108.5 / 18%)" className="animate-pulse" />
      <circle
        r="1.8"
        fill="oklch(0.945 0.215 108.5 / 90%)"
        stroke="oklch(0.14 0.008 265 / 90%)"
        strokeWidth="0.5"
      />
    </g>
  );
}
