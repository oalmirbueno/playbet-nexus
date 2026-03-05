import { useState } from "react";
import { Copy, Edit, XCircle, CopyPlus, Plus, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { initialLinks } from "@/data/mockData";
import type { LinkAfiliado } from "@/types";
import { toast } from "@/hooks/use-toast";

export default function LinksAfiliados() {
  const [data, setData] = useState<LinkAfiliado[]>(initialLinks);
  const [search, setSearch] = useState("");
  const [filterJogo, setFilterJogo] = useState("Todos");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<LinkAfiliado> | null>(null);

  const jogos = ["Todos", ...new Set(data.map(l => l.jogo))];
  const filtered = data.filter(l => {
    if (search && !l.nome.toLowerCase().includes(search.toLowerCase()) && !l.influencer.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterJogo !== "Todos" && l.jogo !== filterJogo) return false;
    if (filterStatus !== "Todos" && l.status !== filterStatus) return false;
    return true;
  });

  const openCreate = () => { setEditing({ id: 0, nome: "", jogo: "", plat: "", influencer: "", uso: "", source: "playbet", medium: "", campaign: "", subid: "", status: "Ativo", ultimoClique: "—", cliques: 0 }); setModalOpen(true); };
  const openEdit = (l: LinkAfiliado) => { setEditing({ ...l }); setModalOpen(true); };

  const handleSave = () => {
    if (!editing?.nome) { toast({ title: "Erro", description: "Nome é obrigatório.", variant: "destructive" }); return; }
    if (editing.id && editing.id > 0) {
      setData(prev => prev.map(l => l.id === editing.id ? { ...l, ...editing } as LinkAfiliado : l));
      toast({ title: "Link atualizado" });
    } else {
      const newId = Math.max(...data.map(l => l.id), 0) + 1;
      setData(prev => [...prev, { ...editing, id: newId } as LinkAfiliado]);
      toast({ title: "Link criado" });
    }
    setModalOpen(false);
  };

  const copyLink = (l: LinkAfiliado) => {
    const url = `https://playbet.com/${l.source}?utm_medium=${l.medium}&utm_campaign=${l.campaign}&subid=${l.subid}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copiado!", description: url });
  };

  const duplicateLink = (l: LinkAfiliado) => {
    const newId = Math.max(...data.map(x => x.id), 0) + 1;
    setData(prev => [...prev, { ...l, id: newId, nome: `${l.nome}-copia`, cliques: 0, ultimoClique: "—" }]);
    toast({ title: "Link duplicado" });
  };

  const deactivate = (l: LinkAfiliado) => {
    setData(prev => prev.map(x => x.id === l.id ? { ...x, status: x.status === "Ativo" ? "Inativo" as const : "Ativo" as const } : x));
    toast({ title: l.status === "Ativo" ? "Link desativado" : "Link ativado" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="page-header">Links Afiliados</h1><p className="page-subtitle">Centro de links — rastreio, UTMs e gestão completa</p></div>
        <button className="btn-primary" onClick={openCreate}><Plus size={14} /> Adicionar Link</button>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 bg-secondary/50 border border-border rounded-lg px-3 py-1.5 flex-1 max-w-xs">
          <Search size={13} className="text-muted-foreground shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar link ou influencer..." className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none w-full" />
        </div>
        <select className="select-field" value={filterJogo} onChange={e => setFilterJogo(e.target.value)}>
          {jogos.map(j => <option key={j}>{j}</option>)}
        </select>
        <select className="select-field" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option>Todos</option><option>Ativo</option><option>Inativo</option>
        </select>
      </div>

      <div className="glass-card overflow-x-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <p className="text-sm font-medium">Nenhum link encontrado</p>
          </div>
        ) : (
          <table className="data-table">
            <thead><tr><th>Nome</th><th>Jogo</th><th>Plataforma</th><th>Influencer</th><th>Uso</th><th>Source</th><th>Medium</th><th>Campaign</th><th>SubID</th><th>Cliques</th><th>Status</th><th>Ações</th></tr></thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id}>
                  <td className="font-medium text-xs">{l.nome}</td>
                  <td className="text-xs">{l.jogo}</td>
                  <td className="text-xs">{l.plat}</td>
                  <td className="text-xs">{l.influencer}</td>
                  <td><span className="badge-neutral">{l.uso}</span></td>
                  <td className="font-mono text-[10px] text-muted-foreground">{l.source}</td>
                  <td className="font-mono text-[10px] text-muted-foreground">{l.medium}</td>
                  <td className="font-mono text-[10px] text-muted-foreground">{l.campaign}</td>
                  <td className="font-mono text-[10px] text-accent">{l.subid}</td>
                  <td className="font-medium">{l.cliques.toLocaleString()}</td>
                  <td><span className={l.status === "Ativo" ? "badge-success" : "badge-danger"}>{l.status}</span></td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => copyLink(l)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Copiar"><Copy size={12} /></button>
                      <button onClick={() => openEdit(l)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Editar"><Edit size={12} /></button>
                      <button onClick={() => duplicateLink(l)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Duplicar"><CopyPlus size={12} /></button>
                      <button onClick={() => deactivate(l)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-destructive transition-colors" title="Desativar"><XCircle size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar Link" : "Adicionar Link"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><label className="text-xs font-medium text-muted-foreground">Nome *</label><input className="input-field mt-1" value={editing?.nome || ""} onChange={e => setEditing(p => ({ ...p, nome: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">Jogo</label><input className="input-field mt-1" value={editing?.jogo || ""} onChange={e => setEditing(p => ({ ...p, jogo: e.target.value }))} /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Plataforma</label><input className="input-field mt-1" value={editing?.plat || ""} onChange={e => setEditing(p => ({ ...p, plat: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">Influencer</label><input className="input-field mt-1" value={editing?.influencer || ""} onChange={e => setEditing(p => ({ ...p, influencer: e.target.value }))} /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Uso</label><input className="input-field mt-1" value={editing?.uso || ""} onChange={e => setEditing(p => ({ ...p, uso: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">UTM Source</label><input className="input-field mt-1" value={editing?.source || ""} onChange={e => setEditing(p => ({ ...p, source: e.target.value }))} /></div>
              <div><label className="text-xs font-medium text-muted-foreground">UTM Medium</label><input className="input-field mt-1" value={editing?.medium || ""} onChange={e => setEditing(p => ({ ...p, medium: e.target.value }))} /></div>
              <div><label className="text-xs font-medium text-muted-foreground">SubID</label><input className="input-field mt-1" value={editing?.subid || ""} onChange={e => setEditing(p => ({ ...p, subid: e.target.value }))} /></div>
            </div>
            <div><label className="text-xs font-medium text-muted-foreground">Campaign</label><input className="input-field mt-1" value={editing?.campaign || ""} onChange={e => setEditing(p => ({ ...p, campaign: e.target.value }))} /></div>
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
