import { AlertTriangle, ExternalLink, Maximize2, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { trackEvent } from "@/lib/tracking";
import { cn } from "@/lib/utils";
import { normaliseTourUrl } from "./tour-url";

interface Props {
  url: string;
  unitLabel: string;
  onBackToPlan: () => void;
}

type LoadState = "loading" | "ready" | "error";

/**
 * Embed del tour 360° real de la unidad (Kuula, Matterport, urbania360, etc.).
 *
 * El recorrido lo renderiza el proveedor dentro de un iframe a pantalla
 * completa; el showroom sólo agrega los controles de salida y la pantalla de
 * carga, igual que hace la plataforma de referencia.
 */
export function ExternalTourEmbed({ url, unitLabel, onBackToPlan }: Props) {
  const [state, setState] = useState<LoadState>("loading");
  const [attempt, setAttempt] = useState(0);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const src = useMemo(() => normaliseTourUrl(url), [url]);

  useEffect(() => {
    setState("loading");
  }, [src]);

  useEffect(() => {
    trackEvent("virtual_tour_360_scene", { scene: "embed", via: "external" });
  }, []);

  function requestFullscreen() {
    containerRef.current?.requestFullscreen?.().catch(() => undefined);
  }

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-black">
      <iframe
        key={attempt}
        ref={frameRef}
        src={src}
        title={`Tour 360° ${unitLabel}`}
        allow="xr-spatial-tracking; fullscreen; camera; gyroscope; accelerometer"
        allowFullScreen
        onLoad={() => setState("ready")}
        onError={() => setState("error")}
        className="h-full w-full border-0"
        style={{ opacity: state === "ready" ? 1 : 0, transition: "opacity 400ms ease" }}
      />

      {state === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[oklch(0.12_0.008_265)]">
          <span className="size-8 animate-spin rounded-full border-2 border-white/25 border-t-white" />
          <p className="text-xs text-white/70">Cargando el recorrido 360°…</p>
        </div>
      )}

      {state === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[oklch(0.12_0.008_265)] px-6 text-center">
          <AlertTriangle className="size-8 text-reserved" />
          <div>
            <p className="text-sm font-medium text-white">No se pudo cargar el recorrido</p>
            <p className="mt-1 max-w-[40ch] text-xs text-white/60">
              Revisá la URL del tour o probá de nuevo. También podés abrirlo en una pestaña.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                setState("loading");
                setAttempt((value) => value + 1);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-white/20"
            >
              <RotateCcw className="size-3.5" /> Reintentar
            </button>
            <a
              href={src}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-white/10"
            >
              <ExternalLink className="size-3.5" /> Abrir aparte
            </a>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/55 to-transparent px-4 pb-10 pt-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/60">
          Recorrido 360°
        </p>
        <p className="mt-0.5 truncate text-base font-medium text-white">{unitLabel}</p>
      </div>

      <div
        className={cn(
          "absolute bottom-4 right-4 z-10 flex items-center gap-2 rounded-lg border border-white/15 bg-black/45 p-1.5 backdrop-blur-sm transition-opacity",
          state === "ready" ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <button
          type="button"
          onClick={requestFullscreen}
          className="grid size-8 place-items-center rounded-md text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Pantalla completa"
          title="Pantalla completa"
        >
          <Maximize2 className="size-4" />
        </button>
        <button
          type="button"
          onClick={onBackToPlan}
          className="px-3 py-1.5 text-xs font-medium text-white/90 transition-colors hover:bg-white/10"
        >
          Volver al plano
        </button>
      </div>
    </div>
  );
}
