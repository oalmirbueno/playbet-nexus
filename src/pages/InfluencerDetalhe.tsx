import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, DollarSign, Link2, Megaphone, Wallet, PenTool, MessageSquare, Copy, Edit, Globe, MousePointerClick, Activity } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import Breadcrumbs from "@/components/Breadcrumbs";
import { useInfluencers, useLandingPageInstances, useCampanhas, useSaques, useConteudo } from "@/hooks/useSupabaseQuery";
import { clickService } from "@/services/supabaseService";
import { getMetricMoneyParts } from "@/lib/trackingMetrics";

const chartTooltip = { background: "hsl(0 0% 8%)", border: "1px solid hsl(0 0% 15%)", borderRadius: 8, color: "#fff", fontSize: 12 };

const tabs = [
  { key: "resumo", label: "Resumo", icon: DollarSign },
  { key: "tracking", label: "Tracking", icon: Activity },
  { key: "landing", label: "Landing Pages", icon: Globe },
  { key: "campanhas", label: "Campanhas", icon: Megaphone },
  { key: "saques", label: "Saques", icon: Wallet },
  { key: "cliques", label: "Cliques", icon: MousePointerClick },
  { key: "conteudos", label: "Conteúdos", icon: PenTool },
  { key: "obs", label: "Observações", icon: MessageSquare },
];

export default function InfluencerDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState("resumo");
  const [obs, setObs] = useState("");
  const [editLPOpen, setEditLPOpen] = useState(false);
  const [clicks, setClicks] = useState<any[]>([]);
  const [trackingEvents, setTrackingEvents] = useState<any[]>([]);
  const [officialMetricRows, setOfficialMetricRows] = useState<any[]>([]);

  const { data: influencers, isLoading, update } = useInfluencers();
  const { data: instances } = useLandingPageInstances();
  const { data: campanhas } = useCampanhas();
  const { data: saques } = useSaques();
  const { data: conteudos } = useConteudo();

  const influencer = influencers.find((i: any) => i.id === id);

  useEffect(() => {
    if (id) {
      clickService.getByInfluencer(id).then(setClicks).catch(() => {});
      // Fetch tracking events for this influencer
      supabase
        .from("tracking_events")
        .select("*")
        .eq("influencer_id", id)
        .eq("is_demo", false)
        .eq("is_duplicate", false)
        .or("status.is.null,status.not.in.(invalid_legacy,invalid_internal_preview,duplicate_technical)")
        .order("event_timestamp", { ascending: false })
        .then(({ data: evts }) => setTrackingEvents(evts || []));
      supabase
        .from("tracking_metrics")
        .select("data_ref, ftd, registros, deposits_count, depositos_total, cliques, revenue, cpa_commission, revshare_commission, commission_total, converted_amount, origem_importacao")
        .eq("influencer_id", id)
        .eq("is_demo", false)
        .then(({ data }) => setOfficialMetricRows(data || []));
    }
  }, [id]);

  useEffect(() => {
    if (influencer?.notes) setObs(influencer.notes);
  }, [influencer?.notes]);

  // Tracking metrics (before early returns for hooks rule)
  const trackingMetrics = useMemo(() => {
    const hasOfficialRows = officialMetricRows.length > 0;
    const visits = trackingEvents.filter(e => e.canonical_event_name === "lp_view").length;
    const outboundClicks = trackingEvents.filter(e => e.canonical_event_name === "click").length;
    const conversionEvents = trackingEvents.filter(e => !["lp_view", "click"].includes(e.canonical_event_name));
    const eventRegistrations = trackingEvents.filter(e => e.canonical_event_name === "registration").length;
    const eventFtds = trackingEvents.filter(e => e.canonical_event_name === "ftd").length;
    const deposits = trackingEvents.filter(e => ["deposit", "redeposit", "ftd"].includes(e.canonical_event_name));
    const eventDepositsTotal = deposits.reduce((s, e) => s + (e.converted_amount_brl || e.original_amount || 0), 0);
    const revenueEvents = trackingEvents.filter(e => e.canonical_event_name === "revenue");
    const eventRevenue = revenueEvents.reduce((s, e) => s + (e.converted_amount_brl || e.original_amount || 0), 0);
    const redeposits = trackingEvents.filter(e => e.canonical_event_name === "redeposit").length;
    const official = officialMetricRows.reduce((acc, row) => {
      const money = getMetricMoneyParts(row);
      const day = row.data_ref ? new Date(`${row.data_ref}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : null;
      acc.registrations += Number(row.registros || 0);
      acc.ftds += Number(row.ftd || 0);
      acc.depositsTotal += Number(row.depositos_total ?? row.converted_amount ?? 0);
      acc.depositsCount += Number(row.deposits_count || 0);
      acc.revshare += money.revShare;
      acc.cpa += money.cpa;
      acc.profit += money.total;
      if (day) acc.revByDay[day] = (acc.revByDay[day] || 0) + money.total;
      return acc;
    }, { registrations: 0, ftds: 0, depositsTotal: 0, depositsCount: 0, revshare: 0, cpa: 0, profit: 0, revByDay: {} as Record<string, number> });

    const revByDay: Record<string, number> = {};
    revenueEvents.forEach(e => {
      const day = new Date(e.event_timestamp).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      revByDay[day] = (revByDay[day] || 0) + (e.converted_amount_brl || e.original_amount || 0);
    });
    const chartSource = hasOfficialRows ? official.revByDay : revByDay;
    const revenueChart = Object.entries(chartSource).map(([data, valor]) => ({ data, valor: Number(Number(valor).toFixed(2)) }));
    return {
      visits,
      outboundClicks,
      registrations: hasOfficialRows ? official.registrations : eventRegistrations,
      ftds: hasOfficialRows ? official.ftds : eventFtds,
      depositsTotal: hasOfficialRows ? official.depositsTotal : eventDepositsTotal,
      depositsCount: hasOfficialRows ? official.depositsCount : deposits.length,
      revenue: hasOfficialRows ? official.profit : eventRevenue,
      revshare: hasOfficialRows ? official.revshare : eventRevenue,
      cpa: hasOfficialRows ? official.cpa : 0,
      redeposits,
      revenueChart,
      total: hasOfficialRows ? officialMetricRows.length : conversionEvents.length,
      source: hasOfficialRows ? "painel oficial" : "postback",
    };
  }, [trackingEvents, officialMetricRows]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  if (!influencer) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: "Influencers", path: "/influencers" }, { label: "Não encontrado" }]} />
        <button onClick={() => navigate("/influencers")} className="btn-ghost"><ArrowLeft size={14} /> Voltar</button>
        <div className="glass-card p-12 text-center text-muted-foreground">
          <p className="text-lg font-medium">Influenciador não encontrado</p>
          <p className="text-sm mt-2">O ID informado não corresponde a nenhum registro.</p>
        </div>
      </div>
    );
  }

  const myInstances = instances.filter((inst: any) => inst.influencer_id === id);
  const myCampanhas = campanhas.filter((c: any) => c.influencer?.toLowerCase().includes(influencer.name?.toLowerCase().split(" ")[0]?.toLowerCase() || "---"));
  const mySaques = saques.filter((s: any) => s.nome?.toLowerCase().includes(influencer.name?.toLowerCase().split(" ")[0]?.toLowerCase() || "---"));
  const myConteudos = conteudos.filter((c: any) => c.influencer?.toLowerCase().includes(influencer.name?.toLowerCase().split(" ")[0]?.toLowerCase() || "---"));
  const totalCliques = clicks.length;
  const comissao = influencer.commission_percent || 15;

  const copyUrl = (url: string) => { navigator.clipboard.writeText(url); toast({ title: "URL copiada!", description: url }); };

  const handleSaveObs = async () => {
    try {
      await update({ id: influencer.id, updates: { notes: obs } });
      toast({ title: "Observação salva" });
    } catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
  };

  // Group clicks by day for chart
  const clicksByDay = clicks.reduce((acc: any, c: any) => {
    const day = c.clicked_at ? new Date(c.clicked_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "-";
    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {});
  const clickChartData = Object.entries(clicksByDay).slice(-7).map(([data, cliques]) => ({ data, cliques }));
  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: "Influencers", path: "/influencers" }, { label: influencer.name }]} />
      <button onClick={() => navigate("/influencers")} className="btn-ghost"><ArrowLeft size={14} /> Voltar para Influencers</button>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center text-xl font-bold text-foreground">{influencer.name?.charAt(0)}</div>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{influencer.name}</h1>
          <p className="text-sm text-muted-foreground flex flex-wrap items-center gap-2 mt-1">
            <span>@{influencer.instagram || influencer.slug}</span> · {influencer.followers?.toLocaleString() || 0} seguidores ·
            <span className={influencer.is_active ? "badge-success" : "badge-neutral"}>{influencer.is_active ? "Ativo" : "Inativo"}</span>
            <span className="font-mono text-xs text-muted-foreground">slug: {influencer.slug}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate("/comissoes")} className="btn-ghost text-xs">Comissões</button>
          <button onClick={() => navigate("/saques")} className="btn-ghost text-xs">Saques</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="stat-card border-l-2 border-l-primary"><span className="text-[10px] text-muted-foreground uppercase">Lucro real</span><p className="text-lg font-bold text-emerald-400">R$ {trackingMetrics.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p></div>
        <div className="stat-card border-l-2 border-l-accent"><span className="text-[10px] text-muted-foreground uppercase">FTDs</span><p className="text-lg font-bold">{trackingMetrics.ftds}</p></div>
        <div className="stat-card border-l-2 border-l-info"><span className="text-[10px] text-muted-foreground uppercase">Registros</span><p className="text-lg font-bold">{trackingMetrics.registrations}</p></div>
        <div className="stat-card border-l-2 border-l-success"><span className="text-[10px] text-muted-foreground uppercase">Comissão</span><p className="text-lg font-bold">{comissao}%</p></div>
        <div className="stat-card border-l-2 border-l-warning"><span className="text-[10px] text-muted-foreground uppercase">Cliques saída</span><p className="text-lg font-bold">{trackingMetrics.outboundClicks.toLocaleString()}</p></div>
        <div className="stat-card border-l-2 border-l-destructive"><span className="text-[10px] text-muted-foreground uppercase">LPs Vinculadas</span><p className="text-lg font-bold">{myInstances.length}</p></div>
        <div className="stat-card border-l-2 border-l-muted-foreground"><span className="text-[10px] text-muted-foreground uppercase">Visitas LP</span><p className="text-lg font-bold">{trackingMetrics.visits}</p></div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary/50 p-1 rounded-xl overflow-x-auto invisible-scroll">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`${tab === t.key ? "tab-btn-active" : "tab-btn"} whitespace-nowrap flex items-center gap-1.5`}>
            <t.icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      {/* RESUMO */}
      {tab === "resumo" && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="glass-card p-5">
              <h3 className="section-title">Informações</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-xs text-muted-foreground">Slug</span><p className="font-mono text-accent">{influencer.slug}</p></div>
                <div><span className="text-xs text-muted-foreground">Instagram</span><p>@{influencer.instagram || "-"}</p></div>
                <div><span className="text-xs text-muted-foreground">Affiliate Link</span><p className="text-xs break-all">{influencer.affiliate_link || "-"}</p></div>
                <div><span className="text-xs text-muted-foreground">Seguidores</span><p>{influencer.followers?.toLocaleString() || "-"}</p></div>
                <div><span className="text-xs text-muted-foreground">Criado em</span><p className="text-xs">{influencer.created_at ? new Date(influencer.created_at).toLocaleDateString("pt-BR") : "-"}</p></div>
                <div><span className="text-xs text-muted-foreground">Atualizado em</span><p className="text-xs">{influencer.updated_at ? new Date(influencer.updated_at).toLocaleDateString("pt-BR") : "-"}</p></div>
              </div>
            </div>
            <div className="glass-card p-5">
              <h3 className="section-title">Landing Pages Vinculadas</h3>
              {myInstances.length > 0 ? (
                <div className="space-y-2">
                  {myInstances.map((inst: any) => (
                    <div key={inst.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
                      <div>
                        <p className="text-sm font-medium">{inst.slug}</p>
                        <p className="text-xs text-muted-foreground mt-1">{inst.is_active ? "Ativa" : "Inativa"}</p>
                      </div>
                      <button onClick={() => copyUrl(inst.affiliate_link || "")} className="btn-ghost text-xs py-1 px-2"><Copy size={11} /> Copiar</button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <p className="text-sm">Nenhuma LP vinculada</p>
                  <button onClick={() => navigate("/lp-instancias")} className="text-accent text-xs underline mt-1">Vincular LP</button>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => navigate("/lp-instancias")} className="btn-ghost text-xs">→ Instâncias de LP</button>
            <button onClick={() => navigate("/landing-pages")} className="btn-ghost text-xs">→ Landing Pages</button>
            <button onClick={() => navigate("/comissoes")} className="btn-ghost text-xs">→ Comissões</button>
            <button onClick={() => navigate("/campanhas")} className="btn-ghost text-xs">→ Campanhas</button>
          </div>
        </div>
      )}

      {/* TRACKING */}
      {tab === "tracking" && (
        <div className="space-y-4 animate-fade-in">
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="stat-card border-l-2 border-l-primary"><span className="text-[10px] text-muted-foreground uppercase">Lucro real</span><p className="text-lg font-bold text-emerald-400">R$ {trackingMetrics.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p></div>
            <div className="stat-card border-l-2 border-l-accent"><span className="text-[10px] text-muted-foreground uppercase">CPA</span><p className="text-lg font-bold">R$ {trackingMetrics.cpa.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p></div>
            <div className="stat-card border-l-2 border-l-info"><span className="text-[10px] text-muted-foreground uppercase">Registros</span><p className="text-lg font-bold">{trackingMetrics.registrations}</p></div>
            <div className="stat-card border-l-2 border-l-success"><span className="text-[10px] text-muted-foreground uppercase">FTDs</span><p className="text-lg font-bold">{trackingMetrics.ftds}</p></div>
            <div className="stat-card border-l-2 border-l-warning"><span className="text-[10px] text-muted-foreground uppercase">Depósitos Total</span><p className="text-lg font-bold">R$ {trackingMetrics.depositsTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p></div>
            <div className="stat-card border-l-2 border-l-destructive"><span className="text-[10px] text-muted-foreground uppercase">Redepósitos</span><p className="text-lg font-bold">{trackingMetrics.redeposits}</p></div>
          </div>

          {/* Revenue chart */}
          {trackingMetrics.revenueChart.length > 0 && (
            <div className="glass-card p-5">
              <h3 className="section-title">Lucro real por dia ({trackingMetrics.source})</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={trackingMetrics.revenueChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 15%)" />
                  <XAxis dataKey="data" stroke="hsl(0 0% 40%)" fontSize={11} />
                  <YAxis stroke="hsl(0 0% 40%)" fontSize={11} />
                  <Tooltip contentStyle={chartTooltip} formatter={(v: number) => [`R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, "Lucro real"]} />
                  <Bar dataKey="valor" fill="hsl(142 71% 45%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Events table */}
          <div className="glass-card p-5">
            <h3 className="section-title">Últimas Conversões ({trackingMetrics.total} total)</h3>
            {trackingEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhum evento de tracking recebido para esta influenciadora.</p>
                <p className="text-xs mt-1">Configure os postbacks na plataforma para começar a receber dados.</p>
              </div>
            ) : (
              <div className="overflow-x-auto invisible-scroll">
                <table className="data-table">
                  <thead>
                    <tr><th>Data/Hora</th><th>Evento</th><th>Valor</th><th>Moeda</th><th>BRL</th><th>Transaction ID</th><th>País</th></tr>
                  </thead>
                  <tbody>
                    {trackingEvents.slice(0, 20).map((e: any) => (
                      <tr key={e.id}>
                        <td className="text-xs whitespace-nowrap">{new Date(e.event_timestamp).toLocaleString("pt-BR")}</td>
                        <td>
                          <span className={
                            e.canonical_event_name === "revenue" ? "badge-success" :
                            e.canonical_event_name === "ftd" ? "badge-info" :
                            e.canonical_event_name === "registration" ? "badge-warning" :
                            "badge-neutral"
                          }>{e.canonical_event_name}</span>
                        </td>
                        <td className="font-mono text-xs">{e.original_amount != null ? Number(e.original_amount).toFixed(2) : "-"}</td>
                        <td className="text-xs">{e.original_currency || e.currency || "-"}</td>
                        <td className="font-mono text-xs font-semibold">{e.converted_amount_brl != null ? `R$ ${Number(e.converted_amount_brl).toFixed(2)}` : "-"}</td>
                        <td className="font-mono text-[10px] text-muted-foreground">{e.transaction_id?.slice(0, 12) || "-"}</td>
                        <td className="text-xs">{e.country || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button onClick={() => navigate("/tracking/events")} className="btn-ghost text-xs">→ Ver todos os Eventos</button>
            <button onClick={() => navigate("/tracking")} className="btn-ghost text-xs">→ Dashboard de Tracking</button>
          </div>
        </div>
      )}

      {/* LANDING PAGES */}
      {tab === "landing" && (
        <div className="space-y-4 animate-fade-in">
          {myInstances.length === 0 ? (
            <div className="glass-card p-12 text-center text-muted-foreground">
              <Globe size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhuma landing page vinculada</p>
              <p className="text-xs mt-1">Vá para <button onClick={() => navigate("/lp-instancias")} className="text-accent underline">Distribuição de LPs</button> para criar um vínculo.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {myInstances.map((inst: any) => (
                <div key={inst.id} className="glass-card p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="section-title mb-0">{inst.slug}</h3>
                    <button onClick={() => copyUrl(inst.affiliate_link || "")} className="btn-ghost text-xs"><Copy size={12} /> Copiar Link</button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div><span className="text-xs text-muted-foreground">Slug</span><p className="font-mono text-accent text-xs">{inst.slug}</p></div>
                    <div><span className="text-xs text-muted-foreground">Affiliate Link</span><p className="text-xs break-all">{inst.affiliate_link}</p></div>
                    <div><span className="text-xs text-muted-foreground">Status</span><p><span className={inst.is_active ? "badge-success" : "badge-danger"}>{inst.is_active ? "Ativa" : "Inativa"}</span></p></div>
                    <div><span className="text-xs text-muted-foreground">Criado</span><p className="text-xs">{inst.created_at ? new Date(inst.created_at).toLocaleDateString("pt-BR") : "-"}</p></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CAMPANHAS */}
      {tab === "campanhas" && (
        <div className="animate-fade-in">
          {myCampanhas.length === 0 ? (
            <div className="glass-card p-12 text-center text-muted-foreground"><p className="font-medium">Nenhuma campanha vinculada.</p></div>
          ) : (
            <div className="glass-card overflow-x-auto invisible-scroll">
              <table className="data-table">
                <thead><tr><th>Nome</th><th>Objetivo</th><th>Jogo</th><th>Início</th><th>Fim</th><th>Status</th></tr></thead>
                <tbody>{myCampanhas.map((c: any) => (
                  <tr key={c.id} className="cursor-pointer hover:bg-secondary/30" onClick={() => navigate(`/campanhas/${c.id}`)}>
                    <td className="font-medium">{c.nome}</td><td className="text-xs">{c.objetivo || "-"}</td><td>{c.jogo || "-"}</td><td className="text-xs">{c.inicio || "-"}</td><td className="text-xs">{c.fim || "-"}</td>
                    <td><span className={c.status === "Ativa" ? "badge-success" : c.status === "Planejada" ? "badge-info" : "badge-neutral"}>{c.status}</span></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SAQUES */}
      {tab === "saques" && (
        <div className="space-y-4 animate-fade-in">
          {mySaques.length === 0 ? (
            <div className="glass-card p-12 text-center text-muted-foreground"><p className="font-medium">Nenhum saque registrado.</p></div>
          ) : (
            <div className="glass-card overflow-x-auto invisible-scroll">
              <table className="data-table">
                <thead><tr><th>Código</th><th>Valor</th><th>Data</th><th>Conta</th><th>Status</th></tr></thead>
                <tbody>{mySaques.map((s: any) => (
                  <tr key={s.id}>
                    <td className="font-mono text-xs">{s.codigo}</td>
                    <td className="font-semibold">R$ {Number(s.valor || 0).toLocaleString()}</td>
                    <td className="text-xs">{s.data || "-"}</td>
                    <td className="font-mono text-xs">{s.conta || "-"}</td>
                    <td><span className={s.status === "Aprovado" ? "badge-success" : s.status === "Pendente" ? "badge-warning" : "badge-danger"}>{s.status}</span></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
          <button onClick={() => navigate("/saques")} className="btn-ghost text-sm">Ir para Central de Saques</button>
        </div>
      )}

      {/* CLIQUES */}
      {tab === "cliques" && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="stat-card border-l-2 border-l-accent"><span className="text-[10px] text-muted-foreground uppercase">Total Cliques</span><p className="text-lg font-bold">{totalCliques.toLocaleString()}</p></div>
            <div className="stat-card border-l-2 border-l-info"><span className="text-[10px] text-muted-foreground uppercase">Últimos 7 dias</span><p className="text-lg font-bold">{clicks.filter(c => { const d = new Date(c.clicked_at); const now = new Date(); return (now.getTime() - d.getTime()) < 7 * 86400000; }).length}</p></div>
            <div className="stat-card border-l-2 border-l-success"><span className="text-[10px] text-muted-foreground uppercase">Fonte Principal</span><p className="text-sm font-bold">{clicks[0]?.source || "-"}</p></div>
          </div>
          {clickChartData.length > 0 && (
            <div className="glass-card p-5">
              <h3 className="section-title">Cliques por Dia</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={clickChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 15%)" />
                  <XAxis dataKey="data" stroke="hsl(0 0% 40%)" fontSize={11} />
                  <YAxis stroke="hsl(0 0% 40%)" fontSize={11} />
                  <Tooltip contentStyle={chartTooltip} />
                  <Line type="monotone" dataKey="cliques" stroke="hsl(45 100% 50%)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          {clicks.length > 0 && (
            <div className="glass-card p-5">
              <h3 className="section-title">Cliques Recentes</h3>
              <div className="overflow-x-auto invisible-scroll">
                <table className="data-table">
                  <thead><tr><th>Data/Hora</th><th>Referrer</th><th>Rota</th><th>Fonte</th></tr></thead>
                  <tbody>{clicks.slice(0, 10).map((c: any) => (
                    <tr key={c.id}>
                      <td className="text-xs whitespace-nowrap">{c.clicked_at ? new Date(c.clicked_at).toLocaleString("pt-BR") : "-"}</td>
                      <td className="text-xs text-accent">{c.referrer || "-"}</td>
                      <td className="font-mono text-xs">{c.route || "-"}</td>
                      <td className="text-xs">{c.source || "-"}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CONTEÚDOS */}
      {tab === "conteudos" && (
        <div className="animate-fade-in">
          {myConteudos.length === 0 ? (
            <div className="glass-card p-12 text-center text-muted-foreground"><p className="font-medium">Nenhum conteúdo vinculado.</p></div>
          ) : (
            <div className="glass-card overflow-x-auto invisible-scroll">
              <table className="data-table">
                <thead><tr><th>Data</th><th>Tipo</th><th>Tema</th><th>Jogo</th><th>Campanha</th><th>Status</th></tr></thead>
                <tbody>{myConteudos.map((c: any) => (
                  <tr key={c.id}><td className="text-xs">{c.data || "-"}</td><td><span className="badge-neutral">{c.tipo || "-"}</span></td><td>{c.tema}</td><td>{c.jogo || "-"}</td><td>{c.campanha || "-"}</td>
                    <td><span className={c.status === "Publicado" ? "badge-success" : c.status === "Agendado" ? "badge-info" : c.status === "Produção" ? "badge-warning" : "badge-neutral"}>{c.status}</span></td></tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* OBSERVAÇÕES */}
      {tab === "obs" && (
        <div className="glass-card p-5 animate-fade-in space-y-3">
          <h3 className="section-title">Observações</h3>
          <textarea className="input-field min-h-[120px]" placeholder="Adicionar observação sobre o influencer..." value={obs} onChange={e => setObs(e.target.value)} />
          <button className="btn-primary" onClick={handleSaveObs}>Salvar Observação</button>
        </div>
      )}

      {/* Edit LP Modal */}
      <Dialog open={editLPOpen} onOpenChange={setEditLPOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Editar Vínculo de LP</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Para editar o vínculo deste influenciador com a landing page, utilize a <button onClick={() => { setEditLPOpen(false); navigate("/lp-instancias"); }} className="text-accent underline">Distribuição de LPs</button>.</p>
          <DialogFooter><button className="btn-ghost" onClick={() => setEditLPOpen(false)}>Fechar</button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
