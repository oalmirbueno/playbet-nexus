import { useMemo, useState } from "react";
import { Copy, Edit, Plus, Search, Link2, MoreHorizontal, Power } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import type { LinkAfiliado } from "@/types";
import { toast } from "@/hooks/use-toast";
import Breadcrumbs from "@/components/Breadcrumbs";
import ExportDropdown from "@/components/ExportDropdown";
import EmptyState from "@/components/EmptyState";

type GroupKey = "influencer" | "jogo" | "plataforma";

export default function LinksAfiliados() {
  const navigate = useNavigate();
  const [data, setData] = useState<LinkAfiliado[]>([]);
  const [search, setSearch] = useState("");
  const [filterJogo, setFilterJogo] = useState("Todos");
  const [filterPlat, setFilterPlat] = useState("Todos");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [groupBy, setGroupBy] = useState<GroupKey>("influencer");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<LinkAfiliado> | null>(null);

  const jogos = useMemo(() => ["Todos", ...Array.from(new Set(data.map(l => l.jogo).filter(Boolean)))], [data]);
  const plataformas = useMemo(() => ["Todos", ...Array.from(new Set(data.map(l => l.plat).filter(Boolean)))], [data]);

  const filtered = useMemo(() => data.filter(l => {
    if (filterJogo !== "Todos" && l.jogo !== filterJogo) return false;
    if (filterPlat !== "Todos" && l.plat !== filterPlat) return false;
    if (filterStatus !== "Todos" && l.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      const hay = [l.nome, l.influencer, l.source, l.medium, l.campaign, l.subid].join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }), [data, filterJogo, filterPlat, filterStatus, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, LinkAfiliado[]>();
    for (const l of filtered) {
      const key = (groupBy === "influencer" ? l.influencer : groupBy === "jogo" ? l.jogo : l.plat) || "-";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(l);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered, groupBy]);

  const openCreate = () => {
    setEditing({ id: 0, nome: "", jogo: "", plat: "", influencer: "", uso: "", source: "playbet", medium: "", campaign: "", subid: "", status: "Ativo", ultimoClique: "-", cliques: 0 });
    setModalOpen(true);
  };
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
    toast({ title: "Link copiado", description: url });
  };

  const toggleStatus = (l: LinkAfiliado) => {
    setData(prev => prev.map(x => x.id === l.id ? { ...x, status: x.status === "Ativo" ? "Inativo" : "Ativo" } : x));
    toast({ title: l.status === "Ativo" ? "Link desativado" : "Link ativado" });
  };

  const totals = {
    total: data.length,
    ativos: data.filter(l => l.status === "Ativo").length,
    inativos: data.filter(l => l.status === "Inativo").length,
    cliques: data.reduce((s, l) => s + (l.cliques || 0), 0),
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Gestão de Ativos", path: "/links" }, { label: "Links Afiliados" }]} />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Links Afiliados</h1>
          <p className="text-sm text-muted-foreground mt-1">Rastreio, UTMs e SubIDs por influencer, jogo e plataforma</p>
        </div>
        <div className="flex gap-2">
          {data.length > 0 && <ExportDropdown data={data.map(l => ({ ...l }))} filename="links-playbet" />}
          <button className="btn-primary" onClick={openCreate}><Plus size={14} /> Novo Link</button>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="glass-card">
          <EmptyState
            icon={Link2}
            title="Nenhum link cadastrado"
            description="Crie links afiliados para rastrear cliques, conversões e performance por influencer, jogo e plataforma."
            actionLabel="Adicionar Link"
            onAction={openCreate}
          />
        </div>
      ) : (
        <>
          {/* KPIs minimalistas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Total", value: totals.total },
              { label: "Ativos", value: totals.ativos },
              { label: "Inativos", value: totals.inativos },
              { label: "Cliques", value: totals.cliques.toLocaleString("pt-BR") },
            ].map(k => (
              <div key={k.label} className="glass-card px-4 py-3">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{k.label}</div>
                <div className="text-xl font-semibold mt-1">{k.value}</div>
              </div>
            ))}
          </div>

          {/* Filtros */}
          <div className="glass-card p-3 flex flex-wrap gap-2 items-center">
            <div className="flex items-center gap-2 bg-secondary/50 border border-border rounded-lg px-3 py-1.5 flex-1 min-w-[220px]">
              <Search size={13} className="text-muted-foreground shrink-0" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar nome, influencer, UTM ou SubID..."
                className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none w-full"
              />
            </div>
            <select className="select-field" value={filterJogo} onChange={e => setFilterJogo(e.target.value)}>
              {jogos.map(j => <option key={j}>{j}</option>)}
            </select>
            <select className="select-field" value={filterPlat} onChange={e => setFilterPlat(e.target.value)}>
              {plataformas.map(p => <option key={p}>{p}</option>)}
            </select>
            <select className="select-field" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option>Todos</option><option>Ativo</option><option>Inativo</option>
            </select>
            <div className="h-6 w-px bg-border mx-1" />
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Agrupar:</span>
            {(["influencer", "jogo", "plataforma"] as GroupKey[]).map(g => (
              <button
                key={g}
                onClick={() => setGroupBy(g)}
                className={`text-xs px-2.5 py-1 rounded-md transition-colors ${groupBy === g ? "bg-primary text-primary-foreground" : "bg-secondary/60 text-muted-foreground hover:text-foreground"}`}
              >
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </button>
            ))}
          </div>

          {/* Grupos */}
          <div className="space-y-4">
            {grouped.length === 0 ? (
              <div className="glass-card p-8 text-center text-sm text-muted-foreground">
                Nenhum link corresponde aos filtros.
              </div>
            ) : grouped.map(([group, items]) => (
              <div key={group} className="glass-card overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-subtle bg-secondary/20">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">{group}</span>
                    <span className="text-[11px] text-muted-foreground">{items.length} link{items.length > 1 ? "s" : ""}</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {items.reduce((s, l) => s + (l.cliques || 0), 0).toLocaleString("pt-BR")} cliques
                  </span>
                </div>
                <div className="overflow-x-auto invisible-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Nome</th>
                        <th>Jogo</th>
                        <th>Plataforma</th>
                        <th>UTM / SubID</th>
                        <th>Cliques</th>
                        <th>Status</th>
                        <th className="text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(l => (
                        <tr key={l.id}>
                          <td className="font-medium text-xs">{l.nome}</td>
                          <td className="text-xs text-muted-foreground">{l.jogo || "-"}</td>
                          <td className="text-xs text-muted-foreground">{l.plat || "-"}</td>
                          <td className="font-mono text-[10px] text-muted-foreground">
                            <div>{l.source}/{l.medium}</div>
                            {l.subid && <div className="text-accent">{l.subid}</div>}
                          </td>
                          <td className="text-xs tabular-nums">{(l.cliques || 0).toLocaleString("pt-BR")}</td>
                          <td><span className={l.status === "Ativo" ? "badge-success" : "badge-danger"}>{l.status}</span></td>
                          <td className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                                <MoreHorizontal size={14} />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem onClick={() => copyLink(l)}>
                                  <Copy size={13} className="mr-2" /> Copiar link
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openEdit(l)}>
                                  <Edit size={13} className="mr-2" /> Editar
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => toggleStatus(l)}>
                                  <Power size={13} className="mr-2" /> {l.status === "Ativo" ? "Desativar" : "Ativar"}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 pt-2 border-t border-border-subtle">
            <button className="btn-ghost text-xs" onClick={() => navigate("/link-engine")}>→ Engine de Links</button>
            <button className="btn-ghost text-xs" onClick={() => navigate("/landing-pages")}>→ Landing Pages</button>
            <button className="btn-ghost text-xs" onClick={() => navigate("/utms")}>→ UTMs / SubIDs</button>
          </div>
        </>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar Link" : "Novo Link"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Nome *</label>
              <input className="input-field mt-1" value={editing?.nome || ""} onChange={e => setEditing(p => ({ ...p, nome: e.target.value }))} />
            </div>
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
