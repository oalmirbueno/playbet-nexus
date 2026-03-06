import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Gamepad2, DollarSign, Globe, Link2, Users, TrendingUp, FileText, BarChart3, MessageSquare } from "lucide-react";
import { initialJogos, initialLinks, initialLandingPages, initialCampanhas, initialInfluencers, initialConteudos } from "@/data/mockData";
import Breadcrumbs from "@/components/Breadcrumbs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const getTrend = (ctr: string) => {
  const v = parseFloat(ctr);
  if (v >= 12) return { label: "Trending", color: "text-success" };
  if (v >= 8) return { label: "Estável", color: "text-accent" };
  if (v >= 5) return { label: "Em Queda", color: "text-warning" };
  return { label: "Crítico", color: "text-destructive" };
};

export default function JogoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const jogo = initialJogos.find(j => j.id === Number(id));
  const [tab, setTab] = useState("resumo");
  const [observacoes, setObservacoes] = useState("Jogo com alta performance. Priorizar em campanhas de março.");

  if (!jogo) return <div className="p-8 text-center text-muted-foreground">Jogo não encontrado.</div>;

  const jogoLinks = initialLinks.filter(l => l.jogo === jogo.nome);
  const jogoLPs = initialLandingPages.filter(l => l.jogo === jogo.nome);
  const jogoCampanhas = initialCampanhas.filter(c => c.jogo === jogo.nome || c.jogo === "Vários");
  const jogoInfluencers = initialInfluencers.filter(inf => jogoLinks.some(l => l.influencer.includes(inf.nome.split(" ")[0])));
  const jogoConteudos = initialConteudos.filter(c => c.jogo === jogo.nome || c.jogo === "Vários");
  const plats = jogo.plats.split(", ").filter(Boolean);
  const trend = getTrend(jogo.ctr);

  const tabs = [
    { id: "resumo", label: "Resumo", icon: Gamepad2 },
    { id: "plataformas", label: "Plataformas", icon: Globe },
    { id: "lps", label: "Landing Pages", icon: FileText },
    { id: "influencers", label: "Influencers", icon: Users },
    { id: "campanhas", label: "Campanhas", icon: TrendingUp },
    { id: "links", label: "Links", icon: Link2 },
    { id: "metricas", label: "Métricas", icon: BarChart3 },
    { id: "conteudo", label: "Conteúdo", icon: FileText },
    { id: "observacoes", label: "Observações", icon: MessageSquare },
  ];

  const clickData = [
    { dia: "27/02", cliques: Math.round(jogo.cliques * 0.08) },
    { dia: "28/02", cliques: Math.round(jogo.cliques * 0.1) },
    { dia: "01/03", cliques: Math.round(jogo.cliques * 0.14) },
    { dia: "02/03", cliques: Math.round(jogo.cliques * 0.12) },
    { dia: "03/03", cliques: Math.round(jogo.cliques * 0.16) },
    { dia: "04/03", cliques: Math.round(jogo.cliques * 0.18) },
    { dia: "05/03", cliques: Math.round(jogo.cliques * 0.22) },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Gestão de Ativos", path: "/jogos" }, { label: "Jogos", path: "/jogos" }, { label: jogo.nome }]} />
      <button onClick={() => navigate("/jogos")} className="text-xs text-muted-foreground hover:text-accent flex items-center gap-1"><ArrowLeft size={14} /> Voltar para Jogos</button>

      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center text-2xl font-bold text-accent">{jogo.nome.charAt(0)}</div>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">{jogo.nome}
            <span className="badge-neutral">{jogo.cat}</span>
            <span className={jogo.status === "Ativo" ? "badge-success" : "badge-danger"}>{jogo.status}</span>
            <span className={`text-xs font-medium ${trend.color}`}>{trend.label}</span>
          </h1>
          <p className="text-xs text-muted-foreground">{jogo.plats}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="stat-card border-l-2 border-l-accent"><span className="text-[10px] text-muted-foreground uppercase">Receita</span><p className="text-sm font-bold">R$ {jogo.receita.toLocaleString()}</p></div>
        <div className="stat-card border-l-2 border-l-info"><span className="text-[10px] text-muted-foreground uppercase">Cliques</span><p className="text-sm font-bold">{jogo.cliques.toLocaleString()}</p></div>
        <div className="stat-card border-l-2 border-l-success"><span className="text-[10px] text-muted-foreground uppercase">CTR</span><p className="text-sm font-bold text-accent">{jogo.ctr}</p></div>
        <div className="stat-card border-l-2 border-l-primary"><span className="text-[10px] text-muted-foreground uppercase">Cadastros</span><p className="text-sm font-bold">{jogo.cadastros.toLocaleString()}</p></div>
        <div className="stat-card border-l-2 border-l-warning"><span className="text-[10px] text-muted-foreground uppercase">Plataformas</span><p className="text-sm font-bold">{plats.length}</p></div>
        <div className="stat-card border-l-2 border-l-primary"><span className="text-[10px] text-muted-foreground uppercase">Influencers</span><p className="text-sm font-bold">{jogoInfluencers.length}</p></div>
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
              <div><span className="text-muted-foreground">Categoria</span><p className="font-medium">{jogo.cat}</p></div>
              <div><span className="text-muted-foreground">LP Principal</span><p className="font-medium">{jogo.lp || "—"}</p></div>
              <div><span className="text-muted-foreground">Plataformas</span><p className="font-medium">{jogo.plats}</p></div>
              <div><span className="text-muted-foreground">Score</span><p className={`font-bold ${trend.color}`}>{trend.label}</p></div>
            </div>
          </div>
          <div className="glass-card p-5 space-y-3">
            <h3 className="section-title">Top Influencer</h3>
            {jogoInfluencers[0] ? (
              <div className="text-xs space-y-1">
                <p className="font-medium cursor-pointer hover:text-accent" onClick={() => navigate(`/influencers/${jogoInfluencers[0].id}`)}>{jogoInfluencers[0].nome}</p>
                <p className="text-muted-foreground">Receita: R$ {jogoInfluencers[0].receita.toLocaleString()}</p>
              </div>
            ) : <p className="text-xs text-muted-foreground">Nenhum influencer vinculado.</p>}
          </div>
        </div>
      )}

      {tab === "plataformas" && (
        <div className="glass-card overflow-x-auto">
          <table className="data-table"><thead><tr><th>Plataforma</th><th>Status</th></tr></thead>
            <tbody>{plats.map((p, i) => <tr key={i}><td className="font-medium cursor-pointer hover:text-accent" onClick={() => navigate("/plataformas")}>{p}</td><td><span className="badge-success">Ativo</span></td></tr>)}</tbody>
          </table>
        </div>
      )}

      {tab === "lps" && (
        <div className="glass-card overflow-x-auto">
          <table className="data-table"><thead><tr><th>Nome</th><th>Rota</th><th>Cliques</th><th>CTR</th><th>Status</th></tr></thead>
            <tbody>{jogoLPs.map(l => <tr key={l.id}><td className="font-medium">{l.nome}</td><td className="font-mono text-xs text-accent">{l.rota}</td><td>{l.cliques.toLocaleString()}</td><td className="text-accent">{l.ctr}</td><td><span className={l.status === "Ativo" ? "badge-success" : "badge-warning"}>{l.status}</span></td></tr>)}</tbody>
          </table>
          {jogoLPs.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">Nenhuma LP vinculada a este jogo.</p>}
        </div>
      )}

      {tab === "influencers" && (
        <div className="glass-card overflow-x-auto">
          <table className="data-table"><thead><tr><th>Nome</th><th>Instagram</th><th>Receita</th><th>Status</th></tr></thead>
            <tbody>{jogoInfluencers.map(inf => <tr key={inf.id}><td className="font-medium cursor-pointer hover:text-accent" onClick={() => navigate(`/influencers/${inf.id}`)}>{inf.nome}</td><td className="text-accent text-xs">{inf.insta}</td><td>R$ {inf.receita.toLocaleString()}</td><td><span className={inf.status === "Ativo" ? "badge-success" : "badge-warning"}>{inf.status}</span></td></tr>)}</tbody>
          </table>
        </div>
      )}

      {tab === "campanhas" && (
        <div className="glass-card overflow-x-auto">
          <table className="data-table"><thead><tr><th>Nome</th><th>Influencer</th><th>Período</th><th>Status</th><th>Resultado</th></tr></thead>
            <tbody>{jogoCampanhas.map(c => <tr key={c.id}><td className="font-medium cursor-pointer hover:text-accent" onClick={() => navigate(`/campanhas/${c.id}`)}>{c.nome}</td><td>{c.influencer}</td><td className="text-xs">{c.inicio} - {c.fim}</td><td><span className={c.status === "Ativa" ? "badge-success" : c.status === "Planejada" ? "badge-info" : "badge-neutral"}>{c.status}</span></td><td className="text-xs">{c.resultado}</td></tr>)}</tbody>
          </table>
        </div>
      )}

      {tab === "links" && (
        <div className="glass-card overflow-x-auto">
          <table className="data-table"><thead><tr><th>Nome</th><th>Plataforma</th><th>Influencer</th><th>Cliques</th><th>Status</th></tr></thead>
            <tbody>{jogoLinks.map(l => <tr key={l.id}><td className="font-medium">{l.nome}</td><td>{l.plat}</td><td>{l.influencer}</td><td>{l.cliques.toLocaleString()}</td><td><span className={l.status === "Ativo" ? "badge-success" : "badge-danger"}>{l.status}</span></td></tr>)}</tbody>
          </table>
        </div>
      )}

      {tab === "metricas" && (
        <div className="glass-card p-5">
          <h3 className="section-title mb-4">Cliques por Dia</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={clickData}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="dia" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} /><YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} /><Tooltip /><Line type="monotone" dataKey="cliques" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} /></LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {tab === "conteudo" && (
        <div className="glass-card overflow-x-auto">
          <table className="data-table"><thead><tr><th>Tema</th><th>Tipo</th><th>Influencer</th><th>Campanha</th><th>Status</th><th>Data</th></tr></thead>
            <tbody>{jogoConteudos.map(c => <tr key={c.id}><td className="font-medium">{c.tema}</td><td><span className="badge-neutral">{c.tipo}</span></td><td>{c.influencer}</td><td>{c.campanha}</td><td><span className={c.status === "Publicado" ? "badge-success" : c.status === "Agendado" ? "badge-info" : "badge-warning"}>{c.status}</span></td><td className="text-xs">{c.data}</td></tr>)}</tbody>
          </table>
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
