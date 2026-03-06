import { useState } from "react";
import { Plus, Edit, XCircle, GitBranch, Copy, Eye, Search, CheckCircle, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import Breadcrumbs from "@/components/Breadcrumbs";
import ExportDropdown from "@/components/ExportDropdown";

interface Hub {
  id: number;
  nome: string;
  rota: string;
  destino: string;
  tipo: "Principal" | "Jogo" | "Campanha" | "Influencer" | "Temporário";
  status: "Ativo" | "Inativo";
  lpsVinculadas: number;
  influencersVinculados: number;
  templatesRelacionados: number;
  links: number;
  cliques: number;
  ultimaAlteracao: string;
}

const initialHubs: Hub[] = [
  { id: 1, nome: "Hub Principal", rota: "/", destino: "Página inicial PlayBet", tipo: "Principal", status: "Ativo", lpsVinculadas: 4, influencersVinculados: 5, templatesRelacionados: 3, links: 8, cliques: 24500, ultimaAlteracao: "05/03/2026" },
  { id: 2, nome: "Hub Jogar", rota: "/jogar", destino: "Seleção de jogos", tipo: "Jogo", status: "Ativo", lpsVinculadas: 3, influencersVinculados: 4, templatesRelacionados: 2, links: 12, cliques: 18200, ultimaAlteracao: "04/03/2026" },
  { id: 3, nome: "Hub Influencer", rota: "/convite/:slug", destino: "Página personalizada influencer", tipo: "Influencer", status: "Ativo", lpsVinculadas: 5, influencersVinculados: 5, templatesRelacionados: 3, links: 5, cliques: 9800, ultimaAlteracao: "03/03/2026" },
  { id: 4, nome: "Hub Março Turbo", rota: "/marco-turbo", destino: "LP campanha especial", tipo: "Campanha", status: "Ativo", lpsVinculadas: 1, influencersVinculados: 2, templatesRelacionados: 1, links: 4, cliques: 6500, ultimaAlteracao: "01/03/2026" },
  { id: 5, nome: "Hub VIP", rota: "/vip", destino: "Acesso VIP exclusivo", tipo: "Temporário", status: "Inativo", lpsVinculadas: 1, influencersVinculados: 1, templatesRelacionados: 1, links: 2, cliques: 1200, ultimaAlteracao: "15/02/2026" },
];

const tipoBadge: Record<Hub["tipo"], string> = {
  Principal: "badge-accent",
  Jogo: "badge-info",
  Campanha: "badge-primary",
  Influencer: "badge-success",
  Temporário: "badge-warning",
};

export default function HubsRotas() {
  const navigate = useNavigate();
  const [data, setData] = useState<Hub[]>(initialHubs);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Hub> | null>(null);
  const [detailOpen, setDetailOpen] = useState<Hub | null>(null);
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState("Todos");

  const filtered = data.filter(h => {
    if (search && !h.nome.toLowerCase().includes(search.toLowerCase()) && !h.rota.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterTipo !== "Todos" && h.tipo !== filterTipo) return false;
    return true;
  });

  const openCreate = () => {
    setEditing({ id: 0, nome: "", rota: "", destino: "", tipo: "Jogo", status: "Ativo", lpsVinculadas: 0, influencersVinculados: 0, templatesRelacionados: 0, links: 0, cliques: 0, ultimaAlteracao: new Date().toLocaleDateString("pt-BR") });
    setModalOpen(true);
  };
  const openEdit = (h: Hub) => { setEditing({ ...h }); setModalOpen(true); };

  const handleSave = () => {
    if (!editing?.nome || !editing?.rota) { toast({ title: "Erro", description: "Nome e rota são obrigatórios.", variant: "destructive" }); return; }
    // Check route duplicate
    const routeExists = data.some(h => h.rota === editing.rota && h.id !== editing.id);
    if (routeExists) {
      toast({ title: "Erro", description: "Essa rota já existe!", variant: "destructive" });
      return;
    }
    if (editing.id && editing.id > 0) {
      setData(prev => prev.map(h => h.id === editing.id ? { ...h, ...editing } as Hub : h));
      toast({ title: "Hub atualizado" });
    } else {
      const newId = Math.max(...data.map(h => h.id), 0) + 1;
      setData(prev => [...prev, { ...editing, id: newId } as Hub]);
      toast({ title: "Hub criado" });
    }
    setModalOpen(false);
  };

  const toggleStatus = (h: Hub) => {
    setData(prev => prev.map(item => item.id === h.id ? { ...item, status: item.status === "Ativo" ? "Inativo" as const : "Ativo" as const } : item));
    toast({ title: h.status === "Ativo" ? "Hub desativado" : "Hub ativado" });
  };

  const copyRota = (h: Hub) => {
    navigator.clipboard.writeText(`https://playbet.com${h.rota}`);
    toast({ title: "URL copiada!", description: `https://playbet.com${h.rota}` });
  };

  const stats = [
    { label: "Total Hubs", value: data.length, variant: "border-l-primary" },
    { label: "Ativos", value: data.filter(h => h.status === "Ativo").length, variant: "border-l-success" },
    { label: "Cliques Totais", value: data.reduce((a, h) => a + h.cliques, 0).toLocaleString(), variant: "border-l-accent" },
    { label: "LPs Vinculadas", value: data.reduce((a, h) => a + h.lpsVinculadas, 0), variant: "border-l-info" },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Gestão de Ativos", path: "/hubs" }, { label: "Hubs / Rotas" }]} />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="page-header">Hubs / Rotas</h1><p className="page-subtitle">Gestão de páginas-hub, rotas de redirecionamento e distribuição de tráfego</p></div>
        <div className="flex gap-2">
          <ExportDropdown data={data.map(({ id, nome, rota, destino, tipo, status, lpsVinculadas, cliques }) => ({ id, nome, rota, destino, tipo, status, lpsVinculadas, cliques }))} filename="hubs-rotas-playbet" />
          <button className="btn-primary" onClick={openCreate}><Plus size={14} /> Adicionar Hub</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className={`stat-card border-l-2 ${s.variant}`}>
            <span className="text-[10px] text-muted-foreground uppercase">{s.label}</span>
            <p className="text-xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Atalhos */}
      <div className="flex flex-wrap gap-2">
        <button className="btn-ghost text-xs" onClick={() => navigate("/link-engine")}>→ Engine de Links</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/landing-pages")}>→ Landing Pages</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/lp-templates")}>→ Templates</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/influencers")}>→ Influencers</button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 bg-secondary/50 border border-border rounded-lg px-3 py-1.5 flex-1 max-w-xs">
          <Search size={13} className="text-muted-foreground shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar hub..." className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none w-full" />
        </div>
        <select className="select-field" value={filterTipo} onChange={e => setFilterTipo(e.target.value)}>
          <option>Todos</option><option>Principal</option><option>Jogo</option><option>Campanha</option><option>Influencer</option><option>Temporário</option>
        </select>
      </div>

      {/* Table */}
      <div className="glass-card overflow-x-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <GitBranch size={40} className="mb-3 opacity-30" />
            <p className="text-sm font-medium">Nenhum hub encontrado</p>
          </div>
        ) : (
          <table className="data-table">
            <thead><tr><th>Nome</th><th>Rota</th><th>Destino</th><th>Tipo</th><th>LPs</th><th>Influencers</th><th>Links</th><th>Cliques</th><th>Última Alt.</th><th>Status</th><th>Ações</th></tr></thead>
            <tbody>
              {filtered.map((h) => (
                <tr key={h.id}>
                  <td className="font-medium">{h.nome}</td>
                  <td className="font-mono text-xs text-accent">{h.rota}</td>
                  <td className="text-xs max-w-[150px] truncate">{h.destino}</td>
                  <td><span className={tipoBadge[h.tipo]}>{h.tipo}</span></td>
                  <td>{h.lpsVinculadas}</td>
                  <td>{h.influencersVinculados}</td>
                  <td>{h.links}</td>
                  <td className="font-medium">{h.cliques.toLocaleString()}</td>
                  <td className="text-xs text-muted-foreground whitespace-nowrap">{h.ultimaAlteracao}</td>
                  <td><span className={h.status === "Ativo" ? "badge-success" : "badge-danger"}>{h.status}</span></td>
                  <td>
                    <div className="flex gap-0.5">
                      <button onClick={() => setDetailOpen(h)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Detalhes"><Eye size={12} /></button>
                      <button onClick={() => openEdit(h)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Editar"><Edit size={12} /></button>
                      <button onClick={() => copyRota(h)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Copiar URL"><Copy size={12} /></button>
                      <button onClick={() => toggleStatus(h)} className={`p-1 rounded hover:bg-secondary transition-colors ${h.status === "Ativo" ? "text-muted-foreground hover:text-destructive" : "text-muted-foreground hover:text-success"}`} title={h.status === "Ativo" ? "Desativar" : "Ativar"}>
                        {h.status === "Ativo" ? <XCircle size={12} /> : <CheckCircle size={12} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Modal */}
      <Dialog open={!!detailOpen} onOpenChange={() => setDetailOpen(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Hub — {detailOpen?.nome}</DialogTitle></DialogHeader>
          {detailOpen && (
            <div className="space-y-4 py-2 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-xs text-muted-foreground">Rota</span><p className="font-mono text-accent">{detailOpen.rota}</p></div>
                <div><span className="text-xs text-muted-foreground">Tipo</span><p><span className={tipoBadge[detailOpen.tipo]}>{detailOpen.tipo}</span></p></div>
                <div><span className="text-xs text-muted-foreground">Destino</span><p>{detailOpen.destino}</p></div>
                <div><span className="text-xs text-muted-foreground">Status</span><p><span className={detailOpen.status === "Ativo" ? "badge-success" : "badge-danger"}>{detailOpen.status}</span></p></div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2 bg-secondary/50 rounded text-center"><span className="text-[10px] text-muted-foreground">LPs</span><p className="font-bold">{detailOpen.lpsVinculadas}</p></div>
                <div className="p-2 bg-secondary/50 rounded text-center"><span className="text-[10px] text-muted-foreground">Influencers</span><p className="font-bold">{detailOpen.influencersVinculados}</p></div>
                <div className="p-2 bg-secondary/50 rounded text-center"><span className="text-[10px] text-muted-foreground">Links</span><p className="font-bold">{detailOpen.links}</p></div>
                <div className="p-2 bg-secondary/50 rounded text-center"><span className="text-[10px] text-muted-foreground">Cliques</span><p className="font-bold">{detailOpen.cliques.toLocaleString()}</p></div>
              </div>
              <div className="border border-dashed border-border rounded-lg p-6 text-center text-muted-foreground bg-secondary/20">
                <ExternalLink size={20} className="mx-auto mb-2 opacity-30" />
                <p className="text-xs">Preview visual do hub disponível após integração com Lovable Cloud</p>
              </div>
              <div className="text-xs text-muted-foreground"><p>Última alteração: {detailOpen.ultimaAlteracao}</p></div>
            </div>
          )}
          <DialogFooter>
            <button className="btn-ghost" onClick={() => { if (detailOpen) copyRota(detailOpen); }}>Copiar URL</button>
            <button className="btn-ghost" onClick={() => navigate("/link-engine")}>Ver na Engine</button>
            <button className="btn-ghost" onClick={() => setDetailOpen(null)}>Fechar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar Hub" : "Adicionar Hub"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><label className="text-xs font-medium text-muted-foreground">Nome *</label><input className="input-field mt-1" value={editing?.nome || ""} onChange={e => setEditing(p => ({ ...p, nome: e.target.value }))} /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Rota *</label><input className="input-field mt-1" value={editing?.rota || ""} onChange={e => setEditing(p => ({ ...p, rota: e.target.value }))} placeholder="/minha-rota" /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Destino</label><input className="input-field mt-1" value={editing?.destino || ""} onChange={e => setEditing(p => ({ ...p, destino: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">Tipo</label>
                <select className="select-field mt-1 w-full" value={editing?.tipo || "Jogo"} onChange={e => setEditing(p => ({ ...p, tipo: e.target.value as Hub["tipo"] }))}>
                  <option>Principal</option><option>Jogo</option><option>Campanha</option><option>Influencer</option><option>Temporário</option>
                </select>
              </div>
              <div><label className="text-xs font-medium text-muted-foreground">Status</label>
                <select className="select-field mt-1 w-full" value={editing?.status || "Ativo"} onChange={e => setEditing(p => ({ ...p, status: e.target.value as "Ativo" | "Inativo" }))}>
                  <option>Ativo</option><option>Inativo</option>
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
