// Asaas webhook receiver — updates saques.status based on payment / transfer events
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, asaas-access-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const STATUS_MAP: Record<string, string> = {
  PAYMENT_CREATED: "Pendente",
  PAYMENT_AWAITING_RISK_ANALYSIS: "Pendente",
  PAYMENT_APPROVED_BY_RISK_ANALYSIS: "Pendente",
  PAYMENT_CONFIRMED: "Confirmado",
  PAYMENT_RECEIVED: "Pago",
  PAYMENT_OVERDUE: "Atrasado",
  PAYMENT_REFUNDED: "Estornado",
  PAYMENT_DELETED: "Cancelado",
  PAYMENT_REFUND_IN_PROGRESS: "Estornando",
  TRANSFER_CREATED: "Pendente",
  TRANSFER_PENDING: "Pendente",
  TRANSFER_IN_BANK_PROCESSING: "Processando",
  TRANSFER_DONE: "Pago",
  TRANSFER_FAILED: "Falhou",
  TRANSFER_CANCELLED: "Cancelado",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const expectedToken = Deno.env.get("ASAAS_WEBHOOK_TOKEN");
    const provided = req.headers.get("asaas-access-token");
    if (!expectedToken || provided !== expectedToken) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json();
    const event = payload?.event as string | undefined;
    const payment = payload?.payment ?? payload?.transfer;
    const asaasId = payment?.id ?? null;
    const externalRef = payment?.externalReference ?? null;

    if (!event || !asaasId) {
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const newStatus = STATUS_MAP[event] ?? "Pendente";
    const updates: Record<string, unknown> = {
      asaas_status: event,
      status: newStatus,
      asaas_synced_at: new Date().toISOString(),
    };

    // Try match by asaas_payment_id first, then by externalReference (saque.id or codigo)
    let query = supabase.from("saques").update(updates);
    if (externalRef) {
      // accept uuid id or human codigo
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(externalRef);
      query = isUuid ? query.eq("id", externalRef) : query.eq("codigo", externalRef);
    } else {
      query = query.eq("asaas_payment_id", asaasId);
    }
    const { error } = await query;
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, event, status: newStatus }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("asaas-webhook error", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
