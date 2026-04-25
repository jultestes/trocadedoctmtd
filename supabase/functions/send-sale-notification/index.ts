// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@example.com";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { sale_id, order_nsu, total_paid, customer_name } = body || {};

    // Get all admin user_ids
    const { data: admins, error: adminsErr } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    if (adminsErr) throw adminsErr;
    const adminIds = (admins ?? []).map((a: any) => a.user_id);
    if (adminIds.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0, reason: "no admins" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all push subscriptions for those admins
    const { data: subs, error: subsErr } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .in("user_id", adminIds);
    if (subsErr) throw subsErr;

    const orderLabel = order_nsu ? `Pedido #${order_nsu}` : sale_id ? `Pedido ${String(sale_id).slice(0, 8)}` : "";
    const valueLabel =
      typeof total_paid === "number"
        ? ` — R$ ${Number(total_paid).toFixed(2).replace(".", ",")}`
        : "";
    const bodyText = `Um novo pedido acabou de entrar no site.${
      orderLabel ? `\n${orderLabel}${valueLabel}` : ""
    }${customer_name ? `\nCliente: ${customer_name}` : ""}`;

    const payload = JSON.stringify({
      title: "Nova venda recebida!",
      body: bodyText,
      tag: `sale-${sale_id || Date.now()}`,
      url: "/admin",
    });

    let sent = 0;
    const stale: string[] = [];

    await Promise.all(
      (subs ?? []).map(async (s: any) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload
          );
          sent++;
        } catch (err: any) {
          const status = err?.statusCode;
          if (status === 404 || status === 410) stale.push(s.id);
          else console.error("push error", status, err?.body || err?.message);
        }
      })
    );

    if (stale.length) {
      await supabase.from("push_subscriptions").delete().in("id", stale);
    }

    return new Response(JSON.stringify({ ok: true, sent, removed: stale.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
