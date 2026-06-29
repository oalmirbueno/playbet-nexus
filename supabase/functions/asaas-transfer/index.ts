// Asaas: create a PIX transfer for a saque (admin only)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "missing auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await userClient.rpc("is_admin", { _user_id: user.id });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { saque_id } = await req.json();
    if (!saque_id) {
      return new Response(JSON.stringify({ error: "saque_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: saque, error: sErr } = await admin
      .from("saques").select("*").eq("id", saque_id).single();
    if (sErr || !saque) {
      return new Response(JSON.stringify({ error: "saque not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!saque.pix_key || !saque.pix_key_type) {
      return new Response(JSON.stringify({ error: "PIX key not configured on saque" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (saque.asaas_payment_id) {
      return new Response(JSON.stringify({ error: "transfer already created", id: saque.asaas_payment_id }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("ASAAS_API_KEY")!;
    const isSandbox = apiKey.includes("sandbox") || apiKey.startsWith("$aact_hmlg") || apiKey.startsWith("$aact_YTU5YT");
    const base = isSandbox ? "https://api-sandbox.asaas.com/v3" : "https://api.asaas.com/v3";

    const body = {
      value: Number(saque.valor),
      pixAddressKey: saque.pix_key,
      pixAddressKeyType: saque.pix_key_type,
      description: `${saque.codigo} — ${saque.nome}`,
      externalReference: saque.id,
    };
    const res = await fetch(`${base}/transfers`, {
      method: "POST",
      headers: { "access_token": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) {
      return new Response(JSON.stringify({ error: "asaas_error", detail: json }), {
        status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin.from("saques").update({
      asaas_payment_id: json.id,
      asaas_status: json.status,
      status: "Processando",
      asaas_synced_at: new Date().toISOString(),
    }).eq("id", saque_id);

    return new Response(JSON.stringify({ ok: true, transfer: json }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
