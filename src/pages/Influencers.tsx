import { useMemo, useState } from "react";
import {
  Plus, Users, Search, Edit, XCircle, CheckCircle, Eye, Trash2, Link2,
  UserCheck, Target, ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useInfluencers, useManagers } from "@/hooks/useSupabaseQuery";
import type { InfluencerRow, ManagerRow } from "@/services/supabaseService";
import { toast } from "@/hooks/use-toast";
import Breadcrumbs from "@/components/Breadcrumbs";
import ExportDropdown from "@/components/ExportDropdown";
import QuickLinkDialog from "@/components/QuickLinkDialog";
import { CREATOR_LEVELS, MANAGER_LEVELS, getLevel, suggestPercentForLevel, isPercentValidForLevel, formatLevelRange } from "@/config/careerLevels";

const UNGROUPED = "Sem time";

type InfEdit = {
  id?: string;
  name: string;
  slug: string;
  instagram: string;
  followers: number | null;
  commission_percent: number | null;
  affiliate_link: string;
  notes: string;
  is_active: boolean;
  manager_id: string | null;
  team_label: string | null;
};

type MgrEdit = {
  id?: string;
  name: string;
  slug: string;
  team_name: string;
  team_color: string;
  monthly_goal: number | null;
  notes: string;
  is_active: boolean;
};

const emptyInf: InfEdit = {
  name: "", slug: "", instagram: "", followers: null,
  commission_percent: 15, affiliate_link: "", notes: "", is_active: true,
  manager_id: null, team_label: null,
};

const emptyMgr: MgrEdit = {
  name: "", slug: "", team_name: "", team_color: "#3B82F6",
  monthly_goal: null, notes: "", is_active: true,
};

const TEAM_COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316"];

export default function Influencers() {
  const navigate = useNavigate();
  const { data: influencers, isLoading, create: createInf, update: updateInf, toggle: toggleInf, remove: removeInf, isCreating: infCreating, isUpdating: infUpdating } = useInfluencers();
  const { data: managers, create: createMgr, update: updateMgr, toggle: toggleMgr, remove: removeMgr, isCreating: mgrCreating, isUpdating: mgrUpdating } = useManagers();

  const [tab, setTab] = useState<"influencers" | "managers">("influencers");

  // Influencer state
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [filterTeam, setFilterTeam] = useState("Todos");
  const [infModalOpen, setInfModalOpen] = useState(false);
  const [editingInf, setEditingInf] = useState<InfEdit | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState<InfluencerRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<InfluencerRow | null>(null);
  const [quickLinkFor, setQuickLinkFor] = useState<string | null>(null);

  // Manager state
  const [mgrSearch, setMgrSearch] = useState("");
  const [mgrModalOpen, setMgrModalOpen] = useState(false);
  const [editingMgr, setEditingMgr] = useState<MgrEdit | null>(null);
  const [confirmDeleteMgr, setConfirmDeleteMgr] = useState<ManagerRow | null>(null);

  // ── Derived ───────────────────────────────────────────────────────
  const managersById = useMemo(() => {
    const m = new Map<string, ManagerRow>();
    managers.forEach((g: ManagerRow) => m.set(g.id, g));
    return m;
  }, [managers]);

  const teams = useMemo(() => {
    const set = new Set<string>();
    managers.forEach((m: ManagerRow) => set.add(m.team_name));
    influencers.forEach((i: any) => { if (i.team_label) set.add(i.team_label); });
    return ["Todos", ...Array.from(set).sort()];
  }, [managers, influencers]);

  const filteredInf = useMemo(() => influencers.filter((inf: any) => {
    const q = search.toLowerCase();
    if (search && !inf.name.toLowerCase().includes(q) && !(inf.instagram || "").toLowerCase().includes(q) && !inf.slug.toLowerCase().includes(q)) return false;
    if (filterStatus === "Ativo" && !inf.is_active) return false;
    if (filterStatus === "Inativo" && inf.is_active) return false;
    if (filterTeam !== "Todos") {
      const team = inf.team_label || (inf.manager_id ? managersById.get(inf.manager_id)?.team_name : null) || UNGROUPED;
      if (team !== filterTeam) return false;
    }
    return true;
  }), [influencers, search, filterStatus, filterTeam, managersById]);

  const groupedInf = useMemo(() => {
    const map = new Map<string, { team: string; manager: ManagerRow | null; rows: any[] }>();
    for (const inf of filteredInf) {
      const mgr = inf.manager_id ? managersById.get(inf.manager_id) || null : null;
      const team = mgr?.team_name || inf.team_label || UNGROUPED;
      if (!map.has(team)) map.set(team, { team, manager: mgr, rows: [] });
      map.get(team)!.rows.push(inf);
    }
    return Array.from(map.values()).sort((a, b) => {
      if (a.team === UNGROUPED) return 1;
      if (b.team === UNGROUPED) return -1;
      return a.team.localeCompare(b.team);
    });
  }, [filteredInf, managersById]);

  const filteredMgrs = useMemo(() => managers.filter((m: ManagerRow) => {
    if (!mgrSearch) return true;
    const q = mgrSearch.toLowerCase();
    return m.name.toLowerCase().includes(q) || m.team_name.toLowerCase().includes(q) || m.slug.toLowerCase().includes(q);
  }), [managers, mgrSearch]);

  const activeCount = influencers.filter((i: any) => i.is_active).length;
  const totalFollowers = influencers.reduce((s: number, i: any) => s + (i.followers || 0), 0);
  const totalTeams = new Set(managers.map((m: ManagerRow) => m.team_name)).size;

  const kpis = [
    { label: "Influencers", value: String(influencers.length), sub: `${activeCount} ativos`, icon: Users, color: "border-l-primary" },
    { label: "Gerentes", value: String(managers.length), sub: `${totalTeams} times`, icon: UserCheck, color: "border-l-accent" },
    { label: "Com link", value: String(influencers.filter((i: any) => i.affiliate_link).length), sub: "tracking ativo", icon: Link2, color: "border-l-success" },
    { label: "Seguidores", value: totalFollowers.toLocaleString(), sub: "alcance total", icon: Target, color: "border-l-info" },
  ];

  // ── Handlers ──────────────────────────────────────────────────────
  const openCreateInf = () => { setEditingInf({ ...emptyInf }); setInfModalOpen(true); };
  const openEditInf = (inf: any) => {
    setEditingInf({
      id: inf.id,
      name: inf.name,
      slug: inf.slug,
      instagram: inf.instagram || "",
      followers: inf.followers,
      commission_percent: inf.commission_percent,
      affiliate_link: inf.affiliate_link || "",
      notes: inf.notes || "",
      is_active: inf.is_active ?? true,
      manager_id: inf.manager_id || null,
      team_label: inf.team_label || null,
    });
    setInfModalOpen(true);
  };

  const handleSaveInf = async () => {
    if (!editingInf?.name || !editingInf?.slug) {
      toast({ title: "Erro", description: "Nome e slug são obrigatórios.", variant: "destructive" });
      return;
    }
    const mgr = editingInf.manager_id ? managersById.get(editingInf.manager_id) : null;
    const team_label = mgr?.team_name || editingInf.team_label || null;
    const payload: any = {
      name: editingInf.name,
      slug: editingInf.slug,
      instagram: editingInf.instagram || null,
      followers: editingInf.followers,
      commission_percent: editingInf.commission_percent,
      affiliate_link: editingInf.affiliate_link || null,
      notes: editingInf.notes || null,
      is_active: editingInf.is_active,
      manager_id: editingInf.manager_id || null,
      team_label,
    };
    try {
      if (editingInf.id) await updateInf({ id: editingInf.id, updates: payload });
      else await createInf(payload);
      setInfModalOpen(false);
      setEditingInf(null);
    } catch { /* toast handled */ }
  };

  const openCreateMgr = () => { setEditingMgr({ ...emptyMgr }); setMgrModalOpen(true); };
  const openEditMgr = (m: ManagerRow) => {
    setEditingMgr({
      id: m.id, name: m.name, slug: m.slug, team_name: m.team_name,
      team_color: m.team_color, monthly_goal: m.monthly_goal, notes: m.notes || "",
      is_active: m.is_active,
    });
    setMgrModalOpen(true);
  };

  const handleSaveMgr = async () => {
    if (!editingMgr?.name || !editingMgr?.slug || !editingMgr?.team_name) {
      toast({ title: "Erro", description: "Nome, slug e nome do time são obrigatórios.", variant: "destructive" });
      return;
    }
    const payload = {
      name: editingMgr.name,
      slug: editingMgr.slug,
      team_name: editingMgr.team_name,
      team_color: editingMgr.team_color,
      monthly_goal: editingMgr.monthly_goal,
      notes: editingMgr.notes || null,
      is_active: editingMgr.is_active,
    };
    try {
      if (editingMgr.id) await updateMgr({ id: editingMgr.id, updates: payload });
      else await createMgr(payload);
      setMgrModalOpen(false);
      setEditingMgr(null);
    } catch { /* toast handled */ }
  };

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Gestão de Pessoas", path: "/influencers" }, { label: "Pessoas" }]} />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pessoas</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerentes, times e influencers em uma única esteira de produção.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <ExportDropdown
            data={influencers.map((i: any) => ({ name: i.name, slug: i.slug, team: i.team_label || "", status: i.is_active ? "Ativo" : "Inativo" }))}
            filename="pessoas-playbet"
          />
          {tab === "influencers" ? (
            <button className="btn-primary" onClick={openCreateInf}><Plus size={14} /> Novo influencer</button>
          ) : (
            <button className="btn-primary" onClick={openCreateMgr}><Plus size={14} /> Novo gerente</button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className={`glass-card p-4 border-l-2 ${k.color}`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{k.label}</span>
              <k.icon size={13} className="text-muted-foreground" />
            </div>
            <div className="text-lg font-bold">{k.value}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{k.sub}</div>
          </div>
        ))}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="influencers"><Users size={13} className="mr-1.5" /> Influencers</TabsTrigger>
          <TabsTrigger value="managers"><UserCheck size={13} className="mr-1.5" /> Gerentes</TabsTrigger>
        </TabsList>

        {/* ── Influencers ─────────────────────────────────────── */}
        <TabsContent value="influencers" className="space-y-4 mt-4">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex items-center gap-2 bg-secondary/50 border border-border rounded-lg px-3 py-1.5 flex-1 max-w-xs">
              <Search size={13} className="text-muted-foreground shrink-0" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar nome, instagram ou slug…" className="bg-transparent text-xs focus:outline-none w-full" />
            </div>
            <select className="select-field" value={filterTeam} onChange={(e) => setFilterTeam(e.target.value)}>
              {teams.map((t) => <option key={t}>{t}</option>)}
            </select>
            <select className="select-field" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option>Todos</option><option>Ativo</option><option>Inativo</option>
            </select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-3" /> Carregando…
            </div>
          ) : groupedInf.length === 0 ? (
            <div className="glass-card flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Users size={36} className="mb-3 opacity-30" />
              <p className="text-sm font-medium">Nenhum influencer encontrado</p>
              <p className="text-xs mt-1">Crie um novo ou ajuste os filtros.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {groupedInf.map((grp) => {
                const color = grp.manager?.team_color || "#64748B";
                return (
                  <div key={grp.team} className="glass-card overflow-hidden">
                    <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border" style={{ borderLeft: `3px solid ${color}` }}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{grp.team}</p>
                          {grp.manager ? (
                            <p className="text-[10px] text-muted-foreground truncate">Gerente · {grp.manager.name}</p>
                          ) : (
                            <p className="text-[10px] text-muted-foreground">Sem gerente atribuído</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                        <span><strong className="text-foreground">{grp.rows.length}</strong> influencer{grp.rows.length === 1 ? "" : "s"}</span>
                        <span>· {grp.rows.reduce((s: number, i: any) => s + (i.followers || 0), 0).toLocaleString()} seguidores</span>
                      </div>
                    </div>
                    <div className="overflow-x-auto invisible-scroll">
                      <table className="data-table">
                        <thead>
                          <tr><th>Nome</th><th>Instagram</th><th>Seguidores</th><th>%</th><th>Slug</th><th>Link</th><th>Status</th><th className="text-right">Ações</th></tr>
                        </thead>
                        <tbody>
                          {grp.rows.map((inf: any) => (
                            <tr key={inf.id}>
                              <td>
                                <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate(`/influencers/${inf.id}`)}>
                                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: color }}>
                                    {inf.name.charAt(0).toUpperCase()}
                                  </div>
                                  <span className="font-medium hover:text-accent transition-colors">{inf.name}</span>
                                </div>
                              </td>
                              <td className="text-accent text-xs">{inf.instagram || "—"}</td>
                              <td className="text-xs">{(inf.followers || 0).toLocaleString()}</td>
                              <td className="text-xs">{inf.commission_percent || 0}%</td>
                              <td className="font-mono text-xs text-accent">{inf.slug}</td>
                              <td className="text-xs">{inf.affiliate_link ? <span className="text-success">✓</span> : <span className="text-muted-foreground">—</span>}</td>
                              <td><span className={inf.is_active ? "badge-success" : "badge-danger"}>{inf.is_active ? "Ativo" : "Inativo"}</span></td>
                              <td className="text-right">
                                <div className="flex justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
                                  <button onClick={() => setQuickLinkFor(inf.id)} className="p-1 rounded hover:bg-primary/15 text-primary transition-colors" title="Cadastrar link de afiliado">
                                    <Link2 size={12} />
                                  </button>
                                  <button onClick={() => navigate(`/influencers/${inf.id}`)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground" title="Abrir"><Eye size={12} /></button>
                                  <button onClick={() => openEditInf(inf)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground" title="Editar"><Edit size={12} /></button>
                                  {inf.is_active ? (
                                    <button onClick={() => setConfirmDeactivate(inf)} className="p-1 rounded hover:bg-destructive/15 text-muted-foreground hover:text-destructive" title="Desativar"><XCircle size={12} /></button>
                                  ) : (
                                    <button onClick={() => toggleInf({ id: inf.id, current: inf.is_active ?? false })} className="p-1 rounded hover:bg-success/15 text-muted-foreground hover:text-success" title="Ativar"><CheckCircle size={12} /></button>
                                  )}
                                  <button onClick={() => setConfirmDelete(inf)} className="p-1 rounded hover:bg-destructive/15 text-muted-foreground hover:text-destructive" title="Apagar"><Trash2 size={12} /></button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Managers ────────────────────────────────────────── */}
        <TabsContent value="managers" className="space-y-4 mt-4">
          <div className="flex items-center gap-2 bg-secondary/50 border border-border rounded-lg px-3 py-1.5 max-w-xs">
            <Search size={13} className="text-muted-foreground shrink-0" />
            <input value={mgrSearch} onChange={(e) => setMgrSearch(e.target.value)} placeholder="Buscar gerente ou time…" className="bg-transparent text-xs focus:outline-none w-full" />
          </div>

          {filteredMgrs.length === 0 ? (
            <div className="glass-card flex flex-col items-center justify-center py-16 text-muted-foreground">
              <UserCheck size={36} className="mb-3 opacity-30" />
              <p className="text-sm font-medium">Nenhum gerente cadastrado</p>
              <p className="text-xs mt-1">Cadastre um gerente para criar times de influencers.</p>
              <button className="btn-primary mt-4" onClick={openCreateMgr}><Plus size={14} /> Novo gerente</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredMgrs.map((m: ManagerRow) => {
                const teamInfs = influencers.filter((i: any) => i.manager_id === m.id);
                const active = teamInfs.filter((i: any) => i.is_active).length;
                return (
                  <div key={m.id} className="glass-card p-4 space-y-3" style={{ borderLeft: `3px solid ${m.team_color}` }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ background: m.team_color }} />
                          <p className="text-sm font-semibold truncate">{m.team_name}</p>
                          {!m.is_active && <span className="badge-danger text-[9px]">Inativo</span>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 truncate">Gerente · {m.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{m.slug}</p>
                      </div>
                      <div className="flex gap-0.5">
                        <button onClick={() => openEditMgr(m)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground" title="Editar"><Edit size={12} /></button>
                        <button onClick={() => toggleMgr({ id: m.id, current: m.is_active })} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground" title={m.is_active ? "Desativar" : "Ativar"}>
                          {m.is_active ? <XCircle size={12} /> : <CheckCircle size={12} />}
                        </button>
                        <button onClick={() => setConfirmDeleteMgr(m)} className="p-1 rounded hover:bg-destructive/15 text-muted-foreground hover:text-destructive" title="Apagar"><Trash2 size={12} /></button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-border">
                      <div>
                        <p className="text-base font-bold">{teamInfs.length}</p>
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Influencers</p>
                      </div>
                      <div>
                        <p className="text-base font-bold text-success">{active}</p>
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Ativos</p>
                      </div>
                      <div>
                        <p className="text-base font-bold">{m.monthly_goal ? `R$ ${(m.monthly_goal / 1000).toFixed(0)}k` : "—"}</p>
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Meta/mês</p>
                      </div>
                    </div>

                    <button
                      className="w-full text-[10px] text-accent hover:underline flex items-center justify-center gap-1"
                      onClick={() => { setTab("influencers"); setFilterTeam(m.team_name); }}
                    >
                      Ver time <ChevronRight size={11} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Influencer modal ─────────────────────────────────── */}
      <Dialog open={infModalOpen} onOpenChange={setInfModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingInf?.id ? "Editar Influencer" : "Novo Influencer"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">Nome *</label><input className="input-field mt-1" value={editingInf?.name || ""} onChange={(e) => setEditingInf((p) => p ? { ...p, name: e.target.value } : p)} /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Slug *</label><input className="input-field mt-1" value={editingInf?.slug || ""} onChange={(e) => setEditingInf((p) => p ? { ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") } : p)} placeholder="ex: rafa" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">Instagram</label><input className="input-field mt-1" value={editingInf?.instagram || ""} onChange={(e) => setEditingInf((p) => p ? { ...p, instagram: e.target.value } : p)} /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Seguidores</label><input type="number" className="input-field mt-1" value={editingInf?.followers || ""} onChange={(e) => setEditingInf((p) => p ? { ...p, followers: e.target.value ? Number(e.target.value) : null } : p)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Gerente / Time</label>
                <select
                  className="select-field mt-1 w-full"
                  value={editingInf?.manager_id || ""}
                  onChange={(e) => setEditingInf((p) => p ? { ...p, manager_id: e.target.value || null } : p)}
                >
                  <option value="">Sem time</option>
                  {managers.map((m: ManagerRow) => (
                    <option key={m.id} value={m.id}>{m.team_name} — {m.name}</option>
                  ))}
                </select>
              </div>
              <div><label className="text-xs font-medium text-muted-foreground">% Comissão</label><input type="number" className="input-field mt-1" value={editingInf?.commission_percent ?? 15} onChange={(e) => setEditingInf((p) => p ? { ...p, commission_percent: Number(e.target.value) } : p)} /></div>
            </div>
            <div><label className="text-xs font-medium text-muted-foreground">Link de afiliado (padrão)</label><input className="input-field mt-1 font-mono text-xs" value={editingInf?.affiliate_link || ""} onChange={(e) => setEditingInf((p) => p ? { ...p, affiliate_link: e.target.value } : p)} placeholder="https://1wxxx.com/…"/></div>
            <div><label className="text-xs font-medium text-muted-foreground">Observações</label><textarea className="input-field mt-1 min-h-[60px]" value={editingInf?.notes || ""} onChange={(e) => setEditingInf((p) => p ? { ...p, notes: e.target.value } : p)} /></div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={editingInf?.is_active ?? true} onChange={(e) => setEditingInf((p) => p ? { ...p, is_active: e.target.checked } : p)} /> Ativo
            </div>
          </div>
          <DialogFooter>
            <button className="btn-ghost" onClick={() => setInfModalOpen(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleSaveInf} disabled={infCreating || infUpdating}>
              {infCreating || infUpdating ? "Salvando…" : "Salvar"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Manager modal ────────────────────────────────────── */}
      <Dialog open={mgrModalOpen} onOpenChange={setMgrModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingMgr?.id ? "Editar Gerente" : "Novo Gerente"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">Nome *</label><input className="input-field mt-1" value={editingMgr?.name || ""} onChange={(e) => setEditingMgr((p) => p ? { ...p, name: e.target.value } : p)} /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Slug *</label><input className="input-field mt-1" value={editingMgr?.slug || ""} onChange={(e) => setEditingMgr((p) => p ? { ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") } : p)} placeholder="ex: joao-silva" /></div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Nome do time *</label>
              <input className="input-field mt-1" value={editingMgr?.team_name || ""} onChange={(e) => setEditingMgr((p) => p ? { ...p, team_name: e.target.value } : p)} placeholder="Time A, Time Sete…" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Cor do time</label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {TEAM_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`w-7 h-7 rounded-full border-2 transition-all ${editingMgr?.team_color === c ? "border-foreground scale-110" : "border-transparent"}`}
                    style={{ background: c }}
                    onClick={() => setEditingMgr((p) => p ? { ...p, team_color: c } : p)}
                  />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Meta mensal (R$)</label>
                <input type="number" className="input-field mt-1" value={editingMgr?.monthly_goal || ""} onChange={(e) => setEditingMgr((p) => p ? { ...p, monthly_goal: e.target.value ? Number(e.target.value) : null } : p)} placeholder="50000" />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-xs text-muted-foreground pb-2">
                  <input type="checkbox" checked={editingMgr?.is_active ?? true} onChange={(e) => setEditingMgr((p) => p ? { ...p, is_active: e.target.checked } : p)} /> Ativo
                </label>
              </div>
            </div>
            <div><label className="text-xs font-medium text-muted-foreground">Observações</label><textarea className="input-field mt-1 min-h-[60px]" value={editingMgr?.notes || ""} onChange={(e) => setEditingMgr((p) => p ? { ...p, notes: e.target.value } : p)} /></div>
          </div>
          <DialogFooter>
            <button className="btn-ghost" onClick={() => setMgrModalOpen(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleSaveMgr} disabled={mgrCreating || mgrUpdating}>
              {mgrCreating || mgrUpdating ? "Salvando…" : "Salvar"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirms */}
      <Dialog open={!!confirmDeactivate} onOpenChange={() => setConfirmDeactivate(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Desativar Influencer</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Desativar <strong>{confirmDeactivate?.name}</strong>? Seus links e LPs serão pausados.</p>
          <DialogFooter>
            <button className="btn-ghost" onClick={() => setConfirmDeactivate(null)}>Cancelar</button>
            <button className="btn-primary bg-destructive hover:bg-destructive/90" onClick={async () => { if (confirmDeactivate) { await toggleInf({ id: confirmDeactivate.id, current: confirmDeactivate.is_active ?? true }); setConfirmDeactivate(null); } }}>Desativar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Apagar Influencer</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Apagar <strong>{confirmDelete?.name}</strong> permanentemente? Esta ação não pode ser desfeita.</p>
          <DialogFooter>
            <button className="btn-ghost" onClick={() => setConfirmDelete(null)}>Cancelar</button>
            <button className="btn-primary bg-destructive hover:bg-destructive/90" onClick={async () => { if (confirmDelete) { await removeInf(confirmDelete.id); setConfirmDelete(null); } }}>Apagar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDeleteMgr} onOpenChange={() => setConfirmDeleteMgr(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Apagar Gerente</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Apagar o gerente <strong>{confirmDeleteMgr?.name}</strong> e dissociar seu time? Os influencers ficarão sem time.</p>
          <DialogFooter>
            <button className="btn-ghost" onClick={() => setConfirmDeleteMgr(null)}>Cancelar</button>
            <button className="btn-primary bg-destructive hover:bg-destructive/90" onClick={async () => { if (confirmDeleteMgr) { await removeMgr(confirmDeleteMgr.id); setConfirmDeleteMgr(null); } }}>Apagar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unified Quick Link dialog */}
      <QuickLinkDialog
        open={!!quickLinkFor}
        onOpenChange={(v) => !v && setQuickLinkFor(null)}
        defaultInfluencerId={quickLinkFor || ""}
      />
    </div>
  );
}
