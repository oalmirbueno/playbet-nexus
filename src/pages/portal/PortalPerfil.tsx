import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export default function PortalPerfil() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [inf, setInf] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      setProfile(p);
      if (p?.influencer_id) {
        const { data: i } = await supabase.from("influencers").select("*").eq("id", p.influencer_id).maybeSingle();
        setInf(i);
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
        <p className="page-subtitle">Seus dados de acesso e pagamento.</p>
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

      {inf && (
        <div className="glass-card p-5 space-y-2">
          <h3 className="section-title">Vínculo comercial</h3>
          <div className="grid grid-cols-2 gap-3 text-[13px]">
            <div><p className="text-[11px] text-muted-foreground">Handle</p><p className="font-medium">@{inf.slug ?? "—"}</p></div>
            <div><p className="text-[11px] text-muted-foreground">Instagram</p><p className="font-medium">{inf.instagram ?? "—"}</p></div>
            <div><p className="text-[11px] text-muted-foreground">Categoria</p><p className="font-medium">{inf.category ?? "—"}</p></div>
            <div><p className="text-[11px] text-muted-foreground">Comissão</p><p className="font-medium">{inf.commission_percent ? `${inf.commission_percent}%` : "—"}</p></div>
          </div>
        </div>
      )}
    </div>
  );
}
