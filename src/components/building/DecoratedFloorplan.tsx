import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const FLOOR = "#eadfc6";
const WALL = "#1d2024";
const WOOD = "#c9a06a";
const WOOD_DARK = "#a87f4c";
const FABRIC = "#8c98a5";
const ACCENT = "#d7a24b";
const METAL = "#9aa2ac";
const SINK = "#c9cdd4";

interface Props {
  rooms: number;
  balcony?: boolean;
  area?: number;
  className?: string;
}

function Rect({
  x,
  y,
  w,
  h,
  fill,
  rx = 0,
  stroke,
  sw = 0,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  rx?: number;
  stroke?: string;
  sw?: number;
}) {
  return (
    <rect x={x} y={y} width={w} height={h} rx={rx} fill={fill} stroke={stroke} strokeWidth={sw} />
  );
}

function Circle({
  cx,
  cy,
  r,
  fill,
  stroke,
}: {
  cx: number;
  cy: number;
  r: number;
  fill: string;
  stroke?: string;
}) {
  return <circle cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth={2} />;
}

function Sofa({
  x,
  y,
  w,
  h,
  flip = false,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  flip?: boolean;
}) {
  return (
    <g transform={flip ? `translate(${x} ${y}) rotate(90 0 0)` : `translate(${x} ${y})`}>
      <rect x={0} y={flip ? -h : 0} width={w} height={h} fill={FABRIC} rx={6} />
      <rect x={0} y={0} width={w} height={h} fill="#aeb8c2" rx={0} />
      {[10, w * 0.3 + 10, w * 0.6 + 10, w - 14].map((cx) => (
        <rect key={cx} x={cx} y={4} width={4} height={h - 6} fill="#7d8894" rx={2} />
      ))}
    </g>
  );
}

function Table({
  x,
  y,
  w,
  h,
  chairs = 4,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  chairs?: number;
}) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  return (
    <g>
      <Rect x={x} y={y} w={w} h={h} fill={WOOD} rx={12} />
      <circle cx={cx} cy={cy} r={4} fill={WOOD_DARK} />
      {chairs >= 2 && <Rect x={cx - 5} y={y - 16} w={10} h={14} fill={FABRIC} rx={3} />}
      {chairs >= 2 && <Rect x={cx - 5} y={y + h + 2} w={10} h={14} fill={FABRIC} rx={3} />}
      {chairs >= 4 && <Rect x={x - 16} y={cy - 5} w={14} h={10} fill={FABRIC} rx={3} />}
      {chairs >= 4 && <Rect x={x + w + 2} y={cy - 5} w={14} h={10} fill={FABRIC} rx={3} />}
    </g>
  );
}

function Bed({
  x,
  y,
  w,
  h,
  flip = false,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  flip?: boolean;
}) {
  return (
    <g transform={flip ? `translate(${x} ${y + h}) rotate(-90)` : `translate(${x} ${y})`}>
      <Rect x={0} y={0} w={w} h={h} fill={METAL} rx={4} />
      <Rect x={6} y={6} w={w - 12} h={h - 12} fill="#dfe4ea" rx={3} />
      <Rect x={6} y={6} w={w - 12} h={h * 0.34} fill="#f2f5f8" rx={3} />
      <Rect x={12} y={12} w={26} h={14} fill="#ffffff" rx={4} />
    </g>
  );
}

function Wardrobe({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g>
      <Rect x={x} y={y} w={w} h={h} fill={WOOD_DARK} rx={4} />
      {[x + w * 0.28, x + w * 0.64].map((cx) => (
        <line key={cx} x1={cx} y1={y + 6} x2={cx} y2={y + h - 6} stroke="#5f4a2b" strokeWidth={3} />
      ))}
      {[x + w * 0.14, x + w * 0.5, x + w * 0.86].map((cx) => (
        <circle key={cx} cx={cx} cy={y + h / 2} r={3} fill="#3f3118" />
      ))}
    </g>
  );
}

function Kitchen({
  x,
  y,
  w,
  h,
  orientation = "h",
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  orientation?: "h" | "v";
}) {
  return (
    <g>
      {orientation === "h" ? (
        <>
          <Rect x={x} y={y} w={w} h={h} fill={WOOD} rx={4} />
          <circle cx={x + 12} cy={y + h / 2} r={8} fill={SINK} />
          <circle cx={x + 12} cy={y + h / 2} r={4} fill="#8f949c" />
          {[x + w * 0.34, x + w * 0.34 + 12].map((cx) => (
            <circle key={cx} cx={cx} cy={y + h / 2 - 5} r={4} fill={ACCENT} />
          ))}
          {[x + w * 0.34, x + w * 0.34 + 12].map((cx) => (
            <circle key={cx} cx={cx} cy={y + h / 2 + 5} r={4} fill="#a8844a" />
          ))}
          <Rect x={x + w * 0.62} y={y + 4} w={w * 0.3} h={h - 8} fill={WOOD_DARK} rx={4} />
        </>
      ) : (
        <>
          <Rect x={x} y={y} w={w} h={h} fill={WOOD} rx={4} />
          <circle cx={x + w / 2} cy={y + 14} r={8} fill={SINK} />
          {[y + h * 0.4, y + h * 0.4 + 12].map((cy) => (
            <circle key={cy} cx={x + w / 2 - 5} cy={cy} r={4} fill={ACCENT} />
          ))}
          {[y + h * 0.4, y + h * 0.4 + 12].map((cy) => (
            <circle key={cy} cx={x + w / 2 + 5} cy={cy} r={4} fill="#a8844a" />
          ))}
          <Rect x={x + 4} y={y + h * 0.66} w={w - 8} h={h * 0.28} fill={WOOD_DARK} rx={4} />
        </>
      )}
    </g>
  );
}

function Bath({
  x,
  y,
  w,
  h,
  orientation = "h",
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  orientation?: "h" | "v";
}) {
  return (
    <g>
      <Rect x={x + 8} y={y + 8} w={w - 16} h={h - 16} fill="#d8dfe7" rx={6} />
      <Rect x={x + 14} y={y + 14} w={w - 28} h={h - 28} fill="#eef2f6" rx={4} />
      <ellipse
        cx={x + w - 26}
        cy={y + h - 26}
        rx={16}
        ry={13}
        fill="#ffffff"
        stroke="#b9c2cc"
        strokeWidth={2}
      />
      <Circle cx={x + 30} cy={y + 34} r={10} fill="#eef2f6" stroke="#b9c2cc" />
      <Rect x={x + 60} y={y + 46} w={16} h={10} fill={SINK} rx={3} />
      <Rect x={x + w - 60} y={y + 30} w={12} h={14} fill="#c9cdd4" rx={3} />
      <Rect x={x + w - 82} y={y + 26} w={14} h={22} fill={WOOD_DARK} rx={3} />
    </g>
  );
}

function Balcony({ x, y, w }: { x: number; y: number; w: number }) {
  return (
    <g>
      {Array.from({ length: Math.floor(w / 26) }).map((_, i) => (
        <line
          key={i}
          x1={x + 13 + i * 26}
          y1={y}
          x2={x + 13 + i * 26}
          y2={y + 26}
          stroke="#b9c2cc"
          strokeWidth={3}
        />
      ))}
      <line x1={x} y1={y} x2={x} y2={y + 26} stroke="#8f98a2" strokeWidth={4} />
      <line x1={x + w} y1={y} x2={x + w} y2={y + 26} stroke="#8f98a2" strokeWidth={4} />
    </g>
  );
}

function Wall({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return (
    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={WALL} strokeWidth={14} strokeLinecap="round" />
  );
}

function Door({
  x,
  y,
  w,
  h,
  open = true,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  open?: boolean;
}) {
  return (
    <g fill="none" stroke={WALL} strokeWidth={5}>
      <rect x={x + 2} y={y + 2} width={w - 4} height={h - 4} />
      {open && (
        <path
          d={`M${x + w / 2 + 2} ${y + 2} A ${w / 2} ${w / 2} 0 0 1 ${x + 3} ${y + h / 2 + 15}`}
        />
      )}
    </g>
  );
}

function Label({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return (
    <text
      x={x}
      y={y}
      fontSize={26}
      fontFamily="ui-sans-serif, system-ui, sans-serif"
      fontWeight={500}
      fill="#6b6355"
    >
      {children}
    </text>
  );
}

/**
 * Plano amoblado (decorado) generado en SVG vectorial por tipología.
 * Usado por el toggle Arquitectura / Decorado del visor de planos.
 */
export function DecoratedFloorplan({ rooms, balcony = false, area, className }: Props) {
  return (
    <svg
      viewBox="0 0 1280 960"
      width={1280}
      height={960}
      role="img"
      aria-label={`Plano amoblado — ${rooms} ambientes`}
      className={cn("h-auto max-w-none", className)}
      style={{ background: FLOOR }}
    >
      {/* Balcón */}
      {balcony && <Balcony x={1158} y={776} w={90} />}

      {/* Estructura exterior */}
      <Wall x1={60} y1={60} x2={1220} y2={60} />
      <Wall x1={60} y1={60} x2={60} y2={900} />
      <Wall x1={1220} y1={60} x2={1220} y2={900} />
      <Wall x1={60} y1={900} x2={1220} y2={900} />

      {rooms === 1 ? (
        <g>
          <Wall x1={60} y1={620} x2={760} y2={620} />
          <Wall x1={900} y1={60} x2={900} y2={320} />
          <Wall x1={900} y1={460} x2={900} y2={900} />

          <Label x={120} y={560}>
            ESTAR · PISO 2
          </Label>
          <Label x={120} y={880}>
            INGRESO
          </Label>
          <Label x={960} y={400}>
            COCINA
          </Label>
          <Label x={960} y={860}>
            DORMITORIO
          </Label>
          <Label x={240} y={260}>
            BAÑO
          </Label>

          <Sofa x={140} y={300} w={190} h={90} />
          <Table x={140} y={236} w={150} h={90} />
          <Rect x={620} y={430} w={60} h={120} fill={WOOD_DARK} rx={4} />
          <Rect x={640} y={440} w={80} h={40} fill="#24303c" rx={4} />

          <Kitchen x={940} y={480} w={240} h={120} orientation="v" />
          <Bed x={940} y={560} w={90} h={220} flip />
          <Wardrobe x={660} y={640} w={200} h={50} />

          <Bath x={180} y={140} w={200} h={190} />
          <Door x={120} y={900} w={180} h={160} />
        </g>
      ) : rooms === 2 ? (
        <g>
          <Wall x1={560} y1={60} x2={560} y2={380} />
          <Wall x1={560} y1={560} x2={560} y2={900} />
          <Wall x1={60} y1={470} x2={360} y2={470} />

          <Label x={140} y={580}>
            ESTAR
          </Label>
          <Label x={680} y={900}>
            DORMITORIO 1
          </Label>
          <Label x={680} y={180}>
            COCINA
          </Label>
          <Label x={140} y={280}>
            BAÑO
          </Label>
          <Label x={900} y={560}>
            DORMITORIO 2
          </Label>
          <Label x={300} y={400}>
            INGRESO
          </Label>

          <Sofa x={140} y={560} w={220} h={110} flip />
          <Table x={270} y={640} w={160} h={120} />
          <Rect x={120} y={880} w={70} h={90} fill={WOOD_DARK} rx={4} />

          <Kitchen x={700} y={120} w={260} h={150} orientation="h" />
          <Bed x={620} y={600} w={100} h={250} />
          <Wardrobe x={820} y={700} w={300} h={50} />
          <Rect x={630} y={540} w={40} h={30} fill="#24303c" rx={4} />

          <Bath x={620} y={420} w={240} h={110} />
          <Door x={560} y={380} w={160} h={170} />
          <Door x={560} y={560} w={160} h={170} />
        </g>
      ) : (
        <g>
          <Wall x1={560} y1={60} x2={560} y2={470} />
          <Wall x1={60} y1={470} x2={340} y2={470} />
          <Wall x1={700} y1={60} x2={700} y2={620} />
          <Wall x1={560} y1={820} x2={960} y2={820} />

          <Label x={140} y={580}>
            ESTAR
          </Label>
          <Label x={820} y={850}>
            DORMITORIO 1
          </Label>
          <Label x={1020} y={380}>
            DORMITORIO 2
          </Label>
          <Label x={780} y={300}>
            BAÑO
          </Label>
          <Label x={620} y={880}>
            COCINA
          </Label>
          <Label x={340} y={420}>
            INGRESO
          </Label>

          <Sofa x={140} y={560} w={240} h={130} flip />
          <Table x={180} y={660} w={170} h={110} chairs={2} />
          <Rect x={120} y={850} w={80} h={120} fill={WOOD_DARK} rx={4} />

          <Wardrobe x={980} y={920} w={200} h={50} />
          <Bed x={620} y={560} w={120} h={260} />
          <Bed x={980} y={520} w={100} h={260} flip />
          <Wardrobe x={1000} y={760} w={140} h={50} />

          <Kitchen x={980} y={120} w={180} h={140} orientation="v" />
          <Bath x={740} y={500} w={200} h={100} />
          <Door x={560} y={470} w={160} h={170} />
          <Door x={700} y={60} w={150} h={180} />
        </g>
      )}

      {/* Pie */}
      <g>
        <rect x={60} y={60} width={1220} height={900} fill="none" stroke={WALL} strokeWidth={4} />
        {area != null && (
          <text
            x={1220}
            y={930}
            textAnchor="end"
            fontSize={26}
            fontWeight={600}
            fill="#4a4438"
            fontFamily="ui-sans-serif, system-ui, sans-serif"
          >
            Plano amoblado — {area} m² — orientativo
          </text>
        )}
      </g>
    </svg>
  );
}
