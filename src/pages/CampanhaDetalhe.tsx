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

  if (!campanha) return <div className="p-8 text-center text-muted-foreground">Campanha não encontrada.</div>;

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
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Marketing e Conteúdo", path: "/campanhas" }, { label: "Campanhas", path: "/campanhas" }, { label: campanha.nome }]} />
      <button onClick={() => navigate("/campanhas")} className="text-xs text-muted-foreground hover:text-accent flex items-center gap-1"><ArrowLeft size={14} /> Voltar para Campanhas</button>

      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center text-2xl font-bold text-accent"><Target size={24} /></div>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">{campanha.nome}
            <span className={campanha.status === "Ativa" ? "badge-success" : campanha.status === "Planejada" ? "badge-info" : "badge-neutral"}>{campanha.status}</span>
          </h1>
          <p className="text-xs text-muted-foreground">{campanha.objetivo} · {campanha.inicio} - {campanha.fim}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="stat-card border-l-2 border-l-accent"><span className="text-[10px] text-muted-foreground uppercase">Cliques</span><p className="text-sm font-bold">{cliquesTotal.toLocaleString()}</p></div>
        <div className="stat-card border-l-2 border-l-info"><span className="text-[10px] text-muted-foreground uppercase">Links</span><p className="text-sm font-bold">{campLinks.length}</p></div>
        <div className="stat-card border-l-2 border-l-success"><span className="text-[10px] text-muted-foreground uppercase">Conteúdos</span><p className="text-sm font-bold">{campConteudos.length}</p></div>
        <div className="stat-card border-l-2 border-l-primary"><span className="text-[10px] text-muted-foreground uppercase">LPs</span><p className="text-sm font-bold">{campLPs.length}</p></div>
        <div className="stat-card border-l-2 border-l-warning"><span className="text-[10px] text-muted-foreground uppercase">Influencers</span><p className="text-sm font-bold">{campInfluencers.length}</p></div>
        <div className="stat-card border-l-2 border-l-accent"><span className="text-[10px] text-muted-foreground uppercase">Resultado</span><p className="text-sm font-bold">{campanha.resultado}</p></div>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}>
            <t.icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      {tab === "resumo" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="glass-card p-5 space-y-3">
            <h3 className="section-title">Informações</h3>
            <div className="grid grid-cols-2 gap-y-3 text-xs">
              <div><span className="text-muted-foreground">Objetivo</span><p className="font-medium">{campanha.objetivo}</p></div>
              <div><span className="text-muted-foreground">Jogo</span><p className="font-medium cursor-pointer hover:text-accent" onClick={() => navigate("/jogos")}>{campanha.jogo}</p></div>
              <div><span className="text-muted-foreground">Plataforma</span><p className="font-medium cursor-pointer hover:text-accent" onClick={() => navigate("/plataformas")}>{campanha.plat}</p></div>
              <div><span className="text-muted-foreground">Influencer</span><p className="font-medium cursor-pointer hover:text-accent" onClick={() => navigate("/influencers")}>{campanha.influencer}</p></div>
              <div><span className="text-muted-foreground">Período</span><p className="font-medium">{campanha.inicio} - {campanha.fim}</p></div>
              <div><span className="text-muted-foreground">Resultado</span><p className="font-bold text-accent">{campanha.resultado}</p></div>
            </div>
          </div>
          <div className="glass-card p-5 space-y-3">
            <h3 className="section-title">Performance</h3>
            <div className="grid grid-cols-2 gap-y-3 text-xs">
              <div><span className="text-muted-foreground">Cliques Total</span><p className="font-bold">{cliquesTotal.toLocaleString()}</p></div>
              <div><span className="text-muted-foreground">CTR Estimado</span><p className="font-bold text-accent">{cliquesTotal > 0 ? ((cliquesTotal * 0.1 / cliquesTotal) * 100).toFixed(1) + "%" : "—"}</p></div>
              <div><span className="text-muted-foreground">Conteúdos</span><p className="font-bold">{campConteudos.length}</p></div>
              <div><span className="text-muted-foreground">Links Ativos</span><p className="font-bold">{campLinks.filter(l => l.status === "Ativo").length}</p></div>
            </div>
          </div>
        </div>
      )}

      {tab === "estrutura" && (
        <div className="glass-card p-5 space-y-3">
          <h3 className="section-title">Estrutura da Campanha</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-y-3 text-xs">
            <div><span className="text-muted-foreground">Plataforma</span><p className="font-medium">{campanha.plat}</p></div>
            <div><span className="text-muted-foreground">Jogo</span><p className="font-medium">{campanha.jogo}</p></div>
            <div><span className="text-muted-foreground">Influencer</span><p className="font-medium">{campanha.influencer}</p></div>
            <div><span className="text-muted-foreground">LP Principal</span><p className="font-medium">{campLPs[0]?.nome || "—"}</p></div>
            <div><span className="text-muted-foreground">Link Principal</span><p className="font-medium">{campLinks[0]?.nome || "—"}</p></div>
            <div><span className="text-muted-foreground">UTM Campaign</span><p className="font-mono text-accent">{campLinks[0]?.campaign || "—"}</p></div>
          </div>
        </div>
      )}

      {tab === "influencers" && (
        <div className="glass-card overflow-x-auto">
          <table className="data-table"><thead><tr><th>Nome</th><th>Instagram</th><th>Receita</th><th>Status</th></tr></thead>
            <tbody>{campInfluencers.map(inf => <tr key={inf.id}><td className="font-medium cursor-pointer hover:text-accent" onClick={() => navigate(`/influencers/${inf.id}`)}>{inf.nome}</td><td className="text-accent text-xs">{inf.insta}</td><td>R$ {inf.receita.toLocaleString()}</td><td><span className={inf.status === "Ativo" ? "badge-success" : "badge-warning"}>{inf.status}</span></td></tr>)}</tbody>
          </table>
          {campInfluencers.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">Nenhum influencer vinculado.</p>}
        </div>
      )}

      {tab === "lps" && (
        <div className="glass-card overflow-x-auto">
          <table className="data-table"><thead><tr><th>Nome</th><th>Rota</th><th>Cliques</th><th>CTR</th><th>Status</th></tr></thead>
            <tbody>{campLPs.map(l => <tr key={l.id}><td className="font-medium">{l.nome}</td><td className="font-mono text-xs text-accent">{l.rota}</td><td>{l.cliques.toLocaleString()}</td><td className="text-accent">{l.ctr}</td><td><span className={l.status === "Ativo" ? "badge-success" : "badge-warning"}>{l.status}</span></td></tr>)}</tbody>
          </table>
        </div>
      )}

      {tab === "links" && (
        <div className="glass-card overflow-x-auto">
          <table className="data-table"><thead><tr><th>Nome</th><th>Plataforma</th><th>UTM</th><th>Cliques</th><th>Status</th></tr></thead>
            <tbody>{campLinks.map(l => <tr key={l.id}><td className="font-medium">{l.nome}</td><td>{l.plat}</td><td className="font-mono text-xs">{l.source}/{l.medium}/{l.campaign}</td><td>{l.cliques.toLocaleString()}</td><td><span className={l.status === "Ativo" ? "badge-success" : "badge-danger"}>{l.status}</span></td></tr>)}</tbody>
          </table>
        </div>
      )}

      {tab === "conteudo" && (
        <div className="glass-card overflow-x-auto">
          <table className="data-table"><thead><tr><th>Tema</th><th>Tipo</th><th>Influencer</th><th>Status</th><th>Data</th></tr></thead>
            <tbody>{campConteudos.map(c => <tr key={c.id}><td className="font-medium">{c.tema}</td><td><span className="badge-neutral">{c.tipo}</span></td><td>{c.influencer}</td><td><span className={c.status === "Publicado" ? "badge-success" : c.status === "Agendado" ? "badge-info" : "badge-warning"}>{c.status}</span></td><td className="text-xs">{c.data}</td></tr>)}</tbody>
          </table>
          {campConteudos.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">Nenhum conteúdo vinculado a esta campanha.</p>}
        </div>
      )}

      {tab === "analytics" && (
        <div className="glass-card p-5">
          <h3 className="section-title mb-4">Performance por Período</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analyticsData}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="periodo" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} /><YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} /><Tooltip /><Bar dataKey="cliques" fill="hsl(var(--primary))" radius={[4,4,0,0]} /><Bar dataKey="conversoes" fill="hsl(var(--accent))" radius={[4,4,0,0]} /></BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {tab === "observacoes" && (
        <div className="glass-card p-5 space-y-3">
          <h3 className="section-title">Observações</h3>
          <textarea className="input-field min-h-[120px] w-full" value={observacoes} onChange={e => setObservacoes(e.target.value)} />
        </div>
      )}
    </div>
  );
}
