import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "unauthorized" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const asUser = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await asUser.auth.getUser();
    if (userErr || !userData.user) return json({ error: "unauthorized" }, 401);

    const admin = createClient(url, serviceKey);
    const { data: isAdminRow } = await admin.rpc("is_admin", { _user_id: userData.user.id });
    if (!isAdminRow) return json({ error: "forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const { action, target_user_id, password, email, full_name } = body ?? {};
    if (!action) return json({ error: "missing_action" }, 400);

    if (action === "set_password") {
      if (!target_user_id || !password || typeof password !== "string" || password.length < 8) {
        return json({ error: "invalid_input" }, 400);
      }
      const { error } = await admin.auth.admin.updateUserById(target_user_id, { password });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "create_user") {
      if (!email || !password || password.length < 8) return json({ error: "invalid_input" }, 400);
      const { data, error } = await admin.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: { full_name: full_name ?? "" },
      });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true, user_id: data.user?.id });
    }

    if (action === "send_recovery") {
      if (!email) return json({ error: "invalid_input" }, 400);
      const { error } = await admin.auth.admin.generateLink({ type: "recovery", email });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: "unknown_action" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
