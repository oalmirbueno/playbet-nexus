import { useState } from "react";
import { Plus, Copy, Edit, XCircle, CopyPlus, Search, Eye, Link2, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import type { InfluencerLP } from "@/types";
import { toast } from "@/hooks/use-toast";
import Breadcrumbs from "@/components/Breadcrumbs";
import ExportDropdown from "@/components/ExportDropdown";
import EmptyState from "@/components/EmptyState";

export default function LinkEngine() {
  const navigate = useNavigate();
  const [data, setData] = useState<InfluencerLP[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<InfluencerLP> | null>(null);

  const filtered = data.filter(lp => {
    if (search && !lp.influencerNome.toLowerCase().includes(search.toLowerCase()) && !lp.slug.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus !== "Todos" && lp.status !== filterStatus) return false;
    return true;
  });

  const openCreate = () => {
    setEditing({ id: 0, influencerId: 0, influencerNome: "", slug: "", templateId: 0, templateNome: "", affiliateLink: "", urlPublica: "", cliques: 0, status: "Ativo", ultimaAtividade: "—" });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!editing?.slug || !editing?.influencerNome) {
      toast({ title: "Erro", description: "Influencer e slug são obrigatórios.", variant: "destructive" });
      return;
    }
    const urlPublica = `/?ref=${editing.slug}`;
    if (editing.id && editing.id > 0) {
      setData(prev => prev.map(lp => lp.id === editing.id ? { ...lp, ...editing, urlPublica } as InfluencerLP : lp));
      toast({ title: "Vínculo atualizado" });
    } else {
      const newId = Math.max(...data.map(lp => lp.id), 0) + 1;
      setData(prev => [...prev, { ...editing, id: newId, urlPublica } as InfluencerLP]);
      toast({ title: "Vínculo criado", description: `URL: ${urlPublica}` });
    }
    setModalOpen(false);
  };

  const copyUrl = (lp: InfluencerLP) => {
    const fullUrl = lp.urlPublica?.startsWith("http") ? lp.urlPublica : `https://playbet.app.br${lp.urlPublica}`;
    navigator.clipboard.writeText(fullUrl);
    toast({ title: "URL copiada!", description: fullUrl });
  };

  const toggleStatus = (lp: InfluencerLP) => {
    setData(prev => prev.map(x => x.id === lp.id ? { ...x, status: x.status === "Ativo" ? "Inativo" as const : "Ativo" as const } : x));
    toast({ title: lp.status === "Ativo" ? "Desativado" : "Ativado" });
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Gestão de Ativos", path: "/link-engine" }, { label: "Engine de Links" }]} />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="page-header">Engine de Links</h1><p className="page-subtitle">Distribuição centralizada de LPs por influenciador — gestão de vínculos e rastreio</p></div>
        <div className="flex gap-2">
          {data.length > 0 && <ExportDropdown data={data.map(({ id, influencerNome, slug, templateNome, urlPublica, status }) => ({ id, influencerNome, slug, templateNome, urlPublica, status }))} filename="engine-links-playbet" />}
          <button className="btn-primary" onClick={openCreate}><Plus size={14} /> Criar Vínculo</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button className="btn-ghost text-xs" onClick={() => navigate("/influencers")}>→ Influencers</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/lp-templates")}>→ Templates de LP</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/landing-pages")}>→ Landing Pages</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/links")}>→ Links Afiliados</button>
      </div>

      {data.length === 0 ? (
        <div className="glass-card">
          <EmptyState
            icon={Link2}
            title="Nenhum vínculo criado"
            description="Crie vínculos entre influencers e templates de LP para gerar URLs personalizadas e rastrear performance."
            actionLabel="Criar Vínculo"
            onAction={openCreate}
          />
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2 bg-secondary/50 border border-border rounded-lg px-3 py-1.5 flex-1 max-w-xs">
              <Search size={13} className="text-muted-foreground shrink-0" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar influencer ou slug..." className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none w-full" />
            </div>
            <select className="select-field" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option>Todos</option><option>Ativo</option><option>Inativo</option>
            </select>
          </div>

          <div className="glass-card overflow-x-auto invisible-scroll">
            <table className="data-table">
              <thead><tr><th>Influenciador</th><th>Slug</th><th>Template</th><th>URL Pública</th><th>Status</th><th>Ações</th></tr></thead>
              <tbody>
                {filtered.map(lp => (
                  <tr key={lp.id}>
                    <td className="font-medium text-xs">{lp.influencerNome}</td>
                    <td className="font-mono text-xs text-accent">{lp.slug}</td>
                    <td className="text-xs">{lp.templateNome}</td>
                    <td className="font-mono text-xs text-accent">{lp.urlPublica}</td>
                    <td><span className={lp.status === "Ativo" ? "badge-success" : "badge-danger"}>{lp.status}</span></td>
                    <td>
                      <div className="flex gap-0.5">
                        <button onClick={() => copyUrl(lp)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"><Copy size={12} /></button>
                        <button onClick={() => { setEditing({ ...lp }); setModalOpen(true); }} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"><Edit size={12} /></button>
                        <button onClick={() => toggleStatus(lp)} className="p-1 rounded hover:bg-secondary text-muted-foreground transition-colors">
                          {lp.status === "Ativo" ? <XCircle size={12} /> : <CheckCircle size={12} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar Vínculo" : "Criar Vínculo"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">Influenciador *</label>
                <input className="input-field mt-1" value={editing?.influencerNome || ""} onChange={e => setEditing(p => ({ ...p, influencerNome: e.target.value }))} />
              </div>
              <div><label className="text-xs font-medium text-muted-foreground">Slug *</label>
                <input className="input-field mt-1" value={editing?.slug || ""} onChange={e => setEditing(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))} />
              </div>
            </div>
            <div><label className="text-xs font-medium text-muted-foreground">Template</label>
              <input className="input-field mt-1" value={editing?.templateNome || ""} onChange={e => setEditing(p => ({ ...p, templateNome: e.target.value }))} />
            </div>
            <div><label className="text-xs font-medium text-muted-foreground">Affiliate Link</label>
              <input className="input-field mt-1" value={editing?.affiliateLink || ""} onChange={e => setEditing(p => ({ ...p, affiliateLink: e.target.value }))} />
            </div>
            {editing?.slug && (
              <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                <span className="text-[10px] text-muted-foreground uppercase">URL pública gerada</span>
                <p className="font-mono text-sm text-accent mt-1">dominio-da-lp.playbet.app.br/?ref={editing.slug}</p>
              </div>
            )}
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
