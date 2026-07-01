import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Wallet, Check, Clock, X, ShieldAlert, FileText, ExternalLink, Sparkles } from "lucide-react";
import { useWithdrawalData } from "@/hooks/useWithdrawalData";
import { FiscalWizard, isFiscalComplete } from "@/components/saques/FiscalWizard";
import { WithdrawRequestForm } from "@/components/saques/WithdrawRequestForm";
import { CyclesPanel } from "@/components/saques/CyclesPanel";
import { WITHDRAWAL_TERMS } from "@/config/withdrawalTerms";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function PortalSaques() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [inf, setInf] = useState<any>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  const loadProfile = async () => {
    if (!user) return;
    setProfileLoading(true);
    const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    setProfile(prof);
    if (prof?.influencer_id) {
      const { data: iRow } = await supabase.from("influencers").select("*").eq("id", prof.influencer_id).maybeSingle();
      setInf(iRow);
    }
    setProfileLoading(false);
  };

  useEffect(() => { loadProfile(); }, [user]);

  const { loading, availableCycles, landedCycles, saques, summary, reload } = useWithdrawalData({
    targetType: "influencer",
    targetId: profile?.influencer_id ?? null,
  });

  const fiscalOk = useMemo(() => isFiscalComplete(profile), [profile]);
  const pixMissing = !profile?.pix_key || !profile?.pix_key_type;

  const statusBadge = (s: string | null) => {
    const st = (s ?? "pendente").toLowerCase();
    if (["pago", "confirmed", "completed", "concluido"].includes(st))
      return <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/20"><Check size={10} /> Pago</span>;
    if (["cancelado", "recusado", "failed", "falhou"].includes(st))
      return <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20"><X size={10} /> {st}</span>;
    return <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] px-2 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/20"><Clock size={10} /> {st}</span>;
  };

  const isLoading = profileLoading || loading;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="page-header">Saques</h1>
          <p className="page-subtitle">Ciclo mensal · nota fiscal obrigatória · pagamento via PIX.</p>
        </div>
        {fiscalOk && (
          <button
            onClick={() => setWizardOpen(true)}
            className="text-[12px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
          >
            <FileText size={12} /> Ver / atualizar dados fiscais
          </button>
        )}
      </div>

      {/* Fiscal setup banner */}
      {!isLoading && !fiscalOk && (
        <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 flex flex-col md:flex-row md:items-center gap-4">
          <div className="h-11 w-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
            <ShieldAlert size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-display font-semibold">Complete seus dados fiscais</h3>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              Antes do primeiro saque, precisamos do seu CPF ou CNPJ, endereço, chave PIX e do aceite dos termos.
            </p>
          </div>
          <button
            onClick={() => setWizardOpen(true)}
            className="btn-primary inline-flex items-center gap-2 shrink-0"
          >
            <Sparkles size={14} /> Iniciar cadastro
          </button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <KpiCard label="Liberado agora" value={brl(summary.available)} tone="emerald" hint="Pronto pra sacar" />
        <KpiCard label="A caminho" value={brl(summary.pending)} tone="amber"
          hint={summary.nextReleaseAt ? `Próxima liberação: ${format(new Date(summary.nextReleaseAt), "dd/MM", { locale: ptBR })}` : "—"} />
        <KpiCard label="Solicitado no mês" value={brl(summary.requested)} tone="primary" hint={`${saques.length} pedido(s)`} />
        <KpiCard label="Já pago" value={brl(summary.paid)} tone="muted" hint="Histórico total" />
      </div>

      {/* Available + form */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3 space-y-4">
          <CyclesPanel landed={landedCycles} available={availableCycles} />

          {/* Termos resumidos */}
          <details className="rounded-xl border border-border/60 bg-card/30 group">
            <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between text-sm font-medium">
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Como funciona o saque
              </span>
              <span className="text-[11px] text-muted-foreground group-open:hidden">Expandir</span>
              <span className="text-[11px] text-muted-foreground hidden group-open:inline">Recolher</span>
            </summary>
            <ul className="px-4 pb-4 space-y-2.5">
              {WITHDRAWAL_TERMS.map((t) => (
                <li key={t.title} className="text-[12.5px] leading-relaxed">
                  <span className="font-semibold text-foreground">{t.title}. </span>
                  <span className="text-muted-foreground">{t.body}</span>
                </li>
              ))}
            </ul>
          </details>
        </div>

        <div className="lg:col-span-2">
          {!fiscalOk ? (
            <div className="rounded-xl border border-dashed border-border/60 bg-card/30 p-6 text-center h-full flex flex-col items-center justify-center">
              <ShieldAlert className="h-8 w-8 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium">Cadastro fiscal pendente</p>
              <p className="text-[11px] text-muted-foreground mt-1 max-w-[240px]">
                Complete os dados no botão acima para desbloquear a solicitação de saque.
              </p>
            </div>
          ) : pixMissing ? (
            <div className="rounded-xl border border-warning/30 bg-warning/5 p-6 text-center h-full flex flex-col items-center justify-center">
              <p className="text-sm font-medium text-warning">Configure sua chave PIX</p>
              <Link to="/portal/perfil" className="text-[12px] text-primary hover:underline mt-1 inline-flex items-center gap-1">
                Ir para o perfil <ExternalLink size={11} />
              </Link>
            </div>
          ) : summary.available <= 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 bg-card/30 p-6 text-center h-full flex flex-col items-center justify-center">
              <Wallet className="h-8 w-8 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium">Nenhum valor liberado ainda</p>
              <p className="text-[11px] text-muted-foreground mt-1 max-w-[260px]">
                Você recebe uma notificação assim que a próxima liberação acontecer.
              </p>
            </div>
          ) : (
            <WithdrawRequestForm
              userId={user!.id}
              target={{
                type: "influencer",
                id: profile.influencer_id,
                name: inf?.name ?? profile.full_name ?? "—",
                pix_key: profile.pix_key,
                pix_key_type: profile.pix_key_type,
              }}
              available={summary.available}
              onSubmitted={reload}
            />
          )}
        </div>
      </div>

      {/* Histórico */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border/40 flex items-center justify-between">
          <h3 className="section-title mb-0">Histórico de saques</h3>
          <span className="text-[11px] text-muted-foreground">{saques.length} registro(s)</span>
        </div>
        {isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Carregando…</div>
        ) : saques.length === 0 ? (
          <div className="p-10 text-center">
            <Wallet className="mx-auto mb-2 text-muted-foreground" size={22} />
            <p className="text-sm font-medium">Nenhum saque solicitado ainda</p>
            <p className="text-xs text-muted-foreground mt-1">
              Seus pedidos aparecerão aqui com status em tempo real.
            </p>
          </div>
        ) : (
          <div className="max-h-[520px] overflow-y-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-secondary/40 text-[10px] uppercase tracking-[0.14em] text-muted-foreground sticky top-0 backdrop-blur-md">
                <tr>
                  <th className="px-4 py-2 text-left">Código</th>
                  <th className="px-4 py-2 text-left">Data</th>
                  <th className="px-4 py-2 text-right">Valor</th>
                  <th className="px-4 py-2 text-left">NF</th>
                  <th className="px-4 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {saques.map((r: any) => (
                  <tr key={r.id} className="border-t border-border/40 hover:bg-secondary/20">
                    <td className="px-4 py-2 font-mono text-[12px]">{r.codigo}</td>
                    <td className="px-4 py-2 tabular-nums">{new Date(r.data ?? r.created_at).toLocaleDateString("pt-BR")}</td>
                    <td className="px-4 py-2 text-right font-semibold tabular-nums">{brl(Number(r.valor))}</td>
                    <td className="px-4 py-2 text-[11px] font-mono text-muted-foreground">
                      {r.nota_fiscal_number ?? "—"}
                    </td>
                    <td className="px-4 py-2">{statusBadge(r.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {user && (
        <FiscalWizard
          open={wizardOpen}
          onOpenChange={setWizardOpen}
          userId={user.id}
          onComplete={loadProfile}
        />
      )}
    </div>
  );
}

function KpiCard({ label, value, hint, tone }: { label: string; value: string; hint: string; tone: "emerald" | "amber" | "primary" | "muted" }) {
  const toneCls = {
    emerald: "from-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    amber: "from-amber-500/15 text-amber-600 dark:text-amber-400",
    primary: "from-primary/15 text-primary",
    muted: "from-muted text-foreground",
  }[tone];
  return (
    <div className={`rounded-xl border border-border/60 bg-gradient-to-br ${toneCls} to-transparent p-4`}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold tabular-nums mt-1">{value}</div>
      <div className="text-[11px] text-muted-foreground mt-1">{hint}</div>
    </div>
  );
}
