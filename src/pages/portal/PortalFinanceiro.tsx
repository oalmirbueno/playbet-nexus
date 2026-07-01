import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Wallet, TrendingUp, Percent, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

interface DayRow { data_ref: string; cliques: number; registros: number; ftd: number; revenue: number }

export default function PortalFinanceiro() {
  const { user } = useAuth();
  const [rows, setRows] = useState<DayRow[]>([]);
  const [inf, setInf] = useState<any>(null);
  const [paidTotal, setPaidTotal] = useState(0);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: prof } = await supabase.from("profiles").select("influencer_id").eq("id", user!.id).maybeSingle();
      const infId = prof?.influencer_id;
      if (!infId) { setLoading(false); return; }

      const [{ data: iRow }, { data: metrics }, { data: saques }] = await Promise.all([
        supabase.from("influencers").select("commission_percent, name").eq("id", infId).maybeSingle(),
        supabase.from("tracking_metrics").select("data_ref, cliques, registros, ftd, revenue")
          .eq("influencer_id", infId).eq("is_demo", false)
          .order("data_ref", { ascending: false }).limit(90),
        supabase.from("saques").select("valor, status").eq("influencer_id", infId),
      ]);

      setInf(iRow);
      setRows((metrics ?? []).map((r: any) => ({
        data_ref: r.data_ref, cliques: r.cliques ?? 0, registros: r.registros ?? 0,
        ftd: r.ftd ?? 0, revenue: Number(r.revenue ?? 0),
      })));

      let paid = 0, pending = 0;
      (saques ?? []).forEach((s: any) => {
        const v = Number(s.valor ?? 0);
        if (["pago", "concluido", "confirmed", "completed"].includes((s.status ?? "").toLowerCase())) paid += v;
        else pending += v;
      });
      setPaidTotal(paid); setPendingTotal(pending);
      setLoading(false);
    })();
  }, [user]);

  const commissionPct = Number(inf?.commission_percent ?? 0);
  const totals = useMemo(() => rows.reduce((a, r) => ({
    revenue: a.revenue + r.revenue,
    clicks: a.clicks + r.cliques,
    ftd: a.ftd + r.ftd,
  }), { revenue: 0, clicks: 0, ftd: 0 }), [rows]);

  const totalCommission = totals.revenue * (commissionPct / 100);
  const available = Math.max(0, totalCommission - paidTotal - pendingTotal);

  const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Financeiro</h1>
        <p className="page-subtitle">Comissão apurada sobre receita validada dos seus links.</p>
      </div>

      {/* Cards de saldo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SaldoCard label="Receita gerada (90d)" value={brl(totals.revenue)} icon={TrendingUp} />
        <SaldoCard label={`Comissão total (${commissionPct}%)`} value={brl(totalCommission)} icon={Percent} tone="primary" />
        <SaldoCard label="Saques pendentes" value={brl(pendingTotal)} icon={Wallet} />
        <SaldoCard label="Disponível para saque" value={brl(available)} icon={Wallet} tone="success" />
      </div>

      <div className="flex flex-wrap gap-2">
        <Link to="/portal/saques" className="btn-primary text-[12px] px-3 py-2 inline-flex items-center gap-1.5">
          Solicitar saque <ArrowUpRight size={13} />
        </Link>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border/40 flex items-center justify-between">
          <h3 className="section-title mb-0">Extrato — últimos 90 dias</h3>
          <span className="text-[11px] text-muted-foreground">{rows.length} dias</span>
        </div>
        <div className="max-h-[520px] overflow-y-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-secondary/40 text-[10px] uppercase tracking-[0.14em] text-muted-foreground sticky top-0 backdrop-blur-md">
              <tr>
                <th className="px-4 py-2 text-left">Data</th>
                <th className="px-4 py-2 text-right">Cliques</th>
                <th className="px-4 py-2 text-right">Cadastros</th>
                <th className="px-4 py-2 text-right">FTD</th>
                <th className="px-4 py-2 text-right">Receita</th>
                <th className="px-4 py-2 text-right">Comissão</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">Carregando…</td></tr>}
              {!loading && rows.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Sem movimentação por enquanto.</td></tr>}
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-border/40 hover:bg-secondary/20">
                  <td className="px-4 py-2 tabular-nums">{new Date(r.data_ref).toLocaleDateString("pt-BR")}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{r.cliques.toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{r.registros.toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{r.ftd.toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{brl(r.revenue)}</td>
                  <td className="px-4 py-2 text-right tabular-nums font-semibold text-primary">{brl(r.revenue * commissionPct / 100)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SaldoCard({ label, value, icon: Icon, tone }: { label: string; value: string; icon: any; tone?: "primary" | "success" }) {
  const cls = tone === "primary" ? "text-primary" : tone === "success" ? "text-success" : "text-foreground";
  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] text-muted-foreground">{label}</span>
        <Icon size={13} className="text-primary/80" />
      </div>
      <div className={`text-xl font-semibold tracking-tight tabular-nums ${cls}`}>{value}</div>
    </div>
  );
}
