import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy } from "lucide-react";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const num = (v: number) => v.toLocaleString("pt-BR");

interface Row {
  id: string;
  name: string;
  subtitle?: string | null;
  ftd: number;
  deposits: number;
  revenue: number;
  share: number;
  commissionPct: number;
  commission: number;
}

interface Props {
  rows: Row[];
  title: string;
  subjectLabel: string; // "Influencer" | "Gerente"
  emptyMessage: string;
}

export default function RankingTable({ rows, title, subjectLabel, emptyMessage }: Props) {
  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center space-y-2">
          <Trophy className="mx-auto text-muted-foreground" size={28} />
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">{title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Ordenado por lucro real atribuído no período</p>
          </div>
          <Badge variant="outline" className="text-[10px]">{rows.length} {rows.length === 1 ? "registro" : "registros"}</Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/30 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-5 py-2.5 font-medium">#</th>
                <th className="text-left px-3 py-2.5 font-medium">{subjectLabel}</th>
                <th className="text-right px-3 py-2.5 font-medium">FTDs</th>
                <th className="text-right px-3 py-2.5 font-medium">Depósitos</th>
                <th className="text-right px-3 py-2.5 font-medium">Lucro real</th>
                <th className="text-right px-3 py-2.5 font-medium">% total</th>
                <th className="text-right px-5 py-2.5 font-medium">Comissão</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className="border-t border-border/50 hover:bg-secondary/20 transition-colors">
                  <td className="px-5 py-3 text-muted-foreground tabular-nums">{i + 1}</td>
                  <td className="px-3 py-3">
                    <div className="font-medium">{r.name}</div>
                    {r.subtitle && <div className="text-[11px] text-muted-foreground">{r.subtitle}</div>}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{num(r.ftd)}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">{fmt(r.deposits)}</td>
                  <td className="px-3 py-3 text-right tabular-nums font-medium">{fmt(r.revenue)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    <div className="inline-flex items-center gap-2">
                      <div className="h-1.5 w-16 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${Math.min(100, r.share)}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground w-10 text-right">{r.share.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    <div className="font-semibold text-primary">{fmt(r.commission)}</div>
                    <div className="text-[10px] text-muted-foreground">{r.commissionPct}% sobre Rev+CPA</div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-secondary/20 border-t border-border">
              <tr>
                <td className="px-5 py-3" colSpan={4}>
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Totais</span>
                </td>
                <td className="px-3 py-3 text-right tabular-nums font-semibold">
                  {fmt(rows.reduce((a, b) => a + b.revenue, 0))}
                </td>
                <td className="px-3 py-3 text-right tabular-nums text-xs text-muted-foreground">100%</td>
                <td className="px-5 py-3 text-right tabular-nums font-semibold text-primary">
                  {fmt(rows.reduce((a, b) => a + b.commission, 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
