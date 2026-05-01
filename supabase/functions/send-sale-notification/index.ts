// deno-lint-ignore-file no-explicit-any
// Web Push (RFC 8291 / aes128gcm) — pure WebCrypto for Deno edge runtime.
// v1.0.4 — detailed errors per subscription
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@example.com";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// ---------- helpers ----------
function b64uToBytes(b64u: string): Uint8Array {
  const b64 = b64u.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((b64u.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function bytesToB64u(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function strToBuf(s: string): ArrayBuffer {
  return toBuf(new TextEncoder().encode(s));
}
function toBuf(u: Uint8Array): ArrayBuffer {
  const ab = new ArrayBuffer(u.byteLength);
  new Uint8Array(ab).set(u);
  return ab;
}
function concat(...arrs: Uint8Array[]): Uint8Array {
  const len = arrs.reduce((a, b) => a + b.length, 0);
  const out = new Uint8Array(len);
  let o = 0;
  for (const a of arrs) {
    out.set(a, o);
    o += a.length;
  }
  return out;
}

// ---------- VAPID JWT (ES256) ----------
async function importVapidPrivateKey(): Promise<CryptoKey> {
  const d = b64uToBytes(VAPID_PRIVATE);
  const pub = b64uToBytes(VAPID_PUBLIC); // 0x04 || X(32) || Y(32)
  const x = pub.slice(1, 33);
  const y = pub.slice(33, 65);
  const jwk: JsonWebKey = {
    kty: "EC", crv: "P-256",
    d: bytesToB64u(d), x: bytesToB64u(x), y: bytesToB64u(y),
    ext: true,
  };
  return await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
}

async function buildVapidAuthHeader(audience: string): Promise<string> {
  const header = { typ: "JWT", alg: "ES256" };
  const payload = { aud: audience, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: VAPID_SUBJECT };
  const headerB64 = bytesToB64u(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = bytesToB64u(new TextEncoder().encode(JSON.stringify(payload)));
  const signingInput = `${headerB64}.${payloadB64}`;
  const key = await importVapidPrivateKey();
  const sigBuf = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, strToBuf(signingInput));
  const sigB64 = bytesToB64u(new Uint8Array(sigBuf));
  return `vapid t=${signingInput}.${sigB64}, k=${VAPID_PUBLIC}`;
}

// ---------- HKDF ----------
async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const baseKey = await crypto.subtle.importKey("raw", toBuf(ikm), "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: toBuf(salt), info: toBuf(info) },
    baseKey,
    length * 8,
  );
  return new Uint8Array(bits);
}

// ---------- ECE aes128gcm (RFC 8291) ----------
async function encryptPayload(payload: Uint8Array, uaPublicRaw: Uint8Array, uaAuthSecret: Uint8Array): Promise<Uint8Array> {
  const asKeyPair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPubJwk = await crypto.subtle.exportKey("jwk", asKeyPair.publicKey);
  const asPubX = b64uToBytes(asPubJwk.x!);
  const asPubY = b64uToBytes(asPubJwk.y!);
  const asPublicRaw = concat(new Uint8Array([0x04]), asPubX, asPubY);

  const uaPubJwk: JsonWebKey = {
    kty: "EC", crv: "P-256",
    x: bytesToB64u(uaPublicRaw.slice(1, 33)),
    y: bytesToB64u(uaPublicRaw.slice(33, 65)),
    ext: true,
  };
  const uaPubKey = await crypto.subtle.importKey("jwk", uaPubJwk, { name: "ECDH", namedCurve: "P-256" }, true, []);

  const ecdhBits = await crypto.subtle.deriveBits({ name: "ECDH", public: uaPubKey }, asKeyPair.privateKey, 256);
  const ecdhSecret = new Uint8Array(ecdhBits);

  const keyInfo = concat(new TextEncoder().encode("WebPush: info\0"), uaPublicRaw, asPublicRaw);
  const ikm = await hkdf(uaAuthSecret, ecdhSecret, keyInfo, 32);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, new TextEncoder().encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, new TextEncoder().encode("Content-Encoding: nonce\0"), 12);

  const padded = concat(payload, new Uint8Array([0x02]));

  const aesKey = await crypto.subtle.importKey("raw", toBuf(cek), { name: "AES-GCM" }, false, ["encrypt"]);
  const ctBuf = await crypto.subtle.encrypt({ name: "AES-GCM", iv: toBuf(nonce) }, aesKey, toBuf(padded));
  const ciphertext = new Uint8Array(ctBuf);

  const rsBytes = new Uint8Array(4);
  new DataView(rsBytes.buffer).setUint32(0, 4096, false);
  const header = concat(salt, rsBytes, new Uint8Array([asPublicRaw.length]), asPublicRaw);

  return concat(header, ciphertext);
}

async function sendOne(sub: { endpoint: string; p256dh: string; auth: string }, payloadStr: string) {
  const url = new URL(sub.endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const auth = await buildVapidAuthHeader(audience);
  const ua = b64uToBytes(sub.p256dh);
  const authSecret = b64uToBytes(sub.auth);
  const body = await encryptPayload(new TextEncoder().encode(payloadStr), ua, authSecret);

  return await fetch(sub.endpoint, {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: "60",
      Urgency: "high",
    },
    body: toBuf(body),
  });
}

// ---------- Order confirmation email (Resend) ----------
const formatBRL = (n: number) => `R$ ${Number(n).toFixed(2).replace(".", ",")}`;
const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)
  );

async function sendOrderEmail(sale_id: string): Promise<Record<string, unknown>> {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    console.error("[order-email] RESEND_API_KEY not configured");
    return { ok: false, reason: "no_resend_key" };
  }

  console.log("[order-email] sale_id recebido", { sale_id });

  const { data: sale, error: saleErr } = await supabase
    .from("sales")
    .select(
      "id, order_nsu, customer_name, customer_email, total_original, total_paid, discount, shipping_price, delivery_type, email_sent_at"
    )
    .eq("id", sale_id)
    .maybeSingle();

  if (saleErr || !sale) {
    console.error("[order-email] Sale not found", saleErr);
    return { ok: false, reason: "sale_not_found" };
  }
  console.log("[order-email] cliente encontrado", {
    sale_id,
    order_nsu: sale.order_nsu,
    has_customer_email: Boolean(sale.customer_email),
  });

  if (!sale.customer_email) return { ok: true, skipped: "no_email" };
  if ((sale as any).email_sent_at) return { ok: true, skipped: "already_sent" };

  // Atomic claim
  const emailClaimedAt = new Date().toISOString();
  const { data: claim, error: claimErr } = await supabase
    .from("sales")
    .update({ email_sent_at: emailClaimedAt })
    .eq("id", sale_id)
    .is("email_sent_at", null)
    .select("id")
    .maybeSingle();

  if (claimErr) {
    console.error("[order-email] claim failed", claimErr);
    return { ok: false, reason: "claim_failed" };
  }
  if (!claim) return { ok: true, skipped: "already_sent" };

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
          <p style="margin:14px 0;font-size:15px;line-height:1.5;">Assim que o pagamento for confirmado, vamos preparar seu pedido com muito carinho 💕</p>
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

  console.log("[order-email] enviando e-mail", {
    sale_id, order_nsu: orderId, to: sale.customer_email,
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
      subject, html, text,
    }),
  });

  const resendBody = await resendRes.json().catch(() => ({}));
  console.log("[order-email] resposta do Resend", {
    sale_id, status: resendRes.status, ok: resendRes.ok,
    id: resendBody?.id, error: resendBody?.error ?? resendBody?.message,
  });

  if (!resendRes.ok) {
    // Release claim so it can be retried
    await supabase
      .from("sales")
      .update({ email_sent_at: null })
      .eq("id", sale_id)
      .eq("email_sent_at", emailClaimedAt);
    return { ok: false, reason: "resend_failed", status: resendRes.status, body: resendBody };
  }

  const finalSentAt = new Date().toISOString();
  const { error: sentAtErr } = await supabase
    .from("sales")
    .update({ email_sent_at: finalSentAt })
    .eq("id", sale_id)
    .eq("email_sent_at", emailClaimedAt);
  if (sentAtErr) console.error("[order-email] email_sent_at update failed", sentAtErr);
  else console.log("[order-email] email_sent_at atualizado", { sale_id, email_sent_at: finalSentAt });

  return { ok: true, email_id: resendBody?.id };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (req.method === "GET") {
    return new Response(
      JSON.stringify({ ok: true, function: "send-sale-notification", supports: ["push", "order_email"] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { sale_id, total_paid } = body || {};
    const saleId = sale_id ? String(sale_id) : "";

    // Fire order confirmation email in parallel when sale_id is provided.
    // Triggered automatically for any insert; idempotent via email_sent_at.
    const emailPromise: Promise<Record<string, unknown> | null> = sale_id
      ? sendOrderEmail(saleId).catch((err) => {
          console.error("[order-email] unexpected error", err);
          return { ok: false, reason: "exception", error: String(err?.message || err) };
        })
      : Promise.resolve(null);

    if (!saleId) {
      return new Response(
        JSON.stringify({ ok: false, error: "sale_id_required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ---------- Idempotência do push via sales.push_sent_at ----------
    const { data: saleForPush, error: saleForPushErr } = await supabase
      .from("sales")
      .select("id, status, total_paid, total_original, push_sent_at")
      .eq("id", saleId)
      .maybeSingle();

    if (saleForPushErr) throw saleForPushErr;
    if (!saleForPush) {
      const emailResult = await emailPromise;
      return new Response(
        JSON.stringify({ ok: false, error: "sale_not_found", sale_id: saleId, email: emailResult }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if ((saleForPush as any).push_sent_at) {
      console.log(`[send-sale-notification] push já enviado para sale_id=${saleId} — pulando`);
      const emailResult = await emailPromise;
      return new Response(
        JSON.stringify({ ok: true, skipped: "already_sent", sale_id: saleId, email: emailResult }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (String((saleForPush as any).status || "").toLowerCase() !== "paid") {
      console.log(`[send-sale-notification] status=${(saleForPush as any).status} sale_id=${saleId} — push ignorado até paid`);
      const emailResult = await emailPromise;
      return new Response(
        JSON.stringify({ ok: true, skipped: "status_not_paid", sale_id: saleId, status: (saleForPush as any).status, email: emailResult }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ---------- CLAIM ATÔMICO: marca push_sent_at ANTES de enviar ----------
    // Evita corrida (duas execuções concorrentes enviarem 2 pushes para a mesma venda).
    const claimedAt = new Date().toISOString();
    const { data: claimedRow, error: claimErr } = await supabase
      .from("sales")
      .update({ push_sent_at: claimedAt })
      .eq("id", saleId)
      .is("push_sent_at", null)
      .select("id")
      .maybeSingle();

    if (claimErr) {
      console.error(`[send-sale-notification] falha ao reservar push_sent_at sale_id=${saleId}`, claimErr);
      throw claimErr;
    }
    if (!claimedRow) {
      console.log(`[send-sale-notification] push_sent_at já preenchido por outra execução sale_id=${saleId} — pulando`);
      const emailResult = await emailPromise;
      return new Response(
        JSON.stringify({ ok: true, skipped: "already_claimed", sale_id: saleId, email: emailResult }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Buscar TODAS as subscriptions (admins são quem se inscreve)
    const { data: subs, error: subsErr } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth");
    if (subsErr) throw subsErr;

    const uniqueSubs = Array.from(
      new Map((subs ?? []).map((s: any) => [s.endpoint, s])).values()
    );

    const subscriptions_found = uniqueSubs.length;
    console.log(`[send-sale-notification] subscriptions_found=${subscriptions_found}`);

    if (subscriptions_found === 0) {
      // libera o claim para permitir nova tentativa quando houver subscriptions
      await supabase
        .from("sales")
        .update({ push_sent_at: null })
        .eq("id", saleId)
        .eq("push_sent_at", claimedAt);
      const emailResult = await emailPromise;
      return new Response(
        JSON.stringify({ ok: true, subscriptions_found: 0, sent: 0, failed: 0, removed: 0, reason: "no subscriptions", email: emailResult }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ---------- Cálculo seguro do valor (NUNCA R$ 0,00) ----------
    const toNum = (v: unknown): number => {
      if (typeof v === "number" && Number.isFinite(v)) return v;
      const n = Number.parseFloat(String(v ?? "0").replace(",", "."));
      return Number.isFinite(n) ? n : 0;
    };
    const candidatos = [
      toNum(total_paid),
      toNum((saleForPush as any).total_paid),
      toNum((saleForPush as any).total_original),
    ];
    const valorNumber = candidatos.find((n) => n > 0) ?? 0;
    const valorFormatado = valorNumber > 0
      ? `R$ ${valorNumber.toFixed(2).replace(".", ",")}`
      : "valor a confirmar";
    const notificationPayload = {
      title: "Venda aprovada!",
      body: `Valor: ${valorFormatado}`,
      icon: "/pwa-icon-192.png",
      badge: "/pwa-icon-192.png",
      tag: `sale-${saleId}`,
      url: "/admin",
    };

    const payloadStr = JSON.stringify(notificationPayload);
    console.log("[send-sale-notification] notification_payload=", notificationPayload);

    let sent = 0;
    let failed = 0;
    const stale: string[] = [];
    const errors: Array<{
      endpoint_host: string;
      status: number | null;
      response_text: string;
      error_message: string | null;
    }> = [];

    await Promise.all(uniqueSubs.map(async (s: any) => {
      let host = "";
      try {
        host = new URL(s.endpoint).host;
      } catch { host = "invalid-url"; }
      try {
        const res = await sendOne(s, payloadStr);
        if (res.status >= 200 && res.status < 300) {
          sent++;
          return;
        }
        const text = await res.text().catch(() => "");
        if (res.status === 404 || res.status === 410) {
          stale.push(s.id);
        }
        failed++;
        errors.push({
          endpoint_host: host,
          status: res.status,
          response_text: text.slice(0, 500),
          error_message: null,
        });
        console.error(`[send-sale-notification] push fail host=${host} status=${res.status} body=${text.slice(0, 300)}`);
      } catch (err: any) {
        failed++;
        const msg = err?.message || String(err);
        errors.push({
          endpoint_host: host,
          status: null,
          response_text: "",
          error_message: msg,
        });
        console.error(`[send-sale-notification] push error host=${host} err=${msg}`);
      }
    }));

    if (stale.length) await supabase.from("push_subscriptions").delete().in("id", stale);

    if (sent > 0) {
      const { data: markedSale, error: markErr } = await supabase
        .from("sales")
        .update({ push_sent_at: new Date().toISOString() })
        .eq("id", saleId)
        .is("push_sent_at", null)
        .select("id, push_sent_at")
        .maybeSingle();

      if (markErr) {
        console.error(`[send-sale-notification] falha ao atualizar push_sent_at sale_id=${saleId}`, markErr);
      } else if (!markedSale) {
        console.log(`[send-sale-notification] push_sent_at já preenchido por outra execução sale_id=${saleId}`);
      } else {
        console.log(`[send-sale-notification] push_sent_at preenchido sale_id=${saleId}`);
      }
    }

    const emailResult = await emailPromise;
    const result = { ok: true, subscriptions_found, sent, failed, removed: stale.length, notification_payload: notificationPayload, errors, email: emailResult };
    console.log(`[send-sale-notification] result=`, result);
    return new Response(JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e?.message || String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
