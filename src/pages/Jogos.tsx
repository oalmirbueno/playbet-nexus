import { useState } from "react";
import { Plus, Edit, XCircle, CheckCircle, Eye, Search, Gamepad2, TrendingUp, TrendingDown, Minus, AlertTriangle, Copy, Link2, Globe, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { initialJogos, initialLinks, initialLandingPages, initialCampanhas, initialInfluencers } from "@/data/mockData";
import type { Jogo } from "@/types";
import { toast } from "@/hooks/use-toast";
import Breadcrumbs from "@/components/Breadcrumbs";
import ExportDropdown from "@/components/ExportDropdown";

const getTrend = (ctr: string) => {
  const v = parseFloat(ctr);
  if (v >= 12) return { label: "Trending", color: "text-success", icon: TrendingUp };
  if (v >= 8) return { label: "Estável", color: "text-accent", icon: Minus };
  if (v >= 5) return { label: "Em Queda", color: "text-warning", icon: TrendingDown };
  return { label: "Crítico", color: "text-destructive", icon: TrendingDown };
};

export default function Jogos() {
  const navigate = useNavigate();
  const [data, setData] = useState<Jogo[]>(initialJogos);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Jogo> | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [filterCat, setFilterCat] = useState("Todos");
  const [alertsOpen, setAlertsOpen] = useState(false);

  const links = initialLinks;
  const lps = initialLandingPages;
  const campanhas = initialCampanhas;
  const influencers = initialInfluencers;

  const getLinksCount = (j: Jogo) => links.filter(l => l.jogo === j.nome).length;
  const getLPsCount = (j: Jogo) => lps.filter(l => l.jogo === j.nome).length;
  const getCampanhasCount = (j: Jogo) => campanhas.filter(c => c.jogo === j.nome || c.jogo === "Vários").length;
  const getInfluencersCount = (j: Jogo) => links.filter(l => l.jogo === j.nome).map(l => l.influencer).filter((v, i, a) => a.indexOf(v) === i).length;

  const filtered = data.filter(j => {
    if (search && !j.nome.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus !== "Todos" && j.status !== filterStatus) return false;
    if (filterCat !== "Todos" && j.cat !== filterCat) return false;
    return true;
  });

  const totalReceita = data.reduce((s, j) => s + j.receita, 0);
  const totalCliques = data.reduce((s, j) => s + j.cliques, 0);

  // Alerts
  const semLP = data.filter(j => j.status === "Ativo" && (!j.lp || j.lp === "—"));
  const emQueda = data.filter(j => j.status === "Ativo" && parseFloat(j.ctr) < 5);
  const hasAlerts = semLP.length > 0 || emQueda.length > 0;

  const stats = [
    { label: "Total Jogos", value: String(data.length), icon: Gamepad2, variant: "border-l-primary" },
    { label: "Ativos", value: String(data.filter(j => j.status === "Ativo").length), icon: CheckCircle, variant: "border-l-success" },
    { label: "Receita Total", value: `R$ ${(totalReceita / 1000).toFixed(1)}K`, icon: DollarSign, variant: "border-l-accent" },
    { label: "Cliques Total", value: totalCliques.toLocaleString(), icon: Link2, variant: "border-l-info" },
    { label: "Cadastros Total", value: data.reduce((s, j) => s + j.cadastros, 0).toLocaleString(), icon: Globe, variant: "border-l-warning" },
    { label: "Trending", value: String(data.filter(j => parseFloat(j.ctr) >= 12).length), icon: TrendingUp, variant: "border-l-success" },
  ];

  const openCreate = () => {
    setEditing({ id: 0, nome: "", cat: "Slot", status: "Ativo", lp: "", plats: "", links: 0, cliques: 0, ctr: "0%", cadastros: 0, receita: 0 });
    setModalOpen(true);
  };
  const openEdit = (j: Jogo) => { setEditing({ ...j }); setModalOpen(true); };

  const handleSave = () => {
    if (!editing?.nome) { toast({ title: "Erro", description: "Nome é obrigatório.", variant: "destructive" }); return; }
    if (editing.id && editing.id > 0) {
      setData(prev => prev.map(j => j.id === editing.id ? { ...j, ...editing } as Jogo : j));
      toast({ title: "Jogo atualizado", description: `${editing.nome} salvo.` });
    } else {
      const newId = Math.max(...data.map(j => j.id), 0) + 1;
      setData(prev => [...prev, { ...editing, id: newId } as Jogo]);
      toast({ title: "Jogo criado", description: `${editing.nome} adicionado.` });
    }
    setModalOpen(false);
  };

  const toggleStatus = (j: Jogo) => {
    setData(prev => prev.map(item => item.id === j.id ? { ...item, status: item.status === "Ativo" ? "Inativo" as const : "Ativo" as const } : item));
    toast({ title: j.status === "Ativo" ? "Jogo desativado" : "Jogo ativado" });
  };

  const duplicar = (j: Jogo) => {
    const newId = Math.max(...data.map(x => x.id), 0) + 1;
    setData(prev => [...prev, { ...j, id: newId, nome: `${j.nome} (cópia)` }]);
    toast({ title: "Jogo duplicado" });
  };

  const exportableData = data.map(j => ({ ...j, trend: getTrend(j.ctr).label, lps_vinculadas: getLPsCount(j), campanhas_vinculadas: getCampanhasCount(j), influencers_vinculados: getInfluencersCount(j) }));

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: "Gestão de Ativos", path: "/jogos" }, { label: "Jogos" }]} />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Jogos</h1>
          <p className="text-sm text-muted-foreground mt-1">Centro de gestão de jogos, performance e distribuição estratégica</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <ExportDropdown data={exportableData} filename="jogos-playbet" />
          <button className="btn-primary" onClick={openCreate}><Plus size={14} /> Adicionar Jogo</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map(s => (
          <div key={s.label} className={`glass-card p-5 border-l-2 ${s.variant}`}>
            <div className="flex items-center justify-between mb-2"><span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{s.label}</span><s.icon size={14} className="text-muted-foreground" /></div>
            <div className="text-lg font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {hasAlerts && (
        <div className="glass-card p-4 border-warning/30 space-y-2 cursor-pointer" onClick={() => setAlertsOpen(!alertsOpen)}>
          <p className="text-xs font-medium text-warning flex items-center gap-1"><AlertTriangle size={13} /> Alertas Operacionais ({semLP.length + emQueda.length})</p>
          {alertsOpen && (
            <div className="space-y-1 mt-2">
              {semLP.map(j => <p key={j.id} className="text-xs text-muted-foreground cursor-pointer hover:text-accent" onClick={e => { e.stopPropagation(); navigate(`/jogos/${j.id}`); }}>⚠ {j.nome} sem LP principal vinculada</p>)}
              {emQueda.map(j => <p key={j.id} className="text-xs text-muted-foreground cursor-pointer hover:text-accent" onClick={e => { e.stopPropagation(); navigate(`/jogos/${j.id}`); }}>⚠ {j.nome} com CTR em queda ({j.ctr})</p>)}
            </div>
          )}
        </div>
      )}

      {/* Quick Nav */}
      <div className="flex flex-wrap gap-2">
        <button className="btn-ghost text-xs" onClick={() => navigate("/plataformas")}>→ Plataformas</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/landing-pages")}>→ Landing Pages</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/links")}>→ Links Afiliados</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/campanhas")}>→ Campanhas</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/analytics")}>→ Analytics</button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 bg-secondary/50 border border-border rounded-lg px-3 py-1.5 flex-1 max-w-xs">
          <Search size={13} className="text-muted-foreground shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar jogo..." className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none w-full" />
        </div>
        <select className="select-field" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option>Todos</option><option>Ativo</option><option>Inativo</option>
        </select>
        <select className="select-field" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option>Todos</option><option>Slot</option><option>Crash</option><option>Casual</option><option>Card</option><option>Live</option>
        </select>
      </div>

      {/* Table */}
      <div className="glass-card overflow-x-auto invisible-scroll">
        <table className="data-table">
          <thead><tr><th>Jogo</th><th>Categoria</th><th>Tendência</th><th>Plataformas</th><th>LP Principal</th><th>LPs</th><th>Influencers</th><th>Campanhas</th><th>Cliques</th><th>CTR</th><th>Cadastros</th><th>Receita</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>
            {filtered.map(j => {
              const trend = getTrend(j.ctr);
              return (
                <tr key={j.id}>
                  <td>
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate(`/jogos/${j.id}`)}>
                      <div className="w-7 h-7 rounded bg-primary/20 flex items-center justify-center text-[10px] font-bold text-accent">{j.nome.charAt(0)}</div>
                      <span className="font-medium hover:text-accent transition-colors">{j.nome}</span>
                    </div>
                  </td>
                  <td><span className="badge-neutral">{j.cat}</span></td>
                  <td><span className={`flex items-center gap-1 text-xs font-medium ${trend.color}`}><trend.icon size={12} />{trend.label}</span></td>
                  <td className="text-xs max-w-[150px] truncate">{j.plats}</td>
                  <td className="text-xs">{j.lp || "—"}</td>
                  <td>{getLPsCount(j)}</td>
                  <td>{getInfluencersCount(j)}</td>
                  <td>{getCampanhasCount(j)}</td>
                  <td>{j.cliques.toLocaleString()}</td>
                  <td className="text-accent font-medium">{j.ctr}</td>
                  <td>{j.cadastros.toLocaleString()}</td>
                  <td className="font-medium">R$ {j.receita.toLocaleString()}</td>
                  <td><span className={j.status === "Ativo" ? "badge-success" : "badge-danger"}>{j.status}</span></td>
                  <td>
                    <div className="flex gap-0.5" onClick={e => e.stopPropagation()}>
                      <button onClick={() => navigate(`/jogos/${j.id}`)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Ver detalhe"><Eye size={12} /></button>
                      <button onClick={() => openEdit(j)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Editar"><Edit size={12} /></button>
                      <button onClick={() => duplicar(j)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Duplicar"><Copy size={12} /></button>
                      <button onClick={() => toggleStatus(j)} className={`p-1 rounded transition-colors text-muted-foreground ${j.status === "Ativo" ? "hover:bg-destructive/15 hover:text-destructive" : "hover:bg-success/15 hover:text-success"}`} title={j.status === "Ativo" ? "Desativar" : "Ativar"}>
                        {j.status === "Ativo" ? <XCircle size={12} /> : <CheckCircle size={12} />}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar Jogo" : "Adicionar Jogo"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><label className="text-xs font-medium text-muted-foreground">Nome *</label><input className="input-field mt-1" value={editing?.nome || ""} onChange={e => setEditing(p => ({ ...p, nome: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">Categoria</label>
                <select className="select-field mt-1 w-full" value={editing?.cat || "Slot"} onChange={e => setEditing(p => ({ ...p, cat: e.target.value }))}>
                  <option>Slot</option><option>Crash</option><option>Casual</option><option>Card</option><option>Live</option>
                </select>
              </div>
              <div><label className="text-xs font-medium text-muted-foreground">Status</label>
                <select className="select-field mt-1 w-full" value={editing?.status || "Ativo"} onChange={e => setEditing(p => ({ ...p, status: e.target.value as "Ativo"|"Inativo" }))}>
                  <option>Ativo</option><option>Inativo</option>
                </select>
              </div>
            </div>
            <div><label className="text-xs font-medium text-muted-foreground">LP Vinculada</label><input className="input-field mt-1" value={editing?.lp || ""} onChange={e => setEditing(p => ({ ...p, lp: e.target.value }))} /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Plataformas</label><input className="input-field mt-1" value={editing?.plats || ""} onChange={e => setEditing(p => ({ ...p, plats: e.target.value }))} placeholder="Bet365, Betano" /></div>
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
