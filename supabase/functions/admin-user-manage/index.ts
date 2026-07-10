import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const VALID_ROLES = ["admin_master", "socio", "financeiro", "operacao", "conteudo", "visualizacao", "gerente", "influencer"] as const;
type AppRole = typeof VALID_ROLES[number];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

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
    const { action } = body ?? {};
    if (!action) return json({ error: "missing_action" }, 400);

    /* ---------------- LIST USERS ---------------- */
    if (action === "list_users") {
      // Get all auth users (paged)
      const authUsers: any[] = [];
      let page = 1;
      while (true) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
        if (error) return json({ error: error.message }, 400);
        authUsers.push(...(data.users ?? []));
        if (!data.users || data.users.length < 200) break;
        page++;
        if (page > 20) break;
      }

      const ids = authUsers.map((u) => u.id);
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        admin.from("profiles").select("id, full_name, email, avatar_url, is_active, influencer_id, manager_id, last_sign_in_at, phone").in("id", ids),
        admin.from("user_roles").select("user_id, role").in("user_id", ids),
      ]);

      const infIds = [...new Set((profiles ?? []).map((p) => p.influencer_id).filter(Boolean))];
      const mgrIds = [...new Set((profiles ?? []).map((p) => p.manager_id).filter(Boolean))];
      const [{ data: infs }, { data: mgrs }] = await Promise.all([
        infIds.length ? admin.from("influencers").select("id, name, slug").in("id", infIds) : Promise.resolve({ data: [] }),
        mgrIds.length ? admin.from("managers").select("id, name, slug, team_name").in("id", mgrIds) : Promise.resolve({ data: [] }),
      ]);

      const profByUser = new Map((profiles ?? []).map((p) => [p.id, p]));
      const rolesByUser = new Map<string, AppRole[]>();
      for (const r of roles ?? []) {
        if (!rolesByUser.has(r.user_id)) rolesByUser.set(r.user_id, []);
        rolesByUser.get(r.user_id)!.push(r.role as AppRole);
      }
      const infMap = new Map((infs ?? []).map((i) => [i.id, i]));
      const mgrMap = new Map((mgrs ?? []).map((m) => [m.id, m]));

      const rows = authUsers.map((u) => {
        const p = profByUser.get(u.id);
        return {
          user_id: u.id,
          email: u.email ?? p?.email ?? "",
          full_name: p?.full_name ?? (u.user_metadata?.full_name ?? ""),
          avatar_url: p?.avatar_url ?? null,
          phone: p?.phone ?? null,
          is_active: p?.is_active !== false,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at ?? p?.last_sign_in_at ?? null,
          confirmed: !!u.email_confirmed_at,
          roles: rolesByUser.get(u.id) ?? [],
          influencer_id: p?.influencer_id ?? null,
          manager_id: p?.manager_id ?? null,
          influencer: p?.influencer_id ? infMap.get(p.influencer_id) ?? null : null,
          manager: p?.manager_id ? mgrMap.get(p.manager_id) ?? null : null,
        };
      });

      return json({ ok: true, rows });
    }

    /* ---------------- INVITE ---------------- */
    if (action === "invite") {
      const { email, full_name, role, influencer_id, manager_id } = body;
      if (!email || typeof email !== "string") return json({ error: "invalid_email" }, 400);
      if (role && !VALID_ROLES.includes(role)) return json({ error: "invalid_role" }, 400);

      const { data: invite, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
        data: { full_name: full_name ?? "" },
      });
      if (inviteErr) return json({ error: inviteErr.message }, 400);
      const userId = invite.user?.id;
      if (!userId) return json({ error: "invite_failed" }, 500);

      // Update profile
      await admin.from("profiles").update({
        full_name: full_name ?? null,
        email,
        influencer_id: influencer_id ?? null,
        manager_id: manager_id ?? null,
      }).eq("id", userId);

      // Set role (replace default)
      if (role) {
        await admin.from("user_roles").delete().eq("user_id", userId);
        await admin.from("user_roles").insert({ user_id: userId, role });
      }
      return json({ ok: true, user_id: userId });
    }

    /* ---------------- SET ROLE ---------------- */
    if (action === "set_role") {
      const { target_user_id, role } = body;
      if (!target_user_id || !role || !VALID_ROLES.includes(role)) return json({ error: "invalid_input" }, 400);
      await admin.from("user_roles").delete().eq("user_id", target_user_id);
      const { error } = await admin.from("user_roles").insert({ user_id: target_user_id, role });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    /* ---------------- LINK / UNLINK ---------------- */
    if (action === "link_user") {
      const { target_user_id, influencer_id, manager_id } = body;
      if (!target_user_id) return json({ error: "invalid_input" }, 400);
      const patch: Record<string, any> = {};
      if (influencer_id !== undefined) patch.influencer_id = influencer_id;
      if (manager_id !== undefined) patch.manager_id = manager_id;
      const { error } = await admin.from("profiles").update(patch).eq("id", target_user_id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    /* ---------------- ACTIVATE / DEACTIVATE ---------------- */
    if (action === "set_active") {
      const { target_user_id, is_active } = body;
      if (!target_user_id || typeof is_active !== "boolean") return json({ error: "invalid_input" }, 400);
      await admin.from("profiles").update({ is_active }).eq("id", target_user_id);
      // Ban/unban via banned_until
      await admin.auth.admin.updateUserById(target_user_id, {
        ban_duration: is_active ? "none" : "876000h",
      } as any);
      return json({ ok: true });
    }

    /* ---------------- SEND RECOVERY ---------------- */
    if (action === "send_recovery") {
      const { email } = body;
      if (!email) return json({ error: "invalid_input" }, 400);
      const { error } = await admin.auth.admin.generateLink({ type: "recovery", email });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    /* ---------------- SET PASSWORD ---------------- */
    if (action === "set_password") {
      const { target_user_id, password } = body;
      if (!target_user_id || !password || typeof password !== "string" || password.length < 8) {
        return json({ error: "invalid_input" }, 400);
      }
      const { error } = await admin.auth.admin.updateUserById(target_user_id, { password });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    /* ---------------- CREATE USER (legacy) ---------------- */
    if (action === "create_user") {
      const { email, password, full_name } = body;
      if (!email || !password || password.length < 8) return json({ error: "invalid_input" }, 400);
      const { data, error } = await admin.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: { full_name: full_name ?? "" },
      });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true, user_id: data.user?.id });
    }

    /* ---------------- PROVISION FROM CARD (existing) ---------------- */
    if (action === "provision_access_from_card") {
      const { card_id, role_type } = body;
      if (!card_id || !role_type || !["influencer", "gerente"].includes(role_type)) {
        return json({ error: "invalid_input" }, 400);
      }
      const { data: card, error: cardErr } = await admin
        .from("commercial_pipeline_cards").select("*").eq("id", card_id).single();
      if (cardErr || !card) return json({ error: "card_not_found" }, 404);
      if (card.generated_user_id && card.generated_email && card.generated_password) {
        return json({ ok: true, reused: true, user_id: card.generated_user_id, email: card.generated_email, password: card.generated_password, role_type: card.role_type ?? role_type });
      }
      if (!card.email) return json({ error: "card_missing_email" }, 400);
      const pass = `playbet${Math.floor(1000 + Math.random() * 9000)}`;
      let userId: string | null = null;
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: card.email, password: pass, email_confirm: true, user_metadata: { full_name: card.name },
      });
      if (createErr) {
        const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
        const found = list?.users?.find((u) => u.email?.toLowerCase() === card.email.toLowerCase());
        if (!found) return json({ error: createErr.message }, 400);
        userId = found.id;
        await admin.auth.admin.updateUserById(userId, { password: pass });
      } else { userId = created.user?.id ?? null; }
      if (!userId) return json({ error: "user_create_failed" }, 500);
      const slug = (card.name ?? "user").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40) || `user-${userId.slice(0, 8)}`;
      let managerRowId: string | null = null;
      let influencerRowId: string | null = null;
      if (role_type === "gerente") {
        const { data: mgr, error: mErr } = await admin.from("managers").insert({ name: card.name, slug: `${slug}-${userId.slice(0, 6)}`, team_name: card.name, squad_id: card.squad_id, notes: card.notes }).select("id").single();
        if (mErr) return json({ error: `manager_insert: ${mErr.message}` }, 400);
        managerRowId = mgr.id;
      } else {
        const { data: inf, error: iErr } = await admin.from("influencers").insert({ name: card.name, slug: `${slug}-${userId.slice(0, 6)}`, instagram: card.handle, squad_id: card.squad_id, manager_id: card.manager_id, category: "influencer", notes: card.notes }).select("id").single();
        if (iErr) return json({ error: `influencer_insert: ${iErr.message}` }, 400);
        influencerRowId = inf.id;
      }
      await admin.from("profiles").update({ full_name: card.name, email: card.email, phone: card.phone, city: card.city, manager_id: managerRowId, influencer_id: influencerRowId }).eq("id", userId);
      await admin.from("user_roles").delete().eq("user_id", userId);
      await admin.from("user_roles").insert({ user_id: userId, role: role_type === "gerente" ? "gerente" : "influencer" });
      await admin.from("commercial_pipeline_cards").update({ role_type, generated_email: card.email, generated_password: pass, generated_user_id: userId, credentials_generated_at: new Date().toISOString(), manager_id: managerRowId ?? card.manager_id, influencer_id: influencerRowId ?? card.influencer_id }).eq("id", card_id);
      return json({ ok: true, user_id: userId, email: card.email, password: pass, role_type });
    }

    return json({ error: "unknown_action" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
