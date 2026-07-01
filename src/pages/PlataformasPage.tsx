import { useState } from "react";
import { Plus, Edit, Eye, XCircle, CheckCircle, Copy, Search, Globe, Link2, MoreHorizontal, RefreshCw, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { usePlatforms } from "@/hooks/useSupabaseQuery";
import type { PlatformRow } from "@/services/supabaseService";
import { toast } from "@/hooks/use-toast";
import Breadcrumbs from "@/components/Breadcrumbs";
import ExportDropdown from "@/components/ExportDropdown";
import { supabase } from "@/integrations/supabase/client";

type EditingState = {
  id?: string;
  name: string;
  commission_type: string;
  revshare: number | null;
  cpa: number | null;
  hybrid: boolean;
  currency: string;
  payout_method: string;
  affiliate_manager: string;
  notes: string;
  is_active: boolean;
};

const emptyEditing: EditingState = {
  name: "", commission_type: "Revenue Share", revshare: null, cpa: null,
  hybrid: false, currency: "BRL", payout_method: "Mensal",
  affiliate_manager: "", notes: "", is_active: true,
};

export default function PlataformasPage() {
  const navigate = useNavigate();
  const { data, isLoading, create, update, toggle, isCreating, isUpdating } = usePlatforms();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [filterTipo, setFilterTipo] = useState("Todos");
  const [refreshing, setRefreshing] = useState(false);
  const [refreshStatus, setRefreshStatus] = useState<null | { ok: boolean; message: string; details?: any; at: string }>(null);

  const refreshHypedGames = async () => {
    setRefreshing(true);
    setRefreshStatus({ ok: true, message: "Executando…", at: new Date().toLocaleTimeString("pt-BR") });
    try {
      const { data: resp, error } = await supabase.functions.invoke("hyped-games-refresh", { body: {} });
      if (error) throw error;
      const updated = resp?.updated ?? resp?.count ?? resp?.platforms_updated;
      const msg = updated != null
        ? `Jogos hypados atualizados (${updated} plataforma${updated === 1 ? "" : "s"}).`
        : "Jogos hypados atualizados.";
      setRefreshStatus({ ok: true, message: msg, details: resp, at: new Date().toLocaleTimeString("pt-BR") });
      toast({ title: "Atualização concluída", description: msg });
    } catch (e: any) {
      const msg = e?.message || "Falha ao atualizar jogos hypados.";
      setRefreshStatus({ ok: false, message: msg, at: new Date().toLocaleTimeString("pt-BR") });
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setRefreshing(false);
    }
  };

  const filtered = data.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus === "Ativo" && !p.is_active) return false;
    if (filterStatus === "Inativo" && p.is_active) return false;
    if (filterTipo !== "Todos" && p.commission_type !== filterTipo) return false;
    return true;
  });

  const activeCount = data.filter(p => p.is_active).length;

  const stats = [
    { label: "Total", value: String(data.length), icon: Globe },
    { label: "Ativas", value: String(activeCount), icon: CheckCircle },
    { label: "Inativas", value: String(data.length - activeCount), icon: XCircle },
    { label: "Com integração", value: String(data.filter(p => p.commission_type).length), icon: Link2 },
  ];

  const openCreate = () => { setEditing({ ...emptyEditing }); setModalOpen(true); };
  const openEdit = (p: PlatformRow) => {
    setEditing({
      id: p.id, name: p.name, commission_type: p.commission_type || "Revenue Share",
      revshare: p.revshare, cpa: p.cpa, hybrid: p.hybrid ?? false,
      currency: p.currency || "BRL", payout_method: p.payout_method || "Mensal",
      affiliate_manager: p.affiliate_manager || "", notes: p.notes || "", is_active: p.is_active ?? true,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!editing?.name) { toast({ title: "Erro", description: "Nome é obrigatório.", variant: "destructive" }); return; }
    try {
      if (editing.id) {
        await update({ id: editing.id, updates: {
          name: editing.name, commission_type: editing.commission_type || null,
          revshare: editing.revshare, cpa: editing.cpa, hybrid: editing.hybrid,
          currency: editing.currency || null, payout_method: editing.payout_method || null,
          affiliate_manager: editing.affiliate_manager || null, notes: editing.notes || null,
          is_active: editing.is_active,
        }});
      } else {
        await create({
          name: editing.name, commission_type: editing.commission_type || null,
          revshare: editing.revshare, cpa: editing.cpa, hybrid: editing.hybrid,
          currency: editing.currency || null, payout_method: editing.payout_method || null,
          affiliate_manager: editing.affiliate_manager || null, notes: editing.notes || null,
          is_active: editing.is_active,
        });
      }
      setModalOpen(false);
    } catch { /* hook handles toast */ }
  };

  const handleToggle = async (p: PlatformRow) => {
    await toggle({ id: p.id, current: p.is_active ?? true });
  };

  const copyLink = (p: PlatformRow) => {
    navigator.clipboard.writeText(`https://playbet.com/plat/${p.name.toLowerCase()}`);
    toast({ title: "Link copiado!" });
  };

  const exportableData = data.map(p => ({
    id: p.id, name: p.name, commission_type: p.commission_type || "",
    revshare: p.revshare || 0, cpa: p.cpa || 0, currency: p.currency || "",
    payout_method: p.payout_method || "", status: p.is_active ? "Ativo" : "Inativo",
  }));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: "Gestão de Ativos", path: "/plataformas" }, { label: "Plataformas" }]} />
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3" />
          <span className="text-sm">Carregando plataformas...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Gestão de Ativos", path: "/plataformas" }, { label: "Plataformas" }]} />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-header">Plataformas</h1>
          <p className="page-subtitle">Parceiros, modelos de comissão e status operacional</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <button
            className="btn-ghost flex items-center gap-1.5"
            onClick={refreshHypedGames}
            disabled={refreshing}
            title="Atualiza os jogos hypados de todas as plataformas via IA"
          >
            {refreshing
              ? <RefreshCw size={14} className="animate-spin" />
              : <Sparkles size={14} />}
            {refreshing ? "Atualizando jogos..." : "Atualizar jogos"}
          </button>
          <ExportDropdown data={exportableData} filename="plataformas-playbet" />
          <button className="btn-primary" onClick={openCreate}><Plus size={14} /> Adicionar</button>
        </div>
      </div>

      {refreshStatus && (
        <div className={`glass-card p-3 text-xs flex items-center gap-2 ${refreshStatus.ok ? "text-foreground" : "text-destructive"}`}>
          {refreshing
            ? <RefreshCw size={13} className="animate-spin text-accent" />
            : refreshStatus.ok
              ? <CheckCircle size={13} className="text-success" />
              : <XCircle size={13} className="text-destructive" />}
          <span className="font-medium">Jogos hypados:</span>
          <span className="text-muted-foreground">{refreshStatus.message}</span>
          <span className="ml-auto text-[10px] text-muted-foreground/70">{refreshStatus.at}</span>
        </div>
      )}

      {/* KPIs compactos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className="glass-card p-3.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{s.label}</span>
              <s.icon size={13} className="text-muted-foreground/60" />
            </div>
            <div className="text-xl font-semibold tracking-tight">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex items-center gap-2 bg-secondary/50 border border-border rounded-md px-3 py-1.5 flex-1 max-w-xs">
          <Search size={13} className="text-muted-foreground shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar plataforma..." className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none w-full" />
        </div>
        <select className="select-field" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option>Todos</option><option>Ativo</option><option>Inativo</option>
        </select>
        <select className="select-field" value={filterTipo} onChange={e => setFilterTipo(e.target.value)}>
          <option>Todos</option><option>Revenue Share</option><option>CPA</option><option>CPA + RevShare</option><option>Hybrid</option>
        </select>
      </div>

      {/* Tabela enxuta */}
      <div className="glass-card overflow-x-auto invisible-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Plataforma</th>
              <th>Comissão</th>
              <th>Moeda</th>
              <th>Pagamento</th>
              <th>Gerente</th>
              <th>Status</th>
              <th className="w-[1%]"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const comissao = [
                p.revshare ? `${p.revshare}% RS` : null,
                p.cpa ? `R$ ${p.cpa} CPA` : null,
              ].filter(Boolean).join(" + ") || "-";
              return (
                <tr key={p.id}>
                  <td>
                    <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate(`/plataformas/${p.id}`)}>
                      <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-[10px] font-semibold text-accent">{p.name.charAt(0)}</div>
                      <div className="flex flex-col">
                        <span className="font-medium text-[13px] hover:text-accent transition-colors">{p.name}</span>
                        <span className="text-[10px] text-muted-foreground">{p.commission_type || "Sem tipo"}</span>
                      </div>
                    </div>
                  </td>
                  <td className="text-xs">{comissao}</td>
                  <td className="text-xs">{p.currency || "BRL"}</td>
                  <td className="text-xs">{p.payout_method || "-"}</td>
                  <td className="text-xs">{p.affiliate_manager || "-"}</td>
                  <td><span className={p.is_active ? "badge-success" : "badge-danger"}>{p.is_active ? "Ativo" : "Inativo"}</span></td>
                  <td onClick={e => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Ações">
                          <MoreHorizontal size={14} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => navigate(`/plataformas/${p.id}`)}>
                          <Eye size={13} className="mr-2" /> Ver detalhe
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEdit(p)}>
                          <Edit size={13} className="mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => copyLink(p)}>
                          <Copy size={13} className="mr-2" /> Copiar link
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleToggle(p)} className={p.is_active ? "text-destructive focus:text-destructive" : "text-success focus:text-success"}>
                          {p.is_active ? <XCircle size={13} className="mr-2" /> : <CheckCircle size={13} className="mr-2" />}
                          {p.is_active ? "Desativar" : "Ativar"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar Plataforma" : "Adicionar Plataforma"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><label className="text-xs font-medium text-muted-foreground">Nome *</label><input className="input-field mt-1" value={editing?.name || ""} onChange={e => setEditing(p => p ? { ...p, name: e.target.value } : p)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">Tipo Comissão</label>
                <select className="select-field mt-1 w-full" value={editing?.commission_type || ""} onChange={e => setEditing(p => p ? { ...p, commission_type: e.target.value } : p)}>
                  <option>Revenue Share</option><option>CPA</option><option>CPA + RevShare</option><option>Hybrid</option>
                </select>
              </div>
              <div><label className="text-xs font-medium text-muted-foreground">Status</label>
                <select className="select-field mt-1 w-full" value={editing?.is_active ? "Ativo" : "Inativo"} onChange={e => setEditing(p => p ? { ...p, is_active: e.target.value === "Ativo" } : p)}>
                  <option>Ativo</option><option>Inativo</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">RevShare (%)</label><input type="number" className="input-field mt-1" value={editing?.revshare ?? ""} onChange={e => setEditing(p => p ? { ...p, revshare: e.target.value ? Number(e.target.value) : null } : p)} /></div>
              <div><label className="text-xs font-medium text-muted-foreground">CPA (R$)</label><input type="number" className="input-field mt-1" value={editing?.cpa ?? ""} onChange={e => setEditing(p => p ? { ...p, cpa: e.target.value ? Number(e.target.value) : null } : p)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">Moeda</label><input className="input-field mt-1" value={editing?.currency || ""} onChange={e => setEditing(p => p ? { ...p, currency: e.target.value } : p)} /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Pagamento</label>
                <select className="select-field mt-1 w-full" value={editing?.payout_method || "Mensal"} onChange={e => setEditing(p => p ? { ...p, payout_method: e.target.value } : p)}>
                  <option>Semanal</option><option>Quinzenal</option><option>Mensal</option>
                </select>
              </div>
            </div>
            <div><label className="text-xs font-medium text-muted-foreground">Gerente de Afiliados</label><input className="input-field mt-1" value={editing?.affiliate_manager || ""} onChange={e => setEditing(p => p ? { ...p, affiliate_manager: e.target.value } : p)} /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Observações</label><textarea className="input-field mt-1 min-h-[60px]" value={editing?.notes || ""} onChange={e => setEditing(p => p ? { ...p, notes: e.target.value } : p)} /></div>
          </div>
          <DialogFooter>
            <button className="btn-ghost" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleSave} disabled={isCreating || isUpdating}>
              {isCreating || isUpdating ? "Salvando..." : "Salvar"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
