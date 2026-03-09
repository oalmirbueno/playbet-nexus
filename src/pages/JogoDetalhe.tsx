import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Gamepad2, Globe, Users, TrendingUp, FileText, BarChart3, MessageSquare } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import { useGames, usePlatforms, useCampanhas, useInfluencers, useConteudo } from "@/hooks/useSupabaseQuery";

export default function JogoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState("resumo");
  const [observacoes, setObservacoes] = useState("");

  const { data: games, isLoading, update } = useGames();
  const { data: platforms } = usePlatforms();
  const { data: campanhas } = useCampanhas();
  const { data: influencers } = useInfluencers();
  const { data: conteudos } = useConteudo();

  const jogo = games.find((g: any) => g.id === id);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  if (!jogo) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: "Jogos", path: "/jogos" }, { label: "Não encontrado" }]} />
        <button onClick={() => navigate("/jogos")} className="btn-ghost"><ArrowLeft size={14} /> Voltar</button>
        <div className="glass-card p-12 text-center text-muted-foreground">
          <p className="text-lg font-medium">Jogo não encontrado</p>
          <p className="text-sm mt-2">O ID informado não corresponde a nenhum registro.</p>
        </div>
      </div>
    );
  }

  const jogoCampanhas = campanhas.filter((c: any) => c.jogo?.toLowerCase().includes(jogo.name?.toLowerCase() || "---"));
  const jogoConteudos = conteudos.filter((c: any) => c.jogo?.toLowerCase().includes(jogo.name?.toLowerCase() || "---"));

  const tabs = [
    { id: "resumo", label: "Resumo", icon: Gamepad2 },
    { id: "campanhas", label: "Campanhas", icon: TrendingUp },
    { id: "conteudo", label: "Conteúdo", icon: FileText },
    { id: "observacoes", label: "Observações", icon: MessageSquare },
  ];

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: "Jogos", path: "/jogos" }, { label: jogo.name }]} />
      <button onClick={() => navigate("/jogos")} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"><ArrowLeft size={14} /> Voltar para Jogos</button>

      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center text-2xl font-bold text-foreground">{jogo.name?.charAt(0)}</div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">{jogo.name}
            <span className="badge-neutral">{jogo.category || "Sem categoria"}</span>
            <span className={jogo.is_active ? "badge-success" : "badge-neutral"}>{jogo.is_active ? "Ativo" : "Inativo"}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Trend: {jogo.trend_status || "—"}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5 border-l-2 border-l-accent"><span className="text-xs text-muted-foreground uppercase tracking-wider">Campanhas</span><p className="text-lg font-bold mt-1">{jogoCampanhas.length}</p></div>
        <div className="glass-card p-5 border-l-2 border-l-info"><span className="text-xs text-muted-foreground uppercase tracking-wider">Conteúdos</span><p className="text-lg font-bold mt-1">{jogoConteudos.length}</p></div>
        <div className="glass-card p-5 border-l-2 border-l-success"><span className="text-xs text-muted-foreground uppercase tracking-wider">Trend</span><p className="text-lg font-bold mt-1">{jogo.trend_status || "—"}</p></div>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}>
            <t.icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      {tab === "resumo" && (
        <div className="glass-card p-5 space-y-3">
          <h3 className="section-title">Informações</h3>
          <div className="grid grid-cols-2 gap-y-3 text-xs">
            <div><span className="text-muted-foreground">Categoria</span><p className="font-medium">{jogo.category || "—"}</p></div>
            <div><span className="text-muted-foreground">Trend Status</span><p className="font-medium">{jogo.trend_status || "—"}</p></div>
            <div><span className="text-muted-foreground">Criado em</span><p className="font-medium">{jogo.created_at ? new Date(jogo.created_at).toLocaleDateString("pt-BR") : "—"}</p></div>
            <div><span className="text-muted-foreground">Atualizado em</span><p className="font-medium">{jogo.updated_at ? new Date(jogo.updated_at).toLocaleDateString("pt-BR") : "—"}</p></div>
          </div>
        </div>
      )}

      {tab === "campanhas" && (
        <div className="glass-card overflow-x-auto invisible-scroll">
          {jogoCampanhas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">Nenhuma campanha vinculada a este jogo.</p>
          ) : (
            <table className="data-table"><thead><tr><th>Nome</th><th>Influencer</th><th>Período</th><th>Status</th></tr></thead>
              <tbody>{jogoCampanhas.map((c: any) => <tr key={c.id} className="cursor-pointer hover:bg-secondary/30" onClick={() => navigate(`/campanhas/${c.id}`)}><td className="font-medium">{c.nome}</td><td>{c.influencer || "—"}</td><td className="text-xs">{c.inicio || "—"} - {c.fim || "—"}</td><td><span className={c.status === "Ativa" ? "badge-success" : c.status === "Planejada" ? "badge-info" : "badge-neutral"}>{c.status}</span></td></tr>)}</tbody>
            </table>
          )}
        </div>
      )}

      {tab === "conteudo" && (
        <div className="glass-card overflow-x-auto invisible-scroll">
          {jogoConteudos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">Nenhum conteúdo vinculado a este jogo.</p>
          ) : (
            <table className="data-table"><thead><tr><th>Tema</th><th>Tipo</th><th>Influencer</th><th>Status</th><th>Data</th></tr></thead>
              <tbody>{jogoConteudos.map((c: any) => <tr key={c.id}><td className="font-medium">{c.tema}</td><td><span className="badge-neutral">{c.tipo || "—"}</span></td><td>{c.influencer || "—"}</td><td><span className={c.status === "Publicado" ? "badge-success" : c.status === "Agendado" ? "badge-info" : "badge-warning"}>{c.status}</span></td><td className="text-xs">{c.data || "—"}</td></tr>)}</tbody>
            </table>
          )}
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
