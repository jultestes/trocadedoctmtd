import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, event, x-infinia-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("[InfinitePay Webhook] Payload:", JSON.stringify(body));

    const orderNsu = body.order_nsu;

    if (!orderNsu) {
      console.warn("[InfinitePay Webhook] No order_nsu in payload");
      return new Response(JSON.stringify({ status: "ignored" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Payment was approved (webhook only fires on approval)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: sale, error: findError } = await supabase
      .from("sales")
      .select("id, status")
      .eq("order_nsu", orderNsu)
      .maybeSingle();

    if (findError || !sale) {
      console.error(`[InfinitePay Webhook] Sale not found for NSU: ${orderNsu}`, findError);
      return new Response(JSON.stringify({ status: "not_found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (sale.status === "pending") {
      const { error: updateError } = await supabase
        .from("sales")
        .update({ status: "paid" })
        .eq("id", sale.id);

      if (updateError) {
        console.error("[InfinitePay Webhook] Update error:", updateError);
        return new Response(JSON.stringify({ status: "error" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`[InfinitePay Webhook] ✅ Sale ${sale.id} (NSU: ${orderNsu}) → paid`);
    } else {
      console.log(`[InfinitePay Webhook] Sale already: ${sale.status}`);
    }

    return new Response(JSON.stringify({ status: "ok" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[InfinitePay Webhook] Error:", error);
    return new Response(JSON.stringify({ status: "error" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
