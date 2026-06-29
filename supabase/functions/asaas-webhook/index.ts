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

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i];
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const expectedToken = Deno.env.get("ASAAS_WEBHOOK_TOKEN");
    if (!expectedToken) {
      console.error("asaas-webhook: ASAAS_WEBHOOK_TOKEN não configurado");
      return new Response(JSON.stringify({ error: "server_misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const provided = req.headers.get("asaas-access-token") ?? "";
    if (!timingSafeEqual(provided, expectedToken)) {
      console.warn("asaas-webhook: token inválido", {
        ip: req.headers.get("x-forwarded-for"),
        ua: req.headers.get("user-agent"),
      });
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json();
    const event = payload?.event as string | undefined;
    const eventId = (payload?.id ?? payload?.event_id ?? null) as string | null;
    const entity = payload?.payment ?? payload?.transfer ?? null;
    const asaasId = entity?.id ?? null;
    const externalRef = entity?.externalReference ?? null;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Idempotency: if Asaas resends the same event_id, skip
    if (eventId) {
      const { data: existing } = await supabase
        .from("asaas_webhook_events")
        .select("id, processed")
        .eq("event_id", eventId)
        .maybeSingle();
      if (existing?.processed) {
        return new Response(JSON.stringify({ ok: true, duplicate: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Log raw event up-front so nothing is lost even if processing fails
    const { data: logRow } = await supabase
      .from("asaas_webhook_events")
      .insert({
        event_id: eventId,
        event_name: event ?? "UNKNOWN",
        asaas_payment_id: asaasId,
        external_reference: externalRef,
        raw_payload: payload,
      })
      .select("id")
      .single();

    if (!event || !asaasId) {
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newStatus = STATUS_MAP[event] ?? "Pendente";
    const updates: Record<string, unknown> = {
      asaas_status: event,
      status: newStatus,
      asaas_payment_id: asaasId,
      asaas_synced_at: new Date().toISOString(),
    };

    // Match by externalReference (uuid or codigo) first, then asaas_payment_id
    let matchedSaqueId: string | null = null;
    try {
      let query = supabase.from("saques").update(updates).select("id");
      if (externalRef) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(externalRef);
        query = isUuid ? query.eq("id", externalRef) : query.eq("codigo", externalRef);
      } else {
        query = query.eq("asaas_payment_id", asaasId);
      }
      const { data: updated, error } = await query;
      if (error) throw error;
      matchedSaqueId = updated?.[0]?.id ?? null;

      await supabase
        .from("asaas_webhook_events")
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
          saque_id: matchedSaqueId,
        })
        .eq("id", logRow!.id);
    } catch (err) {
      await supabase
        .from("asaas_webhook_events")
        .update({ processing_error: (err as Error).message })
        .eq("id", logRow!.id);
      throw err;
    }

    return new Response(
      JSON.stringify({ ok: true, event, status: newStatus, saque_id: matchedSaqueId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("asaas-webhook error", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
