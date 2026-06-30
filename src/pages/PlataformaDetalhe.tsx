import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Globe, DollarSign, Gamepad2, Users, TrendingUp, FileText, CreditCard, MessageSquare } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import { usePlatforms, useGames, useCampanhas, useInfluencers } from "@/hooks/useSupabaseQuery";

export default function PlataformaDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState("resumo");
  const [observacoes, setObservacoes] = useState("");

  const { data: platforms, isLoading } = usePlatforms();
  const { data: games } = useGames();
  const { data: campanhas } = useCampanhas();
  const { data: influencers } = useInfluencers();

  const plat = platforms.find((p: any) => p.id === id);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  if (!plat) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: "Plataformas", path: "/plataformas" }, { label: "Não encontrada" }]} />
        <button onClick={() => navigate("/plataformas")} className="btn-ghost"><ArrowLeft size={14} /> Voltar</button>
        <div className="glass-card p-12 text-center text-muted-foreground">
          <p className="text-lg font-medium">Plataforma não encontrada</p>
          <p className="text-sm mt-2">O ID informado não corresponde a nenhum registro.</p>
        </div>
      </div>
    );
  }

  const platCampanhas = campanhas.filter((c: any) => c.plataforma?.toLowerCase().includes(plat.name?.toLowerCase() || "---"));

  const tabs = [
    { id: "resumo", label: "Resumo", icon: Globe },
    { id: "campanhas", label: "Campanhas", icon: TrendingUp },
    { id: "regras", label: "Regras", icon: FileText },
    { id: "observacoes", label: "Observações", icon: MessageSquare },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Plataformas", path: "/plataformas" }, { label: plat.name }]} />
      <button onClick={() => navigate("/plataformas")} className="text-xs text-muted-foreground hover:text-accent flex items-center gap-1"><ArrowLeft size={14} /> Voltar para Plataformas</button>

      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center text-2xl font-bold text-accent">{plat.name?.charAt(0)}</div>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">{plat.name} <span className={plat.is_active ? "badge-success" : "badge-warning"}>{plat.is_active ? "Ativa" : "Inativa"}</span></h1>
          <p className="text-xs text-muted-foreground">{plat.commission_type || "-"} · {plat.currency || "BRL"} · {plat.payout_method || "-"}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="stat-card border-l-2 border-l-accent"><span className="text-[10px] text-muted-foreground uppercase">RevShare</span><p className="text-sm font-bold">{plat.revshare ? `${plat.revshare}%` : "-"}</p></div>
        <div className="stat-card border-l-2 border-l-success"><span className="text-[10px] text-muted-foreground uppercase">CPA</span><p className="text-sm font-bold">{plat.cpa ? `R$ ${Number(plat.cpa).toLocaleString()}` : "-"}</p></div>
        <div className="stat-card border-l-2 border-l-info"><span className="text-[10px] text-muted-foreground uppercase">Campanhas</span><p className="text-sm font-bold">{platCampanhas.length}</p></div>
        <div className="stat-card border-l-2 border-l-primary"><span className="text-[10px] text-muted-foreground uppercase">Gestor</span><p className="text-sm font-bold">{plat.affiliate_manager || "-"}</p></div>
      </div>

      <div className="flex gap-1 overflow-x-auto invisible-scroll pb-1">
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
            <div><span className="text-muted-foreground">Modelo</span><p className="font-medium">{plat.commission_type || "-"}</p></div>
            <div><span className="text-muted-foreground">RevShare</span><p className="font-medium">{plat.revshare ? `${plat.revshare}%` : "-"}</p></div>
            <div><span className="text-muted-foreground">CPA</span><p className="font-medium">{plat.cpa ? `R$ ${Number(plat.cpa).toLocaleString()}` : "-"}</p></div>
            <div><span className="text-muted-foreground">Moeda</span><p className="font-medium">{plat.currency || "BRL"}</p></div>
            <div><span className="text-muted-foreground">Pagamento</span><p className="font-medium">{plat.payout_method || "-"}</p></div>
            <div><span className="text-muted-foreground">Híbrido</span><p className="font-medium">{plat.hybrid ? "Sim" : "Não"}</p></div>
            <div><span className="text-muted-foreground">Gestor</span><p className="font-medium">{plat.affiliate_manager || "-"}</p></div>
            <div><span className="text-muted-foreground">Notas</span><p className="font-medium">{plat.notes || "-"}</p></div>
          </div>
        </div>
      )}

      {tab === "campanhas" && (
        <div className="glass-card overflow-x-auto invisible-scroll">
          {platCampanhas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">Nenhuma campanha vinculada.</p>
          ) : (
            <table className="data-table"><thead><tr><th>Nome</th><th>Jogo</th><th>Influencer</th><th>Status</th></tr></thead>
              <tbody>{platCampanhas.map((c: any) => <tr key={c.id} className="cursor-pointer hover:bg-secondary/30" onClick={() => navigate(`/campanhas/${c.id}`)}><td className="font-medium">{c.nome}</td><td>{c.jogo || "-"}</td><td>{c.influencer || "-"}</td><td><span className={c.status === "Ativa" ? "badge-success" : c.status === "Planejada" ? "badge-info" : "badge-neutral"}>{c.status}</span></td></tr>)}</tbody>
            </table>
          )}
        </div>
      )}

      {tab === "regras" && (
        <div className="glass-card p-5 space-y-3">
          <h3 className="section-title">Regras da Parceria</h3>
          <div className="space-y-2 text-xs text-muted-foreground">
            <p>• Modelo: {plat.commission_type || "N/A"}</p>
            <p>• RevShare: {plat.revshare ? `${plat.revshare}%` : "N/A"}</p>
            <p>• CPA: {plat.cpa ? `R$ ${Number(plat.cpa).toLocaleString()}` : "N/A"}</p>
            <p>• Pagamento: {plat.payout_method || "N/A"}</p>
            <p>• Moeda: {plat.currency || "BRL"}</p>
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
