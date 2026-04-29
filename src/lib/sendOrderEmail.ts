import { supabase } from "@/integrations/supabase/client";

/**
 * Dispara o envio do e-mail de confirmação do pedido via Edge Function.
 * Fire-and-forget: nunca lança exceção para não bloquear o checkout.
 */
export async function sendOrderEmail(sale_id: string): Promise<void> {
  try {
    const { data, error } = await supabase.functions.invoke(
      "send-order-email",
      { body: { sale_id } }
    );
    if (error) {
      console.error("[sendOrderEmail] Edge Function error:", error);
      return;
    }
    if (data && (data as any).error) {
      console.error("[sendOrderEmail] reported error:", data);
      return;
    }
    console.log("[sendOrderEmail] sent:", data);
  } catch (err) {
    console.error("[sendOrderEmail] unexpected error:", err);
  }
}
