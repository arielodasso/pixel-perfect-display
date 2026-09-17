import { RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type WheelEvent,
} from "react";

import { cn } from "@/lib/utils";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

interface Transform {
  scale: number;
  x: number;
  y: number;
}

interface Props {
  children: ReactNode;
  className?: string;
  /** Encuadre inicial: "contain" ajusta el contenido al contenedor, "fill" llena, o un número directo. */
  fit?: "contain" | "fill" | number;
  minScale?: number;
  maxScale?: number;
  showControls?: boolean;
  hint?: string;
  /** Etiqueta del botón restablecer. */
  resetLabel?: string;
}

type Point = { x: number; y: number };

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Contenedor panorámico con zoom. Soporta:
 * - zoom con rueda del mouse (mantiene el punto focal);
 * - pinch-to-zoom y pan con dos dedos;
 * - drag/pan con un dedo o el mouse;
 * - controles `+`, `-` y restablecer.
 *
 * El contenido se ancla al centro del contenedor y se limita para que nunca
 * quede fuera de alcance (no se puede "perder" la imagen).
 */
export function PanZoom({
  children,
  className,
  fit = "contain",
  minScale = 0.5,
  maxScale = 6,
  showControls = true,
  hint,
  resetLabel = "Restablecer",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState<Transform>({ scale: 1, x: 0, y: 0 });

  const pointers = useRef<Map<number, Point>>(new Map());
  const dragStart = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const pinchStart = useRef<{
    dist: number;
    scale: number;
    x: number;
    y: number;
    mx: number;
    my: number;
  } | null>(null);

  /** Devuelve la extensión máxima de paneo para el scale actual. */
  const panBounds = useCallback((scale: number) => {
    const container = containerRef.current;
    const inner = innerRef.current;
    if (!container || !inner) return { maxX: 0, maxY: 0 };
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const iw = inner.offsetWidth * scale;
    const ih = inner.offsetHeight * scale;
    return { maxX: Math.max(0, (iw - cw) / 2), maxY: Math.max(0, (ih - ch) / 2) };
  }, []);

  const apply = useCallback(
    (next: Transform) => {
      const { maxX, maxY } = panBounds(next.scale);
      setTransform({
        scale: clamp(next.scale, minScale, maxScale),
        x: clamp(next.x, -maxX, maxX),
        y: clamp(next.y, -maxY, maxY),
      });
    },
    [minScale, maxScale, panBounds],
  );

  const zoomAt = useCallback(
    (clientX: number, clientY: number, factor: number) => {
      const container = containerRef.current;
      const inner = innerRef.current;
      if (!container || !inner) return;
      const rect = container.getBoundingClientRect();
      const cdx = clientX - rect.left - rect.width / 2;
      const cdy = clientY - rect.top - rect.height / 2;
      setTransform((prev) => {
        const scale = clamp(prev.scale * factor, minScale, maxScale);
        const cx = (cdx - prev.x) / prev.scale;
        const cy = (cdy - prev.y) / prev.scale;
        return { scale, x: cdx - cx * scale, y: cdy - cy * scale };
      });
    },
    [minScale, maxScale],
  );

  const containScale = useCallback(() => {
    const container = containerRef.current;
    const inner = innerRef.current;
    if (!container || !inner) return 0.9;
    const iw = inner.offsetWidth;
    const ih = inner.offsetHeight;
    if (!iw || !ih) return 0.9;
    return Math.min(container.clientWidth / iw, container.clientHeight / ih) * 0.92;
  }, []);

  const reset = useCallback(() => {
    const base = fit === "contain" ? containScale() : fit === "fill" ? 1 : fit;
    const { maxX, maxY } = panBounds(base);
    setTransform({
      scale: base,
      x: clamp(0, -maxX, maxX),
      y: clamp(0, -maxY, maxY),
    });
  }, [fit, containScale, panBounds]);

  // Encuadre inicial y ante resize.
  useEffect(() => {
    reset();
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      setTransform((prev) => {
        const { maxX, maxY } = panBounds(prev.scale);
        return { ...prev, x: clamp(prev.x, -maxX, maxX), y: clamp(prev.y, -maxY, maxY) };
      });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [reset, panBounds]);

  // Rueda del mouse con preventDefault (listener no pasivo).
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handler = (event: WheelEvent<HTMLDivElement>) => {
      event.preventDefault();
      const factor = event.deltaY < 0 ? 1.18 : 1 / 1.18;
      zoomAt(event.clientX, event.clientY, factor);
    };
    container.addEventListener("wheel", handler as unknown as EventListener, { passive: false });
    return () => container.removeEventListener("wheel", handler as unknown as EventListener);
  }, [zoomAt]);

  function pointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = { x: event.clientX, y: event.clientY };
    pointers.current.set(event.pointerId, point);
    if (pointers.current.size === 1) {
      dragStart.current = { px: point.x, py: point.y, x: transform.x, y: transform.y };
    } else if (pointers.current.size === 2) {
      dragStart.current = null;
      const [a, b] = [...pointers.current.values()] as [Point, Point];
      pinchStart.current = {
        dist: distance(a, b),
        scale: transform.scale,
        x: transform.x,
        y: transform.y,
        mx: (a.x + b.x) / 2 - center().cx,
        my: (a.y + b.y) / 2 - center().cy,
      };
    }
  }

  function center() {
    const container = containerRef.current;
    const rect = container?.getBoundingClientRect();
    return {
      cx: (rect?.left ?? 0) + (rect?.width ?? 0) / 2,
      cy: (rect?.top ?? 0) + (rect?.height ?? 0) / 2,
    };
  }

  function pointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(event.pointerId)) return;
    const point = { x: event.clientX, y: event.clientY };
    pointers.current.set(event.pointerId, point);

    if (pointers.current.size === 2 && pinchStart.current) {
      const [a, b] = [...pointers.current.values()] as [Point, Point];
      const start = pinchStart.current;
      const dist = distance(a, b);
      const mx = (a.x + b.x) / 2 - center().cx;
      const my = (a.y + b.y) / 2 - center().cy;
      const scale = clamp(start.scale * (dist / Math.max(1, start.dist)), minScale, maxScale);
      const f = scale / start.scale;
      apply({
        scale,
        x: mx + (start.x - start.mx) * f,
        y: my + (start.y - start.my) * f,
      });
      return;
    }

    if (pointers.current.size === 1 && dragStart.current) {
      const start = dragStart.current;
      apply({
        scale: transform.scale,
        x: start.x + (point.x - start.px),
        y: start.y + (point.y - start.py),
      });
    }
  }

  function pointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;
    if (pointers.current.size === 0) dragStart.current = null;
  }

  const scaleLabel = `${Math.round(transform.scale * 100)}%`;

  return (
    <div
      className={cn("group/panzoom relative overflow-hidden", className)}
      style={{ touchAction: "none" }}
    >
      <div
        ref={containerRef}
        className="absolute inset-0 cursor-grab select-none active:cursor-grabbing"
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={pointerUp}
        onDoubleClick={(event) => zoomAt(event.clientX, event.clientY, 2)}
      >
        <div
          ref={innerRef}
          className="absolute left-1/2 top-1/2 will-change-transform"
          style={{
            transform: `translate(-50%, -50%) translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            transformOrigin: "center",
          }}
        >
          {children}
        </div>
      </div>

      {showControls && (
        <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-lg border border-border bg-background/80 p-1 shadow-panel backdrop-blur-sm">
          <button
            type="button"
            onClick={() => zoomAt(center().cx, center().cy, 1.3)}
            aria-label="Acercar"
            className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ZoomIn className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => zoomAt(center().cx, center().cy, 1 / 1.3)}
            aria-label="Alejar"
            className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ZoomOut className="size-4" />
          </button>
          <button
            type="button"
            onClick={reset}
            aria-label={resetLabel}
            className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <RotateCcw className="size-4" />
          </button>
          <span className="min-w-11 text-center text-xs tabular-nums text-muted-foreground">
            {scaleLabel}
          </span>
        </div>
      )}

      {hint && (
        <span className="pointer-events-none absolute bottom-3 left-3 hidden max-w-[60%] text-[11px] text-muted-foreground/80 sm:block">
          {hint}
        </span>
      )}
    </div>
  );
}
