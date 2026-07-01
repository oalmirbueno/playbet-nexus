import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export default function GerentePerfil() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [mgr, setMgr] = useState<any>(null);
  const [saving, setSaving] = useState(false);

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

  const save = async () => {
    setSaving(true);
    await supabase.from("profiles").update({ full_name: profile.full_name }).eq("id", user!.id);
    setSaving(false);
    toast({ title: "Perfil atualizado" });
  };

  if (!profile) return <div className="glass-card p-6 text-sm text-muted-foreground">Carregando…</div>;

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="page-header">Meu perfil</h1>
        <p className="page-subtitle">Dados de acesso e squad vinculado.</p>
      </div>

      <div className="glass-card p-5 space-y-3">
        <h3 className="section-title">Dados pessoais</h3>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Nome completo</label>
          <input className="input-field" value={profile.full_name ?? ""} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">E-mail</label>
          <input className="input-field" value={profile.email ?? ""} readOnly />
        </div>
        <button className="btn-primary" onClick={save} disabled={saving}>{saving ? "Salvando…" : "Salvar"}</button>
      </div>

      {mgr && (
        <div className="glass-card p-5 space-y-2">
          <h3 className="section-title">Squad</h3>
          <div className="grid grid-cols-2 gap-3 text-[13px]">
            <div><p className="text-[11px] text-muted-foreground">Nome do squad</p><p className="font-medium flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: mgr.squad?.color ?? "#666" }} />{mgr.squad?.name ?? "—"}</p></div>
            <div><p className="text-[11px] text-muted-foreground">Meta mensal</p><p className="font-medium">{mgr.monthly_goal ? Number(mgr.monthly_goal).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}</p></div>
          </div>
        </div>
      )}
    </div>
  );
}
