import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Breadcrumbs from "@/components/Breadcrumbs";
import EmptyState from "@/components/EmptyState";
import { useTrackingMetrics, usePlatformAccounts, useTrackingEvents } from "@/hooks/useTrackingData";
import { useInfluencers, useCampanhas, usePlatforms, useLandingPages } from "@/hooks/useSupabaseQuery";
import {
  BarChart3, TrendingUp, Users, MousePointerClick, UserPlus, DollarSign,
  Wallet, Target, ArrowRightLeft, Activity, Download, Filter, RefreshCcw,
  AlertTriangle, Zap, Link2, Map,
} from "lucide-react";
import TrackingDemoFilter from "@/components/TrackingDemoFilter";
import PlatformActivationChecklist from "@/components/PlatformActivationChecklist";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, Legend, FunnelChart, Funnel, LabelList,
} from "recharts";

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

function fmt(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function pct(a: number, b: number) { if (!b) return "0%"; return ((a / b) * 100).toFixed(1) + "%"; }
function fmtNum(v: number) {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + "M";
  if (v >= 1_000) return (v / 1_000).toFixed(1) + "K";
  return v.toLocaleString("pt-BR");
}

export default function TrackingDashboard() {
  const navigate = useNavigate();
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [influencerFilter, setInfluencerFilter] = useState<string>("all");
  const [campanhaFilter, setCampanhaFilter] = useState<string>("all");
  const [lpFilter, setLpFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filters = useMemo(() => ({
    platform_id: platformFilter !== "all" ? platformFilter : undefined,
    influencer_id: influencerFilter !== "all" ? influencerFilter : undefined,
    campanha_id: campanhaFilter !== "all" ? campanhaFilter : undefined,
    landing_page_id: lpFilter !== "all" ? lpFilter : undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  }), [platformFilter, influencerFilter, campanhaFilter, lpFilter, dateFrom, dateTo]);

  const { data: metrics, isLoading } = useTrackingMetrics(filters);
  const { data: accounts } = usePlatformAccounts();
  const { data: influencers } = useInfluencers();
  const { data: campanhas } = useCampanhas();
  const { data: platforms } = usePlatforms();
  const { data: landingPages } = useLandingPages();
  const { data: recentEvents } = useTrackingEvents();

  // Aggregated KPIs
  const kpis = useMemo(() => {
    const t = metrics.reduce((acc, m) => ({
      cliques: acc.cliques + (m.cliques || 0),
      registros: acc.registros + (m.registros || 0),
      ftd: acc.ftd + (m.ftd || 0),
      redepositos: acc.redepositos + (m.redepositos || 0),
      depositos: acc.depositos + (m.depositos_total || 0),
      revenue: acc.revenue + (m.revenue || 0),
      revLiq: acc.revLiq + (m.revenue_liquido || 0),
      saque: acc.saque + (m.saque_disponivel || 0),
      custoTrafego: acc.custoTrafego + (m.custo_trafego || 0),
      custoInfluencer: acc.custoInfluencer + (m.custo_influencer || 0),
    }), { cliques: 0, registros: 0, ftd: 0, redepositos: 0, depositos: 0, revenue: 0, revLiq: 0, saque: 0, custoTrafego: 0, custoInfluencer: 0 });

    const custoTotal = t.custoTrafego + t.custoInfluencer;
    return {
      ...t,
      custoTotal,
      crRegistro: t.cliques ? (t.registros / t.cliques) * 100 : 0,
      crFtd: t.cliques ? (t.ftd / t.cliques) * 100 : 0,
      epc: t.cliques ? t.revenue / t.cliques : 0,
      roi: custoTotal ? ((t.revLiq - custoTotal) / custoTotal) * 100 : 0,
      ticketMedio: t.ftd + t.redepositos ? t.depositos / (t.ftd + t.redepositos) : 0,
      revenuePerRegistro: t.registros ? t.revenue / t.registros : 0,
      revenuePerFtd: t.ftd ? t.revenue / t.ftd : 0,
      lucro: t.revLiq - custoTotal,
    };
  }, [metrics]);

  // Group by platform
  const byPlatform = useMemo(() => {
    const map: Record<string, { name: string; cliques: number; registros: number; ftd: number; revenue: number; revLiq: number }> = {};
    metrics.forEach(m => {
      const pid = m.platform_id || "sem-plat";
      if (!map[pid]) {
        const plat = (platforms as any[]).find((p: any) => p.id === m.platform_id);
        map[pid] = { name: plat?.name || pid.slice(0, 8), cliques: 0, registros: 0, ftd: 0, revenue: 0, revLiq: 0 };
      }
      map[pid].cliques += m.cliques || 0;
      map[pid].registros += m.registros || 0;
      map[pid].ftd += m.ftd || 0;
      map[pid].revenue += m.revenue || 0;
      map[pid].revLiq += m.revenue_liquido || 0;
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [metrics, platforms]);

  // Group by influencer
  const byInfluencer = useMemo(() => {
    const map: Record<string, { name: string; cliques: number; registros: number; ftd: number; revenue: number }> = {};
    metrics.forEach(m => {
      const iid = m.influencer_id || "sem-inf";
      if (!map[iid]) {
        const inf = (influencers as any[]).find((i: any) => i.id === m.influencer_id);
        map[iid] = { name: inf?.name || iid.slice(0, 8), cliques: 0, registros: 0, ftd: 0, revenue: 0 };
      }
      map[iid].cliques += m.cliques || 0;
      map[iid].registros += m.registros || 0;
      map[iid].ftd += m.ftd || 0;
      map[iid].revenue += m.revenue || 0;
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [metrics, influencers]);

  // Group by campanha
  const byCampanha = useMemo(() => {
    const map: Record<string, { name: string; cliques: number; registros: number; ftd: number; revenue: number }> = {};
    metrics.forEach(m => {
      const cid = m.campanha_id || "sem-camp";
      if (!map[cid]) {
        const camp = (campanhas as any[]).find((c: any) => c.id === m.campanha_id);
        map[cid] = { name: camp?.nome || cid.slice(0, 8), cliques: 0, registros: 0, ftd: 0, revenue: 0 };
      }
      map[cid].cliques += m.cliques || 0;
      map[cid].registros += m.registros || 0;
      map[cid].ftd += m.ftd || 0;
      map[cid].revenue += m.revenue || 0;
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [metrics, campanhas]);

  // Daily evolution
  const dailyData = useMemo(() => {
    const map: Record<string, { date: string; cliques: number; registros: number; ftd: number; revenue: number }> = {};
    metrics.forEach(m => {
      const d = m.data_ref;
      if (!map[d]) map[d] = { date: d, cliques: 0, registros: 0, ftd: 0, revenue: 0 };
      map[d].cliques += m.cliques || 0;
      map[d].registros += m.registros || 0;
      map[d].ftd += m.ftd || 0;
      map[d].revenue += m.revenue || 0;
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [metrics]);

  // Funnel data
  const funnelData = useMemo(() => [
    { name: "Cliques", value: kpis.cliques, fill: COLORS[0] },
    { name: "Registros", value: kpis.registros, fill: COLORS[1] },
    { name: "FTD", value: kpis.ftd, fill: COLORS[2] },
    { name: "Redepósitos", value: kpis.redepositos, fill: COLORS[3] },
  ], [kpis]);

  // Alerts
  const alerts = useMemo(() => {
    const items: { type: string; message: string; severity: "warning" | "error" | "info" }[] = [];
    const dupes = recentEvents.filter(e => e.is_duplicate).length;
    if (dupes > 0) items.push({ type: "duplicate", message: `${dupes} eventos duplicados detectados`, severity: "warning" });
    const noClick = recentEvents.filter(e => !e.click_id && e.canonical_event_name !== "click").length;
    if (noClick > 5) items.push({ type: "no_click", message: `${noClick} eventos sem click_id`, severity: "warning" });
    byPlatform.forEach(p => {
      if (p.cliques > 100 && p.ftd < 2) items.push({ type: "low_ftd", message: `${p.name}: ${p.cliques} cliques, apenas ${p.ftd} FTD`, severity: "error" });
    });
    return items;
  }, [recentEvents, byPlatform]);

  const platformOptions = useMemo(() => {
    return (platforms as any[]).map((p: any) => ({ id: p.id, name: p.name }));
  }, [platforms]);

  const hasData = metrics.length > 0;

  const kpiCards = [
    { label: "Cliques", value: fmtNum(kpis.cliques), icon: MousePointerClick, color: "text-primary" },
    { label: "Registros", value: fmtNum(kpis.registros), icon: UserPlus, color: "text-chart-2" },
    { label: "FTD", value: fmtNum(kpis.ftd), icon: Target, color: "text-chart-3" },
    { label: "Redepósitos", value: fmtNum(kpis.redepositos), icon: ArrowRightLeft, color: "text-chart-4" },
    { label: "Depósitos Total", value: fmt(kpis.depositos), icon: DollarSign, color: "text-chart-5" },
    { label: "Revenue", value: fmt(kpis.revenue), icon: TrendingUp, color: "text-primary" },
    { label: "Saque Disponível", value: fmt(kpis.saque), icon: Wallet, color: "text-chart-2" },
    { label: "Lucro", value: fmt(kpis.lucro), icon: Activity, color: kpis.lucro >= 0 ? "text-green-500" : "text-destructive" },
    { label: "ROI", value: kpis.roi.toFixed(1) + "%", icon: Activity, color: kpis.roi >= 0 ? "text-green-500" : "text-destructive" },
  ];

  const calculatedCards = [
    { label: "CR Registro", value: kpis.crRegistro.toFixed(2) + "%" },
    { label: "CR FTD", value: kpis.crFtd.toFixed(2) + "%" },
    { label: "EPC", value: fmt(kpis.epc) },
    { label: "Ticket Médio", value: fmt(kpis.ticketMedio) },
    { label: "Rev/Registro", value: fmt(kpis.revenuePerRegistro) },
    { label: "Rev/FTD", value: fmt(kpis.revenuePerFtd) },
    { label: "Custo Total", value: fmt(kpis.custoTotal) },
  ];

  const clearFilters = () => {
    setPlatformFilter("all"); setInfluencerFilter("all");
    setCampanhaFilter("all"); setLpFilter("all");
    setDateFrom(""); setDateTo("");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Breadcrumbs items={[{ label: "Tracking Hub" }]} />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Tracking Hub</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Central de performance multi-plataforma</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <TrackingDemoFilter />
          <Button variant="outline" size="sm" onClick={() => navigate("/tracking/metrics")}>
            <Download size={14} className="mr-1.5" /> Registrar Métrica
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/tracking/accounts")}>
            <Users size={14} className="mr-1.5" /> Contas
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/tracking/mappings")}>
            <Map size={14} className="mr-1.5" /> Mapeamentos
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/tracking/events")}>
            <Zap size={14} className="mr-1.5" /> Eventos
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/tracking/links")}>
            <Link2 size={14} className="mr-1.5" /> Links
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a, i) => (
            <Card key={i} className={a.severity === "error" ? "border-destructive/50 bg-destructive/5" : "border-yellow-500/50 bg-yellow-500/5"}>
              <CardContent className="py-3 px-4 flex items-center gap-3">
                <AlertTriangle size={14} className={a.severity === "error" ? "text-destructive" : "text-yellow-500"} />
                <span className="text-sm">{a.message}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Platform Activation Checklist */}
      <PlatformActivationChecklist />

      {/* Filters */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter size={14} className="text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Filtros</span>
            <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs" onClick={clearFilters}>
              <RefreshCcw size={12} className="mr-1" /> Limpar
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Plataforma" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas plataformas</SelectItem>
                {platformOptions.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={influencerFilter} onValueChange={setInfluencerFilter}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Influencer" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos influencers</SelectItem>
                {(influencers as any[]).map((i: any) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={campanhaFilter} onValueChange={setCampanhaFilter}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Campanha" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas campanhas</SelectItem>
                {(campanhas as any[]).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={lpFilter} onValueChange={setLpFilter}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Landing Page" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas LPs</SelectItem>
                {(landingPages as any[]).map((lp: any) => <SelectItem key={lp.id} value={lp.id}>{lp.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="date" className="h-9 text-xs" value={dateFrom} onChange={e => setDateFrom(e.target.value)} placeholder="De" />
            <Input type="date" className="h-9 text-xs" value={dateTo} onChange={e => setDateTo(e.target.value)} placeholder="Até" />
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">Carregando métricas...</CardContent></Card>
      )}

      {!isLoading && !hasData && (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-secondary/60 border border-border flex items-center justify-center mx-auto">
              <BarChart3 size={24} className="text-muted-foreground/50" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-1.5">Nenhum dado real recebido ainda</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                Siga o checklist de ativação acima para configurar sua primeira plataforma.
                Após configurar o postback, os dados aparecerão aqui automaticamente.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Os dados demo podem ser visualizados usando o filtro <strong>"Demo"</strong> acima.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3">
              <Button variant="default" size="sm" onClick={() => navigate("/tracking/accounts")}>
                Cadastrar Conta
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("/tracking/mappings")}>
                Configurar Mapeamentos
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && hasData && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-3 md:grid-cols-9 gap-3">
            {kpiCards.map(k => (
              <Card key={k.label}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{k.label}</span>
                    <k.icon size={12} className={k.color} />
                  </div>
                  <p className="text-lg font-bold text-foreground">{k.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Calculated */}
          <div className="grid grid-cols-4 md:grid-cols-7 gap-3">
            {calculatedCards.map(c => (
              <Card key={c.label}>
                <CardContent className="py-2.5 px-3 text-center">
                  <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">{c.label}</p>
                  <p className="text-sm font-semibold text-foreground">{c.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts */}
          <Tabs defaultValue="evolucao" className="space-y-4">
            <TabsList className="flex-wrap">
              <TabsTrigger value="evolucao">Evolução Diária</TabsTrigger>
              <TabsTrigger value="funil">Funil</TabsTrigger>
              <TabsTrigger value="plataformas">Por Plataforma</TabsTrigger>
              <TabsTrigger value="influencers">Por Influencer</TabsTrigger>
              <TabsTrigger value="campanhas">Por Campanha</TabsTrigger>
              <TabsTrigger value="eventos">Eventos Recentes</TabsTrigger>
              <TabsTrigger value="detalhes">Métricas</TabsTrigger>
            </TabsList>

            <TabsContent value="evolucao">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Evolução Diária</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dailyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                        <ReTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                        <Area type="monotone" dataKey="cliques" name="Cliques" stroke={COLORS[0]} fill={COLORS[0]} fillOpacity={0.15} />
                        <Area type="monotone" dataKey="registros" name="Registros" stroke={COLORS[1]} fill={COLORS[1]} fillOpacity={0.15} />
                        <Area type="monotone" dataKey="ftd" name="FTD" stroke={COLORS[2]} fill={COLORS[2]} fillOpacity={0.15} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="funil">
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Funil de Conversão</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {funnelData.map((item, i) => {
                        const maxVal = funnelData[0].value || 1;
                        const width = Math.max((item.value / maxVal) * 100, 5);
                        return (
                          <div key={item.name}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-muted-foreground">{item.name}</span>
                              <span className="font-semibold">{fmtNum(item.value)}</span>
                            </div>
                            <div className="h-7 bg-secondary/50 rounded overflow-hidden">
                              <div className="h-full rounded transition-all" style={{ width: `${width}%`, backgroundColor: item.fill }} />
                            </div>
                            {i > 0 && funnelData[i - 1].value > 0 && (
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                CR: {pct(item.value, funnelData[i - 1].value)}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Revenue Diário</CardTitle></CardHeader>
                  <CardContent>
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dailyData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                          <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                          <ReTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                          <Bar dataKey="revenue" name="Revenue" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="plataformas">
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Revenue por Plataforma</CardTitle></CardHeader>
                  <CardContent>
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={byPlatform} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} stroke="hsl(var(--muted-foreground))" />
                          <ReTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                          <Bar dataKey="revenue" name="Revenue" fill={COLORS[0]} radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Comparativo de Plataformas</CardTitle></CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Plataforma</TableHead>
                          <TableHead className="text-right">Cliques</TableHead>
                          <TableHead className="text-right">Reg</TableHead>
                          <TableHead className="text-right">FTD</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                          <TableHead className="text-right">EPC</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {byPlatform.map((p, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{p.name}</TableCell>
                            <TableCell className="text-right">{fmtNum(p.cliques)}</TableCell>
                            <TableCell className="text-right">{fmtNum(p.registros)}</TableCell>
                            <TableCell className="text-right">{fmtNum(p.ftd)}</TableCell>
                            <TableCell className="text-right font-medium">{fmt(p.revenue)}</TableCell>
                            <TableCell className="text-right">{p.cliques ? fmt(p.revenue / p.cliques) : "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="influencers">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Performance por Influencer</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Influencer</TableHead>
                        <TableHead className="text-right">Cliques</TableHead>
                        <TableHead className="text-right">Registros</TableHead>
                        <TableHead className="text-right">CR Reg</TableHead>
                        <TableHead className="text-right">FTD</TableHead>
                        <TableHead className="text-right">CR FTD</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">EPC</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {byInfluencer.map((inf, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{inf.name}</TableCell>
                          <TableCell className="text-right">{fmtNum(inf.cliques)}</TableCell>
                          <TableCell className="text-right">{fmtNum(inf.registros)}</TableCell>
                          <TableCell className="text-right">{pct(inf.registros, inf.cliques)}</TableCell>
                          <TableCell className="text-right">{fmtNum(inf.ftd)}</TableCell>
                          <TableCell className="text-right">{pct(inf.ftd, inf.cliques)}</TableCell>
                          <TableCell className="text-right font-medium">{fmt(inf.revenue)}</TableCell>
                          <TableCell className="text-right">{inf.cliques ? fmt(inf.revenue / inf.cliques) : "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="campanhas">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Performance por Campanha</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Campanha</TableHead>
                        <TableHead className="text-right">Cliques</TableHead>
                        <TableHead className="text-right">Registros</TableHead>
                        <TableHead className="text-right">CR Reg</TableHead>
                        <TableHead className="text-right">FTD</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">EPC</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {byCampanha.map((c, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell className="text-right">{fmtNum(c.cliques)}</TableCell>
                          <TableCell className="text-right">{fmtNum(c.registros)}</TableCell>
                          <TableCell className="text-right">{pct(c.registros, c.cliques)}</TableCell>
                          <TableCell className="text-right">{fmtNum(c.ftd)}</TableCell>
                          <TableCell className="text-right font-medium">{fmt(c.revenue)}</TableCell>
                          <TableCell className="text-right">{c.cliques ? fmt(c.revenue / c.cliques) : "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="eventos">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-sm">Eventos Recentes</CardTitle>
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => navigate("/tracking/events")}>
                      Ver todos
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Evento</TableHead>
                          <TableHead>Canônico</TableHead>
                          <TableHead>Origem</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead>País</TableHead>
                          <TableHead>Timestamp</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentEvents.slice(0, 20).map(ev => (
                          <TableRow key={ev.id} className={ev.is_duplicate ? "opacity-50" : ""}>
                            <TableCell className="font-mono text-xs">{ev.raw_event_name}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-[10px]">{ev.canonical_event_name}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px]">{ev.source_type}</Badge>
                            </TableCell>
                            <TableCell className="text-right">{ev.amount ? fmt(ev.amount) : "—"}</TableCell>
                            <TableCell>{ev.country || "—"}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(ev.event_timestamp).toLocaleString("pt-BR")}
                            </TableCell>
                            <TableCell>
                              {ev.is_duplicate && <Badge variant="destructive" className="text-[10px]">Duplicado</Badge>}
                              {!ev.click_id && !ev.is_duplicate && <Badge variant="outline" className="text-[10px] border-yellow-500 text-yellow-600">Sem click_id</Badge>}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="detalhes">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Métricas Detalhadas</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead className="text-right">Cliques</TableHead>
                          <TableHead className="text-right">Reg</TableHead>
                          <TableHead className="text-right">FTD</TableHead>
                          <TableHead className="text-right">Redep</TableHead>
                          <TableHead className="text-right">Depósitos</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                          <TableHead className="text-right">Rev Líq</TableHead>
                          <TableHead className="text-right">Custo</TableHead>
                          <TableHead>Origem</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {metrics.slice(0, 50).map(m => (
                          <TableRow key={m.id}>
                            <TableCell>{new Date(m.data_ref).toLocaleDateString("pt-BR")}</TableCell>
                            <TableCell className="text-right">{fmtNum(m.cliques)}</TableCell>
                            <TableCell className="text-right">{fmtNum(m.registros)}</TableCell>
                            <TableCell className="text-right">{fmtNum(m.ftd)}</TableCell>
                            <TableCell className="text-right">{fmtNum(m.redepositos)}</TableCell>
                            <TableCell className="text-right">{fmt(m.depositos_total)}</TableCell>
                            <TableCell className="text-right font-medium">{fmt(m.revenue)}</TableCell>
                            <TableCell className="text-right">{fmt(m.revenue_liquido)}</TableCell>
                            <TableCell className="text-right">{fmt((m.custo_trafego || 0) + (m.custo_influencer || 0))}</TableCell>
                            <TableCell>
                              {m.origem_importacao && <Badge variant="secondary" className="text-[10px]">{m.origem_importacao}</Badge>}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
