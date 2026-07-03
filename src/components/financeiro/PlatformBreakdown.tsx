import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2 } from "lucide-react";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const num = (v: number) => v.toLocaleString("pt-BR");

export interface PlatformRow {
  id: string;
  name: string;
  slug?: string | null;
  logoUrl?: string | null;
  revShare: number;
  cpa: number;
  profit: number;
  grossRevenue: number;
  deposits: number;
  depositsCount: number;
  ftd: number;
  registros: number;
  share: number;
}

interface Props {
  rows: PlatformRow[];
  periodLabel: string;
}

export default function PlatformBreakdown({ rows, periodLabel }: Props) {
  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center space-y-2">
          <Building2 className="mx-auto text-muted-foreground" size={28} />
          <p className="text-sm text-muted-foreground">
            Nenhum lucro atribuído a plataformas no período. Cadastre uma conta em Plataformas e sincronize os painéis.
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalProfit = rows.reduce((a, b) => a + b.profit, 0);
  const totalRevShare = rows.reduce((a, b) => a + b.revShare, 0);
  const totalCpa = rows.reduce((a, b) => a + b.cpa, 0);
  const totalDeposits = rows.reduce((a, b) => a + b.deposits, 0);
  const totalFtd = rows.reduce((a, b) => a + b.ftd, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rows.map((r) => (
          <Card key={r.id} className="relative overflow-hidden">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {r.logoUrl ? (
                    <img src={r.logoUrl} alt={r.name} className="h-9 w-9 rounded-lg object-cover ring-1 ring-border" />
                  ) : (
                    <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <Building2 size={16} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold truncate">{r.name}</h3>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
                      {r.slug || "plataforma"}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-[10px] shrink-0">
                  {r.share.toFixed(1)}%
                </Badge>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Lucro real (Rev + CPA)</p>
                <p className="text-2xl font-semibold tabular-nums">{fmt(r.profit)}</p>
                <div className="mt-2 h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${Math.min(100, r.share)}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-muted-foreground">RevShare</p>
                  <p className="font-medium tabular-nums">{fmt(r.revShare)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">CPA</p>
                  <p className="font-medium tabular-nums">{fmt(r.cpa)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Depósitos</p>
                  <p className="font-medium tabular-nums">{fmt(r.deposits)}</p>
                  <p className="text-[10px] text-muted-foreground">{num(r.depositsCount)} tx</p>
                </div>
                <div>
                  <p className="text-muted-foreground">FTDs / Cadastros</p>
                  <p className="font-medium tabular-nums">{num(r.ftd)} / {num(r.registros)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Consolidado · {periodLabel}</p>
            <p className="text-lg font-semibold tabular-nums">{fmt(totalProfit)}</p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
            <div><span className="text-muted-foreground">RevShare </span><span className="font-medium tabular-nums">{fmt(totalRevShare)}</span></div>
            <div><span className="text-muted-foreground">CPA </span><span className="font-medium tabular-nums">{fmt(totalCpa)}</span></div>
            <div><span className="text-muted-foreground">Depósitos </span><span className="font-medium tabular-nums">{fmt(totalDeposits)}</span></div>
            <div><span className="text-muted-foreground">FTDs </span><span className="font-medium tabular-nums">{num(totalFtd)}</span></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
