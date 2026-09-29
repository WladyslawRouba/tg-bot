import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase admin environment variables are missing");
  }

  return createClient(url, serviceRoleKey);
}

Deno.serve(async (req) => {
  if (req.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("clients")
    .select("*")
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (error) {
    console.error(error);
    return Response.json({ error: "Failed to load clients" }, { status: 500 });
  }

  return Response.json({ clients: data });
});
