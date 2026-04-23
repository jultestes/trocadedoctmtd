import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const INFINITEPAY_HANDLE = Deno.env.get("INFINITEPAY_HANDLE") || "giovanna-isabely";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { items, redirect_url, customer, address, order_nsu } = body;

    // Validate items
    if (!items || !Array.isArray(items) || items.length === 0 || items.length > 100) {
      return new Response(
        JSON.stringify({ error: "Items são obrigatórios (máximo 100)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate each item
    for (const item of items) {
      if (!item.description || typeof item.description !== "string" || item.description.length > 200) {
        return new Response(
          JSON.stringify({ error: "Item description inválida" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (typeof item.quantity !== "number" || item.quantity < 1 || item.quantity > 999 || !Number.isInteger(item.quantity)) {
        return new Response(
          JSON.stringify({ error: "Item quantity inválido" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (typeof item.price !== "number" || item.price <= 0 || item.price > 100000) {
        return new Response(
          JSON.stringify({ error: "Item price inválido" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Validate order_nsu if provided
    if (order_nsu && (typeof order_nsu !== "string" || order_nsu.length > 50)) {
      return new Response(
        JSON.stringify({ error: "order_nsu inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate redirect_url if provided
    if (redirect_url && typeof redirect_url === "string") {
      try {
        const parsed = new URL(redirect_url);
        if (!["http:", "https:"].includes(parsed.protocol)) {
          throw new Error("Invalid protocol");
        }
      } catch {
        return new Response(
          JSON.stringify({ error: "redirect_url inválido" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Build webhook URL
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "https://bdipjvkpasiuekqtaiev.supabase.co";
    const webhookUrl = `${supabaseUrl}/functions/v1/infinitepay-webhook`;

    // Convert prices to centavos and build payload
    const payload: Record<string, unknown> = {
      handle: INFINITEPAY_HANDLE,
      items: items.map((item: { description: string; quantity: number; price: number }) => ({
        description: item.description.slice(0, 200),
        quantity: item.quantity,
        price: Math.round(item.price * 100),
      })),
      webhook_url: webhookUrl,
    };

    if (order_nsu) payload.order_nsu = order_nsu;
    if (redirect_url) payload.redirect_url = redirect_url;
    if (customer) payload.customer = customer;
    if (address) payload.address = address;

    const response = await fetch(
      "https://api.infinitepay.io/invoices/public/checkout/links",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("InfinitePay error:", response.status, JSON.stringify(data));
      const detail = (data && (data.message || data.error)) || "Falha na InfinitePay";
      return new Response(
        JSON.stringify({ error: `Erro ao criar link de pagamento: ${detail}`, infinitepay_status: response.status, infinitepay_response: data }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno ao processar pagamento" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
