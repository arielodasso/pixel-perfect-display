import { useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Circle,
  HardHat,
  Images,
  Loader2,
} from "lucide-react";

import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Milestone, Project } from "@/types/domain";

const milestoneStatusStyle: Record<
  Milestone["status"],
  { dot: string; text: string; label: string }
> = {
  completado: {
    dot: "bg-available border-available",
    text: "text-available",
    label: "Completado",
  },
  "en progreso": {
    dot: "bg-primary border-primary animate-pulse",
    text: "text-primary",
    label: "En curso",
  },
  proximamente: {
    dot: "bg-elevated border-border",
    text: "text-muted-foreground",
    label: "Próximo",
  },
};

function MilestoneIcon({ status }: { status: Milestone["status"] }) {
  if (status === "completado") return <CheckCircle2 className="size-4 text-available" />;
  if (status === "en progreso") return <Loader2 className="size-4 animate-spin text-primary" />;
  return <Circle className="size-4 text-muted-foreground" />;
}

/**
 * Experiencia pública de seguimiento de obra. Consume `project.milestones` y
 * `project.construction` para que el avance se administre desde el panel.
 */
export function ConstructionSection({ project }: { project: Project }) {
  const { construction, milestones } = project;
  const total = construction.progress;
  const completed = milestones.filter((m) => m.status === "completado").length;
  const inProgress = milestones.filter((m) => m.status === "en progreso").length;
  const [milestonesExpanded, setMilestonesExpanded] = useState(true);

  return (
    <div className="space-y-6">
      {/* Progreso general */}
      <div className="panel overflow-hidden">
        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="flex items-center gap-6">
            <ProgressRing value={total} />
            <div>
              <p className="eyebrow">Avance de obra</p>
              <p className="mt-1 text-3xl font-light tracking-tight">
                {total}
                <span className="text-lg text-muted-foreground">%</span>
              </p>
              <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-primary">
                <HardHat className="size-3.5" /> {construction.status}
              </p>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-6 sm:grid-cols-3">
            <Stat label="Hitos completados" value={`${completed}/${milestones.length}`} />
            <Stat label="En curso" value={`${inProgress}`} />
            <Stat label="Entrega estimada" value={construction.estimatedCompletion} />
            <Stat
              label="Estado actual"
              value={construction.status}
              className="col-span-2 sm:col-span-1"
            />
            <Stat
              label="Última actualización"
              value={formatDate(construction.updatedAt)}
              className="col-span-2"
            />
          </dl>
        </div>

        {/* Evolución */}
        <div className="border-t border-border px-6 py-6 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="eyebrow">Evolución del proyecto</p>
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarClock className="size-3.5" /> Inicio 2026 · Entrega {project.deliveryDate}
            </span>
          </div>
          <div className="relative mt-8 h-3 rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary transition-all duration-700"
              style={{ width: `${total}%` }}
            />
            {milestones.map((milestone, index) => {
              const position = ((index + 1) / milestones.length) * 100;
              const reached = total >= (index / milestones.length) * 100;
              return (
                <span
                  key={milestone.id}
                  className={cn(
                    "absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2",
                    reached
                      ? "border-primary-foreground bg-primary"
                      : "border-border bg-background",
                  )}
                  style={{ left: `${position}%` }}
                  title={milestone.name}
                />
              );
            })}
          </div>
          <div className="mt-4 flex justify-between text-[11px] text-muted-foreground">
            <span>Inicio de obra</span>
            <span>Entrega</span>
          </div>
        </div>
      </div>

      {/* Timeline de hitos */}
      <div className="panel p-6 sm:p-8">
        <button
          type="button"
          onClick={() => setMilestonesExpanded((value) => !value)}
          aria-expanded={milestonesExpanded}
          aria-controls="milestone-timeline"
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <span className="flex items-center gap-2">
            <p className="eyebrow">Timeline de hitos</p>
          </span>
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            {!milestonesExpanded && (
              <span className="tabular-nums">
                {completed}/{milestones.length} completados · {inProgress} en curso
              </span>
            )}
            <ChevronDown
              className={cn("size-4 transition-transform", milestonesExpanded && "rotate-180")}
            />
          </span>
        </button>

        {milestonesExpanded && (
          <ol id="milestone-timeline" className="mt-6 space-y-0">
            {milestones.map((milestone, index) => {
              const style = milestoneStatusStyle[milestone.status];
              const isLast = index === milestones.length - 1;
              return (
                <li key={milestone.id} className="relative flex gap-5 pb-8 last:pb-0">
                  {!isLast && (
                    <span className="absolute left-[7px] top-5 h-full w-px bg-border" aria-hidden />
                  )}
                  <span
                    className={cn(
                      "relative z-10 mt-0.5 size-3.5 shrink-0 rounded-full border-2 bg-background",
                      style.dot,
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                      <div className="flex items-center gap-2">
                        <MilestoneIcon status={milestone.status} />
                        <h3 className="text-base font-medium">{milestone.name}</h3>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className={cn("font-medium", style.text)}>{style.label}</span>
                        <span className="text-muted-foreground">{milestone.date}</span>
                      </div>
                    </div>
                    {milestone.description && (
                      <p className="mt-1.5 max-w-[70ch] text-sm leading-relaxed text-muted-foreground">
                        {milestone.description}
                      </p>
                    )}

                    {milestone.status !== "proximamente" && (
                      <div className="mt-3 flex items-center gap-3">
                        <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              milestone.status === "completado" ? "bg-available" : "bg-primary",
                            )}
                            style={{ width: `${milestone.progress}%` }}
                          />
                        </div>
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {milestone.progress}%
                        </span>
                      </div>
                    )}

                    {milestone.images && milestone.images.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {milestone.images.map((image, imageIndex) => (
                          <img
                            key={`${milestone.id}-${imageIndex}`}
                            src={image}
                            alt={`${milestone.name} — avance`}
                            loading="lazy"
                            className="h-20 w-28 rounded-lg border border-border object-cover"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {/* Galería de avance */}
      {construction.gallery.length > 0 && (
        <div className="panel p-6 sm:p-8">
          <div className="mb-5 flex items-center gap-2">
            <Images className="size-4 text-primary" />
            <p className="eyebrow">Galería de avance</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {construction.gallery.map((photo) => (
              <figure
                key={photo.id}
                className="group overflow-hidden rounded-xl border border-border"
              >
                <img
                  src={photo.url}
                  alt={photo.caption}
                  loading="lazy"
                  className="h-52 w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <figcaption className="bg-surface px-4 py-3 text-xs text-muted-foreground">
                  {photo.caption}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-1 text-sm font-medium">{value}</dd>
    </div>
  );
}

function ProgressRing({ value }: { value: number }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const dash = (Math.min(100, Math.max(0, value)) / 100) * circumference;
  return (
    <div className="relative grid size-32 shrink-0 place-items-center">
      <svg viewBox="0 0 120 120" className="size-32 -rotate-90">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="oklch(1 0 0 / 8%)" strokeWidth="8" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="oklch(0.945 0.215 108.5)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute text-center">
        <span className="block text-2xl font-light tabular-nums">
          {Math.min(100, Math.max(0, value))}%
        </span>
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">obra</span>
      </div>
    </div>
  );
}
