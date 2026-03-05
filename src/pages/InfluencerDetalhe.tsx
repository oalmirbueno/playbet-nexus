import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, DollarSign, Link2, Megaphone, Wallet, PenTool, MessageSquare } from "lucide-react";

const influencer = {
  nome: "Rafael Mendes", insta: "@rafa.bet", seg: "410K", tipo: "Premium", perc: 20,
  jogos: ["Fortune Tiger", "Aviator", "Gates of Olympus", "Mines", "Spaceman"],
  plataformas: ["Bet365", "Betano", "Pixbet"],
  receita: 42100, saldo: 8500, totalPago: 33600,
};

const links = [
  { jogo: "Fortune Tiger", plataforma: "Bet365", link: "https://bet365.com/ft?ref=rafa", cliques: 4500, status: "Ativo" },
  { jogo: "Aviator", plataforma: "Pixbet", link: "https://pixbet.com/av?ref=rafa", cliques: 3200, status: "Ativo" },
  { jogo: "Mines", plataforma: "Betano", link: "https://betano.com/mn?ref=rafa", cliques: 2100, status: "Ativo" },
];

const ganhos = [
  { periodo: "Mar/2026", receita: 14500, comissao: 2900, status: "Parcial" },
  { periodo: "Fev/2026", receita: 16200, comissao: 3240, status: "Pago" },
  { periodo: "Jan/2026", receita: 11400, comissao: 2280, status: "Pago" },
];

const saquesHist = [
  { id: "SAQ-001", valor: 8500, data: "05/03/2026", status: "Pendente" },
  { id: "SAQ-012", valor: 6200, data: "01/03/2026", status: "Aprovado" },
  { id: "SAQ-025", valor: 5400, data: "15/02/2026", status: "Aprovado" },
];

const conteudos = [
  { data: "06/03", tipo: "Reels", tema: "Fortune Tiger estratégia", status: "Agendado", campanha: "Março Turbo" },
  { data: "08/03", tipo: "Story", tema: "Bônus Bet365", status: "Roteiro", campanha: "Março Turbo" },
  { data: "10/03", tipo: "Post Telegram", tema: "Link exclusivo Aviator", status: "Ideia", campanha: "—" },
];

const tabs = [
  { key: "resumo", label: "Resumo", icon: DollarSign },
  { key: "links", label: "Links", icon: Link2 },
  { key: "campanhas", label: "Campanhas", icon: Megaphone },
  { key: "ganhos", label: "Ganhos", icon: DollarSign },
  { key: "saques", label: "Saques", icon: Wallet },
  { key: "conteudos", label: "Conteúdos", icon: PenTool },
  { key: "obs", label: "Observações", icon: MessageSquare },
];

export default function InfluencerDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState("resumo");

  return (
    <div className="space-y-6">
      <button onClick={() => navigate("/influencers")} className="btn-ghost"><ArrowLeft size={14} /> Voltar para Influencers</button>

      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-xl font-bold text-accent">R</div>
        <div>
          <h1 className="page-header">{influencer.nome}</h1>
          <p className="text-sm text-accent">{influencer.insta} · {influencer.seg} seguidores · <span className="badge-accent">{influencer.tipo}</span></p>
        </div>
      </div>

      <div className="flex gap-1 bg-secondary/50 p-1 rounded-xl overflow-x-auto">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`${tab === t.key ? "tab-btn-active" : "tab-btn"} whitespace-nowrap flex items-center gap-1.5`}>
            <t.icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      {tab === "resumo" && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="stat-card border-l-2 border-l-accent"><span className="text-[10px] text-muted-foreground uppercase">Receita Gerada</span><p className="text-xl font-bold">R$ {influencer.receita.toLocaleString()}</p></div>
            <div className="stat-card border-l-2 border-l-success"><span className="text-[10px] text-muted-foreground uppercase">Saldo Disponível</span><p className="text-xl font-bold text-success">R$ {influencer.saldo.toLocaleString()}</p></div>
            <div className="stat-card border-l-2 border-l-primary"><span className="text-[10px] text-muted-foreground uppercase">Total Pago</span><p className="text-xl font-bold">R$ {influencer.totalPago.toLocaleString()}</p></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="glass-card p-5"><h3 className="section-title">Plataformas Vinculadas</h3><div className="flex flex-wrap gap-2">{influencer.plataformas.map((p) => <span key={p} className="badge-primary">{p}</span>)}</div></div>
            <div className="glass-card p-5"><h3 className="section-title">Jogos Mais Fortes</h3><div className="flex flex-wrap gap-2">{influencer.jogos.map((j) => <span key={j} className="badge-accent">{j}</span>)}</div></div>
          </div>
        </div>
      )}

      {tab === "links" && (
        <div className="glass-card overflow-x-auto animate-fade-in">
          <table className="data-table">
            <thead><tr><th>Jogo</th><th>Plataforma</th><th>Link</th><th>Cliques</th><th>Status</th></tr></thead>
            <tbody>{links.map((l, i) => (<tr key={i}><td>{l.jogo}</td><td>{l.plataforma}</td><td className="text-accent text-xs max-w-[200px] truncate">{l.link}</td><td>{l.cliques.toLocaleString()}</td><td><span className="badge-success">{l.status}</span></td></tr>))}</tbody>
          </table>
        </div>
      )}

      {tab === "ganhos" && (
        <div className="glass-card overflow-x-auto animate-fade-in">
          <table className="data-table">
            <thead><tr><th>Período</th><th>Receita</th><th>Comissão ({influencer.perc}%)</th><th>Status</th></tr></thead>
            <tbody>{ganhos.map((g, i) => (<tr key={i}><td>{g.periodo}</td><td>R$ {g.receita.toLocaleString()}</td><td className="text-success font-medium">R$ {g.comissao.toLocaleString()}</td><td><span className={g.status === "Pago" ? "badge-success" : "badge-warning"}>{g.status}</span></td></tr>))}</tbody>
          </table>
        </div>
      )}

      {tab === "saques" && (
        <div className="space-y-4 animate-fade-in">
          <div className="stat-card border-l-2 border-l-success w-fit"><span className="text-[10px] text-muted-foreground uppercase">Saldo Disponível para Saque</span><p className="text-xl font-bold text-success">R$ {influencer.saldo.toLocaleString()}</p></div>
          <div className="glass-card overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>ID</th><th>Valor</th><th>Data</th><th>Status</th></tr></thead>
              <tbody>{saquesHist.map((s, i) => (<tr key={i}><td className="font-mono text-xs">{s.id}</td><td className="font-semibold">R$ {s.valor.toLocaleString()}</td><td className="text-xs">{s.data}</td><td><span className={s.status === "Aprovado" ? "badge-success" : "badge-warning"}>{s.status}</span></td></tr>))}</tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "conteudos" && (
        <div className="glass-card overflow-x-auto animate-fade-in">
          <table className="data-table">
            <thead><tr><th>Data</th><th>Tipo</th><th>Tema</th><th>Campanha</th><th>Status</th></tr></thead>
            <tbody>{conteudos.map((c, i) => (<tr key={i}><td>{c.data}</td><td>{c.tipo}</td><td>{c.tema}</td><td>{c.campanha}</td><td><span className={c.status === "Agendado" ? "badge-info" : c.status === "Roteiro" ? "badge-warning" : "badge-neutral"}>{c.status}</span></td></tr>))}</tbody>
          </table>
        </div>
      )}

      {tab === "campanhas" && <div className="glass-card p-8 text-center text-muted-foreground animate-fade-in"><p>Nenhuma campanha vinculada diretamente. Veja a seção Campanhas.</p></div>}
      {tab === "obs" && <div className="glass-card p-5 animate-fade-in"><h3 className="section-title">Observações</h3><textarea className="input-field min-h-[120px]" placeholder="Adicionar observação sobre o influencer..." /></div>}
    </div>
  );
}
