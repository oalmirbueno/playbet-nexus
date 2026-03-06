import { useState } from "react";
import { Plus, Edit, Eye, XCircle, CheckCircle, Copy, Search, DollarSign, Globe, Gamepad2, Link2, Users, AlertTriangle, TrendingUp, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { initialPlataformas, initialJogos, initialLinks, initialLandingPages, initialCampanhas, initialInfluencers } from "@/data/mockData";
import type { Plataforma } from "@/types";
import { toast } from "@/hooks/use-toast";
import Breadcrumbs from "@/components/Breadcrumbs";
import ExportDropdown from "@/components/ExportDropdown";

export default function PlataformasPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<Plataforma[]>(initialPlataformas);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Plataforma> | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [filterTipo, setFilterTipo] = useState("Todos");
  const [alertsOpen, setAlertsOpen] = useState(false);

  const jogos = initialJogos;
  const links = initialLinks;
  const lps = initialLandingPages;
  const campanhas = initialCampanhas;
  const influencers = initialInfluencers;

  const getJogosCount = (p: Plataforma) => jogos.filter(j => j.plats.includes(p.nome)).length;
  const getLinksCount = (p: Plataforma) => links.filter(l => l.plat === p.nome).length;
  const getLPsCount = (p: Plataforma) => lps.filter(l => l.plats.includes(p.nome)).length;
  const getCampanhasCount = (p: Plataforma) => campanhas.filter(c => c.plat === p.nome || c.plat === "Todas").length;
  const getInfluencersCount = (p: Plataforma) => links.filter(l => l.plat === p.nome).map(l => l.influencer).filter((v, i, a) => a.indexOf(v) === i).length;
  const getReceita = (p: Plataforma) => jogos.filter(j => j.plats.includes(p.nome)).reduce((s, j) => s + j.receita, 0);
  const getConversao = (p: Plataforma) => {
    const pJogos = jogos.filter(j => j.plats.includes(p.nome));
    if (!pJogos.length) return "0%";
    const avg = pJogos.reduce((s, j) => s + parseFloat(j.ctr), 0) / pJogos.length;
    return avg.toFixed(1) + "%";
  };

  const filtered = data.filter(p => {
    if (search && !p.nome.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus !== "Todos" && p.status !== filterStatus) return false;
    if (filterTipo !== "Todos" && p.tipo !== filterTipo) return false;
    return true;
  });

  const totalReceita = data.reduce((s, p) => s + getReceita(p), 0);
  const ativas = data.filter(p => p.status === "Ativo").length;

  // Alerts
  const semJogos = data.filter(p => getJogosCount(p) === 0);
  const semPayout = data.filter(p => !p.pagamento);
  const pendentes = data.filter(p => p.status === "Pendente");
  const hasAlerts = semJogos.length > 0 || pendentes.length > 0;

  const stats = [
    { label: "Total Plataformas", value: String(data.length), icon: Globe, variant: "border-l-primary" },
    { label: "Ativas", value: String(ativas), icon: CheckCircle, variant: "border-l-success" },
    { label: "Pendentes", value: String(pendentes.length), icon: AlertTriangle, variant: "border-l-warning" },
    { label: "Receita Total", value: `R$ ${(totalReceita / 1000).toFixed(1)}K`, icon: DollarSign, variant: "border-l-accent" },
    { label: "Total Jogos", value: String(jogos.length), icon: Gamepad2, variant: "border-l-info" },
    { label: "Total Links", value: String(links.length), icon: Link2, variant: "border-l-primary" },
  ];

  const openCreate = () => {
    setEditing({ id: 0, nome: "", tipo: "Revenue Share", revshare: "", cpa: "—", moeda: "BRL", pagamento: "Mensal", status: "Pendente", links: 0, jogos: 0 });
    setModalOpen(true);
  };
  const openEdit = (p: Plataforma) => { setEditing({ ...p }); setModalOpen(true); };

  const handleSave = () => {
    if (!editing?.nome) { toast({ title: "Erro", description: "Nome é obrigatório.", variant: "destructive" }); return; }
    if (editing.id && editing.id > 0) {
      setData(prev => prev.map(p => p.id === editing.id ? { ...p, ...editing } as Plataforma : p));
      toast({ title: "Plataforma atualizada" });
    } else {
      const newId = Math.max(...data.map(p => p.id), 0) + 1;
      setData(prev => [...prev, { ...editing, id: newId } as Plataforma]);
      toast({ title: "Plataforma criada" });
    }
    setModalOpen(false);
  };

  const toggleStatus = (p: Plataforma) => {
    const newStatus = p.status === "Ativo" ? "Inativo" as const : "Ativo" as const;
    setData(prev => prev.map(item => item.id === p.id ? { ...item, status: newStatus } : item));
    toast({ title: newStatus === "Ativo" ? "Plataforma ativada" : "Plataforma desativada" });
  };

  const copyLink = (p: Plataforma) => {
    navigator.clipboard.writeText(`https://playbet.com/plat/${p.nome.toLowerCase()}`);
    toast({ title: "Link copiado!" });
  };

  const exportableData = data.map(p => ({
    ...p, jogos_vinculados: getJogosCount(p), links_vinculados: getLinksCount(p),
    lps_vinculadas: getLPsCount(p), receita_total: getReceita(p), conversao_media: getConversao(p),
  }));

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Gestão de Ativos", path: "/plataformas" }, { label: "Plataformas" }]} />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-header">Plataformas</h1>
          <p className="page-subtitle">Gestão de plataformas parceiras, modelos de comissão e performance operacional</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <ExportDropdown data={exportableData} filename="plataformas-playbet" />
          <button className="btn-primary" onClick={openCreate}><Plus size={14} /> Adicionar Plataforma</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map(s => (
          <div key={s.label} className={`stat-card border-l-2 ${s.variant}`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{s.label}</span>
              <s.icon size={14} className="text-muted-foreground" />
            </div>
            <div className="text-sm font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {hasAlerts && (
        <div className="glass-card p-4 border-warning/30 space-y-2 cursor-pointer" onClick={() => setAlertsOpen(!alertsOpen)}>
          <p className="text-xs font-medium text-warning flex items-center gap-1"><AlertTriangle size={13} /> Alertas Operacionais ({semJogos.length + pendentes.length})</p>
          {alertsOpen && (
            <div className="space-y-1 mt-2">
              {semJogos.map(p => (
                <p key={p.id} className="text-xs text-muted-foreground cursor-pointer hover:text-accent" onClick={e => { e.stopPropagation(); navigate(`/plataformas/${p.id}`); }}>
                  ⚠ {p.nome} sem jogos vinculados
                </p>
              ))}
              {pendentes.map(p => (
                <p key={p.id} className="text-xs text-muted-foreground cursor-pointer hover:text-accent" onClick={e => { e.stopPropagation(); openEdit(p); }}>
                  ⚠ {p.nome} com status pendente
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick Nav */}
      <div className="flex flex-wrap gap-2">
        <button className="btn-ghost text-xs" onClick={() => navigate("/jogos")}>→ Jogos</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/links")}>→ Links Afiliados</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/landing-pages")}>→ Landing Pages</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/campanhas")}>→ Campanhas</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/financeiro")}>→ Financeiro</button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 bg-secondary/50 border border-border rounded-lg px-3 py-1.5 flex-1 max-w-xs">
          <Search size={13} className="text-muted-foreground shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar plataforma..." className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none w-full" />
        </div>
        <select className="select-field" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option>Todos</option><option>Ativo</option><option>Pendente</option><option>Inativo</option>
        </select>
        <select className="select-field" value={filterTipo} onChange={e => setFilterTipo(e.target.value)}>
          <option>Todos</option><option>Revenue Share</option><option>CPA</option><option>CPA + RevShare</option><option>Hybrid</option>
        </select>
      </div>

      {/* Table */}
      <div className="glass-card overflow-x-auto invisible-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Plataforma</th><th>Tipo Comissão</th><th>RevShare</th><th>CPA</th><th>Moeda</th><th>Pagamento</th>
              <th>Jogos</th><th>LPs</th><th>Campanhas</th><th>Influencers</th><th>Receita Total</th><th>Conv. Média</th>
              <th>Status</th><th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id}>
                <td>
                  <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate(`/plataformas/${p.id}`)}>
                    <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-accent">{p.nome.charAt(0)}</div>
                    <span className="font-medium hover:text-accent transition-colors">{p.nome}</span>
                  </div>
                </td>
                <td><span className="badge-primary">{p.tipo}</span></td>
                <td>{p.revshare}</td>
                <td>{p.cpa}</td>
                <td>{p.moeda}</td>
                <td className="text-xs">{p.pagamento}</td>
                <td>{getJogosCount(p)}</td>
                <td>{getLPsCount(p)}</td>
                <td>{getCampanhasCount(p)}</td>
                <td>{getInfluencersCount(p)}</td>
                <td className="font-medium">R$ {getReceita(p).toLocaleString()}</td>
                <td className="text-accent font-medium">{getConversao(p)}</td>
                <td><span className={p.status === "Ativo" ? "badge-success" : p.status === "Pendente" ? "badge-warning" : "badge-danger"}>{p.status}</span></td>
                <td>
                  <div className="flex gap-0.5" onClick={e => e.stopPropagation()}>
                    <button onClick={() => navigate(`/plataformas/${p.id}`)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Ver detalhe"><Eye size={12} /></button>
                    <button onClick={() => openEdit(p)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Editar"><Edit size={12} /></button>
                    <button onClick={() => copyLink(p)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Copiar link"><Copy size={12} /></button>
                    <button onClick={() => toggleStatus(p)} className={`p-1 rounded transition-colors text-muted-foreground ${p.status === "Ativo" ? "hover:bg-destructive/15 hover:text-destructive" : "hover:bg-success/15 hover:text-success"}`} title={p.status === "Ativo" ? "Desativar" : "Ativar"}>
                      {p.status === "Ativo" ? <XCircle size={12} /> : <CheckCircle size={12} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar Plataforma" : "Adicionar Plataforma"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><label className="text-xs font-medium text-muted-foreground">Nome *</label><input className="input-field mt-1" value={editing?.nome || ""} onChange={e => setEditing(p => ({ ...p, nome: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">Tipo Comissão</label>
                <select className="select-field mt-1 w-full" value={editing?.tipo || ""} onChange={e => setEditing(p => ({ ...p, tipo: e.target.value }))}>
                  <option>Revenue Share</option><option>CPA</option><option>CPA + RevShare</option><option>Hybrid</option>
                </select>
              </div>
              <div><label className="text-xs font-medium text-muted-foreground">Status</label>
                <select className="select-field mt-1 w-full" value={editing?.status || "Pendente"} onChange={e => setEditing(p => ({ ...p, status: e.target.value as Plataforma["status"] }))}>
                  <option>Ativo</option><option>Pendente</option><option>Inativo</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">RevShare</label><input className="input-field mt-1" value={editing?.revshare || ""} onChange={e => setEditing(p => ({ ...p, revshare: e.target.value }))} /></div>
              <div><label className="text-xs font-medium text-muted-foreground">CPA</label><input className="input-field mt-1" value={editing?.cpa || ""} onChange={e => setEditing(p => ({ ...p, cpa: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">Moeda</label><input className="input-field mt-1" value={editing?.moeda || ""} onChange={e => setEditing(p => ({ ...p, moeda: e.target.value }))} /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Pagamento</label>
                <select className="select-field mt-1 w-full" value={editing?.pagamento || "Mensal"} onChange={e => setEditing(p => ({ ...p, pagamento: e.target.value }))}>
                  <option>Semanal</option><option>Quinzenal</option><option>Mensal</option>
                </select>
              </div>
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
