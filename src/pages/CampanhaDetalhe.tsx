import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Target, Layers, Users, FileText, Link2, BarChart3, MessageSquare } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import { useCampanhas, useInfluencers, useConteudo } from "@/hooks/useSupabaseQuery";

export default function CampanhaDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState("resumo");
  const [observacoes, setObservacoes] = useState("");

  const { data: campanhas, isLoading } = useCampanhas();
  const { data: influencers } = useInfluencers();
  const { data: conteudos } = useConteudo();

  const campanha = campanhas.find((c: any) => c.id === id);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  if (!campanha) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: "Campanhas", path: "/campanhas" }, { label: "Não encontrada" }]} />
        <button onClick={() => navigate("/campanhas")} className="btn-ghost"><ArrowLeft size={14} /> Voltar</button>
        <div className="glass-card p-12 text-center text-muted-foreground">
          <p className="text-lg font-medium">Campanha não encontrada</p>
          <p className="text-sm mt-2">O ID informado não corresponde a nenhum registro.</p>
        </div>
      </div>
    );
  }

  const campConteudos = conteudos.filter((c: any) => c.campanha?.toLowerCase().includes(campanha.nome?.toLowerCase() || "---"));

  const tabs = [
    { id: "resumo", label: "Resumo", icon: Target },
    { id: "estrutura", label: "Estrutura", icon: Layers },
    { id: "conteudo", label: "Conteúdo", icon: FileText },
    { id: "observacoes", label: "Observações", icon: MessageSquare },
  ];

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: "Campanhas", path: "/campanhas" }, { label: campanha.nome }]} />
      <button onClick={() => navigate("/campanhas")} className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1.5 transition-colors"><ArrowLeft size={15} /> Voltar para Campanhas</button>

      <div className="flex items-center gap-5">
        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center"><Target size={22} className="text-primary" /></div>
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-3">{campanha.nome}
            <span className={campanha.status === "Ativa" ? "badge-success" : campanha.status === "Planejada" ? "badge-info" : "badge-neutral"}>{campanha.status}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{campanha.objetivo || "—"} · {campanha.inicio || "—"} - {campanha.fim || "—"}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card p-5 border-l-2 border-l-primary"><span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Jogo</span><p className="text-lg font-semibold mt-1">{campanha.jogo || "—"}</p></div>
        <div className="glass-card p-5 border-l-2 border-l-info"><span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Plataforma</span><p className="text-lg font-semibold mt-1">{campanha.plataforma || "—"}</p></div>
        <div className="glass-card p-5 border-l-2 border-l-success"><span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Conteúdos</span><p className="text-lg font-semibold mt-1">{campConteudos.length}</p></div>
        <div className="glass-card p-5"><span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Resultado</span><p className="text-lg font-semibold mt-1">{campanha.resultado || "—"}</p></div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto invisible-scroll pb-1 border-b border-border">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 px-4 py-2.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {tab === "resumo" && (
        <div className="glass-card p-6 space-y-5">
          <h3 className="text-[15px] font-semibold">Informações</h3>
          <div className="grid grid-cols-2 gap-y-5 text-sm">
            <div><span className="text-xs text-muted-foreground uppercase tracking-wide">Objetivo</span><p className="font-medium mt-0.5">{campanha.objetivo || "—"}</p></div>
            <div><span className="text-xs text-muted-foreground uppercase tracking-wide">Jogo</span><p className="font-medium mt-0.5">{campanha.jogo || "—"}</p></div>
            <div><span className="text-xs text-muted-foreground uppercase tracking-wide">Plataforma</span><p className="font-medium mt-0.5">{campanha.plataforma || "—"}</p></div>
            <div><span className="text-xs text-muted-foreground uppercase tracking-wide">Influencer</span><p className="font-medium mt-0.5">{campanha.influencer || "—"}</p></div>
            <div><span className="text-xs text-muted-foreground uppercase tracking-wide">Período</span><p className="font-medium mt-0.5">{campanha.inicio || "—"} - {campanha.fim || "—"}</p></div>
            <div><span className="text-xs text-muted-foreground uppercase tracking-wide">Resultado</span><p className="font-semibold mt-0.5">{campanha.resultado || "—"}</p></div>
          </div>
        </div>
      )}

      {tab === "estrutura" && (
        <div className="glass-card p-6 space-y-5">
          <h3 className="text-[15px] font-semibold">Estrutura da Campanha</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-y-5 text-sm">
            <div><span className="text-xs text-muted-foreground uppercase tracking-wide">Plataforma</span><p className="font-medium mt-0.5">{campanha.plataforma || "—"}</p></div>
            <div><span className="text-xs text-muted-foreground uppercase tracking-wide">Jogo</span><p className="font-medium mt-0.5">{campanha.jogo || "—"}</p></div>
            <div><span className="text-xs text-muted-foreground uppercase tracking-wide">Influencer</span><p className="font-medium mt-0.5">{campanha.influencer || "—"}</p></div>
            <div><span className="text-xs text-muted-foreground uppercase tracking-wide">Status</span><p className="font-medium mt-0.5">{campanha.status || "—"}</p></div>
            <div><span className="text-xs text-muted-foreground uppercase tracking-wide">Criado em</span><p className="font-medium mt-0.5">{campanha.created_at ? new Date(campanha.created_at).toLocaleDateString("pt-BR") : "—"}</p></div>
          </div>
        </div>
      )}

      {tab === "conteudo" && (
        <div className="glass-card overflow-x-auto invisible-scroll rounded-lg">
          {campConteudos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">Nenhum conteúdo vinculado a esta campanha.</p>
          ) : (
            <table className="data-table"><thead><tr><th>Tema</th><th>Tipo</th><th>Influencer</th><th>Status</th><th>Data</th></tr></thead>
              <tbody>{campConteudos.map((c: any) => <tr key={c.id}><td className="font-medium">{c.tema}</td><td><span className="badge-neutral">{c.tipo || "—"}</span></td><td>{c.influencer || "—"}</td><td><span className={c.status === "Publicado" ? "badge-success" : c.status === "Agendado" ? "badge-info" : "badge-neutral"}>{c.status}</span></td><td className="text-sm text-muted-foreground">{c.data || "—"}</td></tr>)}</tbody>
            </table>
          )}
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
