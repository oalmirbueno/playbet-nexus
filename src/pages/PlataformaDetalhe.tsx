import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Globe, DollarSign, Gamepad2, Link2, Users, TrendingUp, FileText, CreditCard, MessageSquare } from "lucide-react";
import { initialPlataformas, initialJogos, initialLinks, initialLandingPages, initialCampanhas, initialInfluencers } from "@/data/mockData";
import Breadcrumbs from "@/components/Breadcrumbs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function PlataformaDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const plat = initialPlataformas.find(p => p.id === Number(id));
  const [tab, setTab] = useState("resumo");
  const [observacoes, setObservacoes] = useState("Parceria ativa desde Jan/2025. Gestor: João (affiliate@plataforma.com).");

  if (!plat) return <div className="p-8 text-center text-muted-foreground">Plataforma não encontrada.</div>;

  const platJogos = initialJogos.filter(j => j.plats.includes(plat.nome));
  const platLinks = initialLinks.filter(l => l.plat === plat.nome);
  const platLPs = initialLandingPages.filter(l => l.plats.includes(plat.nome));
  const platCampanhas = initialCampanhas.filter(c => c.plat === plat.nome || c.plat === "Todas");
  const platInfluencers = initialInfluencers.filter(inf => platLinks.some(l => l.influencer.includes(inf.nome.split(" ")[0])));
  const receita = platJogos.reduce((s, j) => s + j.receita, 0);
  const cliquesTotal = platLinks.reduce((s, l) => s + l.cliques, 0);

  const tabs = [
    { id: "resumo", label: "Resumo", icon: Globe },
    { id: "financeiro", label: "Financeiro", icon: DollarSign },
    { id: "jogos", label: "Jogos", icon: Gamepad2 },
    { id: "lps", label: "Landing Pages", icon: FileText },
    { id: "campanhas", label: "Campanhas", icon: TrendingUp },
    { id: "influencers", label: "Influencers", icon: Users },
    { id: "links", label: "Links", icon: Link2 },
    { id: "regras", label: "Regras", icon: FileText },
    { id: "pagamentos", label: "Pagamentos", icon: CreditCard },
    { id: "observacoes", label: "Observações", icon: MessageSquare },
  ];

  const finData = [
    { mes: "Jan", receita: receita * 0.15 },
    { mes: "Fev", receita: receita * 0.25 },
    { mes: "Mar", receita: receita * 0.6 },
  ];

  const pagamentos = [
    { id: 1, data: "28/02/2026", valor: receita * 0.3, moeda: "BRL", status: "Pago", ref: "PAG-001" },
    { id: 2, data: "31/01/2026", valor: receita * 0.2, moeda: "BRL", status: "Pago", ref: "PAG-002" },
    { id: 3, data: "05/03/2026", valor: receita * 0.5, moeda: "BRL", status: "Pendente", ref: "PAG-003" },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Gestão de Ativos", path: "/plataformas" }, { label: "Plataformas", path: "/plataformas" }, { label: plat.nome }]} />
      <button onClick={() => navigate("/plataformas")} className="text-xs text-muted-foreground hover:text-accent flex items-center gap-1"><ArrowLeft size={14} /> Voltar para Plataformas</button>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center text-2xl font-bold text-accent">{plat.nome.charAt(0)}</div>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">{plat.nome} <span className={plat.status === "Ativo" ? "badge-success" : "badge-warning"}>{plat.status}</span></h1>
          <p className="text-xs text-muted-foreground">{plat.tipo} · {plat.moeda} · Pagamento {plat.pagamento}</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="stat-card border-l-2 border-l-accent"><span className="text-[10px] text-muted-foreground uppercase">Receita Total</span><p className="text-sm font-bold">R$ {receita.toLocaleString()}</p></div>
        <div className="stat-card border-l-2 border-l-success"><span className="text-[10px] text-muted-foreground uppercase">Cliques Total</span><p className="text-sm font-bold">{cliquesTotal.toLocaleString()}</p></div>
        <div className="stat-card border-l-2 border-l-primary"><span className="text-[10px] text-muted-foreground uppercase">Jogos</span><p className="text-sm font-bold">{platJogos.length}</p></div>
        <div className="stat-card border-l-2 border-l-info"><span className="text-[10px] text-muted-foreground uppercase">LPs</span><p className="text-sm font-bold">{platLPs.length}</p></div>
        <div className="stat-card border-l-2 border-l-warning"><span className="text-[10px] text-muted-foreground uppercase">Campanhas</span><p className="text-sm font-bold">{platCampanhas.length}</p></div>
        <div className="stat-card border-l-2 border-l-success"><span className="text-[10px] text-muted-foreground uppercase">Influencers</span><p className="text-sm font-bold">{platInfluencers.length}</p></div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}>
            <t.icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "resumo" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="glass-card p-5 space-y-3">
            <h3 className="section-title">Informações</h3>
            <div className="grid grid-cols-2 gap-y-3 text-xs">
              <div><span className="text-muted-foreground">Modelo</span><p className="font-medium">{plat.tipo}</p></div>
              <div><span className="text-muted-foreground">RevShare</span><p className="font-medium">{plat.revshare || "—"}</p></div>
              <div><span className="text-muted-foreground">CPA</span><p className="font-medium">{plat.cpa}</p></div>
              <div><span className="text-muted-foreground">Moeda</span><p className="font-medium">{plat.moeda}</p></div>
              <div><span className="text-muted-foreground">Pagamento</span><p className="font-medium">{plat.pagamento}</p></div>
              <div><span className="text-muted-foreground">Status</span><p className="font-medium">{plat.status}</p></div>
            </div>
          </div>
          <div className="glass-card p-5 space-y-3">
            <h3 className="section-title">Performance</h3>
            <div className="grid grid-cols-2 gap-y-3 text-xs">
              <div><span className="text-muted-foreground">Receita</span><p className="font-bold text-accent">R$ {receita.toLocaleString()}</p></div>
              <div><span className="text-muted-foreground">Cliques</span><p className="font-bold">{cliquesTotal.toLocaleString()}</p></div>
              <div><span className="text-muted-foreground">Jogos Ativos</span><p className="font-bold">{platJogos.filter(j => j.status === "Ativo").length}</p></div>
              <div><span className="text-muted-foreground">Ticket Médio</span><p className="font-bold">R$ {platJogos.length ? Math.round(receita / platJogos.length).toLocaleString() : 0}</p></div>
            </div>
          </div>
        </div>
      )}

      {tab === "financeiro" && (
        <div className="space-y-4">
          <div className="glass-card p-5">
            <h3 className="section-title mb-4">Receita por Período</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={finData}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="mes" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} /><YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} /><Tooltip /><Bar dataKey="receita" fill="hsl(var(--primary))" radius={[4,4,0,0]} /></BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="glass-card p-5">
            <h3 className="section-title mb-3">Performance por Jogo</h3>
            <table className="data-table"><thead><tr><th>Jogo</th><th>Receita</th><th>CTR</th><th>Cadastros</th></tr></thead>
              <tbody>{platJogos.map(j => <tr key={j.id}><td className="font-medium cursor-pointer hover:text-accent" onClick={() => navigate(`/jogos/${j.id}`)}>{j.nome}</td><td>R$ {j.receita.toLocaleString()}</td><td className="text-accent">{j.ctr}</td><td>{j.cadastros}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "jogos" && (
        <div className="glass-card overflow-x-auto">
          <table className="data-table"><thead><tr><th>Jogo</th><th>Categoria</th><th>CTR</th><th>Receita</th><th>Cadastros</th><th>Status</th></tr></thead>
            <tbody>{platJogos.map(j => <tr key={j.id}><td className="font-medium cursor-pointer hover:text-accent" onClick={() => navigate(`/jogos/${j.id}`)}>{j.nome}</td><td><span className="badge-neutral">{j.cat}</span></td><td className="text-accent">{j.ctr}</td><td>R$ {j.receita.toLocaleString()}</td><td>{j.cadastros}</td><td><span className={j.status === "Ativo" ? "badge-success" : "badge-danger"}>{j.status}</span></td></tr>)}</tbody>
          </table>
        </div>
      )}

      {tab === "lps" && (
        <div className="glass-card overflow-x-auto">
          <table className="data-table"><thead><tr><th>Nome</th><th>Rota</th><th>Tipo</th><th>Jogo</th><th>Cliques</th><th>CTR</th><th>Status</th></tr></thead>
            <tbody>{platLPs.map(l => <tr key={l.id}><td className="font-medium">{l.nome}</td><td className="font-mono text-xs text-accent">{l.rota}</td><td><span className="badge-neutral">{l.tipo}</span></td><td>{l.jogo}</td><td>{l.cliques.toLocaleString()}</td><td className="text-accent">{l.ctr}</td><td><span className={l.status === "Ativo" ? "badge-success" : "badge-warning"}>{l.status}</span></td></tr>)}</tbody>
          </table>
        </div>
      )}

      {tab === "campanhas" && (
        <div className="glass-card overflow-x-auto">
          <table className="data-table"><thead><tr><th>Nome</th><th>Jogo</th><th>Influencer</th><th>Período</th><th>Status</th><th>Resultado</th></tr></thead>
            <tbody>{platCampanhas.map(c => <tr key={c.id}><td className="font-medium cursor-pointer hover:text-accent" onClick={() => navigate(`/campanhas/${c.id}`)}>{c.nome}</td><td>{c.jogo}</td><td>{c.influencer}</td><td className="text-xs">{c.inicio} - {c.fim}</td><td><span className={c.status === "Ativa" ? "badge-success" : c.status === "Planejada" ? "badge-info" : "badge-neutral"}>{c.status}</span></td><td className="text-xs">{c.resultado}</td></tr>)}</tbody>
          </table>
        </div>
      )}

      {tab === "influencers" && (
        <div className="glass-card overflow-x-auto">
          <table className="data-table"><thead><tr><th>Nome</th><th>Instagram</th><th>Tipo</th><th>Receita</th><th>Status</th></tr></thead>
            <tbody>{platInfluencers.map(inf => <tr key={inf.id}><td className="font-medium cursor-pointer hover:text-accent" onClick={() => navigate(`/influencers/${inf.id}`)}>{inf.nome}</td><td className="text-accent text-xs">{inf.insta}</td><td><span className="badge-primary">{inf.tipo}</span></td><td>R$ {inf.receita.toLocaleString()}</td><td><span className={inf.status === "Ativo" ? "badge-success" : "badge-warning"}>{inf.status}</span></td></tr>)}</tbody>
          </table>
        </div>
      )}

      {tab === "links" && (
        <div className="glass-card overflow-x-auto">
          <table className="data-table"><thead><tr><th>Nome</th><th>Jogo</th><th>Influencer</th><th>Cliques</th><th>Status</th></tr></thead>
            <tbody>{platLinks.map(l => <tr key={l.id}><td className="font-medium">{l.nome}</td><td>{l.jogo}</td><td>{l.influencer}</td><td>{l.cliques.toLocaleString()}</td><td><span className={l.status === "Ativo" ? "badge-success" : "badge-danger"}>{l.status}</span></td></tr>)}</tbody>
          </table>
        </div>
      )}

      {tab === "regras" && (
        <div className="glass-card p-5 space-y-3">
          <h3 className="section-title">Regras da Parceria</h3>
          <div className="space-y-2 text-xs text-muted-foreground">
            <p>• Modelo: {plat.tipo}</p>
            <p>• RevShare: {plat.revshare || "N/A"}</p>
            <p>• CPA: {plat.cpa}</p>
            <p>• Pagamento: {plat.pagamento}</p>
            <p>• Moeda: {plat.moeda}</p>
            <p>• Restrições: Tráfego incentivado não permitido. Sem campanhas de e-mail sem aprovação.</p>
            <p>• Compliance: Todos os criativos devem ser aprovados antes da veiculação.</p>
          </div>
        </div>
      )}

      {tab === "pagamentos" && (
        <div className="glass-card overflow-x-auto">
          <table className="data-table"><thead><tr><th>Data</th><th>Valor</th><th>Moeda</th><th>Referência</th><th>Status</th></tr></thead>
            <tbody>{pagamentos.map(pg => <tr key={pg.id}><td className="text-xs">{pg.data}</td><td className="font-medium">R$ {pg.valor.toLocaleString()}</td><td>{pg.moeda}</td><td className="font-mono text-xs">{pg.ref}</td><td><span className={pg.status === "Pago" ? "badge-success" : "badge-warning"}>{pg.status}</span></td></tr>)}</tbody>
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
