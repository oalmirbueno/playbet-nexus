import { useEffect, useMemo, useState } from "react";
import { Calculator, AlertTriangle, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  calculateSocioDistribution,
  DEFAULT_DISTRIBUTION_PARAMS,
  formatBRL as fmt,
  readDistributionParams,
  writeDistributionParams,
  type DistributionBreakdown,
  type PartnerLike,
} from "@/lib/financialDistribution";

interface Props {
  breakdown: DistributionBreakdown;
  socios?: PartnerLike[];
  sourceLabel?: string;
}

export default function DistributionCard({ breakdown, socios = [], sourceLabel = "Rev + CPA do período" }: Props) {
  const [params, setParams] = useState(readDistributionParams);

  useEffect(() => {
    try { writeDistributionParams(params); } catch { /* noop */ }
  }, [params]);

  const result = useMemo(() => calculateSocioDistribution(breakdown, params, socios), [breakdown, params, socios]);

  const warnings: string[] = [];
  if (params.taxPct < 10 || params.taxPct > 20)
    warnings.push("Imposto/provisão fora da faixa oficial 10–20%.");
  if (params.reservePct !== 10)
    warnings.push("Reserva PlayBet difere do padrão de 10%.");
  if (result.partnerRows.length > 0 && Math.round(result.rawParticipationTotal * 100) / 100 !== 100)
    warnings.push(`Participações ativas somam ${result.rawParticipationTotal.toLocaleString("pt-BR")}% — a divisão foi normalizada proporcionalmente.`);

  const setField = (key: keyof typeof DEFAULT_DISTRIBUTION_PARAMS) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setParams((p) => ({ ...p, [key]: Number(e.target.value) || 0 }));

  const reset = () => setParams(DEFAULT_DISTRIBUTION_PARAMS);

  const steps = [
    { label: "Lucro real (Rev + CPA)", value: breakdown.profitBase, kind: "base" as const, hint: sourceLabel },
    {
      label: "− Comissão influenciadores (apenas linhas atribuídas)",
      value: -breakdown.influencerCommissionsOwed,
      kind: "out" as const,
      hint: `${fmt(breakdown.attributedProfit)} atribuído`,
    },
    {
      label: "− Comissão gerentes (só quando o influencer tem gerente)",
      value: -breakdown.managerCommissionsOwed,
      kind: "out" as const,
    },
    { label: "= Após comissões", value: result.afterCommissions, kind: "sub" as const },
    { label: `− Imposto/provisão (${params.taxPct}%)`, value: -result.tax, kind: "out" as const },
    { label: "− Custos diretos", value: -result.costs, kind: "out" as const },
    { label: "= Subtotal", value: result.subtotal, kind: "sub" as const },
    { label: `− Reserva PlayBet (${params.reservePct}%)`, value: -result.reserve, kind: "out" as const },
    { label: "= Saldo dos sócios", value: result.partnersPool, kind: "final" as const },
  ];

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Calculator size={16} className="text-primary" />
            <CardTitle className="text-sm">Distribuição Oficial PlayBet</CardTitle>
            <Badge variant="outline" className="text-[10px]">Modelo v4 · Rev+CPA</Badge>
          </div>
          <button
            type="button"
            onClick={reset}
            className="text-[10px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
          >
            Restaurar padrão
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1 flex items-start gap-1 leading-relaxed">
          <Info size={11} className="mt-0.5 shrink-0" />
          Base = <strong className="text-foreground mx-1">Rev (RevShare) + CPA</strong>.
          Influencer/gerente só descontam quando o link tem influencer (e o influencer tem gerente) atribuído —
          linhas sem influencer vão 100% para o pool dos sócios.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {([
            { k: "taxPct", label: "Imposto %", min: 0, max: 30, step: 0.5 },
            { k: "reservePct", label: "Reserva %", min: 0, max: 50, step: 1 },
            { k: "costs", label: "Custos (R$)", min: 0, step: 50 },
          ] as const).map((f) => (
            <div key={f.k}>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">{f.label}</label>
              <input
                type="number"
                step={f.step}
                min={f.min}
                max={(f as any).max}
                value={params[f.k as keyof typeof params] as number}
                onChange={setField(f.k as keyof typeof DEFAULTS)}
                className="w-full mt-1 px-2 py-1.5 rounded-md bg-secondary/40 border border-border text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          ))}
        </div>

        {breakdown.unattributedProfit > 0 && (
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-[11px] text-emerald-600 dark:text-emerald-400 flex items-start gap-2">
            <Info size={12} className="mt-0.5 shrink-0" />
            <p>
              {fmt(breakdown.unattributedProfit)} desse lucro veio de links <strong>sem influencer</strong> atribuído —
              vai 100% para o pool dos sócios sem descontar comissão de influencer nem gerente.
            </p>
          </div>
        )}

        {warnings.length > 0 && (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-600 dark:text-amber-400 flex items-start gap-2">
            <AlertTriangle size={12} className="mt-0.5 shrink-0" />
            <div className="space-y-0.5">
              {warnings.map((w) => <p key={w}>{w}</p>)}
            </div>
          </div>
        )}

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
              <div className="flex items-center gap-2 min-w-0">
                <span className="truncate">{s.label}</span>
                {s.hint && <span className="text-[10px] text-muted-foreground shrink-0">· {s.hint}</span>}
              </div>
              <span className={`font-mono tabular-nums shrink-0 ${s.value < 0 ? "text-destructive" : s.kind === "final" ? "text-primary" : ""}`}>
                {fmt(s.value)}
              </span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {result.partnerRows.length === 0 ? (
            <div className="col-span-3 rounded-md border border-border bg-secondary/30 px-3 py-4 text-center text-xs text-muted-foreground">
              Nenhum sócio ativo cadastrado para receber a distribuição.
            </div>
          ) : result.partnerRows.map((row) => (
            <div key={row.id} className="rounded-md border border-border bg-secondary/30 px-3 py-2 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">{row.nome}</p>
              <p className="text-base font-bold font-mono tabular-nums">{fmt(row.amount)}</p>
              <p className="text-[10px] text-muted-foreground">{row.normalizedPct.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
