import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Eye, Pencil, ShieldCheck, User as UserIcon, X, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Row {
  id: string;
  email: string | null;
  full_name: string | null;
  is_active: boolean | null;
  last_sign_in_at: string | null;
  influencer_id: string | null;
  manager_id: string | null;
  role: AppRole | null;
}

const ROLE_OPTIONS: { value: AppRole; label: string }[] = [
  { value: "admin_master", label: "Admin Master" },
  { value: "socio", label: "Sócio" },
  { value: "financeiro", label: "Financeiro" },
  { value: "operacao", label: "Operação" },
  { value: "conteudo", label: "Conteúdo" },
  { value: "gerente", label: "Gerente" },
  { value: "influencer", label: "Influenciador" },
  { value: "visualizacao", label: "Visualização" },
];

const roleBadge = (role: AppRole | null) => {
  if (!role) return "bg-secondary/60 text-muted-foreground";
  if (role === "admin_master" || role === "socio") return "bg-primary/15 text-primary border-primary/30";
  if (role === "gerente") return "bg-amber-500/15 text-amber-300 border-amber-500/30";
  if (role === "influencer") return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
  return "bg-secondary/60 text-foreground/80 border-border/60";
};

export default function UsersAccessSection() {
  const { isAdmin, setPreviewAs } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [influencers, setInfluencers] = useState<{ id: string; name: string }[]>([]);
  const [managers, setManagers] = useState<{ id: string; name: string }[]>([]);

  const load = async () => {
    setLoading(true);
    const [{ data: profiles }, { data: roles }, { data: infs }, { data: mgrs }] = await Promise.all([
      supabase.from("profiles").select("id, email, full_name, is_active, last_sign_in_at, influencer_id, manager_id").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("influencers").select("id, name").order("name"),
      supabase.from("managers").select("id, name").order("name"),
    ]);
    const roleMap = new Map<string, AppRole>();
    for (const r of roles ?? []) roleMap.set(r.user_id, r.role as AppRole);
    setRows((profiles ?? []).map((p: any) => ({ ...p, role: roleMap.get(p.id) ?? null })));
    setInfluencers(infs ?? []);
    setManagers(mgrs ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const previewAs = (kind: "influencer" | "gerente") => {
    setPreviewAs(kind);
    navigate(kind === "influencer" ? "/portal" : "/gerente");
  };

  const filtered = rows.filter((r) =>
    !q || (r.email ?? "").toLowerCase().includes(q.toLowerCase()) || (r.full_name ?? "").toLowerCase().includes(q.toLowerCase())
  );

  if (!isAdmin) {
    return (
      <div className="glass-card p-6 text-sm text-muted-foreground">
        Você não tem permissão para gerenciar usuários.
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Preview as */}
      <div className="glass-card p-5">
        <h3 className="section-title flex items-center gap-2"><Eye size={13} /> Pré-visualizar portais</h3>
        <p className="text-xs text-muted-foreground mb-3">Veja como cada papel enxerga a plataforma, sem trocar de conta.</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => previewAs("influencer")} className="btn-primary">
            <UserIcon size={13} /> Ver como Influenciador
          </button>
          <button onClick={() => previewAs("gerente")} className="btn-primary">
            <ShieldCheck size={13} /> Ver como Gerente
          </button>
        </div>
      </div>

      {/* Users list */}
      <div className="glass-card p-5 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="section-title">Usuários & Acessos</h3>
            <p className="text-xs text-muted-foreground">Papéis, vínculos e status de cada usuário.</p>
          </div>
          <input
            className="input-field max-w-xs"
            placeholder="Buscar por nome ou e-mail…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-[13px] min-w-[720px]">
            <thead className="text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left py-2">Usuário</th>
                <th className="text-left py-2">Papel</th>
                <th className="text-left py-2">Vínculo</th>
                <th className="text-left py-2">Status</th>
                <th className="text-right py-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">Carregando…</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Nenhum usuário encontrado.</td></tr>}
              {filtered.map((r) => {
                const linkedInf = r.influencer_id && influencers.find((i) => i.id === r.influencer_id)?.name;
                const linkedMgr = r.manager_id && managers.find((m) => m.id === r.manager_id)?.name;
                return (
                  <tr key={r.id} className="border-t border-border/40">
                    <td className="py-2.5">
                      <div className="font-medium">{r.full_name || "—"}</div>
                      <div className="text-[11px] text-muted-foreground">{r.email}</div>
                    </td>
                    <td className="py-2.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] ${roleBadge(r.role)}`}>
                        {ROLE_OPTIONS.find((o) => o.value === r.role)?.label ?? "—"}
                      </span>
                    </td>
                    <td className="py-2.5 text-muted-foreground">
                      {linkedInf ? <>👤 {linkedInf}</> : linkedMgr ? <>🎯 {linkedMgr}</> : <span className="opacity-60">—</span>}
                    </td>
                    <td className="py-2.5">
                      {r.is_active === false
                        ? <span className="text-[11px] text-muted-foreground">Desativado</span>
                        : <span className="text-[11px] text-emerald-400 inline-flex items-center gap-1"><Check size={11} /> Ativo</span>}
                    </td>
                    <td className="py-2.5 text-right">
                      <button onClick={() => setEditing(r)} className="btn-ghost text-xs inline-flex items-center gap-1">
                        <Pencil size={11} /> Editar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <EditUserDialog
          user={editing}
          influencers={influencers}
          managers={managers}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </div>
  );
}

function EditUserDialog({
  user, influencers, managers, onClose, onSaved,
}: {
  user: Row;
  influencers: { id: string; name: string }[];
  managers: { id: string; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [role, setRole] = useState<AppRole>(user.role ?? "visualizacao");
  const [influencerId, setInfluencerId] = useState<string>(user.influencer_id ?? "");
  const [managerId, setManagerId] = useState<string>(user.manager_id ?? "");
  const [isActive, setIsActive] = useState<boolean>(user.is_active !== false);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      // Upsert role
      await supabase.from("user_roles").delete().eq("user_id", user.id);
      await supabase.from("user_roles").insert({ user_id: user.id, role });

      await supabase.from("profiles").update({
        influencer_id: role === "influencer" ? (influencerId || null) : null,
        manager_id: role === "gerente" ? (managerId || null) : null,
        is_active: isActive,
      }).eq("id", user.id);

      toast({ title: "Usuário atualizado" });
      onSaved();
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm p-4">
      <div className="glass-card w-full max-w-lg p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="section-title">Editar usuário</h3>
            <p className="text-[11px] text-muted-foreground">{user.email}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-secondary/60 text-muted-foreground"><X size={14} /></button>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Papel</label>
          <select className="select-field w-full" value={role} onChange={(e) => setRole(e.target.value as AppRole)}>
            {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {role === "influencer" && (
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Vincular ao Influenciador</label>
            <select className="select-field w-full" value={influencerId} onChange={(e) => setInfluencerId(e.target.value)}>
              <option value="">— Selecionar —</option>
              {influencers.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>
        )}

        {role === "gerente" && (
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Vincular ao Gerente</label>
            <select className="select-field w-full" value={managerId} onChange={(e) => setManagerId(e.target.value)}>
              <option value="">— Selecionar —</option>
              {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        )}

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded" />
          <span>Usuário ativo</span>
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="btn-ghost text-sm">Cancelar</button>
          <button onClick={save} disabled={saving} className="btn-primary">
            {saving ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
