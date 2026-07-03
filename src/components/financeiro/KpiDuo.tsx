import { Card, CardContent } from "@/components/ui/card";
import { Wallet, Activity, ArrowUpRight, ArrowDownRight, Minus, BadgeDollarSign, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Props {
  caixa: number;
  revenue: number;
  diff: number; // caixa - revenue
  periodLabel: string;
  revShare?: number;
  cpa?: number;
  deposits?: number;
  ftd?: number;
  registrations?: number;
  isLoading?: boolean;
}

export default function KpiDuo({ caixa, revenue, diff, periodLabel, revShare = revenue, cpa = 0, deposits = 0, ftd = 0, registrations = 0, isLoading }: Props) {
  const divergPct = revenue > 0 ? Math.abs(diff) / revenue * 100 : 0;
  const divergIcon = diff > 0 ? ArrowUpRight : diff < 0 ? ArrowDownRight : Minus;
  const divergTone = Math.abs(diff) < 1 ? "text-muted-foreground" : diff < 0 ? "text-amber-500" : "text-emerald-500";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      <Card className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            <Wallet size={14} className="text-primary" />
            Caixa realizado · Asaas
          </div>
          <div className="mt-2 text-3xl font-semibold tabular-nums">
            {isLoading ? <span className="text-muted-foreground">-</span> : fmt(caixa)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Saques pagos e confirmados em {periodLabel.toLowerCase()}
          </p>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            <TrendingUp size={14} className="text-accent" />
            Revenue real · RevShare
          </div>
          <div className="mt-2 text-3xl font-semibold tabular-nums">
            {isLoading ? <span className="text-muted-foreground">-</span> : fmt(revShare)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Comissão RevShare importada · não é depósito/NGR
          </p>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            <BadgeDollarSign size={14} className="text-primary" />
            CPA
          </div>
          <div className="mt-2 text-3xl font-semibold tabular-nums">
            {isLoading ? <span className="text-muted-foreground">-</span> : fmt(cpa)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {registrations.toLocaleString("pt-BR")} cadastros · {ftd.toLocaleString("pt-BR")} FTD
          </p>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden border-primary/30">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            <Activity size={14} className="text-primary" />
            Lucro real · Rev + CPA
          </div>
          <div className="mt-2 text-3xl font-semibold tabular-nums text-primary">
            {isLoading ? <span className="text-muted-foreground">-</span> : fmt(revenue)}
          </div>
          <p className={cn("text-xs mt-1 flex items-center gap-1", divergTone)}>
            {(() => { const I = divergIcon; return <I size={12} />; })()}
            {Math.abs(diff) < 1
              ? "Bate com o caixa"
              : `Δ ${fmt(diff)} (${divergPct.toFixed(1)}% de divergência)`}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">Volume depositado: {fmt(deposits)}</p>
        </CardContent>
      </Card>
    </div>
  );
}
