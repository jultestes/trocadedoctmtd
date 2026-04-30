/**
 * Dispara o envio do e-mail de confirmação do pedido via Edge Function.
 *
 * Agora chamamos `send-sale-notification` (que já está deployada e responde 200)
 * — ela aceita `sale_id` e envia o e-mail do pedido (com proteção idempotente
 * via `sales.email_sent_at`) além de notificar admins.
 *
 * Usa fetch com `keepalive: true` para garantir que a requisição seja
 * concluída mesmo se a página navegar/fechar imediatamente após a chamada
 * (ex.: redirecionamento para WhatsApp ou página de sucesso).
 *
 * Fire-and-forget: nunca lança exceção para não bloquear o checkout.
 */
const SUPABASE_URL = "https://bdipjvkpasiuekqtaiev.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkaXBqdmtwYXNpdWVrcXRhaWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MTc4OTgsImV4cCI6MjA4OTA5Mzg5OH0.KKVzskEJh2TDjzrdlS4ggZDHu5BpI75GRWeykgUTwfY";

export async function sendOrderEmail(sale_id: string): Promise<void> {
  if (!sale_id) return;
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-sale-notification`, {
      method: "POST",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ sale_id }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error("[sendOrderEmail] HTTP", res.status, txt);
      return;
    }
    console.log("[sendOrderEmail] dispatched for sale", sale_id);
  } catch (err) {
    console.error("[sendOrderEmail] unexpected error:", err);
  }
}
