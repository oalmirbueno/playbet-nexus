import { Card, CardContent } from "@/components/ui/card";
import { Wallet, Activity, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Props {
  caixa: number;
  revenue: number;
  diff: number; // caixa - revenue
  periodLabel: string;
  isLoading?: boolean;
}

export default function KpiDuo({ caixa, revenue, diff, periodLabel, isLoading }: Props) {
  const divergPct = revenue > 0 ? Math.abs(diff) / revenue * 100 : 0;
  const divergIcon = diff > 0 ? ArrowUpRight : diff < 0 ? ArrowDownRight : Minus;
  const divergTone = Math.abs(diff) < 1 ? "text-muted-foreground" : diff < 0 ? "text-amber-500" : "text-emerald-500";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            <Wallet size={14} className="text-primary" />
            Caixa realizado · Asaas
          </div>
          <div className="mt-2 text-3xl font-semibold tabular-nums">
            {isLoading ? <span className="text-muted-foreground">—</span> : fmt(caixa)}
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
            <Activity size={14} className="text-accent" />
            Revenue atribuído · Tracking
          </div>
          <div className="mt-2 text-3xl font-semibold tabular-nums">
            {isLoading ? <span className="text-muted-foreground">—</span> : fmt(revenue)}
          </div>
          <p className={cn("text-xs mt-1 flex items-center gap-1", divergTone)}>
            {(() => { const I = divergIcon; return <I size={12} />; })()}
            {Math.abs(diff) < 1
              ? "Bate com o caixa"
              : `Δ ${fmt(diff)} (${divergPct.toFixed(1)}% de divergência)`}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
