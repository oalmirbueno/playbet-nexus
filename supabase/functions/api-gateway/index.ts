import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
};

const ALLOWED_TABLES = [
  "influencers",
  "games",
  "platforms",
  "templates",
  "landing_pages",
  "landing_page_instances",
  "utms",
  "clicks",
  "campanhas",
  "socios",
  "saques",
  "conteudo",
  "game_platforms",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate API key
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Missing X-API-Key header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Validate key via DB function
    const { data: isValid } = await supabase.rpc("validate_api_key", { _key: apiKey });
    if (!isValid) {
      return new Response(
        JSON.stringify({ error: "Invalid API key" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse URL: /api-gateway/{table}[/{id}]
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    // pathParts: ["api-gateway", "table", "id?"]
    const table = pathParts[1];
    const recordId = pathParts[2];

    if (!table) {
      return new Response(
        JSON.stringify({
          message: "PlayBet API Gateway v1.0",
          tables: ALLOWED_TABLES,
          usage: "GET /api-gateway/{table} | GET /api-gateway/{table}/{id} | POST /api-gateway/{table} | PUT /api-gateway/{table}/{id} | DELETE /api-gateway/{table}/{id}",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!ALLOWED_TABLES.includes(table)) {
      return new Response(
        JSON.stringify({ error: `Table '${table}' not found. Available: ${ALLOWED_TABLES.join(", ")}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let result;
    const method = req.method.toUpperCase();

    // Parse query params for filtering
    const params: Record<string, string> = {};
    url.searchParams.forEach((v, k) => { params[k] = v; });
    const limit = parseInt(params.limit || "100");
    const offset = parseInt(params.offset || "0");
    const orderBy = params.order_by || "created_at";
    const orderDir = params.order_dir === "asc" ? true : false;

    switch (method) {
      case "GET": {
        if (recordId) {
          const { data, error } = await supabase.from(table).select("*").eq("id", recordId).single();
          if (error) throw error;
          result = data;
        } else {
          let query = supabase.from(table).select("*", { count: "exact" });
          
          // Apply filters from query params (field=value)
          for (const [key, value] of Object.entries(params)) {
            if (!["limit", "offset", "order_by", "order_dir"].includes(key)) {
              query = query.eq(key, value);
            }
          }
          
          const { data, error, count } = await query
            .order(orderBy, { ascending: orderDir })
            .range(offset, offset + limit - 1);
          if (error) throw error;
          result = { data, total: count, limit, offset };
        }
        break;
      }
      case "POST": {
        const body = await req.json();
        const { data, error } = await supabase.from(table).insert(body).select().single();
        if (error) throw error;
        result = data;
        break;
      }
      case "PUT":
      case "PATCH": {
        if (!recordId) {
          return new Response(
            JSON.stringify({ error: "PUT/PATCH requires /{table}/{id}" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const updateBody = await req.json();
        const { data, error } = await supabase.from(table).update(updateBody).eq("id", recordId).select().single();
        if (error) throw error;
        result = data;
        break;
      }
      case "DELETE": {
        if (!recordId) {
          return new Response(
            JSON.stringify({ error: "DELETE requires /{table}/{id}" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const { error } = await supabase.from(table).delete().eq("id", recordId);
        if (error) throw error;
        result = { deleted: true, id: recordId };
        break;
      }
      default:
        return new Response(
          JSON.stringify({ error: `Method ${method} not supported` }),
          { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(JSON.stringify(result), {
      status: method === "POST" ? 201 : 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
