import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Missing token" }, 401);
    const token = authHeader.replace("Bearer ", "");

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });
    const { data: { user }, error: ue } = await userClient.auth.getUser();
    if (ue || !user) return json({ error: "Invalid token" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "super_admin") return json({ error: "Not admin" }, 403);

    const { phone, name, grade, password } = await req.json();
    if (!phone || !name) return json({ error: "phone & name required" }, 400);

    const email = `${phone.replace(/\s/g, "")}@edu.local`;
    const defaultPassword = password || "123456";

    const { data: created, error: ce } = await admin.auth.admin.createUser({
      email, password: defaultPassword, email_confirm: true,
      user_metadata: { name, phone, grade, role: "teacher" }
    });
    if (ce) return json({ error: ce.message }, 400);

    await admin.from("profiles").update({ role: "teacher", name, phone, grade }).eq("id", created.user.id);
    return json({ success: true, user_id: created.user.id, email, default_password: defaultPassword });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...cors, "Content-Type": "application/json" }
  });
}
