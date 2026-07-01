import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Wallet, Plus, Check, Clock, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface SaqueRow { id: string; codigo: string; valor: number; status: string | null; data: string | null; created_at: string; pix_key: string | null; pix_key_type: string | null }

export default function PortalSaques() {
  const { user } = useAuth();
  const [rows, setRows] = useState<SaqueRow[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [inf, setInf] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [available, setAvailable] = useState(0);

  const load = async () => {
    const { data: prof } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
    setProfile(prof);
    const infId = prof?.influencer_id;
    if (!infId) { setLoading(false); return; }

    const [{ data: iRow }, { data: metrics }, { data: saques }] = await Promise.all([
      supabase.from("influencers").select("*").eq("id", infId).maybeSingle(),
      supabase.from("tracking_metrics").select("revenue").eq("influencer_id", infId).eq("is_demo", false),
      supabase.from("saques").select("*").eq("influencer_id", infId).order("created_at", { ascending: false }),
    ]);
    setInf(iRow);
    setRows((saques ?? []) as SaqueRow[]);

    const totalRev = (metrics ?? []).reduce((a: number, r: any) => a + Number(r.revenue ?? 0), 0);
    const totalCommission = totalRev * Number(iRow?.commission_percent ?? 0) / 100;
    const alreadyRequested = (saques ?? []).reduce((a: number, s: any) => {
      const st = (s.status ?? "").toLowerCase();
      return ["cancelado", "recusado", "failed"].includes(st) ? a : a + Number(s.valor ?? 0);
    }, 0);
    setAvailable(Math.max(0, totalCommission - alreadyRequested));
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const canRequest = useMemo(() => {
    const v = Number(amount.replace(",", "."));
    return v > 0 && v <= available && !!profile?.pix_key && !!profile?.pix_key_type && !!inf;
  }, [amount, available, profile, inf]);

  const submit = async () => {
    if (!canRequest || !inf) return;
    setSubmitting(true);
    const v = Number(amount.replace(",", "."));
    const codigo = `SQ-${Date.now().toString(36).toUpperCase()}`;
    const { error } = await supabase.from("saques").insert({
      codigo,
      valor: v,
      status: "pendente",
      tipo: "pix",
      nome: inf.name,
      origem: "portal_influenciador",
      pix_key: profile.pix_key,
      pix_key_type: profile.pix_key_type,
      influencer_id: inf.id,
      data: new Date().toISOString().slice(0, 10),
    } as any);
    setSubmitting(false);
    if (error) {
      toast({ title: "Erro ao solicitar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Saque solicitado", description: `Código ${codigo} · ${brl(v)}` });
      setAmount("");
      load();
    }
  };

  const statusBadge = (s: string | null) => {
    const st = (s ?? "pendente").toLowerCase();
    if (["pago", "confirmed", "completed", "concluido"].includes(st))
      return <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/20"><Check size={10} /> Pago</span>;
    if (["cancelado", "recusado", "failed"].includes(st))
      return <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20"><X size={10} /> {st}</span>;
    return <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] px-2 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/20"><Clock size={10} /> {st}</span>;
  };

  const pixMissing = !profile?.pix_key || !profile?.pix_key_type;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Saques</h1>
        <p className="page-subtitle">Solicite e acompanhe seus saques via PIX.</p>
      </div>

      {/* Disponível */}
      <div className="glass-card p-5 md:p-6 flex flex-col md:flex-row md:items-center gap-4 md:gap-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-40 pointer-events-none bg-gradient-to-br from-success/10 via-transparent to-transparent" />
        <div className="relative flex-1">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Disponível para saque</p>
          <p className="text-3xl md:text-4xl font-semibold tracking-tight text-success mt-1">{brl(available)}</p>
          <p className="text-[11px] text-muted-foreground mt-1">Baseado na sua comissão validada menos saques já solicitados.</p>
        </div>
        <div className="relative w-full md:w-80 space-y-2">
          {pixMissing ? (
            <div className="text-[12px] bg-warning/10 border border-warning/20 text-warning rounded-lg p-3">
              Cadastre sua chave PIX em <strong>Perfil</strong> para solicitar saque.
            </div>
          ) : (
            <>
              <label className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Valor a sacar</label>
              <div className="flex gap-2">
                <input
                  className="input-field flex-1"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9,.]/g, ""))}
                />
                <button className="btn-primary inline-flex items-center gap-1.5 px-4" disabled={!canRequest || submitting} onClick={submit}>
                  <Plus size={13} /> {submitting ? "Enviando…" : "Solicitar"}
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground">PIX {profile.pix_key_type?.toUpperCase()} · <span className="font-mono">{profile.pix_key}</span></p>
            </>
          )}
        </div>
      </div>

      {/* Histórico */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border/40 flex items-center justify-between">
          <h3 className="section-title mb-0">Histórico de saques</h3>
          <span className="text-[11px] text-muted-foreground">{rows.length} registro(s)</span>
        </div>
        {loading ? (
          <div className="p-6 text-sm text-muted-foreground">Carregando…</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center">
            <Wallet className="mx-auto mb-2 text-muted-foreground" size={22} />
            <p className="text-sm font-medium">Nenhum saque solicitado ainda</p>
            <p className="text-xs text-muted-foreground mt-1">Seus pedidos aparecerão aqui com o status em tempo real.</p>
          </div>
        ) : (
          <div className="max-h-[520px] overflow-y-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-secondary/40 text-[10px] uppercase tracking-[0.14em] text-muted-foreground sticky top-0 backdrop-blur-md">
                <tr>
                  <th className="px-4 py-2 text-left">Código</th>
                  <th className="px-4 py-2 text-left">Data</th>
                  <th className="px-4 py-2 text-right">Valor</th>
                  <th className="px-4 py-2 text-left">PIX</th>
                  <th className="px-4 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-border/40 hover:bg-secondary/20">
                    <td className="px-4 py-2 font-mono text-[12px]">{r.codigo}</td>
                    <td className="px-4 py-2 tabular-nums">{new Date(r.data ?? r.created_at).toLocaleDateString("pt-BR")}</td>
                    <td className="px-4 py-2 text-right font-semibold tabular-nums">{brl(Number(r.valor))}</td>
                    <td className="px-4 py-2 text-[11px] text-muted-foreground font-mono truncate max-w-[180px]">{r.pix_key ?? "—"}</td>
                    <td className="px-4 py-2">{statusBadge(r.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
