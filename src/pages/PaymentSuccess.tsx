import { useSearchParams } from "react-router-dom";
import { CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useCart } from "@/hooks/useCart";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { trackPurchase } from "@/lib/fbpixel";

const WHATSAPP_NUMBER = "5592993339711";

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className}>
    <path fill="currentColor" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR") + " às " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
};

const paymentLabel: Record<string, string> = {
  pix: "PIX",
  cash: "Dinheiro",
  card: "Cartão",
  credit_card: "Cartão de Crédito",
  whatsapp: "WhatsApp",
};

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const { clearCart } = useCart();

  const orderNsu = searchParams.get("order_nsu");
  const captureMethod = searchParams.get("capture_method") || searchParams.get("payment_method");
  const isWhatsApp = captureMethod === "whatsapp";

  const [loadingWhatsApp, setLoadingWhatsApp] = useState(false);

  useEffect(() => {
    if (!isWhatsApp) {
      trackPurchase({ currency: "BRL" });
    }
    clearCart();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleWhatsApp = async () => {
    if (!orderNsu) return;

    // Open window synchronously to preserve user gesture (avoids popup blockers on mobile)
    const win = window.open("about:blank", "_blank");

    setLoadingWhatsApp(true);

    const buildUrl = (text: string) =>
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;

    const navigate = (url: string) => {
      if (win && !win.closed) {
        win.location.href = url;
      } else {
        window.location.href = url;
      }
    };

    const shortFallback = () => {
      const msg = [
        `🛍️ *CONFIRMAÇÃO DE PEDIDO*`,
        ``,
        `📦 *Pedido:* ${orderNsu}`,
        ``,
        `Olá! Gostaria de confirmar meu pedido.`,
      ].join("\n");
      navigate(buildUrl(msg));
    };

    try {
      const { data: sale } = await supabase
        .rpc("get_sale_by_nsu", { _nsu: orderNsu })
        .maybeSingle();

      // Só usa fallback curto se realmente não houver pedido
      if (!sale) {
        shortFallback();
        return;
      }

      const { data: items } = await supabase
        .from("sale_items")
        .select("product_name, unit_price, product_sku")
        .eq("sale_id", sale.id);

      // Agrupar itens iguais (nome + sku/variação + preço) para mostrar quantidade
      // Fallbacks inteligentes: nunca descartar item por campo faltando
      const grouped = new Map<
        string,
        { name: string; variant: string; price: number; qty: number }
      >();
      for (const i of (items || []) as any[]) {
        const name = (i.product_name || "").trim() || "Produto";
        const variant = (i.product_sku || "").trim() || "-";
        const price = Number(i.unit_price) || 0;
        const key = `${name}__${variant}__${price}`;
        const existing = grouped.get(key);
        if (existing) {
          existing.qty += 1;
        } else {
          grouped.set(key, { name, variant, price, qty: 1 });
        }
      }

      const itemsList = Array.from(grouped.values())
        .map((i) => {
          const variantLabel = i.variant && i.variant !== "-" ? ` (Tam: ${i.variant})` : "";
          return `• ${i.name}${variantLabel} x${i.qty} — ${formatCurrency(i.price * i.qty)}`;
        })
        .join("\n");

      const isPickup = sale.delivery_type === "pickup";
      const addressParts = [
        sale.address_street,
        sale.address_number ? `Nº ${sale.address_number}` : null,
        sale.address_complement,
        sale.address_neighborhood,
        sale.address_city,
        sale.address_uf,
        sale.address_cep ? `CEP: ${sale.address_cep}` : null,
      ]
        .filter(Boolean)
        .join(", ");

      const addressLine = isPickup
        ? "Retirada na loja"
        : addressParts || "A combinar";

      const lines: string[] = [
        `🛍️ *CONFIRMAÇÃO DE PEDIDO*`,
        ``,
        `📦 *Pedido:* ${sale.order_nsu || orderNsu}`,
        `👤 *Cliente:* ${sale.customer_name || "A informar"}`,
        `📞 *Telefone:* ${sale.customer_phone || "A informar"}`,
        `📍 *Endereço:* ${addressLine}`,
        ``,
        `🛒 *Produtos:*`,
        itemsList || `• Produto x1 — ${formatCurrency(Number(sale.total_paid) || 0)}`,
        ``,
        `💰 *Total:* ${formatCurrency(sale.total_paid)}`,
        `💳 *Pagamento:* ${paymentLabel[sale.payment_method] || sale.payment_method || "A definir"}`,
        `🚚 *Entrega:* ${isPickup ? "Retirada na loja" : "Entrega"}`,
      ];

      navigate(buildUrl(lines.join("\n")));
    } catch (err) {
      console.error("Error fetching sale for WhatsApp:", err);
      shortFallback();
    } finally {
      setLoadingWhatsApp(false);
    }
  };

  const methodLabel = (() => {
    if (!captureMethod) return null;
    return paymentLabel[captureMethod] || captureMethod;
  })();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="bg-card border border-border rounded-2xl p-8 max-w-md w-full text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground font-heading">
            Pedido Recebido!
          </h1>
          <p className="text-muted-foreground">
            Seu pedido foi recebido com sucesso. Obrigado pela compra!
          </p>
          {orderNsu && (
            <p className="text-sm text-muted-foreground">
              Pedido: <span className="font-semibold text-foreground">{orderNsu}</span>
            </p>
          )}
          {methodLabel && (
            <p className="text-sm text-muted-foreground">
              Pagamento: <span className="font-semibold text-foreground">{methodLabel}</span>
            </p>
          )}

          <div className="flex flex-col gap-2 pt-2">
            <Button
              className="w-full gap-3 bg-[hsl(142,70%,45%)] hover:bg-[hsl(142,70%,38%)] text-white text-lg font-bold py-7 rounded-xl shadow-lg"
              size="lg"
              onClick={handleWhatsApp}
              disabled={loadingWhatsApp || !orderNsu}
            >
              {loadingWhatsApp ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <WhatsAppIcon className="w-6 h-6" />
              )}
              Enviar pedido no WhatsApp
            </Button>
            <Button variant="outline" asChild className="w-full">
              <a href="/">Voltar à Loja</a>
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PaymentSuccess;
