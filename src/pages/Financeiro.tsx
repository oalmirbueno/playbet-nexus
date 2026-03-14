import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  DollarSign, ArrowRight, TrendingUp, TrendingDown, Wallet, Users,
  AlertTriangle, CheckCircle, Clock, PieChart, Shield, ArrowUpRight, ArrowDownRight,
  Activity,
} from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import EmptyState from "@/components/EmptyState";
import ExportDropdown from "@/components/ExportDropdown";
import { useCampanhas, useSaques, useSocios, useInfluencers } from "@/hooks/useSupabaseQuery";
import { useAutoConsolidation } from "@/hooks/useAutoConsolidation";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart as RPieChart, Pie, Cell,
  AreaChart, Area, ResponsiveContainer,
} from "recharts";

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatCompact(value: number) {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}k`;
  return formatBRL(value);
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--info, 200 80% 60%))",
  "hsl(var(--success, 140 60% 50%))",
  "hsl(var(--warning, 40 90% 60%))",
  "hsl(var(--destructive))",
];

const chartConfig = {
  valor: { label: "Valor (R$)", color: "hsl(var(--primary))" },
  count: { label: "Quantidade", color: "hsl(var(--accent))" },
};

type TabKey = "visao" | "fluxo" | "socios" | "simulador";

export default function Financeiro() {
  const navigate = useNavigate();
  const { data: campanhas, isLoading: loadingCampanhas } = useCampanhas();
  const { data: socios, isLoading: loadingSocios } = useSocios();
  const { data: saques, isLoading: loadingSaques } = useSaques();
  const { data: influencers, isLoading: loadingInfluencers } = useInfluencers();
  const { consolidated, hasData: hasTrackingData } = useAutoConsolidation();
  const [tab, setTab] = useState<TabKey>("visao");

  const loading = loadingCampanhas || loadingSocios || loadingSaques || loadingInfluencers;

  // ── Computed metrics ──
  const metrics = useMemo(() => {
    const totalGanhosSocios = socios.reduce((a: number, s: any) => a + Number(s.ganhos || 0), 0);
    const totalDisponivelSocios = socios.reduce((a: number, s: any) => a + Number(s.disponivel || 0), 0);
    const totalSaquesValor = saques.reduce((a: number, s: any) => a + Number(s.valor || 0), 0);
    const pendentes = saques.filter((s: any) => s.status === "Pendente");
    const totalPendentes = pendentes.reduce((a: number, s: any) => a + Number(s.valor || 0), 0);
    const aprovados = saques.filter((s: any) => s.status === "Aprovado");
    const totalAprovados = aprovados.reduce((a: number, s: any) => a + Number(s.valor || 0), 0);
    const pagos = saques.filter((s: any) => s.status === "Pago via Asaas");
    const totalPagos = pagos.reduce((a: number, s: any) => a + Number(s.valor || 0), 0);
    const recusados = saques.filter((s: any) => s.status === "Recusado");
    const totalRecusados = recusados.reduce((a: number, s: any) => a + Number(s.valor || 0), 0);

    const mediaComissaoInfluencer = influencers.length > 0
      ? influencers.reduce((a: number, i: any) => a + Number(i.commission_percent || 0), 0) / influencers.length
      : 0;

    // Commission simulation based on formula
    const taxaOperacional = 0.10;
    const receitaBruta = totalGanhosSocios > 0 ? totalGanhosSocios / (1 - mediaComissaoInfluencer / 100 - taxaOperacional) : 0;
    const comissoesInfluencers = receitaBruta * (mediaComissaoInfluencer / 100);
    const retencaoOperacional = receitaBruta * taxaOperacional;
    const baseSocietaria = receitaBruta - comissoesInfluencers - retencaoOperacional;

    return {
      totalGanhosSocios,
      totalDisponivelSocios,
      totalSaquesValor,
      totalPendentes,
      totalAprovados,
      totalPagos,
      totalRecusados,
      pendentesCount: pendentes.length,
      aprovadosCount: aprovados.length,
      pagosCount: pagos.length,
      recusadosCount: recusados.length,
      mediaComissaoInfluencer,
      receitaBruta,
      comissoesInfluencers,
      retencaoOperacional,
      baseSocietaria,
      taxaSaque: totalSaquesValor > 0 ? (totalPagos / totalSaquesValor * 100) : 0,
    };
  }, [campanhas, socios, saques, influencers]);

  // ── Charts data ──
  const saquesPorStatus = useMemo(() => {
    const map: Record<string, { count: number; valor: number }> = {};
    saques.forEach((s: any) => {
      const st = s.status || "Sem status";
      if (!map[st]) map[st] = { count: 0, valor: 0 };
      map[st].count += 1;
      map[st].valor += Number(s.valor || 0);
    });
    return Object.entries(map).map(([name, v]) => ({ name, ...v }));
  }, [saques]);

  const saquesPorTipo = useMemo(() => {
    const map: Record<string, number> = {};
    saques.forEach((s: any) => {
      const t = s.tipo || "Outros";
      map[t] = (map[t] || 0) + Number(s.valor || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [saques]);

  const participacaoSocios = useMemo(() => {
    return socios.map((s: any) => ({
      name: s.nome,
      participacao: Number(s.participacao || 0),
      ganhos: Number(s.ganhos || 0),
      disponivel: Number(s.disponivel || 0),
    }));
  }, [socios]);

  const fluxoMensal = useMemo(() => {
    const months: Record<string, { entrada: number; saida: number }> = {};
    saques.forEach((s: any) => {
      if (!s.data) return;
      const d = new Date(s.data);
      const key = `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getFullYear()).slice(2)}`;
      if (!months[key]) months[key] = { entrada: 0, saida: 0 };
      if (s.status === "Aprovado" || s.status === "Pago via Asaas") {
        months[key].saida += Number(s.valor || 0);
      } else {
        months[key].entrada += Number(s.valor || 0);
      }
    });
    return Object.entries(months).sort(([a], [b]) => a.localeCompare(b)).map(([month, v]) => ({ month, ...v }));
  }, [saques]);

  // ── Alerts ──
  const alerts = useMemo(() => {
    const items: { type: "warning" | "danger" | "success" | "info"; message: string }[] = [];

    if (metrics.pendentesCount > 0) {
      items.push({ type: "warning", message: `${metrics.pendentesCount} saque(s) pendente(s) aguardando aprovação — ${formatBRL(metrics.totalPendentes)}` });
    }
    if (metrics.totalPendentes > 100000) {
      items.push({ type: "danger", message: `Volume pendente acima de R$ 100k — revise saques urgentemente` });
    }

    const totalPart = socios.reduce((a: number, s: any) => a + Number(s.participacao || 0), 0);
    if (socios.length > 0 && totalPart !== 100) {
      items.push({ type: "danger", message: `Participação societária total é ${totalPart}% — deveria ser 100%` });
    }

    if (metrics.totalRecusados > 0) {
      items.push({ type: "info", message: `${metrics.recusadosCount} saque(s) recusado(s) — total de ${formatBRL(metrics.totalRecusados)}` });
    }

    if (items.length === 0) {
      items.push({ type: "success", message: "Nenhum alerta financeiro. Tudo em dia!" });
    }

    return items;
  }, [metrics, socios]);

  // ── Simulator state ──
  const [simReceita, setSimReceita] = useState(500000);
  const [simComissao, setSimComissao] = useState(metrics.mediaComissaoInfluencer || 15);

  const simResult = useMemo(() => {
    const comissao = simReceita * (simComissao / 100);
    const operacional = simReceita * 0.10;
    const base = simReceita - comissao - operacional;
    return {
      comissao,
      operacional,
      base,
      porSocio: socios.map((s: any) => ({
        nome: s.nome,
        participacao: Number(s.participacao || 0),
        valor: base * (Number(s.participacao || 0) / 100),
      })),
    };
  }, [simReceita, simComissao, socios]);

  const hasData = saques.length + socios.length + campanhas.length > 0 || hasTrackingData;

  const exportData = saques.map((s: any) => ({
    codigo: s.codigo,
    nome: s.nome,
    tipo: s.tipo,
    valor: s.valor,
    status: s.status,
    data: s.data,
    origem: s.origem,
    responsavel: s.responsavel,
  }));

  const tabs: { key: TabKey; label: string }[] = [
    { key: "visao", label: "Visão Geral" },
    { key: "fluxo", label: "Fluxo de Caixa" },
    { key: "socios", label: "Distribuição Societária" },
    { key: "simulador", label: "Simulador" },
  ];

  const alertStyles = {
    warning: { bg: "bg-warning/10 border-warning/20", icon: AlertTriangle, color: "text-warning" },
    danger: { bg: "bg-destructive/10 border-destructive/20", icon: AlertTriangle, color: "text-destructive" },
    success: { bg: "bg-success/10 border-success/20", icon: CheckCircle, color: "text-success" },
    info: { bg: "bg-primary/10 border-primary/20", icon: Shield, color: "text-primary" },
  };

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: "Financeiro" }]} />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Central Financeira</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Controle completo de receitas, comissões, saques e distribuição societária
          </p>
        </div>
        {hasData && <ExportDropdown data={exportData} filename="financeiro-playbet" />}
      </div>

      {loading ? (
        <div className="glass-card p-8 text-sm text-muted-foreground">Carregando financeiro...</div>
      ) : !hasData ? (
        <div className="glass-card">
          <EmptyState
            icon={DollarSign}
            title="Sem registros financeiros"
            description="Povoe os dados demo em Configurações para simular o financeiro completo com valores e calendário."
            actionLabel="Povoar Dados Demo"
            onAction={() => navigate("/configuracoes")}
            secondaryLabel="Ver Regras Financeiras"
            onSecondary={() => navigate("/regras")}
          />
        </div>
      ) : (
        <>
          {/* ── Alerts ── */}
          <div className="space-y-2">
            {alerts.map((a, i) => {
              const style = alertStyles[a.type];
              return (
                <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${style.bg}`}>
                  <style.icon size={15} className={style.color} />
                  <span className="text-sm">{a.message}</span>
                </div>
              );
            })}
          </div>

          {/* ── KPIs Row 1: Financial Overview ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="glass-card p-5 cursor-pointer hover:bg-secondary/30 transition-colors" onClick={() => navigate("/socios")}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Receita Bruta</span>
                <TrendingUp size={13} className="text-success" />
              </div>
              <p className="text-xl font-bold tracking-tight">{formatCompact(metrics.receitaBruta)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Estimada via ganhos sócios</p>
            </div>
            <div className="glass-card p-5 cursor-pointer hover:bg-secondary/30 transition-colors" onClick={() => navigate("/socios")}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Ganhos Sócios</span>
                <Users size={13} className="text-primary" />
              </div>
              <p className="text-xl font-bold tracking-tight">{formatCompact(metrics.totalGanhosSocios)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{socios.length} sócios ativos</p>
            </div>
            <div className="glass-card p-5 cursor-pointer hover:bg-secondary/30 transition-colors" onClick={() => navigate("/socios")}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Saldo Disponível</span>
                <Wallet size={13} className="text-accent" />
              </div>
              <p className="text-xl font-bold tracking-tight">{formatCompact(metrics.totalDisponivelSocios)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Para saque</p>
            </div>
            <div className="glass-card p-5 cursor-pointer hover:bg-secondary/30 transition-colors" onClick={() => navigate("/saques")}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Total Saques</span>
                <ArrowUpRight size={13} className="text-info" />
              </div>
              <p className="text-xl font-bold tracking-tight">{formatCompact(metrics.totalSaquesValor)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{saques.length} solicitações</p>
            </div>
            <div className="glass-card p-5 border-l-2 border-l-warning cursor-pointer hover:bg-secondary/30 transition-colors" onClick={() => navigate("/saques")}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Pendentes</span>
                <Clock size={13} className="text-warning" />
              </div>
              <p className="text-xl font-bold tracking-tight">{formatCompact(metrics.totalPendentes)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{metrics.pendentesCount} aguardando</p>
            </div>
            <div className="glass-card p-5 cursor-pointer hover:bg-secondary/30 transition-colors" onClick={() => navigate("/comissoes")}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Comissão Média</span>
                <PieChart size={13} className="text-accent" />
              </div>
              <p className="text-xl font-bold tracking-tight">{metrics.mediaComissaoInfluencer.toFixed(1)}%</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{influencers.filter((i: any) => i.is_active).length} influencers</p>
            </div>
          </div>

          {/* ── Tabs ── */}
          <div className="flex gap-1 bg-secondary/50 p-1 rounded-xl flex-wrap">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} className={tab === t.key ? "tab-btn-active" : "tab-btn"}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Tab: Visão Geral ── */}
          {tab === "visao" && (
            <>
              {/* Tracking Revenue Integration */}
              {hasTrackingData && consolidated.revenueBrl > 0 && (
                <div className="glass-card p-6 border-l-4 border-l-primary">
                  <div className="flex items-center gap-2 mb-3">
                    <Activity size={14} className="text-primary" />
                    <h3 className="text-sm font-semibold">Revenue do Tracking (automático)</h3>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {Object.entries(consolidated.byCurrency).map(([currency, data]) => (
                      <div key={currency} className="bg-secondary/30 rounded-lg p-3 border border-border/50">
                        <p className="text-[10px] text-muted-foreground uppercase">Revenue ({currency})</p>
                        <p className="text-lg font-bold">{data.total.toLocaleString("pt-BR", { style: "currency", currency: currency === "BRL" ? "BRL" : "USD" })}</p>
                        {currency !== "BRL" && data.rate && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">≈ {formatBRL(data.convertedBrl)} · 1 {currency} = R$ {data.rate.toFixed(4)}</p>
                        )}
                      </div>
                    ))}
                    <div className="bg-secondary/30 rounded-lg p-3 border border-border/50">
                      <p className="text-[10px] text-muted-foreground uppercase">Total em BRL</p>
                      <p className="text-lg font-bold text-primary">{formatBRL(consolidated.revenueBrl)}</p>
                      {consolidated.lastExchangeRateTimestamp && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Cotação: {new Date(consolidated.lastExchangeRateTimestamp).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      )}
                    </div>
                    <div className="bg-secondary/30 rounded-lg p-3 border border-border/50">
                      <p className="text-[10px] text-muted-foreground uppercase">FTD / Registros</p>
                      <p className="text-lg font-bold">{consolidated.totalFtd} / {consolidated.totalRegistrations}</p>
                    </div>
                    <div className="bg-secondary/30 rounded-lg p-3 border border-border/50">
                      <p className="text-[10px] text-muted-foreground uppercase">Eventos processados</p>
                      <p className="text-lg font-bold">{consolidated.eventCount}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Revenue Breakdown */}
              <div className="glass-card p-6">
                <h3 className="text-sm font-semibold mb-4">Decomposição da Receita</h3>
                <div className="bg-secondary/30 rounded-lg p-4 font-mono text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-accent">Receita Bruta Estimada</span>
                    <span className="font-semibold">{formatBRL(metrics.receitaBruta)}</span>
                  </div>
                  <div className="flex justify-between text-success">
                    <span>− Comissões Influencers ({metrics.mediaComissaoInfluencer.toFixed(1)}%)</span>
                    <span>- {formatBRL(metrics.comissoesInfluencers)}</span>
                  </div>
                  <div className="flex justify-between text-info">
                    <span>− Retenção Operacional (10%)</span>
                    <span>- {formatBRL(metrics.retencaoOperacional)}</span>
                  </div>
                  <div className="h-px bg-border my-1" />
                  <div className="flex justify-between font-bold text-primary">
                    <span>= Base Societária</span>
                    <span>{formatBRL(metrics.baseSocietaria)}</span>
                  </div>
                </div>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Saques por status */}
                <div className="glass-card p-6">
                  <h3 className="text-sm font-semibold mb-1">Saques por Status</h3>
                  <p className="text-xs text-muted-foreground mb-4">Distribuição por volume (R$)</p>
                  {saquesPorStatus.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-12">Sem dados</p>
                  ) : (
                    <ChartContainer config={chartConfig} className="h-[240px] w-full">
                      <BarChart data={saquesPorStatus} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
                          {saquesPorStatus.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ChartContainer>
                  )}
                </div>

                {/* Saques por tipo (pie) */}
                <div className="glass-card p-6">
                  <h3 className="text-sm font-semibold mb-1">Saques por Tipo</h3>
                  <p className="text-xs text-muted-foreground mb-4">Influencer vs Sócio</p>
                  {saquesPorTipo.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-12">Sem dados</p>
                  ) : (
                    <div className="flex items-center gap-6">
                      <ChartContainer config={chartConfig} className="h-[220px] w-[220px] mx-auto shrink-0">
                        <RPieChart>
                          <Pie data={saquesPorTipo} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={45} paddingAngle={3}>
                            {saquesPorTipo.map((_, i) => (
                              <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                          </Pie>
                          <ChartTooltip content={<ChartTooltipContent />} />
                        </RPieChart>
                      </ChartContainer>
                      <div className="space-y-3 flex-1">
                        {saquesPorTipo.map((s, i) => (
                          <div key={s.name}>
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                              <span className="text-sm font-medium flex-1">{s.name}</span>
                            </div>
                            <p className="text-lg font-bold ml-5">{formatBRL(s.value)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Transactions */}
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold">Últimas Transações</h3>
                  <button onClick={() => navigate("/saques")} className="text-xs text-primary hover:underline flex items-center gap-1">
                    Ver todas <ArrowRight size={12} />
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Código</th>
                        <th>Nome</th>
                        <th>Tipo</th>
                        <th>Valor</th>
                        <th>Status</th>
                        <th>Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {saques.slice(0, 6).map((s: any) => {
                        const statusBadge: Record<string, string> = {
                          Pendente: "badge-warning",
                          Aprovado: "badge-success",
                          Recusado: "badge-danger",
                          Processando: "badge-info",
                          "Pago via Asaas": "badge-primary",
                        };
                        return (
                          <tr key={s.id} className="cursor-pointer hover:bg-secondary/20" onClick={() => navigate("/saques")}>
                            <td className="font-mono text-xs text-muted-foreground">{s.codigo}</td>
                            <td className="font-medium">{s.nome}</td>
                            <td><span className={s.tipo === "Influencer" ? "badge-info" : "badge-primary"}>{s.tipo}</span></td>
                            <td className="font-semibold">{formatBRL(Number(s.valor))}</td>
                            <td><span className={statusBadge[s.status] || "badge-neutral"}>{s.status}</span></td>
                            <td className="text-xs whitespace-nowrap">{s.data}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ── Tab: Fluxo de Caixa ── */}
          {tab === "fluxo" && (
            <>
              <div className="glass-card p-6">
                <h3 className="text-sm font-semibold mb-1">Fluxo de Caixa Mensal</h3>
                <p className="text-xs text-muted-foreground mb-4">Entradas (pendentes) vs Saídas (aprovados/pagos)</p>
                {fluxoMensal.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-12">Sem dados de fluxo</p>
                ) : (
                  <ChartContainer config={{
                    entrada: { label: "Pendentes (R$)", color: "hsl(var(--warning, 40 90% 60%))" },
                    saida: { label: "Pagos (R$)", color: "hsl(var(--primary))" },
                  }} className="h-[300px] w-full">
                    <BarChart data={fluxoMensal}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="entrada" name="Pendentes" fill="hsl(var(--warning, 40 90% 60%))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="saida" name="Pagos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                )}
              </div>

              {/* KPI cards for flow */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="glass-card p-5 border-l-2 border-l-warning">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Pendentes</p>
                  <p className="text-xl font-bold mt-1">{formatBRL(metrics.totalPendentes)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{metrics.pendentesCount} saques</p>
                </div>
                <div className="glass-card p-5 border-l-2 border-l-success">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Aprovados</p>
                  <p className="text-xl font-bold mt-1">{formatBRL(metrics.totalAprovados)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{metrics.aprovadosCount} saques</p>
                </div>
                <div className="glass-card p-5 border-l-2 border-l-primary">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Pagos</p>
                  <p className="text-xl font-bold mt-1">{formatBRL(metrics.totalPagos)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{metrics.pagosCount} saques</p>
                </div>
                <div className="glass-card p-5 border-l-2 border-l-destructive">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Recusados</p>
                  <p className="text-xl font-bold mt-1">{formatBRL(metrics.totalRecusados)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{metrics.recusadosCount} saques</p>
                </div>
              </div>
            </>
          )}

          {/* ── Tab: Distribuição Societária ── */}
          {tab === "socios" && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pie chart participação */}
                <div className="glass-card p-6">
                  <h3 className="text-sm font-semibold mb-1">Participação Societária</h3>
                  <p className="text-xs text-muted-foreground mb-4">Divisão percentual</p>
                  <div className="flex items-center gap-6">
                    <ChartContainer config={chartConfig} className="h-[220px] w-[220px] mx-auto shrink-0">
                      <RPieChart>
                        <Pie data={participacaoSocios} dataKey="participacao" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={45} paddingAngle={3}>
                          {participacaoSocios.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </RPieChart>
                    </ChartContainer>
                    <div className="space-y-3 flex-1">
                      {participacaoSocios.map((s, i) => (
                        <div key={s.name}>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                            <span className="text-sm font-medium">{s.name}</span>
                            <span className="text-xs text-muted-foreground ml-auto">{s.participacao}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Ganhos por sócio */}
                <div className="glass-card p-6">
                  <h3 className="text-sm font-semibold mb-1">Ganhos por Sócio</h3>
                  <p className="text-xs text-muted-foreground mb-4">Acumulado total</p>
                  <ChartContainer config={chartConfig} className="h-[220px] w-full">
                    <BarChart data={participacaoSocios}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="ganhos" radius={[4, 4, 0, 0]}>
                        {participacaoSocios.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                </div>
              </div>

              {/* Sócios detail table */}
              <div className="glass-card p-6">
                <h3 className="text-sm font-semibold mb-4">Detalhamento por Sócio</h3>
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr><th>Sócio</th><th>Participação</th><th>Ganhos Totais</th><th>Disponível</th><th>Sacado</th><th>Ações</th></tr>
                    </thead>
                    <tbody>
                      {socios.map((s: any) => {
                        const sacado = Number(s.ganhos || 0) - Number(s.disponivel || 0);
                        return (
                          <tr key={s.id}>
                            <td className="font-medium">{s.nome}</td>
                            <td><span className="badge-primary">{s.participacao}%</span></td>
                            <td className="font-semibold">{formatBRL(Number(s.ganhos))}</td>
                            <td className="font-semibold text-success">{formatBRL(Number(s.disponivel))}</td>
                            <td className="text-muted-foreground">{formatBRL(sacado)}</td>
                            <td>
                              <button onClick={() => navigate(`/socios/${s.id}`)} className="text-xs text-primary hover:underline flex items-center gap-1">
                                Detalhe <ArrowRight size={11} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ── Tab: Simulador ── */}
          {tab === "simulador" && (
            <>
              <div className="glass-card p-6">
                <h3 className="text-sm font-semibold mb-1">Simulador de Comissões</h3>
                <p className="text-xs text-muted-foreground mb-6">Simule diferentes cenários de receita e comissão para projetar a distribuição</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Receita Bruta (R$)</label>
                    <input
                      type="number"
                      className="input-field w-full"
                      value={simReceita}
                      onChange={e => setSimReceita(Math.max(0, Number(e.target.value)))}
                      min={0}
                      max={100000000}
                    />
                    <input
                      type="range"
                      className="w-full mt-2 accent-primary"
                      min={10000}
                      max={5000000}
                      step={10000}
                      value={simReceita}
                      onChange={e => setSimReceita(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Comissão Influencer (%)</label>
                    <input
                      type="number"
                      className="input-field w-full"
                      value={simComissao}
                      onChange={e => setSimComissao(Math.min(90, Math.max(0, Number(e.target.value))))}
                      min={0}
                      max={90}
                    />
                    <input
                      type="range"
                      className="w-full mt-2 accent-primary"
                      min={0}
                      max={50}
                      step={0.5}
                      value={simComissao}
                      onChange={e => setSimComissao(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="bg-secondary/30 rounded-lg p-5 font-mono text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-accent">Receita Bruta</span>
                    <span className="font-bold">{formatBRL(simReceita)}</span>
                  </div>
                  <div className="flex justify-between text-success">
                    <span>− Comissão Influencers ({simComissao.toFixed(1)}%)</span>
                    <span>- {formatBRL(simResult.comissao)}</span>
                  </div>
                  <div className="flex justify-between text-info">
                    <span>− Retenção Operacional (10%)</span>
                    <span>- {formatBRL(simResult.operacional)}</span>
                  </div>
                  <div className="h-px bg-border my-1" />
                  <div className="flex justify-between font-bold text-primary text-base">
                    <span>= Base Societária</span>
                    <span>{formatBRL(simResult.base)}</span>
                  </div>
                </div>
              </div>

              {simResult.porSocio.length > 0 && (
                <div className="glass-card p-6">
                  <h3 className="text-sm font-semibold mb-4">Projeção por Sócio</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {simResult.porSocio.map((s, i) => (
                      <div key={s.nome} className="p-4 rounded-lg border border-border bg-secondary/20">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="text-sm font-medium">{s.nome}</span>
                          <span className="text-xs text-muted-foreground ml-auto">{s.participacao}%</span>
                        </div>
                        <p className="text-2xl font-bold">{formatBRL(s.valor)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── Quick Links ── */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">Módulos Financeiros</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {[
                { label: "Central de Saques", path: "/saques", desc: `${saques.length} registros` },
                { label: "Comissões", path: "/comissoes", desc: `${influencers.filter((i: any) => i.is_active).length} influencers` },
                { label: "Sócios", path: "/socios", desc: `${socios.length} cadastrados` },
                { label: "Regras Financeiras", path: "/regras", desc: "Configuração de regras" },
                { label: "Pagamentos Asaas", path: "/asaas", desc: "Integração de pagamento" },
                { label: "Campanhas", path: "/campanhas", desc: `${campanhas.length} campanhas` },
              ].map((item) => (
                <div
                  key={item.label}
                  onClick={() => navigate(item.path)}
                  className="flex items-center gap-3 p-3.5 rounded-lg bg-secondary/30 border border-border cursor-pointer hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex-1">
                    <span className="text-sm font-medium">{item.label}</span>
                    <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                  </div>
                  <ArrowRight size={14} className="text-muted-foreground" />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
