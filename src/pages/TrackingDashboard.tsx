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
import { useTrackingMetrics, usePlatformAccounts } from "@/hooks/useTrackingData";
import { useInfluencers, useCampanhas } from "@/hooks/useSupabaseQuery";
import {
  BarChart3, TrendingUp, Users, MousePointerClick, UserPlus, DollarSign,
  Wallet, Target, ArrowRightLeft, Activity, Download, Filter, RefreshCcw,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function pct(a: number, b: number) {
  if (!b) return "0%";
  return ((a / b) * 100).toFixed(1) + "%";
}
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
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filters = useMemo(() => ({
    platform_id: platformFilter !== "all" ? platformFilter : undefined,
    influencer_id: influencerFilter !== "all" ? influencerFilter : undefined,
    campanha_id: campanhaFilter !== "all" ? campanhaFilter : undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  }), [platformFilter, influencerFilter, campanhaFilter, dateFrom, dateTo]);

  const { data: metrics, isLoading } = useTrackingMetrics(filters);
  const { data: accounts } = usePlatformAccounts();
  const { data: influencers } = useInfluencers();
  const { data: campanhas } = useCampanhas();

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
    };
  }, [metrics]);

  // Group by platform
  const byPlatform = useMemo(() => {
    const map: Record<string, { name: string; cliques: number; registros: number; ftd: number; revenue: number; revLiq: number }> = {};
    metrics.forEach(m => {
      const pid = m.platform_id || "sem-plat";
      if (!map[pid]) {
        const acc = accounts.find(a => a.platform_id === m.platform_id);
        map[pid] = { name: acc?.nome_conta || pid.slice(0, 8), cliques: 0, registros: 0, ftd: 0, revenue: 0, revLiq: 0 };
      }
      map[pid].cliques += m.cliques || 0;
      map[pid].registros += m.registros || 0;
      map[pid].ftd += m.ftd || 0;
      map[pid].revenue += m.revenue || 0;
      map[pid].revLiq += m.revenue_liquido || 0;
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [metrics, accounts]);

  // Group by influencer
  const byInfluencer = useMemo(() => {
    const map: Record<string, { name: string; cliques: number; registros: number; ftd: number; revenue: number }> = {};
    metrics.forEach(m => {
      const iid = m.influencer_id || "sem-inf";
      if (!map[iid]) {
        const inf = influencers.find((i: any) => i.id === m.influencer_id);
        map[iid] = { name: inf?.name || iid.slice(0, 8), cliques: 0, registros: 0, ftd: 0, revenue: 0 };
      }
      map[iid].cliques += m.cliques || 0;
      map[iid].registros += m.registros || 0;
      map[iid].ftd += m.ftd || 0;
      map[iid].revenue += m.revenue || 0;
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [metrics, influencers]);

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

  // Platforms list for filter (from accounts)
  const platformOptions = useMemo(() => {
    const unique = new Map<string, string>();
    accounts.forEach(a => unique.set(a.platform_id, a.nome_conta));
    return Array.from(unique, ([id, name]) => ({ id, name }));
  }, [accounts]);

  const hasData = metrics.length > 0;

  const kpiCards = [
    { label: "Cliques", value: fmtNum(kpis.cliques), icon: MousePointerClick, color: "text-primary" },
    { label: "Registros", value: fmtNum(kpis.registros), icon: UserPlus, color: "text-chart-2" },
    { label: "FTD", value: fmtNum(kpis.ftd), icon: Target, color: "text-chart-3" },
    { label: "Redepósitos", value: fmtNum(kpis.redepositos), icon: ArrowRightLeft, color: "text-chart-4" },
    { label: "Depósitos Total", value: fmt(kpis.depositos), icon: DollarSign, color: "text-chart-5" },
    { label: "Revenue", value: fmt(kpis.revenue), icon: TrendingUp, color: "text-primary" },
    { label: "Saque Disponível", value: fmt(kpis.saque), icon: Wallet, color: "text-chart-2" },
    { label: "ROI", value: kpis.roi.toFixed(1) + "%", icon: Activity, color: kpis.roi >= 0 ? "text-green-500" : "text-destructive" },
  ];

  const calculatedCards = [
    { label: "CR Registro", value: kpis.crRegistro.toFixed(2) + "%" },
    { label: "CR FTD", value: kpis.crFtd.toFixed(2) + "%" },
    { label: "EPC", value: fmt(kpis.epc) },
    { label: "Ticket Médio", value: fmt(kpis.ticketMedio) },
    { label: "Rev/Registro", value: fmt(kpis.revenuePerRegistro) },
    { label: "Rev/FTD", value: fmt(kpis.revenuePerFtd) },
  ];

  const clearFilters = () => {
    setPlatformFilter("all");
    setInfluencerFilter("all");
    setCampanhaFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Breadcrumbs items={[{ label: "Tracking Hub" }]} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Tracking Hub</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Central de performance multi-plataforma</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/tracking/metrics")}>
            <Download size={14} className="mr-1.5" /> Registrar Métrica
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/tracking/accounts")}>
            <Users size={14} className="mr-1.5" /> Contas
          </Button>
        </div>
      </div>

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
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
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
            <Input type="date" className="h-9 text-xs" value={dateFrom} onChange={e => setDateFrom(e.target.value)} placeholder="De" />
            <Input type="date" className="h-9 text-xs" value={dateTo} onChange={e => setDateTo(e.target.value)} placeholder="Até" />
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">Carregando métricas...</CardContent></Card>
      )}

      {!isLoading && !hasData && (
        <EmptyState
          title="Nenhuma métrica registrada"
          description="Comece registrando métricas de performance das suas plataformas para ver os dados aqui."
          actionLabel="Registrar Métrica"
          onAction={() => navigate("/tracking/metrics")}
          secondaryLabel="Gerenciar Contas"
          onSecondary={() => navigate("/tracking/accounts")}
        />
      )}

      {!isLoading && hasData && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {kpiCards.map(k => (
              <Card key={k.label}>
                <CardContent className="py-4 px-5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{k.label}</span>
                    <k.icon size={14} className={k.color} />
                  </div>
                  <p className="text-xl font-bold text-foreground">{k.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Calculated Metrics */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {calculatedCards.map(c => (
              <Card key={c.label}>
                <CardContent className="py-3 px-4 text-center">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">{c.label}</p>
                  <p className="text-base font-semibold text-foreground">{c.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts & Tables */}
          <Tabs defaultValue="evolucao" className="space-y-4">
            <TabsList>
              <TabsTrigger value="evolucao">Evolução Diária</TabsTrigger>
              <TabsTrigger value="plataformas">Por Plataforma</TabsTrigger>
              <TabsTrigger value="influencers">Por Influencer</TabsTrigger>
              <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
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
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} stroke="hsl(var(--muted-foreground))" />
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
                          <TableHead className="text-right">Registros</TableHead>
                          <TableHead className="text-right">FTD</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
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
