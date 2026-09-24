import { Calculator, Info, MessageCircle } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { formatNumber, formatPrice } from "@/lib/format";
import { trackEvent } from "@/lib/tracking";
import type { Unit } from "@/types/domain";

interface Props {
  /** Precio de referencia con el que inicia el simulador. */
  initialPrice: number;
  units: Unit[];
  onRequestQuote?: ((summary: SimulatorSummary) => void) | undefined;
}

export interface SimulatorSummary {
  referencePrice: number;
  advance: number;
  installments: number;
  balance: number;
  cuota: number;
  termMonths: number;
  ratePerYear: number;
}

const SECTIONS = [
  { min: 10, max: 70, step: 5, key: "advance", label: "Anticipo", hint: "Al momento de reservar" },
  {
    min: 10,
    max: 70,
    step: 5,
    key: "installments",
    label: "Cuotas",
    hint: "Financiado durante la obra",
  },
  { min: 6, max: 120, step: 6, key: "term", label: "Plazo", hint: "Cantidad de meses" },
  { min: 0, max: 35, step: 1, key: "rate", label: "Tasa anual", hint: "Tasa nominal anual" },
] as const;

/**
 * Simulador financiero interactivo: anticipo + cuotas + saldo contra posesión.
 * Los resultados son orientativos, no constituyen oferta financiera.
 */
export function FinancingSimulator({ initialPrice, units, onRequestQuote }: Props) {
  const available = useMemo(() => units.filter((u) => u.status === "disponible"), [units]);
  const [referencePrice, setReferencePrice] = useState(initialPrice);
  const [advance, setAdvance] = useState(30);
  const [installments, setInstallments] = useState(50);
  const [term, setTerm] = useState(48);
  const [rate, setRate] = useState(18);

  const summary = useMemo<SimulatorSummary>(() => {
    const advanceValue = Math.round((referencePrice * advance) / 100);
    const installmentsValue = Math.round((referencePrice * installments) / 100);
    const balance = referencePrice - advanceValue - installmentsValue;
    const r = rate / 12 / 100;
    const cuota =
      r > 0
        ? installmentsValue > 0
          ? (installmentsValue * r) / (1 - Math.pow(1 + r, -term))
          : 0
        : term > 0
          ? installmentsValue / term
          : 0;
    return {
      referencePrice,
      advance: advanceValue,
      installments: installmentsValue,
      balance,
      cuota: Math.round(cuota),
      termMonths: term,
      ratePerYear: rate,
    };
  }, [referencePrice, advance, installments, term, rate]);

  return (
    <div className="grid gap-0 overflow-hidden rounded-xl border border-border bg-surface lg:grid-cols-[1.05fr_0.95fr]">
      {/* Controles */}
      <div className="border-b border-border p-6 lg:border-b-0 lg:border-r">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Calculator className="size-4 text-primary" />
          Simulador de financiación
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Mové los controles para estimar anticipo, cuotas y saldo final.
        </p>

        {available.length > 0 && (
          <label className="mt-5 block">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Unidad a simular
            </span>
            <select
              value={referencePrice}
              onChange={(e) => setReferencePrice(Number(e.target.value))}
              className="mt-1.5 h-9 w-full appearance-none rounded-lg border border-input bg-elevated px-3 text-xs text-foreground outline-none transition-colors hover:border-ring/40 focus:border-ring/60"
            >
              {available.map((unit) => (
                <option key={unit.id} value={unit.price}>
                  Unidad {unit.number} · {unit.typology} · {formatPrice(unit.price, unit.currency)}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="mt-6 space-y-5">
          {SECTIONS.map(({ min, max, step, key, label, hint }) => {
            const value =
              key === "advance"
                ? advance
                : key === "installments"
                  ? installments
                  : key === "term"
                    ? term
                    : rate;
            const setter =
              key === "advance"
                ? setAdvance
                : key === "installments"
                  ? setInstallments
                  : key === "term"
                    ? setTerm
                    : setRate;
            const display =
              key === "advance" || key === "installments"
                ? `${value}%`
                : key === "term"
                  ? `${value} meses`
                  : `${value}%`;
            return (
              <label key={key} className="block">
                <div className="flex items-center justify-between text-xs">
                  <span>
                    {label} <span className="text-muted-foreground">— {hint}</span>
                  </span>
                  <span className="font-semibold tabular-nums">{display}</span>
                </div>
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={value}
                  onChange={(e) => setter(Number(e.target.value))}
                  className="mt-2 w-full accent-[var(--primary)]"
                />
              </label>
            );
          })}
        </div>
      </div>

      {/* Resultado */}
      <div className="flex flex-col p-6">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Resumen estimado
        </p>

        <div className="mt-3 flex items-end justify-between gap-2">
          <div>
            <p className="text-3xl font-light tabular-nums sm:text-4xl">
              {summary.cuota > 0 ? formatNumber(summary.cuota) : "—"}
            </p>
            <p className="text-[10px] text-muted-foreground">cuota mensual aprox. {term} meses</p>
          </div>
          <p className="text-right text-xs text-muted-foreground">
            {formatPrice(summary.referencePrice)}
            <span className="block text-[10px]">precio de referencia</span>
          </p>
        </div>

        <dl className="mt-6 space-y-2 border-t border-border pt-4 text-xs">
          {[
            ["Anticipo (reserva)", formatPrice(summary.advance)],
            ["Cuotas (" + term + " meses)", formatPrice(summary.installments)],
            ["Saldo contra posesión", formatPrice(summary.balance)],
            ["Tasa anual simulada", `${rate}%`],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-2">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-medium tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-4 flex items-start gap-2 rounded-lg border border-border bg-background/40 p-3 text-[11px] text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          Los montos son orientativos y no constituyen una oferta financiera. Las cuotas en pesos
          pueden ajustarse por índice (ej. BADLAR) según el plan vigente.
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            className="flex-1"
            onClick={() => {
              trackEvent("financing_view", { step: "quote" });
              onRequestQuote?.(summary);
            }}
          >
            <MessageCircle className="size-4" /> Pedir plan personalizado
          </Button>
        </div>
      </div>
    </div>
  );
}
