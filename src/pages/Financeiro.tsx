import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  DollarSign, ArrowRight, TrendingUp, Wallet, Users,
  AlertTriangle, CheckCircle, Shield, ArrowUpRight,
  Activity, Info, Landmark, PieChart, Clock,
} from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import EmptyState from "@/components/EmptyState";
import ExportDropdown from "@/components/ExportDropdown";
import { useSaques, useSocios, useInfluencers } from "@/hooks/useSupabaseQuery";
import { useAutoConsolidation } from "@/hooks/useAutoConsolidation";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart as RPieChart, Pie, Cell,
} from "recharts";

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtCurrency(value: number, currency: string) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: currency === "BRL" ? "BRL" : "USD" });
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
  const { data: socios, isLoading: loadingSocios } = useSocios();
  const { data: saques, isLoading: loadingSaques } = useSaques();
  const { data: influencers, isLoading: loadingInfluencers } = useInfluencers();
  const { consolidated, hasData: hasTrackingData } = useAutoConsolidation();
  const [tab, setTab] = useState<TabKey>("visao");

  const loading = loadingSocios || loadingSaques || loadingInfluencers;

  // ── Caixa Realizado: only from paid saques (actual money movement) ──
  const caixaMetrics = useMemo(() => {
    const pagos = saques.filter((s: any) => s.status === "Pago via Asaas");
    const totalPagos = pagos.reduce((a: number, s: any) => a + Number(s.valor || 0), 0);
    const pendentes = saques.filter((s: any) => s.status === "Pendente");
    const totalPendentes = pendentes.reduce((a: number, s: any) => a + Number(s.valor || 0), 0);
    const aprovados = saques.filter((s: any) => s.status === "Aprovado");
    const totalAprovados = aprovados.reduce((a: number, s: any) => a + Number(s.valor || 0), 0);
    const recusados = saques.filter((s: any) => s.status === "Recusado");
    const totalRecusados = recusados.reduce((a: number, s: any) => a + Number(s.valor || 0), 0);
    const totalSaquesValor = saques.reduce((a: number, s: any) => a + Number(s.valor || 0), 0);

    return {
      totalPagos, totalPendentes, totalAprovados, totalRecusados, totalSaquesValor,
      pagosCount: pagos.length, pendentesCount: pendentes.length,
      aprovadosCount: aprovados.length, recusadosCount: recusados.length,
    };
  }, [saques]);

  // ── Societário ──
  const socioMetrics = useMemo(() => {
    const totalGanhosSocios = socios.reduce((a: number, s: any) => a + Number(s.ganhos || 0), 0);
    const totalDisponivelSocios = socios.reduce((a: number, s: any) => a + Number(s.disponivel || 0), 0);
    const mediaComissaoInfluencer = influencers.length > 0
      ? influencers.reduce((a: number, i: any) => a + Number(i.commission_percent || 0), 0) / influencers.length
      : 0;
    return { totalGanhosSocios, totalDisponivelSocios, mediaComissaoInfluencer };
  }, [socios, influencers]);

  // ── Decomposição: only calculate when there's realized cash ──
  const decomposicao = useMemo(() => {
    // Only decompose if there's actual paid cash
    const base = caixaMetrics.totalPagos;
    if (base <= 0) return null;
    const comissao = base * (socioMetrics.mediaComissaoInfluencer / 100);
    const operacional = base * 0.10;
    const baseSocietaria = base - comissao - operacional;
    return {
      receitaBase: base,
      comissao,
      operacional,
      baseSocietaria,
      porSocio: socios.map((s: any) => ({
        nome: s.nome,
        participacao: Number(s.participacao || 0),
        valor: baseSocietaria * (Number(s.participacao || 0) / 100),
      })),
    };
  }, [caixaMetrics.totalPagos, socioMetrics, socios]);

  // ── Charts ──
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
      if (s.status === "Pago via Asaas") {
        months[key].saida += Number(s.valor || 0);
      }
    });
    return Object.entries(months).sort(([a], [b]) => a.localeCompare(b)).map(([month, v]) => ({ month, ...v }));
  }, [saques]);

  // ── Alerts ──
  const alerts = useMemo(() => {
    const items: { type: "warning" | "danger" | "success" | "info"; message: string }[] = [];
    if (caixaMetrics.pendentesCount > 0) {
      items.push({ type: "warning", message: `${caixaMetrics.pendentesCount} saque(s) pendente(s) — ${formatBRL(caixaMetrics.totalPendentes)}` });
    }
    const totalPart = socios.reduce((a: number, s: any) => a + Number(s.participacao || 0), 0);
    if (socios.length > 0 && totalPart !== 100) {
      items.push({ type: "danger", message: `Participação societária total é ${totalPart}% — deveria ser 100%` });
    }
    if (hasTrackingData && consolidated.revenueBrl > 0 && caixaMetrics.totalPagos === 0) {
      items.push({ type: "info", message: "Há revenue na plataforma, mas sem caixa realizado ainda. O saque da plataforma ainda não foi registrado." });
    }
    if (items.length === 0) {
      items.push({ type: "success", message: "Nenhum alerta financeiro ativo." });
    }
    return items;
  }, [caixaMetrics, socios, hasTrackingData, consolidated]);

  // ── Simulator ──
  const [simReceita, setSimReceita] = useState(500000);
  const [simComissao, setSimComissao] = useState(socioMetrics.mediaComissaoInfluencer || 15);
  const simResult = useMemo(() => {
    const comissao = simReceita * (simComissao / 100);
    const operacional = simReceita * 0.10;
    const base = simReceita - comissao - operacional;
    return {
      comissao, operacional, base,
      porSocio: socios.map((s: any) => ({
        nome: s.nome,
        participacao: Number(s.participacao || 0),
        valor: base * (Number(s.participacao || 0) / 100),
      })),
    };
  }, [simReceita, simComissao, socios]);

  const hasData = saques.length + socios.length > 0 || hasTrackingData;

  const exportData = saques.map((s: any) => ({
    codigo: s.codigo, nome: s.nome, tipo: s.tipo, valor: s.valor,
    status: s.status, data: s.data, origem: s.origem, responsavel: s.responsavel,
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
    info: { bg: "bg-primary/10 border-primary/20", icon: Info, color: "text-primary" },
  };

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: "Financeiro" }]} />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Central Financeira</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Revenue da plataforma · Caixa realizado · Distribuição societária
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
            description="Configure plataformas no Tracking Hub e registre saques para visualizar o financeiro."
            actionLabel="Ver Tracking Hub"
            onAction={() => navigate("/tracking")}
            secondaryLabel="Ver Regras Financeiras"
            onSecondary={() => navigate("/regras")}
          />
        </div>
      ) : (
        <>
          {/* Alerts */}
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

          {/* ══════ THREE LEVELS ══════ */}

          {/* LEVEL A: Revenue da Plataforma */}
          <div className="glass-card p-6 border-l-4 border-l-primary">
            <div className="flex items-center gap-2 mb-1">
              <Activity size={14} className="text-primary" />
              <h3 className="text-sm font-semibold">Nível A — Revenue da Plataforma</h3>
            </div>
            <p className="text-[10px] text-muted-foreground mb-4">
              Revenue bruto reportado pela plataforma. Não é caixa — ainda não foi sacado.
            </p>
            {hasTrackingData && consolidated.revenueBrl > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {Object.entries(consolidated.byCurrency).map(([currency, data]) => (
                  <div key={currency} className="bg-secondary/30 rounded-lg p-3 border border-border/50">
                    <p className="text-[10px] text-muted-foreground uppercase">Revenue ({currency})</p>
                    <p className="text-lg font-bold">{fmtCurrency(data.total, currency)}</p>
                    {currency !== "BRL" && data.rate && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        ≈ {formatBRL(data.convertedBrl)} · 1 {currency} = R$ {data.rate.toFixed(4)}
                      </p>
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
                  <p className="text-[10px] text-muted-foreground uppercase">Funil</p>
                  <p className="text-sm font-bold">{consolidated.realClicksCount} cliques → {consolidated.totalRegistrations} reg → {consolidated.totalFtd} FTD</p>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground bg-secondary/20 p-4 rounded-lg text-center">
                Sem revenue verificado no tracking. Configure postbacks para receber dados automáticos.
              </div>
            )}
          </div>

          {/* LEVEL B: Caixa Realizado */}
          <div className="glass-card p-6 border-l-4 border-l-success">
            <div className="flex items-center gap-2 mb-1">
              <Landmark size={14} className="text-success" />
              <h3 className="text-sm font-semibold">Nível B — Caixa Realizado</h3>
            </div>
            <p className="text-[10px] text-muted-foreground mb-4">
              Somente valores efetivamente sacados da plataforma e pagos via Asaas. É o dinheiro real na conta.
            </p>
            {caixaMetrics.totalPagos > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-secondary/30 rounded-lg p-3 border border-border/50">
                  <p className="text-[10px] text-muted-foreground uppercase">Total Pago (Asaas)</p>
                  <p className="text-lg font-bold text-success">{formatBRL(caixaMetrics.totalPagos)}</p>
                  <p className="text-[10px] text-muted-foreground">{caixaMetrics.pagosCount} pagamento(s)</p>
                </div>
                <div className="bg-secondary/30 rounded-lg p-3 border border-border/50">
                  <p className="text-[10px] text-muted-foreground uppercase">Aprovados (aguardando)</p>
                  <p className="text-lg font-bold">{formatBRL(caixaMetrics.totalAprovados)}</p>
                  <p className="text-[10px] text-muted-foreground">{caixaMetrics.aprovadosCount} saque(s)</p>
                </div>
                <div className="bg-secondary/30 rounded-lg p-3 border border-border/50 border-l-2 border-l-warning">
                  <p className="text-[10px] text-muted-foreground uppercase">Pendentes</p>
                  <p className="text-lg font-bold">{formatBRL(caixaMetrics.totalPendentes)}</p>
                  <p className="text-[10px] text-muted-foreground">{caixaMetrics.pendentesCount} aguardando</p>
                </div>
                <div className="bg-secondary/30 rounded-lg p-3 border border-border/50">
                  <p className="text-[10px] text-muted-foreground uppercase">Recusados</p>
                  <p className="text-lg font-bold text-muted-foreground">{formatBRL(caixaMetrics.totalRecusados)}</p>
                  <p className="text-[10px] text-muted-foreground">{caixaMetrics.recusadosCount} saque(s)</p>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground bg-secondary/20 p-4 rounded-lg text-center">
                Nenhum saque pago via Asaas ainda. Revenue da plataforma não é considerado caixa até ser sacado e recebido.
              </div>
            )}
          </div>

          {/* LEVEL C: Distribuição Societária */}
          <div className="glass-card p-6 border-l-4 border-l-accent">
            <div className="flex items-center gap-2 mb-1">
              <Users size={14} className="text-accent" />
              <h3 className="text-sm font-semibold">Nível C — Distribuição Societária</h3>
            </div>
            <p className="text-[10px] text-muted-foreground mb-4">
              Calculada sobre o caixa realizado. Camilly (sócia) não entra como débito de influencer.
            </p>
            {decomposicao ? (
              <div className="space-y-4">
                <div className="bg-secondary/30 rounded-lg p-4 font-mono text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-accent">Caixa Realizado (base)</span>
                    <span className="font-semibold">{formatBRL(decomposicao.receitaBase)}</span>
                  </div>
                  <div className="flex justify-between text-success">
                    <span>− Comissões Influencers ({socioMetrics.mediaComissaoInfluencer.toFixed(1)}%)</span>
                    <span>- {formatBRL(decomposicao.comissao)}</span>
                  </div>
                  <div className="flex justify-between text-primary">
                    <span>− Retenção Operacional (10%)</span>
                    <span>- {formatBRL(decomposicao.operacional)}</span>
                  </div>
                  <div className="h-px bg-border my-1" />
                  <div className="flex justify-between font-bold text-primary">
                    <span>= Base Societária</span>
                    <span>{formatBRL(decomposicao.baseSocietaria)}</span>
                  </div>
                </div>
                {decomposicao.porSocio.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {decomposicao.porSocio.map((s, i) => (
                      <div key={s.nome} className="bg-secondary/20 rounded-lg p-3 border border-border/50">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="text-sm font-medium">{s.nome}</span>
                          <span className="text-xs text-muted-foreground ml-auto">{s.participacao}%</span>
                        </div>
                        <p className="text-lg font-bold">{formatBRL(s.valor)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground bg-secondary/20 p-4 rounded-lg text-center">
                Sem caixa realizado para distribuir. A decomposição societária é calculada sobre pagamentos efetivados via Asaas, não sobre revenue da plataforma.
              </div>
            )}
          </div>

          {/* ── Tabs ── */}
          <div className="flex gap-1 bg-secondary/50 p-1 rounded-xl flex-wrap">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} className={tab === t.key ? "tab-btn-active" : "tab-btn"}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab: Visão Geral */}
          {tab === "visao" && (
            <>
              {saques.length > 0 && (
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
                        <tr><th>Código</th><th>Nome</th><th>Tipo</th><th>Valor</th><th>Status</th><th>Data</th></tr>
                      </thead>
                      <tbody>
                        {saques.slice(0, 6).map((s: any) => {
                          const statusBadge: Record<string, string> = {
                            Pendente: "badge-warning", Aprovado: "badge-success",
                            Recusado: "badge-danger", "Pago via Asaas": "badge-primary",
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
              )}

              {/* Saques charts */}
              {saques.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="glass-card p-6">
                    <h3 className="text-sm font-semibold mb-1">Saques por Status</h3>
                    <p className="text-xs text-muted-foreground mb-4">Volume (R$)</p>
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
                  <div className="glass-card p-6">
                    <h3 className="text-sm font-semibold mb-1">Sócios — Participação</h3>
                    <p className="text-xs text-muted-foreground mb-4">Divisão percentual</p>
                    {participacaoSocios.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-12">Sem sócios</p>
                    ) : (
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
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Tab: Fluxo de Caixa */}
          {tab === "fluxo" && (
            <>
              <div className="glass-card p-6">
                <h3 className="text-sm font-semibold mb-1">Fluxo de Caixa Mensal</h3>
                <p className="text-xs text-muted-foreground mb-4">Somente pagamentos efetivados via Asaas</p>
                {fluxoMensal.length === 0 ? (
                  <div className="text-center py-12 space-y-2">
                    <p className="text-sm text-muted-foreground">Sem fluxo de caixa registrado</p>
                    <p className="text-xs text-muted-foreground">
                      Revenue da plataforma não é caixa. Registre saques e pagamentos via Asaas para alimentar o fluxo.
                    </p>
                  </div>
                ) : (
                  <ChartContainer config={{
                    saida: { label: "Pagos (R$)", color: "hsl(var(--primary))" },
                  }} className="h-[300px] w-full">
                    <BarChart data={fluxoMensal}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="saida" name="Pagos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="glass-card p-5 border-l-2 border-l-warning">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Pendentes</p>
                  <p className="text-xl font-bold mt-1">{formatBRL(caixaMetrics.totalPendentes)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{caixaMetrics.pendentesCount} saques</p>
                </div>
                <div className="glass-card p-5 border-l-2 border-l-success">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Aprovados</p>
                  <p className="text-xl font-bold mt-1">{formatBRL(caixaMetrics.totalAprovados)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{caixaMetrics.aprovadosCount} saques</p>
                </div>
                <div className="glass-card p-5 border-l-2 border-l-primary">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Pagos (Asaas)</p>
                  <p className="text-xl font-bold mt-1">{formatBRL(caixaMetrics.totalPagos)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{caixaMetrics.pagosCount} pagamentos</p>
                </div>
                <div className="glass-card p-5 border-l-2 border-l-destructive">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Recusados</p>
                  <p className="text-xl font-bold mt-1">{formatBRL(caixaMetrics.totalRecusados)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{caixaMetrics.recusadosCount} saques</p>
                </div>
              </div>
            </>
          )}

          {/* Tab: Sócios */}
          {tab === "socios" && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-card p-6">
                  <h3 className="text-sm font-semibold mb-1">Participação Societária</h3>
                  <p className="text-xs text-muted-foreground mb-4">Divisão percentual</p>
                  {participacaoSocios.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-12">Sem sócios cadastrados</p>
                  ) : (
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
                  )}
                </div>
                <div className="glass-card p-6">
                  <h3 className="text-sm font-semibold mb-1">Ganhos Declarados</h3>
                  <p className="text-xs text-muted-foreground mb-4">Acumulado por sócio (declaratório)</p>
                  {participacaoSocios.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-12">Sem dados</p>
                  ) : (
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
                  )}
                </div>
              </div>

              {socios.length > 0 && (
                <div className="glass-card p-6">
                  <h3 className="text-sm font-semibold mb-4">Detalhamento por Sócio</h3>
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr><th>Sócio</th><th>Participação</th><th>Ganhos (declarado)</th><th>Disponível (declarado)</th><th>Ações</th></tr>
                      </thead>
                      <tbody>
                        {socios.map((s: any) => (
                          <tr key={s.id}>
                            <td className="font-medium">{s.nome}</td>
                            <td><span className="badge-primary">{s.participacao}%</span></td>
                            <td className="font-semibold">{formatBRL(Number(s.ganhos))}</td>
                            <td className="font-semibold text-success">{formatBRL(Number(s.disponivel))}</td>
                            <td>
                              <button onClick={() => navigate(`/socios/${s.id}`)} className="text-xs text-primary hover:underline flex items-center gap-1">
                                Detalhe <ArrowRight size={11} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Tab: Simulador */}
          {tab === "simulador" && (
            <>
              <div className="glass-card p-6">
                <h3 className="text-sm font-semibold mb-1">Simulador de Comissões</h3>
                <p className="text-xs text-muted-foreground mb-6">Simule cenários de receita para projetar distribuição</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Receita Bruta (R$)</label>
                    <input type="number" className="input-field w-full" value={simReceita} onChange={e => setSimReceita(Math.max(0, Number(e.target.value)))} min={0} max={100000000} />
                    <input type="range" className="w-full mt-2 accent-primary" min={10000} max={5000000} step={10000} value={simReceita} onChange={e => setSimReceita(Number(e.target.value))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Comissão Influencer (%)</label>
                    <input type="number" className="input-field w-full" value={simComissao} onChange={e => setSimComissao(Math.min(90, Math.max(0, Number(e.target.value))))} min={0} max={90} />
                    <input type="range" className="w-full mt-2 accent-primary" min={0} max={50} step={0.5} value={simComissao} onChange={e => setSimComissao(Number(e.target.value))} />
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
                  <div className="flex justify-between text-primary">
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

          {/* Quick Links */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">Módulos Financeiros</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {[
                { label: "Central de Saques", path: "/saques", desc: `${saques.length} registros` },
                { label: "Comissões", path: "/comissoes", desc: `${influencers.filter((i: any) => i.is_active).length} influencers` },
                { label: "Sócios", path: "/socios", desc: `${socios.length} cadastrados` },
                { label: "Regras Financeiras", path: "/regras", desc: "Configuração de regras" },
                { label: "Pagamentos Asaas", path: "/asaas", desc: "Camada de caixa realizado" },
                { label: "Tracking Hub", path: "/tracking", desc: "Revenue da plataforma" },
              ].map((item) => (
                <div key={item.label} onClick={() => navigate(item.path)} className="flex items-center gap-3 p-3.5 rounded-lg bg-secondary/30 border border-border cursor-pointer hover:bg-secondary/50 transition-colors">
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
