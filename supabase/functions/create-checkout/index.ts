import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const INFINITEPAY_HANDLE = Deno.env.get("INFINITEPAY_HANDLE");

    console.log(
      `[create-checkout] INFINITEPAY_HANDLE status: ${
        INFINITEPAY_HANDLE ? "configured" : "missing"
      }`
    );

    if (!INFINITEPAY_HANDLE) {
      return new Response(
        JSON.stringify({
          error: "Gateway de pagamento não configurado (handle ausente)",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const body = await req.json();
    const { items, redirect_url, customer, address, order_nsu } = body;

    console.log("[create-checkout] incoming body:", JSON.stringify(body));

    // Validate items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ error: "Carrinho vazio: nenhum item enviado" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    if (items.length > 100) {
      return new Response(
        JSON.stringify({ error: "Máximo de 100 itens por pedido" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    for (const item of items) {
      if (
        !item.description ||
        typeof item.description !== "string" ||
        item.description.length > 200
      ) {
        return new Response(
          JSON.stringify({ error: "Item description inválida" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (
        typeof item.quantity !== "number" ||
        item.quantity < 1 ||
        item.quantity > 999 ||
        !Number.isInteger(item.quantity)
      ) {
        return new Response(
          JSON.stringify({ error: "Item quantity inválido" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (
        typeof item.price !== "number" ||
        item.price <= 0 ||
        item.price > 100000
      ) {
        return new Response(
          JSON.stringify({ error: "Item price inválido" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    if (order_nsu && (typeof order_nsu !== "string" || order_nsu.length > 50)) {
      return new Response(
        JSON.stringify({ error: "order_nsu inválido" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (redirect_url && typeof redirect_url === "string") {
      try {
        const parsed = new URL(redirect_url);
        if (!["http:", "https:"].includes(parsed.protocol)) {
          throw new Error("Invalid protocol");
        }
      } catch {
        return new Response(
          JSON.stringify({ error: "redirect_url inválido" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    const supabaseUrl =
      Deno.env.get("SUPABASE_URL") || "https://bdipjvkpasiuekqtaiev.supabase.co";
    const webhookUrl = `${supabaseUrl}/functions/v1/infinitepay-webhook`;

    const normalizedItems = items.map(
      (item: { description: string; quantity: number; price: number }) => ({
        description: item.description.slice(0, 200),
        quantity: item.quantity,
        price: Math.round(item.price * 100),
      })
    );

    let normalizedCustomer: Record<string, unknown> | undefined;
    if (customer && typeof customer === "object") {
      const rawPhone = String(
        (customer as any).phone_number || (customer as any).phone || ""
      );
      const phoneDigits = rawPhone.replace(/\D/g, "");
      normalizedCustomer = {
        name: String((customer as any).name || "").slice(0, 120),
        email: String((customer as any).email || "").slice(0, 200),
        phone_number: phoneDigits,
      };
    }

    let normalizedAddress: Record<string, unknown> | undefined;
    if (address && typeof address === "object") {
      normalizedAddress = {
        cep: String((address as any).cep || "").replace(/\D/g, ""),
        street: String((address as any).street || ""),
        number: String((address as any).number || ""),
        complement: String((address as any).complement || ""),
        neighborhood: String((address as any).neighborhood || ""),
        city: String((address as any).city || ""),
        state: String((address as any).state || (address as any).uf || ""),
      };
    }

    const payload: Record<string, unknown> = {
      handle: INFINITEPAY_HANDLE,
      items: normalizedItems,
      webhook_url: webhookUrl,
    };

    if (order_nsu) payload.order_nsu = order_nsu;
    if (redirect_url) payload.redirect_url = redirect_url;
    if (normalizedCustomer) payload.customer = normalizedCustomer;
    if (normalizedAddress) payload.address = normalizedAddress;

    console.log(
      "[create-checkout] outgoing payload:",
      JSON.stringify(payload)
    );

    const response = await fetch(
      "https://api.infinitepay.io/invoices/public/checkout/links",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const rawText = await response.text();
    let data: any;
    try {
      data = JSON.parse(rawText);
    } catch {
      data = { raw: rawText };
    }

    if (!response.ok) {
      console.error(
        "[create-checkout] InfinitePay error:",
        response.status,
        rawText
      );
      const detail =
        (data &&
          (data.message ||
            data.error ||
            (data.errors && JSON.stringify(data.errors)))) ||
        `HTTP ${response.status}`;
      return new Response(
        JSON.stringify({
          error: `InfinitePay: ${detail}`,
          infinitepay_status: response.status,
          infinitepay_response: data,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("[create-checkout] success:", JSON.stringify(data));
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[create-checkout] internal error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno ao processar pagamento" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
