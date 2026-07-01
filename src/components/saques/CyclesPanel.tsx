import { WithdrawalCycle } from "@/hooks/useWithdrawalData";
import { CalendarClock, CheckCircle2, Clock, Coins } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Props {
  landed: WithdrawalCycle[];
  available: WithdrawalCycle[];
}

export function CyclesPanel({ landed, available }: Props) {
  if (landed.length === 0 && available.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 bg-card/30 p-6 text-center">
        <Coins className="mx-auto h-6 w-6 text-muted-foreground/50 mb-2" />
        <p className="text-sm font-medium">Nenhum ciclo em andamento</p>
        <p className="text-xs text-muted-foreground mt-1">
          Assim que o dinheiro cair na Playbet, ele aparece aqui e libera automaticamente em 3 dias.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {available.length > 0 && (
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <h4 className="text-xs uppercase tracking-wider font-semibold text-emerald-600 dark:text-emerald-400">
              Liberado agora
            </h4>
          </div>
          <div className="space-y-2">
            {available.map((c) => (
              <CycleRow key={c.id} cycle={c} tone="available" />
            ))}
          </div>
        </div>
      )}

      {landed.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-card/30 p-4">
          <div className="flex items-center gap-2 mb-3">
            <CalendarClock className="h-4 w-4 text-amber-500" />
            <h4 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
              Aguardando liberação
            </h4>
          </div>
          <div className="space-y-2">
            {landed.map((c) => (
              <CycleRow key={c.id} cycle={c} tone="landed" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CycleRow({ cycle, tone }: { cycle: WithdrawalCycle; tone: "landed" | "available" }) {
  const remaining = Math.max(0, Number(cycle.amount) - Number(cycle.consumed_amount));
  const landedDate = new Date(cycle.landed_at);
  const availDate = new Date(cycle.available_at);
  const now = new Date();
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-background/60 px-3 py-2.5">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-sm font-semibold tabular-nums">
          <span className={tone === "available" ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}>
            {brl(remaining)}
          </span>
          {cycle.reference && (
            <span className="text-[10px] font-mono text-muted-foreground truncate">
              · {cycle.reference}
            </span>
          )}
        </div>
        <div className="text-[11px] text-muted-foreground mt-0.5">
          Entrou em {format(landedDate, "dd/MM", { locale: ptBR })}
          {cycle.source && ` · via ${cycle.source}`}
        </div>
      </div>
      <div className="text-right shrink-0">
        {tone === "available" ? (
          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" /> Disponível
          </span>
        ) : (
          <div>
            <div className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold px-2 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Clock className="h-3 w-3" />
              Libera {formatDistanceToNow(availDate, { addSuffix: true, locale: ptBR })}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
              {format(availDate, "dd/MM 'às' HH:mm", { locale: ptBR })}
              {availDate < now && " (processando)"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
