import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Copy, ExternalLink, Percent, Link2 } from "lucide-react";

const PIX_TYPES = [
  { value: "cpf", label: "CPF" },
  { value: "cnpj", label: "CNPJ" },
  { value: "email", label: "E-mail" },
  { value: "phone", label: "Telefone" },
  { value: "random", label: "Aleatória" },
];

export default function GerentePerfil() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [mgr, setMgr] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [savingMgr, setSavingMgr] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      setProfile(p);
      if (p?.manager_id) {
        const { data: m } = await supabase.from("managers").select("*, squad:squads(name, color)").eq("id", p.manager_id).maybeSingle();
        setMgr(m);
      }
    })();
  }, [user]);

  const saveProfile = async () => {
    setSaving(true);
    await supabase.from("profiles").update({ full_name: profile.full_name }).eq("id", user!.id);
    setSaving(false);
    toast({ title: "Perfil atualizado" });
  };

  const saveMgr = async () => {
    if (!mgr) return;
    setSavingMgr(true);
    const { error } = await supabase.from("managers").update({
      pix_key: mgr.pix_key || null,
      pix_key_type: mgr.pix_key_type || null,
      share_url: mgr.share_url || null,
    }).eq("id", mgr.id);
    setSavingMgr(false);
    if (error) toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    else toast({ title: "Dados atualizados" });
  };

  const copy = (v: string) => { navigator.clipboard.writeText(v); toast({ title: "Copiado" }); };

  if (!profile) return <div className="glass-card p-6 text-sm text-muted-foreground">Carregando…</div>;

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="page-header">Meu perfil</h1>
        <p className="page-subtitle">Dados de acesso, chave PIX para saques e link pessoal de divulgação.</p>
      </div>

      <div className="glass-card p-5 space-y-3">
        <h3 className="section-title">Dados pessoais</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Nome completo</label>
            <input className="input-field" value={profile.full_name ?? ""} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">E-mail</label>
            <input className="input-field" value={profile.email ?? ""} readOnly />
          </div>
        </div>
        <button className="btn-primary" onClick={saveProfile} disabled={saving}>{saving ? "Salvando…" : "Salvar"}</button>
      </div>

      {mgr && (
        <>
          <div className="glass-card p-5 space-y-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h3 className="section-title mb-1">Squad & comissão</h3>
                <p className="text-[12px] text-muted-foreground">Valores oficiais controlados pelo admin central.</p>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30 text-primary text-[13px] font-semibold">
                <Percent size={12} /> {Number(mgr.commission_percent ?? 0).toFixed(1)}% de comissão
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-[13px]">
              <div>
                <p className="text-[11px] text-muted-foreground">Squad</p>
                <p className="font-medium flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: mgr.squad?.color ?? "#666" }} />
                  {mgr.squad?.name ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Nível de carreira</p>
                <p className="font-medium">{mgr.career_label ?? "—"} {mgr.career_level ? `· ${mgr.career_level}` : ""}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Meta mensal</p>
                <p className="font-medium">{mgr.monthly_goal ? Number(mgr.monthly_goal).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-5 space-y-3">
            <h3 className="section-title">Chave PIX para saques</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Tipo de chave</label>
                <select className="input-field" value={mgr.pix_key_type ?? ""} onChange={(e) => setMgr({ ...mgr, pix_key_type: e.target.value })}>
                  <option value="">Selecione…</option>
                  {PIX_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-muted-foreground mb-1 block">Chave PIX</label>
                <input className="input-field" value={mgr.pix_key ?? ""} onChange={(e) => setMgr({ ...mgr, pix_key: e.target.value })} placeholder="Sua chave PIX" />
              </div>
            </div>
          </div>

          <div className="glass-card p-5 space-y-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h3 className="section-title mb-1 inline-flex items-center gap-2"><Link2 size={13} /> Link pessoal de divulgação</h3>
                <p className="text-[12px] text-muted-foreground">Opcional. Se você também divulga, use este link para ser atribuído.</p>
              </div>
            </div>
            <input
              className="input-field font-mono"
              value={mgr.share_url ?? ""}
              onChange={(e) => setMgr({ ...mgr, share_url: e.target.value })}
              placeholder="https://exemplo.com/?ref=seu-slug"
            />
            {mgr.share_url && (
              <div className="flex items-center gap-2">
                <button onClick={() => copy(mgr.share_url)} className="text-[12px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/40 hover:bg-secondary/60"><Copy size={12} /> Copiar</button>
                <a href={mgr.share_url} target="_blank" rel="noreferrer" className="text-[12px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/40 hover:bg-secondary/60"><ExternalLink size={12} /> Abrir</a>
              </div>
            )}
          </div>

          <button className="btn-primary" onClick={saveMgr} disabled={savingMgr}>{savingMgr ? "Salvando…" : "Salvar dados do gerente"}</button>
        </>
      )}
    </div>
  );
}
