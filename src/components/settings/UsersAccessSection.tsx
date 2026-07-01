import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Eye, Pencil, ShieldCheck, User as UserIcon, X, Check, KeyRound, Plus, Mail, ShieldAlert } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { APP_MODULES, MODULE_GROUPS, hasModuleAccess } from "@/config/appModules";

interface Row {
  id: string;
  email: string | null;
  full_name: string | null;
  is_active: boolean | null;
  last_sign_in_at: string | null;
  influencer_id: string | null;
  manager_id: string | null;
  phone: string | null;
  notes: string | null;
  allowed_modules: string[] | null;
  denied_modules: string[] | null;
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
  const { isAdmin, setPreviewAs, setPreviewTarget } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [creating, setCreating] = useState(false);
  const [influencers, setInfluencers] = useState<{ id: string; name: string }[]>([]);
  const [managers, setManagers] = useState<{ id: string; name: string }[]>([]);

  const load = async () => {
    setLoading(true);
    const [{ data: profiles }, { data: roles }, { data: infs }, { data: mgrs }] = await Promise.all([
      supabase.from("profiles").select("id, email, full_name, is_active, last_sign_in_at, influencer_id, manager_id, phone, notes, allowed_modules, denied_modules").order("created_at", { ascending: false }),
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
    setPreviewTarget(null);
    setPreviewAs(kind);
    navigate(kind === "influencer" ? "/portal" : "/gerente");
  };

  const viewAsUser = (r: Row) => {
    if (!r.role) {
      toast({ title: "Usuário sem papel definido", variant: "destructive" });
      return;
    }
    setPreviewTarget({
      role: r.role,
      userId: r.id,
      influencerId: r.influencer_id,
      managerId: r.manager_id,
      name: r.full_name,
      email: r.email,
    });
    if (r.role === "influencer") navigate("/portal");
    else if (r.role === "gerente") navigate("/gerente");
    else navigate("/"); // sócio, admin, financeiro, operação, conteúdo, visualização → painel principal
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
            <p className="text-xs text-muted-foreground">Papéis, vínculos, permissões e senha de cada usuário.</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              className="input-field max-w-xs"
              placeholder="Buscar por nome ou e-mail…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <button onClick={() => setCreating(true)} className="btn-primary whitespace-nowrap">
              <Plus size={13} /> Novo usuário
            </button>
          </div>
        </div>

        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-[13px] min-w-[820px]">
            <thead className="text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left py-2">Usuário</th>
                <th className="text-left py-2">Papel</th>
                <th className="text-left py-2">Vínculo</th>
                <th className="text-left py-2">Acessos</th>
                <th className="text-left py-2">Status</th>
                <th className="text-right py-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">Carregando…</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">Nenhum usuário encontrado.</td></tr>}
              {filtered.map((r) => {
                const linkedInf = r.influencer_id && influencers.find((i) => i.id === r.influencer_id)?.name;
                const linkedMgr = r.manager_id && managers.find((m) => m.id === r.manager_id)?.name;
                const allowedCount = (r.allowed_modules ?? []).length;
                const deniedCount = (r.denied_modules ?? []).length;
                return (
                  <tr key={r.id} className="border-t border-border/40 hover:bg-secondary/20 transition-colors">
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => viewAsUser(r)}
                          title={`Ver painel como ${r.full_name || r.email}`}
                          className="shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-md border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                        >
                          <Eye size={13} />
                        </button>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{r.full_name || "—"}</div>
                          <div className="text-[11px] text-muted-foreground truncate">{r.email}</div>
                        </div>
                      </div>
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
                      <div className="flex items-center gap-1 text-[11px]">
                        <span className="text-emerald-400">+{allowedCount}</span>
                        <span className="text-muted-foreground">/</span>
                        <span className="text-rose-400">−{deniedCount}</span>
                      </div>
                    </td>
                    <td className="py-2.5">
                      {r.is_active === false
                        ? <span className="text-[11px] text-muted-foreground">Desativado</span>
                        : <span className="text-[11px] text-emerald-400 inline-flex items-center gap-1"><Check size={11} /> Ativo</span>}
                    </td>
                    <td className="py-2.5 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => viewAsUser(r)}
                          title={`Ver painel como ${r.full_name || r.email}`}
                          className="btn-ghost text-xs inline-flex items-center gap-1"
                        >
                          <Eye size={11} /> Ver
                        </button>
                        <button onClick={() => setEditing(r)} className="btn-ghost text-xs inline-flex items-center gap-1">
                          <Pencil size={11} /> Editar
                        </button>
                      </div>
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

      {creating && (
        <CreateUserDialog
          onClose={() => setCreating(false)}
          onCreated={() => { setCreating(false); load(); }}
        />
      )}
    </div>
  );
}

async function callAdminFn(action: string, payload: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("admin-user-manage", {
    body: { action, ...payload },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

function CreateUserDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!email || password.length < 8) {
      toast({ title: "Preencha e-mail e senha (min. 8)", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await callAdminFn("create_user", { email, password, full_name: fullName });
      toast({ title: "Usuário criado" });
      onCreated();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} title="Novo usuário">
      <div className="space-y-3">
        <Field label="Nome completo"><input className="input-field w-full" value={fullName} onChange={(e) => setFullName(e.target.value)} /></Field>
        <Field label="E-mail"><input type="email" className="input-field w-full" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Senha inicial (min. 8)"><input type="text" className="input-field w-full font-mono" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="btn-ghost text-sm">Cancelar</button>
          <button onClick={submit} disabled={saving} className="btn-primary">{saving ? "Criando…" : "Criar usuário"}</button>
        </div>
      </div>
    </Modal>
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
  const { setPreviewTarget } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"perfil" | "acessos" | "senha">("perfil");
  const [role, setRole] = useState<AppRole>(user.role ?? "visualizacao");
  const [influencerId, setInfluencerId] = useState<string>(user.influencer_id ?? "");
  const [managerId, setManagerId] = useState<string>(user.manager_id ?? "");
  const [fullName, setFullName] = useState<string>(user.full_name ?? "");
  const [phone, setPhone] = useState<string>(user.phone ?? "");
  const [notes, setNotes] = useState<string>(user.notes ?? "");
  const [isActive, setIsActive] = useState<boolean>(user.is_active !== false);
  const [allowed, setAllowed] = useState<Set<string>>(new Set(user.allowed_modules ?? []));
  const [denied, setDenied] = useState<Set<string>>(new Set(user.denied_modules ?? []));
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  const effectiveHas = useMemo(() => {
    return (key: string) => hasModuleAccess(role, key, [...allowed], [...denied]);
  }, [role, allowed, denied]);

  const toggle = (key: string, state: "default" | "allow" | "deny") => {
    const na = new Set(allowed); na.delete(key);
    const nd = new Set(denied); nd.delete(key);
    if (state === "allow") na.add(key);
    if (state === "deny") nd.add(key);
    setAllowed(na); setDenied(nd);
  };

  const save = async () => {
    setSaving(true);
    try {
      await supabase.from("user_roles").delete().eq("user_id", user.id);
      await supabase.from("user_roles").insert({ user_id: user.id, role });
      await supabase.from("profiles").update({
        full_name: fullName || null,
        phone: phone || null,
        notes: notes || null,
        influencer_id: role === "influencer" ? (influencerId || null) : null,
        manager_id: role === "gerente" ? (managerId || null) : null,
        allowed_modules: [...allowed],
        denied_modules: [...denied],
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

  const setPassword = async () => {
    if (newPassword.length < 8) {
      toast({ title: "Senha muito curta (min. 8)", variant: "destructive" });
      return;
    }
    setPwSaving(true);
    try {
      await callAdminFn("set_password", { target_user_id: user.id, password: newPassword });
      toast({ title: "Senha alterada" });
      setNewPassword("");
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setPwSaving(false);
    }
  };

  const sendRecovery = async () => {
    if (!user.email) return;
    try {
      await callAdminFn("send_recovery", { email: user.email });
      toast({ title: "Link de recuperação gerado" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const previewThisUser = () => {
    if (role !== "influencer" && role !== "gerente") {
      toast({ title: "Preview disponível apenas para influenciador e gerente" });
      return;
    }
    setPreviewTarget({
      role,
      userId: user.id,
      influencerId: role === "influencer" ? (influencerId || user.influencer_id) : null,
      managerId: role === "gerente" ? (managerId || user.manager_id) : null,
      name: fullName || user.full_name,
      email: user.email,
    });
    navigate(role === "influencer" ? "/portal" : "/gerente");
  };


  return (
    <Modal onClose={onClose} title="Editar usuário" subtitle={user.email ?? undefined}>
      <div className="flex gap-1 bg-secondary/50 p-1 rounded-lg mb-4 text-xs">
        {[
          { k: "perfil", l: "Perfil & Papel" },
          { k: "acessos", l: "Acessos" },
          { k: "senha", l: "Senha" },
        ].map((t) => (
          <button key={t.k} onClick={() => setTab(t.k as any)} className={tab === t.k ? "tab-btn-active flex-1" : "tab-btn flex-1"}>
            {t.l}
          </button>
        ))}
      </div>

      {tab === "perfil" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nome"><input className="input-field w-full" value={fullName} onChange={(e) => setFullName(e.target.value)} /></Field>
            <Field label="Telefone"><input className="input-field w-full" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
          </div>

          <Field label="Papel">
            <select className="select-field w-full" value={role} onChange={(e) => setRole(e.target.value as AppRole)}>
              {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>

          {role === "influencer" && (
            <Field label="Vincular ao Influenciador">
              <select className="select-field w-full" value={influencerId} onChange={(e) => setInfluencerId(e.target.value)}>
                <option value="">— Selecionar —</option>
                {influencers.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </Field>
          )}
          {role === "gerente" && (
            <Field label="Vincular ao Gerente">
              <select className="select-field w-full" value={managerId} onChange={(e) => setManagerId(e.target.value)}>
                <option value="">— Selecionar —</option>
                {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </Field>
          )}

          <Field label="Observações internas">
            <textarea className="input-field w-full min-h-[70px]" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded" />
            <span>Usuário ativo</span>
          </label>

          {(role === "influencer" || role === "gerente") && (
            <button onClick={previewThisUser} className="btn-ghost text-xs inline-flex items-center gap-1">
              <Eye size={11} /> Ver painel deste usuário
            </button>
          )}
        </div>
      )}

      {tab === "acessos" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-secondary/40 border border-border/40 rounded-lg p-2.5">
            <ShieldAlert size={13} className="text-amber-400 shrink-0" />
            <span>
              Padrão segue o papel. <span className="text-emerald-400">Permitir</span> força acesso, <span className="text-rose-400">Bloquear</span> remove — mesmo se o papel teria por padrão.
            </span>
          </div>

          <div className="max-h-[380px] overflow-y-auto pr-1 space-y-3">
            {MODULE_GROUPS.map((group) => (
              <div key={group}>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">{group}</div>
                <div className="space-y-1">
                  {APP_MODULES.filter((m) => m.group === group).map((m) => {
                    const state: "allow" | "deny" | "default" =
                      allowed.has(m.key) ? "allow" : denied.has(m.key) ? "deny" : "default";
                    const eff = effectiveHas(m.key);
                    return (
                      <div key={m.key} className="flex items-center justify-between bg-secondary/30 border border-border/40 rounded-md px-2.5 py-1.5">
                        <div className="text-[12px] flex items-center gap-2">
                          <span className={eff ? "text-foreground" : "text-muted-foreground line-through"}>{m.label}</span>
                        </div>
                        <div className="flex gap-1 text-[10px]">
                          <button
                            onClick={() => toggle(m.key, "default")}
                            className={`px-2 py-0.5 rounded ${state === "default" ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60"}`}
                          >Padrão</button>
                          <button
                            onClick={() => toggle(m.key, "allow")}
                            className={`px-2 py-0.5 rounded ${state === "allow" ? "bg-emerald-500/20 text-emerald-300" : "text-muted-foreground hover:bg-emerald-500/10"}`}
                          >Permitir</button>
                          <button
                            onClick={() => toggle(m.key, "deny")}
                            className={`px-2 py-0.5 rounded ${state === "deny" ? "bg-rose-500/20 text-rose-300" : "text-muted-foreground hover:bg-rose-500/10"}`}
                          >Bloquear</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "senha" && (
        <div className="space-y-3">
          <Field label="Nova senha (min. 8 caracteres)">
            <input
              type="text"
              className="input-field w-full font-mono"
              placeholder="Digite a nova senha"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </Field>
          <div className="flex gap-2">
            <button onClick={setPassword} disabled={pwSaving} className="btn-primary">
              <KeyRound size={13} /> {pwSaving ? "Alterando…" : "Definir senha"}
            </button>
            <button onClick={sendRecovery} className="btn-ghost text-sm inline-flex items-center gap-1">
              <Mail size={13} /> Gerar link de recuperação
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Comunique a nova senha ao usuário por um canal seguro. Recomendado pedir troca no primeiro acesso.
          </p>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4 border-t border-border/40 mt-4">
        <button onClick={onClose} className="btn-ghost text-sm">Fechar</button>
        {tab !== "senha" && (
          <button onClick={save} disabled={saving} className="btn-primary">
            {saving ? "Salvando…" : "Salvar alterações"}
          </button>
        )}
      </div>
    </Modal>
  );
}

function Modal({ children, onClose, title, subtitle }: { children: React.ReactNode; onClose: () => void; title: string; subtitle?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm p-4">
      <div className="glass-card w-full max-w-2xl p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="section-title">{title}</h3>
            {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-secondary/60 text-muted-foreground"><X size={14} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
      {children}
    </div>
  );
}
