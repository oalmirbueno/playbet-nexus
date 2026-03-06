import { useState } from "react";
import { Plus, Edit, Eye, Copy, Pause, Play, CheckCircle, Search, Target, TrendingUp, DollarSign, Users, AlertTriangle, Gamepad2, Link2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { initialCampanhas, initialLinks, initialLandingPages, initialInfluencers, initialConteudos } from "@/data/mockData";
import type { Campanha } from "@/types";
import { toast } from "@/hooks/use-toast";
import Breadcrumbs from "@/components/Breadcrumbs";
import ExportDropdown from "@/components/ExportDropdown";

const TIPOS_CAMPANHA = ["Lançamento de Jogo", "Evergreen", "Relâmpago", "Por Influencer", "Por Plataforma", "Sazonal", "VIP / Grupo"];

export default function Campanhas() {
  const navigate = useNavigate();
  const [data, setData] = useState<Campanha[]>(initialCampanhas);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Campanha & { tipo_campanha?: string; lp?: string; hub?: string; orcamento?: number; responsavel?: string }> | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [alertsOpen, setAlertsOpen] = useState(false);

  const links = initialLinks;
  const lps = initialLandingPages;
  const influencers = initialInfluencers;
  const conteudos = initialConteudos;

  const getCliques = (c: Campanha) => links.filter(l => l.campaign === c.nome.toLowerCase().replace(/ /g, "-") || l.jogo === c.jogo).reduce((s, l) => s + l.cliques, 0);
  const getConteudoCount = (c: Campanha) => conteudos.filter(ct => ct.campanha === c.nome || ct.campanha === "—").length;

  const filtered = data.filter(c => {
    if (search && !c.nome.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus !== "Todos" && c.status !== filterStatus) return false;
    return true;
  });

  // Alerts
  const semInfluencer = data.filter(c => c.status === "Ativa" && !c.influencer);
  const semConteudo = data.filter(c => c.status === "Ativa" && getConteudoCount(c) === 0);
  const hasAlerts = semInfluencer.length > 0 || semConteudo.length > 0;

  const stats = [
    { label: "Total Campanhas", value: String(data.length), icon: Target, variant: "border-l-primary" },
    { label: "Ativas", value: String(data.filter(c => c.status === "Ativa").length), icon: Play, variant: "border-l-success" },
    { label: "Planejadas", value: String(data.filter(c => c.status === "Planejada").length), icon: TrendingUp, variant: "border-l-info" },
    { label: "Finalizadas", value: String(data.filter(c => c.status === "Finalizada").length), icon: CheckCircle, variant: "border-l-warning" },
    { label: "Cliques Total", value: data.reduce((s, c) => s + getCliques(c), 0).toLocaleString(), icon: Link2, variant: "border-l-accent" },
    { label: "Influencers", value: String(new Set(data.map(c => c.influencer).filter(Boolean)).size), icon: Users, variant: "border-l-primary" },
  ];

  const openCreate = () => {
    setEditing({ id: 0, nome: "", objetivo: "", jogo: "", plat: "", influencer: "", inicio: "", fim: "", status: "Planejada", resultado: "—", tipo_campanha: "Evergreen", lp: "", hub: "", orcamento: 0, responsavel: "" });
    setModalOpen(true);
  };
  const openEdit = (c: Campanha) => { setEditing({ ...c }); setModalOpen(true); };

  const handleSave = () => {
    if (!editing?.nome) { toast({ title: "Erro", description: "Nome é obrigatório.", variant: "destructive" }); return; }
    if (editing.id && editing.id > 0) {
      setData(prev => prev.map(c => c.id === editing.id ? { ...c, ...editing } as Campanha : c));
      toast({ title: "Campanha atualizada" });
    } else {
      const newId = Math.max(...data.map(c => c.id), 0) + 1;
      setData(prev => [...prev, { ...editing, id: newId } as Campanha]);
      toast({ title: "Campanha criada" });
    }
    setModalOpen(false);
  };

  const setStatus = (c: Campanha, status: Campanha["status"]) => {
    setData(prev => prev.map(item => item.id === c.id ? { ...item, status } : item));
    toast({ title: `Campanha ${status === "Ativa" ? "ativada" : status === "Finalizada" ? "finalizada" : "pausada"}` });
  };

  const duplicar = (c: Campanha) => {
    const newId = Math.max(...data.map(x => x.id), 0) + 1;
    setData(prev => [...prev, { ...c, id: newId, nome: `${c.nome} (cópia)`, status: "Planejada" as const }]);
    toast({ title: "Campanha duplicada" });
  };

  const exportableData = data.map(c => ({ ...c, cliques: getCliques(c), conteudos: getConteudoCount(c) }));

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Marketing e Conteúdo", path: "/conteudo" }, { label: "Campanhas" }]} />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="page-header">Campanhas</h1><p className="page-subtitle">Centro de operação de campanhas de afiliados, performance e distribuição</p></div>
        <div className="flex gap-2 flex-wrap">
          <ExportDropdown data={exportableData} filename="campanhas-playbet" />
          <button className="btn-primary" onClick={openCreate}><Plus size={14} /> Criar Campanha</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map(s => (
          <div key={s.label} className={`stat-card border-l-2 ${s.variant}`}>
            <div className="flex items-center justify-between"><span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{s.label}</span><s.icon size={14} className="text-muted-foreground" /></div>
            <div className="text-sm font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {hasAlerts && (
        <div className="glass-card p-4 border-warning/30 space-y-2 cursor-pointer" onClick={() => setAlertsOpen(!alertsOpen)}>
          <p className="text-xs font-medium text-warning flex items-center gap-1"><AlertTriangle size={13} /> Alertas Operacionais ({semInfluencer.length + semConteudo.length})</p>
          {alertsOpen && (
            <div className="space-y-1 mt-2">
              {semInfluencer.map(c => <p key={c.id} className="text-xs text-muted-foreground cursor-pointer hover:text-accent" onClick={e => { e.stopPropagation(); openEdit(c); }}>⚠ {c.nome} sem influencer vinculado</p>)}
              {semConteudo.map(c => <p key={c.id} className="text-xs text-muted-foreground cursor-pointer hover:text-accent" onClick={e => { e.stopPropagation(); navigate(`/campanhas/${c.id}`); }}>⚠ {c.nome} ativa sem conteúdo vinculado</p>)}
            </div>
          )}
        </div>
      )}

      {/* Quick Nav */}
      <div className="flex flex-wrap gap-2">
        <button className="btn-ghost text-xs" onClick={() => navigate("/jogos")}>→ Jogos</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/plataformas")}>→ Plataformas</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/influencers")}>→ Influencers</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/landing-pages")}>→ Landing Pages</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/conteudo")}>→ Conteúdo</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/analytics")}>→ Analytics</button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 bg-secondary/50 border border-border rounded-lg px-3 py-1.5 flex-1 max-w-xs">
          <Search size={13} className="text-muted-foreground shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar campanha..." className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none w-full" />
        </div>
        <select className="select-field" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option>Todos</option><option>Ativa</option><option>Planejada</option><option>Finalizada</option>
        </select>
      </div>

      {/* Table */}
      <div className="glass-card overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>Nome</th><th>Objetivo</th><th>Jogo</th><th>Plataforma</th><th>Influencer</th><th>Período</th><th>Cliques</th><th>Status</th><th>Resultado</th><th>Ações</th></tr></thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id}>
                <td>
                  <div className="cursor-pointer" onClick={() => navigate(`/campanhas/${c.id}`)}>
                    <span className="font-medium hover:text-accent transition-colors">{c.nome}</span>
                  </div>
                </td>
                <td className="text-xs max-w-[180px] truncate">{c.objetivo}</td>
                <td className="text-xs cursor-pointer hover:text-accent" onClick={() => navigate("/jogos")}>{c.jogo}</td>
                <td className="text-xs cursor-pointer hover:text-accent" onClick={() => navigate("/plataformas")}>{c.plat}</td>
                <td className="text-xs cursor-pointer hover:text-accent" onClick={() => navigate("/influencers")}>{c.influencer}</td>
                <td className="text-xs whitespace-nowrap">{c.inicio} - {c.fim}</td>
                <td>{getCliques(c).toLocaleString()}</td>
                <td><span className={c.status === "Ativa" ? "badge-success" : c.status === "Planejada" ? "badge-info" : "badge-neutral"}>{c.status}</span></td>
                <td className="text-xs font-medium">{c.resultado}</td>
                <td>
                  <div className="flex gap-0.5" onClick={e => e.stopPropagation()}>
                    <button onClick={() => navigate(`/campanhas/${c.id}`)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Ver detalhe"><Eye size={12} /></button>
                    <button onClick={() => openEdit(c)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Editar"><Edit size={12} /></button>
                    <button onClick={() => duplicar(c)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Duplicar"><Copy size={12} /></button>
                    {c.status === "Planejada" && <button onClick={() => setStatus(c, "Ativa")} className="p-1 rounded hover:bg-success/15 text-muted-foreground hover:text-success transition-colors" title="Ativar"><Play size={12} /></button>}
                    {c.status === "Ativa" && (
                      <>
                        <button onClick={() => setStatus(c, "Planejada")} className="p-1 rounded hover:bg-warning/15 text-muted-foreground hover:text-warning transition-colors" title="Pausar"><Pause size={12} /></button>
                        <button onClick={() => setStatus(c, "Finalizada")} className="p-1 rounded hover:bg-primary/15 text-muted-foreground hover:text-primary transition-colors" title="Finalizar"><CheckCircle size={12} /></button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar Campanha" : "Criar Campanha"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><label className="text-xs font-medium text-muted-foreground">Nome *</label><input className="input-field mt-1" value={editing?.nome || ""} onChange={e => setEditing(p => ({ ...p, nome: e.target.value }))} /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Objetivo</label><input className="input-field mt-1" value={editing?.objetivo || ""} onChange={e => setEditing(p => ({ ...p, objetivo: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">Tipo de Campanha</label>
                <select className="select-field mt-1 w-full" value={(editing as any)?.tipo_campanha || "Evergreen"} onChange={e => setEditing(p => ({ ...p, tipo_campanha: e.target.value }))}>
                  {TIPOS_CAMPANHA.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div><label className="text-xs font-medium text-muted-foreground">Status</label>
                <select className="select-field mt-1 w-full" value={editing?.status || "Planejada"} onChange={e => setEditing(p => ({ ...p, status: e.target.value as Campanha["status"] }))}>
                  <option>Planejada</option><option>Ativa</option><option>Finalizada</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">Jogo</label><input className="input-field mt-1" value={editing?.jogo || ""} onChange={e => setEditing(p => ({ ...p, jogo: e.target.value }))} /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Plataforma</label><input className="input-field mt-1" value={editing?.plat || ""} onChange={e => setEditing(p => ({ ...p, plat: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">Influencer</label><input className="input-field mt-1" value={editing?.influencer || ""} onChange={e => setEditing(p => ({ ...p, influencer: e.target.value }))} /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Início</label><input className="input-field mt-1" value={editing?.inicio || ""} onChange={e => setEditing(p => ({ ...p, inicio: e.target.value }))} /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Fim</label><input className="input-field mt-1" value={editing?.fim || ""} onChange={e => setEditing(p => ({ ...p, fim: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">LP Vinculada</label><input className="input-field mt-1" value={(editing as any)?.lp || ""} onChange={e => setEditing(p => ({ ...p, lp: e.target.value }))} /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Responsável</label><input className="input-field mt-1" value={(editing as any)?.responsavel || ""} onChange={e => setEditing(p => ({ ...p, responsavel: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <button className="btn-ghost" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleSave}>Salvar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
