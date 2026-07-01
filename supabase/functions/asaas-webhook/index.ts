// Asaas webhook receiver — updates saques.status + reconcilia valores automaticamente
// Evita divergência entre valor solicitado (tracking) e valor efetivamente pago (Asaas).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, asaas-access-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Mapa canonical status -> status interno do saque
const STATUS_MAP: Record<string, string> = {
  // Cobranças (payments) — pouco usadas em saque, mas mantidas por segurança
  PAYMENT_CREATED: "Pendente",
  PAYMENT_AWAITING_RISK_ANALYSIS: "Em análise",
  PAYMENT_APPROVED_BY_RISK_ANALYSIS: "Pendente",
  PAYMENT_CONFIRMED: "Confirmado",
  PAYMENT_RECEIVED: "Pago",
  PAYMENT_OVERDUE: "Atrasado",
  PAYMENT_REFUNDED: "Estornado",
  PAYMENT_DELETED: "Cancelado",
  PAYMENT_REFUND_IN_PROGRESS: "Estornando",
  // Transferências PIX (saques)
  TRANSFER_CREATED: "Pendente",
  TRANSFER_PENDING: "Pendente",
  TRANSFER_IN_BANK_PROCESSING: "Processando",
  TRANSFER_BLOCKED: "Bloqueado",
  TRANSFER_DONE: "Pago",
  TRANSFER_FAILED: "Falhou",
  TRANSFER_CANCELLED: "Cancelado",
};

const PAID_EVENTS = new Set(["TRANSFER_DONE", "PAYMENT_RECEIVED", "PAYMENT_CONFIRMED"]);
const CENTS_TOLERANCE = 0.01; // 1 centavo

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i];
  return diff === 0;
}

function num(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
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

    // Valores retornados pelo Asaas
    const gross = num(entity?.value);
    const net = num(entity?.netValue);
    const fee = gross !== null && net !== null ? +(gross - net).toFixed(2) : null;
    const paidDateStr =
      entity?.effectiveDate ?? entity?.dateCreated ?? entity?.confirmedDate ?? null;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Idempotência: se Asaas reenviar o mesmo event_id, ignora
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

    // Log bruto ANTES de processar — nada é perdido em caso de erro
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

    // ============================================================
    // ENTRADA DE DINHEIRO → cria withdrawal_cycle automaticamente
    // ------------------------------------------------------------
    // Convenção de externalReference para créditos:
    //   cycle:influencer:<uuid>[:<nota>]
    //   cycle:manager:<uuid>[:<nota>]
    // Só processa quando é payload de "payment" (não transfer)
    // e o evento indica dinheiro efetivamente recebido.
    // ============================================================
    const isPaymentEntity = !!payload?.payment;
    const isIncomingPaid = event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED";
    let cycleCreated: { id: string; target_type: string; target_id: string } | null = null;

    if (isPaymentEntity && isIncomingPaid && externalRef && externalRef.startsWith("cycle:")) {
      const parts = externalRef.split(":");
      const targetType = parts[1];
      const targetId = parts[2];
      const noteExtra = parts.slice(3).join(":") || null;
      const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const amount = net ?? gross;

      if (
        (targetType === "influencer" || targetType === "manager") &&
        uuidRe.test(targetId ?? "") &&
        amount !== null &&
        amount > 0
      ) {
        // Idempotência: se já existe ciclo para este payment, não duplica
        const { data: existingCycle } = await supabase
          .from("withdrawal_cycles")
          .select("id, target_type, target_id")
          .eq("reference", asaasId)
          .maybeSingle();

        if (existingCycle) {
          cycleCreated = existingCycle as typeof cycleCreated;
        } else {
          const landedAt = paidDateStr ?? new Date().toISOString();
          const { data: cycleRow, error: cycleErr } = await supabase
            .from("withdrawal_cycles")
            .insert({
              target_type: targetType,
              target_id: targetId,
              amount,
              landed_at: landedAt,
              status: "landed",
              source: "asaas_webhook",
              reference: asaasId,
              notes: noteExtra,
            })
            .select("id, target_type, target_id")
            .single();
          if (cycleErr) {
            console.error("asaas-webhook: falha ao criar withdrawal_cycle", cycleErr);
            await supabase
              .from("asaas_webhook_events")
              .update({ processing_error: `cycle_insert_failed: ${cycleErr.message}` })
              .eq("id", logRow!.id);
          } else {
            cycleCreated = cycleRow as typeof cycleCreated;
          }
        }
      }
    }

    // Localiza o saque ANTES do update para conseguir comparar valores
    let saqueQuery = supabase.from("saques").select("id, valor, asaas_payment_id, codigo").limit(1);
    if (externalRef) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(externalRef);
      saqueQuery = isUuid
        ? saqueQuery.eq("id", externalRef)
        : saqueQuery.eq("codigo", externalRef);
    } else {
      saqueQuery = saqueQuery.eq("asaas_payment_id", asaasId);
    }
    const { data: found } = await saqueQuery;
    const saque = found?.[0] ?? null;

    // Se não é update de saque (é entrada de crédito), pula fluxo de saque e finaliza
    if (!saque && cycleCreated) {
      await supabase
        .from("asaas_webhook_events")
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
        })
        .eq("id", logRow!.id);
      return new Response(
        JSON.stringify({
          ok: true,
          event,
          cycle_created: cycleCreated,
          amount: net ?? gross,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Reconciliação de valor: compara valor solicitado × valor bruto do Asaas
    let divergence = false;
    let divergenceReason: string | null = null;
    if (saque && gross !== null && saque.valor !== null) {
      const requested = Number(saque.valor);
      if (Math.abs(requested - gross) > CENTS_TOLERANCE) {
        divergence = true;
        divergenceReason = `Valor solicitado R$ ${requested.toFixed(2)} ≠ valor Asaas R$ ${gross.toFixed(2)}`;
      }
    }

    const updates: Record<string, unknown> = {
      asaas_status: event,
      status: newStatus,
      asaas_payment_id: asaasId,
      asaas_synced_at: new Date().toISOString(),
    };
    if (gross !== null) updates.asaas_gross_value = gross;
    if (net !== null) updates.asaas_net_value = net;
    if (fee !== null) updates.asaas_fee = fee;
    if (PAID_EVENTS.has(event) && paidDateStr) updates.paid_at = paidDateStr;
    if (PAID_EVENTS.has(event) && !paidDateStr) updates.paid_at = new Date().toISOString();
    if (divergence) {
      updates.value_divergence = true;
      updates.divergence_reason = divergenceReason;
    } else if (saque) {
      // Limpa divergência anterior se um evento novo corrigir
      updates.value_divergence = false;
      updates.divergence_reason = null;
    }

    let matchedSaqueId: string | null = null;
    try {
      let updQuery = supabase.from("saques").update(updates).select("id");
      if (saque) {
        updQuery = updQuery.eq("id", saque.id);
      } else if (externalRef) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(externalRef);
        updQuery = isUuid ? updQuery.eq("id", externalRef) : updQuery.eq("codigo", externalRef);
      } else {
        updQuery = updQuery.eq("asaas_payment_id", asaasId);
      }
      const { data: updated, error } = await updQuery;
      if (error) throw error;
      matchedSaqueId = updated?.[0]?.id ?? null;

      await supabase
        .from("asaas_webhook_events")
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
          saque_id: matchedSaqueId,
          processing_error: divergence ? divergenceReason : null,
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
      JSON.stringify({
        ok: true,
        event,
        status: newStatus,
        saque_id: matchedSaqueId,
        divergence,
        divergence_reason: divergenceReason,
        gross,
        net,
        fee,
      }),
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
