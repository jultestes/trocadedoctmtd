import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Payload {
  sale_id: string;
}

const formatBRL = (n: number) =>
  `R$ ${Number(n).toFixed(2).replace(".", ",")}`;

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)
  );

// Deploy marker: v2 (force redeploy) - 2026-04-29
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Health check (GET) so we can verify the function is deployed without a sale_id.
  if (req.method === "GET") {
    return new Response(
      JSON.stringify({ ok: true, function: "send-order-email", version: "v2" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { sale_id } = (await req.json()) as Payload;
    console.log("sale_id recebido", { sale_id });
    if (!sale_id) {
      return new Response(JSON.stringify({ error: "sale_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch sale
    const { data: sale, error: saleErr } = await supabase
      .from("sales")
      .select(
        "id, order_nsu, customer_name, customer_email, total_original, total_paid, discount, shipping_price, delivery_type, email_sent_at"
      )
      .eq("id", sale_id)
      .maybeSingle();

    if (saleErr || !sale) {
      console.error("Sale not found:", saleErr);
      return new Response(JSON.stringify({ error: "Sale not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log("cliente encontrado", {
      sale_id,
      order_nsu: sale.order_nsu,
      has_customer_email: Boolean(sale.customer_email),
    });

    if (!sale.customer_email) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "no email" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Idempotency: don't send twice. Claim the sale atomically before sending so
    // concurrent calls (DB trigger + old browser bundle/manual retry) cannot race.
    if ((sale as any).email_sent_at) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "already sent" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailClaimedAt = new Date().toISOString();
    const { data: claim, error: claimErr } = await supabase
      .from("sales")
      .update({ email_sent_at: emailClaimedAt })
      .eq("id", sale_id)
      .is("email_sent_at", null)
      .select("id")
      .maybeSingle();

    if (claimErr) {
      console.error("Failed to claim order email send:", claimErr);
      return new Response(JSON.stringify({ error: "claim_failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!claim) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "already sent" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: items } = await supabase
      .from("sale_items")
      .select("product_name, product_sku, unit_price")
      .eq("sale_id", sale_id);

    const firstName = (sale.customer_name || "").trim().split(/\s+/)[0] || "cliente";
    const orderId = sale.order_nsu || sale.id;
    const subtotal = Number(sale.total_original ?? sale.total_paid ?? 0);

    const itemsListText = (items || [])
      .map((i: any) => `• ${i.product_name}${i.product_sku ? ` (${i.product_sku})` : ""}`)
      .join("\n") || "• (sem itens)";

    const itemsListHtml = (items || [])
      .map(
        (i: any) =>
          `<li style="margin:4px 0;">${escapeHtml(i.product_name)}${
            i.product_sku ? ` <span style="color:#888;">(${escapeHtml(i.product_sku)})</span>` : ""
          }</li>`
      )
      .join("") || "<li>(sem itens)</li>";

    const shippingLabel =
      sale.delivery_type === "pickup"
        ? "Retirada na loja"
        : sale.shipping_price && Number(sale.shipping_price) > 0
        ? formatBRL(Number(sale.shipping_price))
        : "A combinar";

    const subject = "Recebemos seu pedido 💖 | TMTD Kids";

    const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#fdf2f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#333;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fdf2f8;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.05);">
        <tr><td style="padding:28px 28px 8px 28px;">
          <h1 style="margin:0 0 16px 0;font-size:22px;color:#db2777;">Oi, ${escapeHtml(firstName)}! 💖</h1>
          <p style="margin:0 0 18px 0;font-size:16px;line-height:1.5;">Recebemos seu pedido com sucesso!</p>

          <p style="margin:14px 0 6px 0;font-size:15px;"><strong>📦 Pedido #${escapeHtml(String(orderId))}</strong></p>

          <p style="margin:14px 0 6px 0;font-size:15px;"><strong>🛍️ Itens do pedido:</strong></p>
          <ul style="margin:0 0 14px 18px;padding:0;font-size:15px;line-height:1.5;">${itemsListHtml}</ul>

          <p style="margin:8px 0;font-size:15px;"><strong>💰 Subtotal:</strong> ${formatBRL(subtotal)}</p>
          <p style="margin:8px 0;font-size:15px;"><strong>🚚 Frete:</strong> ${escapeHtml(shippingLabel)}</p>

          <div style="margin:22px 0;padding:14px 16px;background:#fdf2f8;border-radius:12px;font-size:15px;line-height:1.5;">
            Nossa equipe entrará em contato pelo WhatsApp para confirmar os detalhes e combinar o pagamento 😊
          </div>

          <p style="margin:14px 0;font-size:15px;line-height:1.5;">
            Assim que o pagamento for confirmado, vamos preparar seu pedido com muito carinho 💕
          </p>

          <p style="margin:14px 0 0 0;font-size:15px;">Qualquer dúvida, estamos por aqui!</p>
        </td></tr>
        <tr><td style="padding:18px 28px 28px 28px;border-top:1px solid #fce7f3;text-align:center;">
          <p style="margin:0;font-size:16px;color:#db2777;font-weight:600;">💖 TMTD Kids</p>
          <p style="margin:4px 0 0 0;font-size:13px;color:#888;font-style:italic;">A infância é uma só.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`.trim();

    const text = `Oi, ${firstName}! 💖

Recebemos seu pedido com sucesso!

📦 Pedido #${orderId}

🛍️ Itens do pedido:
${itemsListText}

💰 Subtotal: ${formatBRL(subtotal)}
🚚 Frete: ${shippingLabel}

Nossa equipe entrará em contato pelo WhatsApp para confirmar os detalhes e combinar o pagamento 😊

Assim que o pagamento for confirmado, vamos preparar seu pedido com muito carinho 💕

Qualquer dúvida, estamos por aqui!

💖 TMTD Kids
A infância é uma só.`;

    console.log("enviando e-mail", {
      sale_id,
      order_nsu: orderId,
      to: sale.customer_email,
      from: "TMTD Kids <pedidos@tamaratadelikids.com.br>",
    });

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "TMTD Kids <pedidos@tamaratadelikids.com.br>",
        to: [sale.customer_email],
        subject,
        html,
        text,
      }),
    });

    const resendBody = await resendRes.json().catch(() => ({}));
    console.log("resposta do Resend", {
      sale_id,
      status: resendRes.status,
      ok: resendRes.ok,
      id: resendBody?.id,
      error: resendBody?.error ?? resendBody?.message,
    });
    if (!resendRes.ok) {
      console.error("Resend error:", resendRes.status, resendBody);
      await supabase
        .from("sales")
        .update({ email_sent_at: null })
        .eq("id", sale_id)
        .eq("email_sent_at", emailClaimedAt);
      return new Response(
        JSON.stringify({ error: "resend_failed", status: resendRes.status, body: resendBody }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Refresh sent timestamp after successful delivery request.
    const finalSentAt = new Date().toISOString();
    const { error: sentAtErr } = await supabase
      .from("sales")
      .update({ email_sent_at: finalSentAt })
      .eq("id", sale_id)
      .eq("email_sent_at", emailClaimedAt);

    if (sentAtErr) {
      console.error("email_sent_at update failed", { sale_id, error: sentAtErr });
    } else {
      console.log("email_sent_at atualizado", { sale_id, email_sent_at: finalSentAt });
    }

    return new Response(JSON.stringify({ success: true, id: resendBody?.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("send-order-email error:", msg, err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
