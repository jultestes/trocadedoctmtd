import { supabase } from "@/integrations/supabase/client";

interface NotifySalePayload {
  sale_id: string;
  total_paid: number;
}

/**
 * Dispara a notificação Web Push de nova venda.
 * Nunca lança exceção — falhas são apenas logadas para não bloquear o checkout.
 */
export async function notifyNewSale(payload: NotifySalePayload): Promise<void> {
  try {
    const { data, error } = await supabase.functions.invoke(
      "send-sale-notification",
      { body: payload }
    );

    if (error) {
      console.error("[notifyNewSale] Edge Function error:", error);
      return;
    }

    if (data && (data as any).error) {
      console.error("[notifyNewSale] Notification reported error:", data);
      return;
    }

    console.log("[notifyNewSale] sent:", data);
  } catch (err) {
    console.error("[notifyNewSale] Unexpected error:", err);
  }
}
