// Asaas: fetch account balance + connection check (admin only)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: user.id });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("ASAAS_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "ASAAS_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isSandbox = apiKey.includes("sandbox") || apiKey.startsWith("$aact_hmlg") || apiKey.startsWith("$aact_YTU5YT");
    const base = isSandbox
      ? "https://api-sandbox.asaas.com/v3"
      : "https://api.asaas.com/v3";

    const [balanceRes, accountRes] = await Promise.all([
      fetch(`${base}/finance/balance`, { headers: { "access_token": apiKey } }),
      fetch(`${base}/myAccount`, { headers: { "access_token": apiKey } }),
    ]);
    const balance = await balanceRes.json();
    const account = await accountRes.json();

    if (!balanceRes.ok) {
      return new Response(JSON.stringify({ error: "asaas_error", detail: balance }), {
        status: balanceRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      ok: true,
      environment: isSandbox ? "sandbox" : "production",
      balance: balance?.balance ?? 0,
      account: {
        name: account?.name,
        email: account?.email,
        walletId: account?.walletId,
        accountNumber: account?.accountNumber,
      },
      checked_at: new Date().toISOString(),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
