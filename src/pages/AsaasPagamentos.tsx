import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CreditCard, RefreshCw, Loader2, CheckCircle2, AlertTriangle, Copy } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import EmptyState from "@/components/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const WEBHOOK_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/asaas-webhook`;

interface AsaasStatus {
  ok: boolean;
  environment: string;
  balance: number;
  account: { name?: string; email?: string; walletId?: string; accountNumber?: string };
  checked_at: string;
}

export default function AsaasPagamentos() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<AsaasStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke("asaas-balance");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setStatus(data as AsaasStatus);
    } catch (e: any) {
      setError(e.message ?? "Falha ao consultar Asaas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStatus(); }, []);

  const brl = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Gestão de Receita", path: "/financeiro" }, { label: "Asaas / Pagamentos" }]} />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-header">Asaas / Pagamentos</h1>
          <p className="page-subtitle">Central de pagamentos — envio, processamento e conciliação</p>
        </div>
        <button className="btn-ghost text-xs" onClick={fetchStatus} disabled={loading}>
          {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Atualizar
        </button>
      </div>

      {/* Connection card */}
      <div className="glass-card p-5">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            error ? "bg-destructive/10" : status ? "bg-success/10" : "bg-primary/10"
          }`}>
            {error ? <AlertTriangle size={18} className="text-destructive" />
              : status ? <CheckCircle2 size={18} className="text-success" />
              : <CreditCard size={18} className="text-primary" />}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-sm">Integração Asaas</p>
              {status && <span className="badge-success">Conectado</span>}
              {status && <span className="badge-neutral">{status.environment}</span>}
              {error && <span className="badge-danger">Erro</span>}
              {loading && !status && <span className="badge-info">Verificando...</span>}
            </div>
            {status && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Saldo disponível</p>
                  <p className="text-lg font-semibold mt-0.5">{brl(status.balance)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Conta</p>
                  <p className="text-sm font-medium mt-0.5 truncate">{status.account.name ?? "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Wallet ID</p>
                  <p className="text-xs font-mono mt-0.5 truncate">{status.account.walletId ?? "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Última verificação</p>
                  <p className="text-xs mt-0.5">{new Date(status.checked_at).toLocaleString("pt-BR")}</p>
                </div>
              </div>
            )}
            {error && <p className="text-xs text-destructive mt-2">{error}</p>}
          </div>
        </div>
      </div>

      {/* Webhook setup */}
      <div className="glass-card p-5">
        <p className="font-medium text-sm mb-1">Webhook</p>
        <p className="text-xs text-muted-foreground mb-3">
          Configure este endpoint em Asaas → Integrações → Webhooks. Use o token salvo em <code className="bg-secondary px-1 rounded">ASAAS_WEBHOOK_TOKEN</code> no campo "Token de autenticação".
        </p>
        <div className="flex items-center gap-2 bg-secondary/40 border border-border rounded-md px-3 py-2">
          <code className="text-xs flex-1 truncate font-mono">{WEBHOOK_URL}</code>
          <button
            className="btn-ghost text-xs"
            onClick={() => { navigator.clipboard.writeText(WEBHOOK_URL); toast({ title: "URL copiada" }); }}
          >
            <Copy size={12} /> Copiar
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          Eventos recomendados: PAYMENT_CONFIRMED, PAYMENT_RECEIVED, PAYMENT_OVERDUE, PAYMENT_REFUNDED, TRANSFER_CREATED, TRANSFER_DONE, TRANSFER_FAILED.
        </p>
      </div>

      <div className="glass-card">
        <EmptyState
          icon={CreditCard}
          title="Nenhum pagamento registrado"
          description="Os pagamentos aparecerão aqui assim que houver saques aprovados e processados via Asaas."
          secondaryLabel="Ver Saques"
          onSecondary={() => navigate("/saques")}
        />
      </div>
    </div>
  );
}
