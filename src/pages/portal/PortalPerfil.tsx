import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { User, Instagram, CreditCard, Phone, MapPin, Users, Percent, Save, Copy } from "lucide-react";

const PIX_TYPES = [
  { value: "cpf", label: "CPF" },
  { value: "cnpj", label: "CNPJ" },
  { value: "email", label: "E-mail" },
  { value: "phone", label: "Celular" },
  { value: "random", label: "Aleatória" },
];

export default function PortalPerfil() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [inf, setInf] = useState<any>(null);
  const [manager, setManager] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      setProfile(p);
      if (p?.influencer_id) {
        const { data: i } = await supabase
          .from("influencers")
          .select("*, managers(name, team_name, email)")
          .eq("id", p.influencer_id)
          .maybeSingle();
        setInf(i);
        setManager(i?.managers ?? null);
      }
    })();
  }, [user]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: profile.full_name,
      phone: profile.phone,
      city: profile.city,
      pix_key: profile.pix_key,
      pix_key_type: profile.pix_key_type,
    }).eq("id", user!.id);
    setSaving(false);
    if (error) toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    else toast({ title: "Perfil atualizado" });
  };

  if (!profile) return <div className="glass-card p-6 text-sm text-muted-foreground">Carregando…</div>;

  const initials = (profile.full_name || profile.email || "?").split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Cabeçalho */}
      <div className="glass-card p-5 md:p-6 flex items-center gap-4 md:gap-5 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-40 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
        <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-primary-foreground text-2xl font-semibold shadow-lg">
          {initials}
        </div>
        <div className="relative min-w-0 flex-1">
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight truncate">{profile.full_name || "Sem nome"}</h1>
          <p className="text-[13px] text-muted-foreground truncate">{profile.email}</p>
          {inf && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <Badge>@{inf.slug}</Badge>
              {inf.category && <Badge>{inf.category}</Badge>}
              {inf.commission_percent && <Badge tone="primary"><Percent size={10} />{inf.commission_percent}%</Badge>}
              {inf.career_label && <Badge>{inf.career_label}</Badge>}
            </div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Dados pessoais */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <User size={14} className="text-primary" />
            <h3 className="section-title mb-0">Dados pessoais</h3>
          </div>
          <Field label="Nome completo">
            <input className="input-field" value={profile.full_name ?? ""} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} />
          </Field>
          <Field label="E-mail (login)">
            <input className="input-field opacity-70" value={profile.email ?? ""} readOnly />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Celular">
              <input className="input-field" placeholder="(11) 99999-0000" value={profile.phone ?? ""} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
            </Field>
            <Field label="Cidade">
              <input className="input-field" value={profile.city ?? ""} onChange={(e) => setProfile({ ...profile, city: e.target.value })} />
            </Field>
          </div>
        </div>

        {/* Pagamento */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <CreditCard size={14} className="text-primary" />
            <h3 className="section-title mb-0">Dados de pagamento</h3>
          </div>
          <Field label="Tipo da chave PIX">
            <select className="select-field w-full" value={profile.pix_key_type ?? ""} onChange={(e) => setProfile({ ...profile, pix_key_type: e.target.value || null })}>
              <option value="">Selecione…</option>
              {PIX_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="Chave PIX">
            <input className="input-field font-mono" value={profile.pix_key ?? ""} onChange={(e) => setProfile({ ...profile, pix_key: e.target.value })} placeholder="Sua chave PIX para receber saques" />
          </Field>
          <div className="text-[11px] text-muted-foreground bg-secondary/40 border border-border/40 rounded-lg p-3">
            Seus saques são pagos via PIX através do Asaas. Mantenha a chave atualizada para evitar falhas.
          </div>
          <button className="btn-primary w-full inline-flex items-center justify-center gap-2" onClick={save} disabled={saving}>
            <Save size={13} /> {saving ? "Salvando…" : "Salvar alterações"}
          </button>
        </div>
      </div>

      {/* Vínculo comercial */}
      {inf && (
        <div className="glass-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-primary" />
            <h3 className="section-title mb-0">Vínculo comercial</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[13px]">
            <Info label="Handle" value={inf.slug ? `@${inf.slug}` : "—"} />
            <Info label="Categoria" value={inf.category || "—"} />
            <Info label="Nível carreira" value={inf.career_label || `Nível ${inf.career_level ?? 1}`} />
            <Info label="Comissão" value={inf.commission_percent ? `${inf.commission_percent}%` : "—"} highlight />
            <Info label="Gerente" value={manager?.name || "—"} />
            <Info label="Time" value={manager?.team_name || "—"} />
            <div className="col-span-2">
              <Info label="Instagram" value={inf.instagram || "—"} copyable />
            </div>
          </div>
          {!manager && (
            <div className="text-[11px] text-warning bg-warning/10 border border-warning/20 rounded-lg p-2.5">
              Você ainda não tem gerente atribuído. Fale com a operação.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-1 block">{label}</label>
      {children}
    </div>
  );
}

function Badge({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "primary" }) {
  const cls = tone === "primary"
    ? "bg-primary/10 text-primary border-primary/20"
    : "bg-secondary/60 text-muted-foreground border-border/40";
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] px-2 py-0.5 rounded-full border ${cls}`}>
      {children}
    </span>
  );
}

function Info({ label, value, highlight, copyable }: { label: string; value: string; highlight?: boolean; copyable?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className={`font-medium text-[13px] truncate flex items-center gap-1.5 ${highlight ? "text-primary" : ""}`}>
        {value}
        {copyable && value !== "—" && (
          <button
            onClick={() => { navigator.clipboard.writeText(value); toast({ title: "Copiado" }); }}
            className="text-muted-foreground hover:text-foreground"
            title="Copiar"
          >
            <Copy size={11} />
          </button>
        )}
      </p>
    </div>
  );
}
