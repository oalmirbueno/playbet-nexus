import { useEffect, useMemo, useState } from "react";
import { Calculator, AlertTriangle, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { calcDistribution, DEFAULT_DISTRIBUTION } from "@/lib/distribution";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const STORAGE_KEY = "playbet.distribution.params";

interface Props {
  /** Receita validada em BRL - usa saldo retirável quando existir; senão soma de revenue */
  revenueBrl: number;
  /** Rótulo da fonte do valor (ex: "saldo retirável", "soma revenue") */
  sourceLabel: string;
  /** Quebra opcional por plataforma (BRL) */
  perPlatform?: Array<{ id: string; name: string; brl: number }>;
}

export default function DistributionCard({ revenueBrl, sourceLabel, perPlatform = [] }: Props) {
  const [params, setParams] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_DISTRIBUTION;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? { ...DEFAULT_DISTRIBUTION, ...JSON.parse(raw) } : DEFAULT_DISTRIBUTION;
    } catch {
      return DEFAULT_DISTRIBUTION;
    }
  });

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(params)); } catch { /* noop */ }
  }, [params]);

  const result = useMemo(
    () => calcDistribution({ revenue: revenueBrl, ...params }),
    [revenueBrl, params]
  );

  const perPlatformResults = useMemo(
    () => perPlatform.map((p) => ({ ...p, result: calcDistribution({ revenue: p.brl, ...params }) })),
    [perPlatform, params]
  );

  const setField = (key: keyof typeof DEFAULT_DISTRIBUTION) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setParams((p) => ({ ...p, [key]: Number(e.target.value) || 0 }));

  const reset = () => setParams(DEFAULT_DISTRIBUTION);

  const steps = [
    { label: "Receita validada", value: result.revenue, kind: "base" as const, hint: sourceLabel },
    { label: `− Influenciador (${params.influencerPct}%)`, value: -result.influencer, kind: "out" as const },
    { label: `− Gerente (${params.managerPct}%)`, value: -result.manager, kind: "out" as const },
    { label: `− Imposto/provisão (${params.taxPct}%)`, value: -result.tax, kind: "out" as const },
    { label: "− Custos diretos", value: -result.costs, kind: "out" as const },
    { label: "= Subtotal", value: result.subtotal, kind: "sub" as const },
    { label: `− Reserva PlayBet (${params.reservePct}%)`, value: -result.reserve, kind: "out" as const },
    { label: `= Saldo dos sócios ÷ ${params.partners}`, value: result.partnersPool, kind: "final" as const },
  ];

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Calculator size={16} className="text-primary" />
            <CardTitle className="text-sm">Distribuição Oficial PlayBet</CardTitle>
            <Badge variant="outline" className="text-[10px]">Modelo v3</Badge>
          </div>
          <button
            type="button"
            onClick={reset}
            className="text-[10px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
          >
            Restaurar padrão
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
          <Info size={11} /> Cálculo sobre <strong className="text-foreground mx-1">receita validada</strong>
          - nunca sobre clique, depósito bruto ou promessa da casa.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Parameter inputs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {([
            { k: "influencerPct", label: "Influencer %", min: 10, max: 15, step: 0.5 },
            { k: "managerPct", label: "Gerente %", min: 3, max: 8, step: 0.5 },
            { k: "taxPct", label: "Imposto %", min: 10, max: 20, step: 0.5 },
            { k: "reservePct", label: "Reserva %", min: 0, max: 50, step: 1 },
            { k: "costs", label: "Custos (R$)", min: 0, max: undefined, step: 50 },
          ] as const).map((f) => (
            <div key={f.k}>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">{f.label}</label>
              <input
                type="number"
                step={f.step}
                min={f.min}
                max={f.max}
                value={params[f.k as keyof typeof params] as number}
                onChange={setField(f.k as keyof typeof DEFAULT_DISTRIBUTION)}
                className="w-full mt-1 px-2 py-1.5 rounded-md bg-secondary/40 border border-border text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          ))}
        </div>

        {result.warnings.length > 0 && (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-600 dark:text-amber-400 flex items-start gap-2">
            <AlertTriangle size={12} className="mt-0.5 shrink-0" />
            <div className="space-y-0.5">
              {result.warnings.map((w) => <p key={w}>{w}</p>)}
            </div>
          </div>
        )}

        {/* Cascade */}
        <div className="space-y-1">
          {steps.map((s) => (
            <div
              key={s.label}
              className={`flex items-center justify-between px-3 py-2 rounded-md text-sm ${
                s.kind === "final"
                  ? "bg-primary/10 border border-primary/30 font-semibold"
                  : s.kind === "sub"
                  ? "bg-secondary/60 border border-border font-medium"
                  : s.kind === "base"
                  ? "bg-secondary/30 border border-border"
                  : "bg-transparent"
              }`}
            >
              <div className="flex items-center gap-2">
                <span>{s.label}</span>
                {s.hint && <span className="text-[10px] text-muted-foreground">· {s.hint}</span>}
              </div>
              <span className={`font-mono tabular-nums ${s.value < 0 ? "text-destructive" : s.kind === "final" ? "text-primary" : ""}`}>
                {fmt(s.value)}
              </span>
            </div>
          ))}
        </div>

        {/* Per partner */}
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: params.partners }).map((_, i) => (
            <div key={i} className="rounded-md border border-border bg-secondary/30 px-3 py-2 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Sócio {i + 1}</p>
              <p className="text-base font-bold font-mono tabular-nums">{fmt(result.perPartner)}</p>
            </div>
          ))}
        </div>

        {/* Per platform breakdown */}
        {perPlatformResults.length > 1 && (
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Por plataforma</p>
            <div className="rounded-md border border-border overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-secondary/40 text-[10px] uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2">Plataforma</th>
                    <th className="text-right px-3 py-2">Validado</th>
                    <th className="text-right px-3 py-2">Subtotal</th>
                    <th className="text-right px-3 py-2">Sócios pool</th>
                    <th className="text-right px-3 py-2">Por sócio</th>
                  </tr>
                </thead>
                <tbody>
                  {perPlatformResults.map((p) => (
                    <tr key={p.id} className="border-t border-border">
                      <td className="px-3 py-2">{p.name}</td>
                      <td className="px-3 py-2 text-right font-mono">{fmt(p.brl)}</td>
                      <td className="px-3 py-2 text-right font-mono">{fmt(p.result.subtotal)}</td>
                      <td className="px-3 py-2 text-right font-mono">{fmt(p.result.partnersPool)}</td>
                      <td className="px-3 py-2 text-right font-mono text-primary">{fmt(p.result.perPartner)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
