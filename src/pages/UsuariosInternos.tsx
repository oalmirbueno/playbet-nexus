import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Users, UserPlus, Search, Mail, Shield, Link2, MoreVertical, KeyRound, Ban, CheckCircle2, Loader2, X } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import EmptyState from "@/components/EmptyState";

interface UserRow {
  user_id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  last_sign_in_at: string | null;
  confirmed: boolean;
  roles: AppRole[];
  influencer_id: string | null;
  manager_id: string | null;
  influencer: { id: string; name: string; slug: string } | null;
  manager: { id: string; name: string; slug: string; team_name: string } | null;
}

const ROLE_META: Record<string, { label: string; className: string }> = {
  admin_master: { label: "Admin", className: "bg-primary/15 text-primary border-primary/30" },
  socio: { label: "Sócio", className: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  financeiro: { label: "Financeiro", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  operacao: { label: "Operação", className: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30" },
  conteudo: { label: "Conteúdo", className: "bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30" },
  gerente: { label: "Gerente", className: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30" },
  influencer: { label: "Influencer", className: "bg-pink-500/15 text-pink-400 border-pink-500/30" },
  visualizacao: { label: "Visualização", className: "bg-secondary text-muted-foreground border-border" },
};

const ALL_ROLES: AppRole[] = ["admin_master", "socio", "financeiro", "operacao", "conteudo", "gerente", "influencer", "visualizacao"];

export default function UsuariosInternos() {
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "admin" | "gerente" | "influencer" | "sem_role">("all");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [linkTarget, setLinkTarget] = useState<UserRow | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const call = useCallback(async (body: Record<string, any>) => {
    const { data, error } = await supabase.functions.invoke("admin-user-manage", { body });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return data;
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await call({ action: "list_users" });
      setRows(data.rows ?? []);
    } catch (e: any) {
      toast({ title: "Erro ao carregar usuários", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [call]);

  useEffect(() => {
    if (!isAdmin) { setLoading(false); return; }
    load();

    const channel = supabase
      .channel("users-admin-rt")
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "profiles" }, () => load())
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "user_roles" }, () => load())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isAdmin, load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === "admin" && !r.roles.some((x) => x === "admin_master" || x === "socio")) return false;
      if (filter === "gerente" && !r.roles.includes("gerente")) return false;
      if (filter === "influencer" && !r.roles.includes("influencer")) return false;
      if (filter === "sem_role" && r.roles.length > 0) return false;
      if (!q) return true;
      return (r.email + " " + r.full_name).toLowerCase().includes(q);
    });
  }, [rows, query, filter]);

  const handleAction = async (action: string, payload: Record<string, any>, id: string, successMsg: string) => {
    setBusy(id);
    try {
      await call({ action, ...payload });
      toast({ title: successMsg });
      await load();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="glass-card p-8">
        <EmptyState icon={Shield} title="Acesso restrito" description="Apenas administradores gerenciam usuários." />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <Breadcrumbs items={[{ label: "Sistema" }, { label: "Usuários" }]} />
        <div className="flex items-center justify-between mt-1 flex-wrap gap-3">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight">Usuários</h1>
            <p className="text-[13px] text-muted-foreground">Convites, papéis e vínculos com influencers/gerentes — sincronizado em tempo real com o painel geral.</p>
          </div>
          <button onClick={() => setInviteOpen(true)} className="btn-primary text-[12.5px] px-3 py-2 inline-flex items-center gap-1.5">
            <UserPlus size={14} /> Convidar usuário
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome ou e-mail…"
            className="w-full pl-9 pr-3 py-2 text-[13px] rounded-lg bg-secondary/40 border border-border/60 outline-none focus:border-primary/60"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[
            ["all", "Todos"],
            ["admin", "Admin"],
            ["gerente", "Gerentes"],
            ["influencer", "Influencers"],
            ["sem_role", "Sem vínculo"],
          ].map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v as any)}
              className={`px-3 py-1.5 rounded-lg text-[12px] border transition-colors ${filter === v ? "bg-primary/15 border-primary/40 text-primary" : "bg-secondary/40 border-border/60 text-muted-foreground hover:text-foreground"}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Table (desktop) / Cards (mobile) */}
      <div className="glass-card p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 flex items-center justify-center gap-2 text-muted-foreground text-sm">
            <Loader2 size={14} className="animate-spin" /> Carregando…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8"><EmptyState icon={Users} title="Nenhum usuário encontrado" description="Ajuste os filtros ou convide alguém." /></div>
        ) : (
          <>
            {/* Desktop table */}
            <table className="hidden md:table w-full text-[13px]">
              <thead className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border/60">
                <tr>
                  <th className="px-4 py-3 font-medium">Usuário</th>
                  <th className="px-4 py-3 font-medium">Papel</th>
                  <th className="px-4 py-3 font-medium">Vínculo</th>
                  <th className="px-4 py-3 font-medium">Último acesso</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <UserRowDesktop key={u.user_id} u={u} busy={busy === u.user_id}
                    onSetRole={(role) => handleAction("set_role", { target_user_id: u.user_id, role }, u.user_id, "Papel atualizado")}
                    onLink={() => setLinkTarget(u)}
                    onRecovery={() => handleAction("send_recovery", { email: u.email }, u.user_id, "E-mail de recuperação gerado")}
                    onToggleActive={() => handleAction("set_active", { target_user_id: u.user_id, is_active: !u.is_active }, u.user_id, u.is_active ? "Usuário desativado" : "Usuário ativado")}
                  />
                ))}
              </tbody>
            </table>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-border/50">
              {filtered.map((u) => <UserCardMobile key={u.user_id} u={u} onSetLink={() => setLinkTarget(u)} onRecovery={() => handleAction("send_recovery", { email: u.email }, u.user_id, "E-mail enviado")} onToggleActive={() => handleAction("set_active", { target_user_id: u.user_id, is_active: !u.is_active }, u.user_id, u.is_active ? "Desativado" : "Ativado")} busy={busy === u.user_id} />)}
            </div>
          </>
        )}
      </div>

      {inviteOpen && <InviteDrawer onClose={() => setInviteOpen(false)} onDone={() => { setInviteOpen(false); load(); }} call={call} />}
      {linkTarget && <LinkDrawer user={linkTarget} onClose={() => setLinkTarget(null)} onDone={() => { setLinkTarget(null); load(); }} call={call} />}
    </div>
  );
}

/* ---------------- Row components ---------------- */

function RoleBadge({ role }: { role: AppRole }) {
  const meta = ROLE_META[role] ?? { label: role, className: "bg-secondary text-muted-foreground border-border" };
  return <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] border ${meta.className}`}>{meta.label}</span>;
}

function Avatar({ u }: { u: UserRow }) {
  const initial = (u.full_name || u.email || "?").charAt(0).toUpperCase();
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-primary-foreground text-[11px] font-semibold shrink-0">
      {initial}
    </div>
  );
}

function LinkLabel({ u }: { u: UserRow }) {
  if (u.influencer) return <span className="text-[12px] text-pink-400/90">Influencer · {u.influencer.name}</span>;
  if (u.manager) return <span className="text-[12px] text-indigo-400/90">Gerente · {u.manager.name}</span>;
  return <span className="text-[12px] text-muted-foreground">—</span>;
}

function UserRowDesktop({ u, busy, onSetRole, onLink, onRecovery, onToggleActive }: {
  u: UserRow; busy: boolean;
  onSetRole: (role: AppRole) => void;
  onLink: () => void;
  onRecovery: () => void;
  onToggleActive: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <tr className="border-b border-border/40 hover:bg-secondary/20">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar u={u} />
          <div className="min-w-0">
            <div className="font-medium truncate">{u.full_name || u.email.split("@")[0]}</div>
            <div className="text-[11px] text-muted-foreground truncate">{u.email}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {u.roles.length === 0 ? <span className="text-[11px] text-muted-foreground italic">sem papel</span> : u.roles.map((r) => <RoleBadge key={r} role={r} />)}
          <select value="" onChange={(e) => { if (e.target.value) onSetRole(e.target.value as AppRole); }}
            className="ml-1 text-[10px] bg-secondary/40 border border-border/60 rounded px-1 py-0.5 outline-none">
            <option value="">alterar…</option>
            {ALL_ROLES.map((r) => <option key={r} value={r}>{ROLE_META[r]?.label ?? r}</option>)}
          </select>
        </div>
      </td>
      <td className="px-4 py-3"><LinkLabel u={u} /></td>
      <td className="px-4 py-3 text-[12px] text-muted-foreground tabular-nums">
        {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "—"}
      </td>
      <td className="px-4 py-3">
        {u.is_active
          ? <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400"><CheckCircle2 size={11} /> Ativo</span>
          : <span className="inline-flex items-center gap-1 text-[11px] text-destructive"><Ban size={11} /> Inativo</span>}
      </td>
      <td className="px-4 py-3 text-right relative">
        {busy ? <Loader2 size={14} className="animate-spin inline text-muted-foreground" /> : (
          <button onClick={() => setMenuOpen((v) => !v)} className="p-1.5 rounded hover:bg-secondary/60"><MoreVertical size={14} /></button>
        )}
        {menuOpen && (
          <div className="absolute right-4 mt-1 z-10 w-52 rounded-lg border border-border/70 bg-popover shadow-xl overflow-hidden">
            <button onClick={() => { setMenuOpen(false); onLink(); }} className="w-full px-3 py-2 text-left text-[12px] hover:bg-secondary/60 inline-flex items-center gap-2"><Link2 size={12} /> Vincular a influencer/gerente</button>
            <button onClick={() => { setMenuOpen(false); onRecovery(); }} className="w-full px-3 py-2 text-left text-[12px] hover:bg-secondary/60 inline-flex items-center gap-2"><KeyRound size={12} /> Gerar link de recuperação</button>
            <button onClick={() => { setMenuOpen(false); onToggleActive(); }} className={`w-full px-3 py-2 text-left text-[12px] hover:bg-secondary/60 inline-flex items-center gap-2 ${u.is_active ? "text-destructive" : "text-emerald-400"}`}>
              {u.is_active ? <><Ban size={12} /> Desativar</> : <><CheckCircle2 size={12} /> Reativar</>}
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

function UserCardMobile({ u, onSetLink, onRecovery, onToggleActive, busy }: { u: UserRow; onSetLink: () => void; onRecovery: () => void; onToggleActive: () => void; busy: boolean }) {
  return (
    <div className="p-4 flex items-start gap-3">
      <Avatar u={u} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="font-medium truncate">{u.full_name || u.email.split("@")[0]}</div>
            <div className="text-[11px] text-muted-foreground truncate">{u.email}</div>
          </div>
          {busy && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
        </div>
        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
          {u.roles.length === 0 ? <span className="text-[10px] italic text-muted-foreground">sem papel</span> : u.roles.map((r) => <RoleBadge key={r} role={r} />)}
        </div>
        <div className="mt-1.5"><LinkLabel u={u} /></div>
        <div className="mt-3 flex gap-1.5 flex-wrap">
          <button onClick={onSetLink} className="text-[11px] px-2 py-1 rounded bg-secondary/60 border border-border/60 inline-flex items-center gap-1"><Link2 size={11} /> Vincular</button>
          <button onClick={onRecovery} className="text-[11px] px-2 py-1 rounded bg-secondary/60 border border-border/60 inline-flex items-center gap-1"><KeyRound size={11} /> Reset</button>
          <button onClick={onToggleActive} className={`text-[11px] px-2 py-1 rounded border ${u.is_active ? "bg-destructive/10 border-destructive/30 text-destructive" : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"}`}>
            {u.is_active ? "Desativar" : "Ativar"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Invite drawer ---------------- */

function InviteDrawer({ onClose, onDone, call }: { onClose: () => void; onDone: () => void; call: (b: any) => Promise<any> }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<AppRole>("influencer");
  const [influencerId, setInfluencerId] = useState<string>("");
  const [managerId, setManagerId] = useState<string>("");
  const [influencers, setInfluencers] = useState<{ id: string; name: string }[]>([]);
  const [managers, setManagers] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: infs }, { data: mgrs }] = await Promise.all([
        supabase.from("influencers").select("id, name").order("name"),
        supabase.from("managers").select("id, name").order("name"),
      ]);
      setInfluencers(infs ?? []); setManagers(mgrs ?? []);
    })();
  }, []);

  async function submit() {
    if (!email) return;
    setSaving(true);
    try {
      await call({
        action: "invite",
        email, full_name: name || null, role,
        influencer_id: role === "influencer" ? influencerId || null : null,
        manager_id: role === "gerente" ? managerId || null : null,
      });
      toast({ title: "Convite enviado", description: email });
      onDone();
    } catch (e: any) {
      toast({ title: "Erro no convite", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  }

  return (
    <Drawer title="Convidar usuário" onClose={onClose}>
      <div className="space-y-3">
        <Field label="E-mail"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="pessoa@dominio.com" /></Field>
        <Field label="Nome (opcional)"><input value={name} onChange={(e) => setName(e.target.value)} className="input" /></Field>
        <Field label="Papel">
          <select value={role} onChange={(e) => setRole(e.target.value as AppRole)} className="input">
            {ALL_ROLES.map((r) => <option key={r} value={r}>{ROLE_META[r]?.label ?? r}</option>)}
          </select>
        </Field>
        {role === "influencer" && (
          <Field label="Vincular a influencer (opcional)">
            <select value={influencerId} onChange={(e) => setInfluencerId(e.target.value)} className="input">
              <option value="">— nenhum —</option>
              {influencers.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </Field>
        )}
        {role === "gerente" && (
          <Field label="Vincular a gerente (opcional)">
            <select value={managerId} onChange={(e) => setManagerId(e.target.value)} className="input">
              <option value="">— nenhum —</option>
              {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </Field>
        )}
        <div className="pt-2 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 text-[12px] rounded-lg bg-secondary/60">Cancelar</button>
          <button onClick={submit} disabled={saving || !email} className="btn-primary text-[12px] px-3 py-2 inline-flex items-center gap-1.5">
            {saving && <Loader2 size={12} className="animate-spin" />} <Mail size={12} /> Enviar convite
          </button>
        </div>
      </div>
    </Drawer>
  );
}

/* ---------------- Link drawer ---------------- */

function LinkDrawer({ user, onClose, onDone, call }: { user: UserRow; onClose: () => void; onDone: () => void; call: (b: any) => Promise<any> }) {
  const [influencerId, setInfluencerId] = useState<string>(user.influencer_id ?? "");
  const [managerId, setManagerId] = useState<string>(user.manager_id ?? "");
  const [influencers, setInfluencers] = useState<{ id: string; name: string }[]>([]);
  const [managers, setManagers] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: infs }, { data: mgrs }] = await Promise.all([
        supabase.from("influencers").select("id, name").order("name"),
        supabase.from("managers").select("id, name").order("name"),
      ]);
      setInfluencers(infs ?? []); setManagers(mgrs ?? []);
    })();
  }, []);

  async function submit() {
    setSaving(true);
    try {
      await call({
        action: "link_user",
        target_user_id: user.user_id,
        influencer_id: influencerId || null,
        manager_id: managerId || null,
      });
      toast({ title: "Vínculo atualizado" });
      onDone();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  }

  return (
    <Drawer title={`Vincular ${user.full_name || user.email}`} onClose={onClose}>
      <div className="space-y-3">
        <Field label="Influencer">
          <select value={influencerId} onChange={(e) => setInfluencerId(e.target.value)} className="input">
            <option value="">— nenhum —</option>
            {influencers.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        </Field>
        <Field label="Gerente">
          <select value={managerId} onChange={(e) => setManagerId(e.target.value)} className="input">
            <option value="">— nenhum —</option>
            {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </Field>
        <p className="text-[11px] text-muted-foreground">Um usuário pode ser vinculado a um influencer OU a um gerente — nunca aos dois ao mesmo tempo em produção.</p>
        <div className="pt-2 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 text-[12px] rounded-lg bg-secondary/60">Cancelar</button>
          <button onClick={submit} disabled={saving} className="btn-primary text-[12px] px-3 py-2 inline-flex items-center gap-1.5">
            {saving && <Loader2 size={12} className="animate-spin" />} Salvar vínculo
          </button>
        </div>
      </div>
    </Drawer>
  );
}

/* ---------------- Shared ---------------- */

function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full md:max-w-md md:rounded-2xl rounded-t-2xl bg-card border border-border/60 shadow-2xl p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-semibold">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-secondary/60"><X size={14} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
