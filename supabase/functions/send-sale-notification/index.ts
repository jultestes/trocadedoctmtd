// deno-lint-ignore-file no-explicit-any
// Web Push (RFC 8291 / aes128gcm) — pure WebCrypto for Deno edge runtime.
// v1.0.2 — force deploy without stale Deno lock
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { sale_id, order_nsu, total_paid, customer_name } = body || {};

    const { data: admins, error: adminsErr } = await supabase
      .from("user_roles").select("user_id").eq("role", "admin");
    if (adminsErr) throw adminsErr;
    const adminIds = (admins ?? []).map((a: any) => a.user_id);
    if (adminIds.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0, reason: "no admins" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: subs, error: subsErr } = await supabase
      .from("push_subscriptions").select("id, endpoint, p256dh, auth").in("user_id", adminIds);
    if (subsErr) throw subsErr;

    const orderLabel = order_nsu
      ? `Pedido #${order_nsu}`
      : sale_id ? `Pedido ${String(sale_id).slice(0, 8)}` : "";
    const valueLabel = typeof total_paid === "number"
      ? ` — R$ ${Number(total_paid).toFixed(2).replace(".", ",")}` : "";
    const bodyText = `Um novo pedido acabou de entrar no site.${
      orderLabel ? `\n${orderLabel}${valueLabel}` : ""
    }${customer_name ? `\nCliente: ${customer_name}` : ""}`;

    const payloadStr = JSON.stringify({
      title: "Nova venda recebida!",
      body: bodyText,
      tag: `sale-${sale_id || Date.now()}`,
      url: "/admin",
    });

    let sent = 0;
    const stale: string[] = [];

    await Promise.all((subs ?? []).map(async (s: any) => {
      try {
        const res = await sendOne(s, payloadStr);
        if (res.status >= 200 && res.status < 300) sent++;
        else if (res.status === 404 || res.status === 410) stale.push(s.id);
        else console.error("push status", res.status, await res.text().catch(() => ""));
      } catch (err: any) {
        console.error("push error", err?.message || err);
      }
    }));

    if (stale.length) await supabase.from("push_subscriptions").delete().in("id", stale);

    return new Response(JSON.stringify({ ok: true, sent, removed: stale.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e?.message || String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
