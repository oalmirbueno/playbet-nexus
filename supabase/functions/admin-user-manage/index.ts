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
    const { action, target_user_id, password, email, full_name, card_id, role_type } = body ?? {};
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

    if (action === "provision_access_from_card") {
      if (!card_id || !role_type || !["influencer", "gerente"].includes(role_type)) {
        return json({ error: "invalid_input" }, 400);
      }

      const { data: card, error: cardErr } = await admin
        .from("commercial_pipeline_cards")
        .select("*")
        .eq("id", card_id)
        .single();
      if (cardErr || !card) return json({ error: "card_not_found" }, 404);

      // Already provisioned → return existing
      if (card.generated_user_id && card.generated_email && card.generated_password) {
        return json({
          ok: true,
          reused: true,
          user_id: card.generated_user_id,
          email: card.generated_email,
          password: card.generated_password,
          role_type: card.role_type ?? role_type,
        });
      }

      if (!card.email) return json({ error: "card_missing_email" }, 400);

      // Memorable password: playbet + 4 digits
      const pass = `playbet${Math.floor(1000 + Math.random() * 9000)}`;

      // Create auth user (or reuse if already exists with that email)
      let userId: string | null = null;
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: card.email,
        password: pass,
        email_confirm: true,
        user_metadata: { full_name: card.name },
      });
      if (createErr) {
        // If already exists, look it up
        const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
        const found = list?.users?.find((u) => u.email?.toLowerCase() === card.email.toLowerCase());
        if (!found) return json({ error: createErr.message }, 400);
        userId = found.id;
        // Reset the password so we know it
        await admin.auth.admin.updateUserById(userId, { password: pass });
      } else {
        userId = created.user?.id ?? null;
      }
      if (!userId) return json({ error: "user_create_failed" }, 500);

      const slug = (card.name ?? "user")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .slice(0, 40) || `user-${userId.slice(0, 8)}`;

      let managerRowId: string | null = null;
      let influencerRowId: string | null = null;

      if (role_type === "gerente") {
        const { data: mgr, error: mErr } = await admin
          .from("managers")
          .insert({
            name: card.name,
            slug: `${slug}-${userId.slice(0, 6)}`,
            team_name: card.name,
            squad_id: card.squad_id,
            notes: card.notes,
          })
          .select("id")
          .single();
        if (mErr) return json({ error: `manager_insert: ${mErr.message}` }, 400);
        managerRowId = mgr.id;
      } else {
        const { data: inf, error: iErr } = await admin
          .from("influencers")
          .insert({
            name: card.name,
            slug: `${slug}-${userId.slice(0, 6)}`,
            instagram: card.handle,
            squad_id: card.squad_id,
            manager_id: card.manager_id,
            category: "influencer",
            notes: card.notes,
          })
          .select("id")
          .single();
        if (iErr) return json({ error: `influencer_insert: ${iErr.message}` }, 400);
        influencerRowId = inf.id;
      }

      // Link profile (created by handle_new_user trigger) with role scope
      await admin
        .from("profiles")
        .update({
          full_name: card.name,
          email: card.email,
          phone: card.phone,
          city: card.city,
          manager_id: managerRowId,
          influencer_id: influencerRowId,
        })
        .eq("id", userId);

      // Replace default 'visualizacao' role with proper one
      await admin.from("user_roles").delete().eq("user_id", userId);
      await admin
        .from("user_roles")
        .insert({ user_id: userId, role: role_type === "gerente" ? "gerente" : "influencer" });

      // Persist on card
      await admin
        .from("commercial_pipeline_cards")
        .update({
          role_type,
          generated_email: card.email,
          generated_password: pass,
          generated_user_id: userId,
          credentials_generated_at: new Date().toISOString(),
          manager_id: managerRowId ?? card.manager_id,
          influencer_id: influencerRowId ?? card.influencer_id,
        })
        .eq("id", card_id);

      return json({
        ok: true,
        user_id: userId,
        email: card.email,
        password: pass,
        role_type,
      });
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
