import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Target, DollarSign, Globe, Link2, Users, TrendingUp, FileText, BarChart3, MessageSquare, Layers } from "lucide-react";
import { initialCampanhas, initialLinks, initialLandingPages, initialInfluencers, initialConteudos } from "@/data/mockData";
import Breadcrumbs from "@/components/Breadcrumbs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function CampanhaDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const campanha = initialCampanhas.find(c => c.id === Number(id));
  const [tab, setTab] = useState("resumo");
  const [observacoes, setObservacoes] = useState("Campanha com bom desempenho. Manter investimento.");

  if (!campanha) return <div className="p-12 text-center text-muted-foreground">Campanha não encontrada.</div>;

  const campLinks = initialLinks.filter(l => l.campaign === campanha.nome.toLowerCase().replace(/ /g, "-") || l.jogo === campanha.jogo);
  const campLPs = initialLandingPages.filter(l => l.jogo === campanha.jogo || l.tipo === "Geral");
  const campInfluencers = initialInfluencers.filter(inf => campanha.influencer.includes(inf.nome.split(" ")[0]));
  const campConteudos = initialConteudos.filter(c => c.campanha === campanha.nome);
  const cliquesTotal = campLinks.reduce((s, l) => s + l.cliques, 0);

  const tabs = [
    { id: "resumo", label: "Resumo", icon: Target },
    { id: "estrutura", label: "Estrutura", icon: Layers },
    { id: "influencers", label: "Influencers", icon: Users },
    { id: "lps", label: "Landing Pages", icon: FileText },
    { id: "links", label: "Links", icon: Link2 },
    { id: "conteudo", label: "Conteúdo", icon: FileText },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "observacoes", label: "Observações", icon: MessageSquare },
  ];

  const analyticsData = [
    { periodo: "Sem 1", cliques: Math.round(cliquesTotal * 0.3), conversoes: Math.round(cliquesTotal * 0.03) },
    { periodo: "Sem 2", cliques: Math.round(cliquesTotal * 0.35), conversoes: Math.round(cliquesTotal * 0.04) },
    { periodo: "Sem 3", cliques: Math.round(cliquesTotal * 0.35), conversoes: Math.round(cliquesTotal * 0.035) },
  ];

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: "Marketing e Conteúdo", path: "/campanhas" }, { label: "Campanhas", path: "/campanhas" }, { label: campanha.nome }]} />
      <button onClick={() => navigate("/campanhas")} className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1.5 transition-colors"><ArrowLeft size={15} /> Voltar para Campanhas</button>

      {/* Header */}
      <div className="flex items-center gap-5">
        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center"><Target size={22} className="text-primary" /></div>
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-3">{campanha.nome}
            <span className={campanha.status === "Ativa" ? "badge-success" : campanha.status === "Planejada" ? "badge-info" : "badge-neutral"}>{campanha.status}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{campanha.objetivo} · {campanha.inicio} - {campanha.fim}</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: "Cliques", value: cliquesTotal.toLocaleString(), variant: "border-l-2 border-l-primary" },
          { label: "Links", value: campLinks.length, variant: "border-l-2 border-l-info" },
          { label: "Conteúdos", value: campConteudos.length, variant: "border-l-2 border-l-success" },
          { label: "LPs", value: campLPs.length, variant: "" },
          { label: "Influencers", value: campInfluencers.length, variant: "" },
          { label: "Resultado", value: campanha.resultado, variant: "" },
        ].map((s, i) => (
          <div key={i} className={`glass-card p-5 ${s.variant}`}>
            <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{s.label}</span>
            <p className="text-xl font-semibold mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto invisible-scroll pb-1 border-b border-border">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 px-4 py-2.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {tab === "resumo" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="glass-card p-6 space-y-5">
            <h3 className="text-[15px] font-semibold">Informações</h3>
            <div className="grid grid-cols-2 gap-y-5 text-sm">
              <div><span className="text-xs text-muted-foreground uppercase tracking-wide">Objetivo</span><p className="font-medium mt-0.5">{campanha.objetivo}</p></div>
              <div><span className="text-xs text-muted-foreground uppercase tracking-wide">Jogo</span><p className="font-medium mt-0.5 cursor-pointer hover:text-primary transition-colors" onClick={() => navigate("/jogos")}>{campanha.jogo}</p></div>
              <div><span className="text-xs text-muted-foreground uppercase tracking-wide">Plataforma</span><p className="font-medium mt-0.5 cursor-pointer hover:text-primary transition-colors" onClick={() => navigate("/plataformas")}>{campanha.plat}</p></div>
              <div><span className="text-xs text-muted-foreground uppercase tracking-wide">Influencer</span><p className="font-medium mt-0.5 cursor-pointer hover:text-primary transition-colors" onClick={() => navigate("/influencers")}>{campanha.influencer}</p></div>
              <div><span className="text-xs text-muted-foreground uppercase tracking-wide">Período</span><p className="font-medium mt-0.5">{campanha.inicio} - {campanha.fim}</p></div>
              <div><span className="text-xs text-muted-foreground uppercase tracking-wide">Resultado</span><p className="font-semibold mt-0.5">{campanha.resultado}</p></div>
            </div>
          </div>
          <div className="glass-card p-6 space-y-5">
            <h3 className="text-[15px] font-semibold">Performance</h3>
            <div className="grid grid-cols-2 gap-y-5 text-sm">
              <div><span className="text-xs text-muted-foreground uppercase tracking-wide">Cliques Total</span><p className="text-xl font-semibold mt-0.5">{cliquesTotal.toLocaleString()}</p></div>
              <div><span className="text-xs text-muted-foreground uppercase tracking-wide">CTR Estimado</span><p className="text-xl font-semibold mt-0.5">{cliquesTotal > 0 ? ((cliquesTotal * 0.1 / cliquesTotal) * 100).toFixed(1) + "%" : "—"}</p></div>
              <div><span className="text-xs text-muted-foreground uppercase tracking-wide">Conteúdos</span><p className="font-semibold mt-0.5">{campConteudos.length}</p></div>
              <div><span className="text-xs text-muted-foreground uppercase tracking-wide">Links Ativos</span><p className="font-semibold mt-0.5">{campLinks.filter(l => l.status === "Ativo").length}</p></div>
            </div>
          </div>
        </div>
      )}

      {tab === "estrutura" && (
        <div className="glass-card p-6 space-y-5">
          <h3 className="text-[15px] font-semibold">Estrutura da Campanha</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-y-5 text-sm">
            <div><span className="text-xs text-muted-foreground uppercase tracking-wide">Plataforma</span><p className="font-medium mt-0.5">{campanha.plat}</p></div>
            <div><span className="text-xs text-muted-foreground uppercase tracking-wide">Jogo</span><p className="font-medium mt-0.5">{campanha.jogo}</p></div>
            <div><span className="text-xs text-muted-foreground uppercase tracking-wide">Influencer</span><p className="font-medium mt-0.5">{campanha.influencer}</p></div>
            <div><span className="text-xs text-muted-foreground uppercase tracking-wide">LP Principal</span><p className="font-medium mt-0.5">{campLPs[0]?.nome || "—"}</p></div>
            <div><span className="text-xs text-muted-foreground uppercase tracking-wide">Link Principal</span><p className="font-medium mt-0.5">{campLinks[0]?.nome || "—"}</p></div>
            <div><span className="text-xs text-muted-foreground uppercase tracking-wide">UTM Campaign</span><p className="font-mono text-sm text-muted-foreground mt-0.5">{campLinks[0]?.campaign || "—"}</p></div>
          </div>
        </div>
      )}

      {tab === "influencers" && (
        <div className="glass-card overflow-x-auto invisible-scroll rounded-lg">
          <table className="data-table"><thead><tr><th>Nome</th><th>Instagram</th><th>Receita</th><th>Status</th></tr></thead>
            <tbody>{campInfluencers.map(inf => <tr key={inf.id}><td className="font-medium cursor-pointer hover:text-primary transition-colors" onClick={() => navigate(`/influencers/${inf.id}`)}>{inf.nome}</td><td className="text-sm text-muted-foreground">{inf.insta}</td><td>R$ {inf.receita.toLocaleString()}</td><td><span className={inf.status === "Ativo" ? "badge-success" : "badge-warning"}>{inf.status}</span></td></tr>)}</tbody>
          </table>
          {campInfluencers.length === 0 && <p className="text-sm text-muted-foreground text-center py-12">Nenhum influencer vinculado.</p>}
        </div>
      )}

      {tab === "lps" && (
        <div className="glass-card overflow-x-auto invisible-scroll rounded-lg">
          <table className="data-table"><thead><tr><th>Nome</th><th>Rota</th><th>Cliques</th><th>CTR</th><th>Status</th></tr></thead>
            <tbody>{campLPs.map(l => <tr key={l.id}><td className="font-medium">{l.nome}</td><td className="font-mono text-sm text-muted-foreground">{l.rota}</td><td>{l.cliques.toLocaleString()}</td><td>{l.ctr}</td><td><span className={l.status === "Ativo" ? "badge-success" : "badge-warning"}>{l.status}</span></td></tr>)}</tbody>
          </table>
        </div>
      )}

      {tab === "links" && (
        <div className="glass-card overflow-x-auto invisible-scroll rounded-lg">
          <table className="data-table"><thead><tr><th>Nome</th><th>Plataforma</th><th>UTM</th><th>Cliques</th><th>Status</th></tr></thead>
            <tbody>{campLinks.map(l => <tr key={l.id}><td className="font-medium">{l.nome}</td><td>{l.plat}</td><td className="font-mono text-sm text-muted-foreground">{l.source}/{l.medium}/{l.campaign}</td><td>{l.cliques.toLocaleString()}</td><td><span className={l.status === "Ativo" ? "badge-success" : "badge-danger"}>{l.status}</span></td></tr>)}</tbody>
          </table>
        </div>
      )}

      {tab === "conteudo" && (
        <div className="glass-card overflow-x-auto invisible-scroll rounded-lg">
          <table className="data-table"><thead><tr><th>Tema</th><th>Tipo</th><th>Influencer</th><th>Status</th><th>Data</th></tr></thead>
            <tbody>{campConteudos.map(c => <tr key={c.id}><td className="font-medium">{c.tema}</td><td><span className="badge-neutral">{c.tipo}</span></td><td>{c.influencer}</td><td><span className={c.status === "Publicado" ? "badge-success" : c.status === "Agendado" ? "badge-info" : "badge-neutral"}>{c.status}</span></td><td className="text-sm text-muted-foreground">{c.data}</td></tr>)}</tbody>
          </table>
          {campConteudos.length === 0 && <p className="text-sm text-muted-foreground text-center py-12">Nenhum conteúdo vinculado a esta campanha.</p>}
        </div>
      )}

      {tab === "analytics" && (
        <div className="glass-card p-6">
          <h3 className="text-[15px] font-semibold mb-5">Performance por Período</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analyticsData}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="periodo" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} /><YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} /><Tooltip contentStyle={{ background: "hsl(0 0% 9%)", border: "1px solid hsl(0 0% 16%)", borderRadius: "8px", fontSize: "12px" }} /><Bar dataKey="cliques" fill="hsl(var(--primary))" radius={[4,4,0,0]} /><Bar dataKey="conversoes" fill="hsl(var(--success))" radius={[4,4,0,0]} /></BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {tab === "observacoes" && (
        <div className="glass-card p-6 space-y-4">
          <h3 className="text-[15px] font-semibold">Observações</h3>
          <textarea className="input-field min-h-[150px] w-full" value={observacoes} onChange={e => setObservacoes(e.target.value)} />
        </div>
      )}
    </div>
  );
}
