import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Genera un render procedural en el cliente (canvas) y lo muestra. En SSR no
 * se puede tocar `document`, por eso el dibujo ocurre en un efecto y hasta
 * entonces se muestra un placeholder con la paleta del proyecto.
 */
function useRenderSrc(key: string, factory: () => string) {
  const factoryRef = useRef(factory);
  factoryRef.current = factory;
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let raf = 0;
    const timer = window.setTimeout(() => {
      raf = window.requestAnimationFrame(() => {
        if (cancelled) return;
        try {
          setSrc(factoryRef.current());
        } catch {
          setSrc(null);
        }
      });
    }, 30);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.cancelAnimationFrame(raf);
    };
  }, [key]);

  return src;
}

interface Props {
  /** Cambia cuando el render cambia (unidad, escena, variante). */
  cacheKey: string;
  factory: () => string;
  alt: string;
  className?: string;
  imgClassName?: string;
  children?: React.ReactNode;
}

export function RenderImage({ cacheKey, factory, alt, className, imgClassName, children }: Props) {
  const src = useRenderSrc(cacheKey, factory);

  return (
    <div className={cn("relative overflow-hidden bg-[oklch(0.16_0.01_265)]", className)}>
      {src ? (
        <img src={src} alt={alt} className={cn("size-full object-cover", imgClassName)} />
      ) : (
        <div
          aria-hidden
          className="size-full animate-pulse bg-gradient-to-br from-[oklch(0.22_0.02_265)] via-[oklch(0.18_0.02_265)] to-[oklch(0.14_0.02_265)]"
        />
      )}
      {children}
    </div>
  );
}
