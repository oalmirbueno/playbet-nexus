import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, XCircle, ArrowUpRight, Wallet } from "lucide-react";
import { WithdrawalCyclesAdmin } from "@/components/financeiro/WithdrawalCyclesAdmin";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Props {
  saques: any[];
}

const STATUS_STYLES: Record<string, { tone: string; icon: any; label: string }> = {
  "Pago": { tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30", icon: CheckCircle2, label: "Pago" },
  "Pago via Asaas": { tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30", icon: CheckCircle2, label: "Pago via Asaas" },
  "Confirmado": { tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30", icon: CheckCircle2, label: "Confirmado" },
  "Pendente": { tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30", icon: Clock, label: "Pendente" },
  "Aprovado": { tone: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30", icon: ArrowUpRight, label: "Aprovado" },
  "Recusado": { tone: "bg-destructive/10 text-destructive border-destructive/30", icon: XCircle, label: "Recusado" },
  "Falhou": { tone: "bg-destructive/10 text-destructive border-destructive/30", icon: XCircle, label: "Falhou" },
  "Cancelado": { tone: "bg-muted text-muted-foreground border-border", icon: XCircle, label: "Cancelado" },
  "Atrasado": { tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30", icon: Clock, label: "Atrasado" },
  "Estornado": { tone: "bg-muted text-muted-foreground border-border", icon: XCircle, label: "Estornado" },
};

export default function SaquesTab({ saques }: Props) {
  if (saques.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center space-y-2">
          <Wallet className="mx-auto text-muted-foreground" size={28} />
          <p className="text-sm text-muted-foreground">Nenhum saque registrado no período.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Fila de saques</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Status sincroniza automaticamente via webhook Asaas
            </p>
          </div>
          <Badge variant="outline" className="text-[10px]">{saques.length} {saques.length === 1 ? "saque" : "saques"}</Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/30 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-5 py-2.5 font-medium">Código</th>
                <th className="text-left px-3 py-2.5 font-medium">Beneficiário</th>
                <th className="text-left px-3 py-2.5 font-medium">Tipo</th>
                <th className="text-right px-3 py-2.5 font-medium">Valor</th>
                <th className="text-left px-3 py-2.5 font-medium">Data</th>
                <th className="text-left px-5 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {saques.map((s: any) => {
                const cfg = STATUS_STYLES[s.status] ?? { tone: "bg-muted text-muted-foreground border-border", icon: Clock, label: s.status ?? "-" };
                const Icon = cfg.icon;
                return (
                  <tr key={s.id} className="border-t border-border/50 hover:bg-secondary/20 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{s.codigo ?? "-"}</td>
                    <td className="px-3 py-3">
                      <div className="font-medium">{s.nome}</div>
                      <div className="text-[11px] text-muted-foreground">{s.responsavel ?? s.origem ?? "-"}</div>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground text-xs">{s.tipo ?? "-"}</td>
                    <td className="px-3 py-3 text-right tabular-nums font-semibold">{fmt(Number(s.valor || 0))}</td>
                    <td className="px-3 py-3 text-muted-foreground text-xs tabular-nums">
                      {s.data ? new Date(s.data).toLocaleDateString("pt-BR") : "-"}
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant="outline" className={`text-[10px] gap-1 ${cfg.tone}`}>
                        <Icon size={10} />
                        {cfg.label}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
