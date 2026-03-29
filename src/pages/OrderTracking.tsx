import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, Package, Truck, Store, Clock, Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

type SaleItem = {
  product_name: string;
  unit_price: number;
  product_sku: string | null;
};

type SaleInfo = {
  id: string;
  order_nsu: string | null;
  status: string;
  delivery_type: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  payment_method: string;
  total_paid: number;
  total_original: number;
  discount: number;
  shipping_price: number;
  change_for: number | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_uf: string | null;
  address_cep: string | null;
  created_at: string;
};

const STEPS_DELIVERY = [
  { key: "pending", label: "Confirmação de Pedido", icon: Clock },
  { key: "separating", label: "Separando Produto", icon: Package },
  { key: "delivering", label: "A Caminho", icon: Truck },
  { key: "completed", label: "Entregue", icon: CheckCircle },
];

const STEPS_PICKUP = [
  { key: "pending", label: "Confirmação de Pedido", icon: Clock },
  { key: "separating", label: "Separando Produto", icon: Package },
  { key: "ready_pickup", label: "Pronto para Retirada", icon: Store },
  { key: "completed", label: "Retirado", icon: CheckCircle },
];

const WHATSAPP_NUMBER = "5592993339711";

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
};

const OrderTracking = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderNsu = searchParams.get("order_nsu");
  const [sale, setSale] = useState<SaleInfo | null>(null);
  const [items, setItems] = useState<SaleItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSale = async () => {
    if (!orderNsu) return;
    console.log(`[OrderTracking] Polling status for order_nsu=${orderNsu} at ${new Date().toLocaleTimeString()}`);
    const { data, error } = await supabase
      .rpc("get_sale_by_nsu", { _nsu: orderNsu })
      .maybeSingle();
    if (error) {
      console.log(`[OrderTracking] Error:`, error.message);
    } else {
      console.log(`[OrderTracking] Status: ${data?.status}`);
      if (data) {
        setSale(data as SaleInfo);
        // fetch items once
        if (items.length === 0) {
          const { data: itemsData } = await supabase
            .from("sale_items")
            .select("product_name, unit_price, product_sku")
            .eq("sale_id", data.id);
          if (itemsData) setItems(itemsData);
        }
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSale();
    const interval = setInterval(fetchSale, 10000);
    return () => clearInterval(interval);
  }, [orderNsu]);

  const handleWhatsApp = () => {
    if (!sale) return;

    const itemsList = items
      .map((i, idx) => `  ${idx + 1}. ${i.product_name} (SKU: ${i.product_sku || "—"}) — ${formatCurrency(i.unit_price)}`)
      .join("\n");

    const addressParts = [
      sale.address_street,
      sale.address_number ? `Nº ${sale.address_number}` : null,
      sale.address_complement,
      sale.address_neighborhood,
      sale.address_city,
      sale.address_uf,
      sale.address_cep ? `CEP: ${sale.address_cep}` : null,
    ].filter(Boolean).join(", ");

    const msg = [
      `🛒 *CONFIRMAÇÃO DE PEDIDO*`,
      ``,
      `📋 *ID:* ${sale.id}`,
      `🔢 *NSU:* ${sale.order_nsu || "—"}`,
      `📅 *Data:* ${formatDate(sale.created_at)}`,
      ``,
      `👤 *Cliente:* ${sale.customer_name || "—"}`,
      `📞 *Telefone:* ${sale.customer_phone || "—"}`,
      `📧 *Email:* ${sale.customer_email || "—"}`,
      ``,
      `📦 *Itens:*`,
      itemsList || "  Nenhum item",
      ``,
      `💰 *Subtotal:* ${formatCurrency(sale.total_original)}`,
      sale.discount > 0 ? `🏷️ *Desconto:* -${formatCurrency(sale.discount)}` : null,
      sale.shipping_price > 0 ? `🚚 *Frete:* ${formatCurrency(sale.shipping_price)}` : null,
      `✅ *Total Pago:* ${formatCurrency(sale.total_paid)}`,
      ``,
      `💳 *Pagamento:* ${paymentLabel[sale.payment_method] || sale.payment_method}`,
      sale.payment_method === "cash" && sale.change_for ? `💵 *Troco para:* ${formatCurrency(sale.change_for)}` : null,
      ``,
      `🚛 *Tipo:* ${sale.delivery_type === "pickup" ? "Retirada" : "Entrega"}`,
      sale.delivery_type !== "pickup" && addressParts ? `📍 *Endereço:* ${addressParts}` : null,
    ].filter(Boolean).join("\n");

    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  if (!orderNsu) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <p className="text-muted-foreground">Nenhum pedido informado.</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <p className="text-muted-foreground">Pedido não encontrado.</p>
        </main>
        <Footer />
      </div>
    );
  }

  const steps = sale.delivery_type === "pickup" ? STEPS_PICKUP : STEPS_DELIVERY;
  const currentIdx = steps.findIndex((s) => s.key === sale.status);
  const activeIdx = currentIdx === -1 ? 0 : currentIdx;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 max-w-md w-full space-y-6">
          <div className="text-center space-y-1">
            <h1 className="text-xl font-bold text-foreground font-heading">Acompanhe seu Pedido</h1>
            <p className="text-sm text-muted-foreground font-mono">{sale.order_nsu}</p>
          </div>

          {/* Timeline */}
          <div className="space-y-0">
            {steps.map((step, idx) => {
              const isDone = idx <= activeIdx;
              const isCurrent = idx === activeIdx;
              const Icon = step.icon;
              return (
                <div key={step.key} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                        isDone
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      } ${isCurrent ? "ring-2 ring-primary ring-offset-2 ring-offset-card" : ""}`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    {idx < steps.length - 1 && (
                      <div
                        className={`w-0.5 h-10 ${
                          idx < activeIdx ? "bg-primary" : "bg-border"
                        }`}
                      />
                    )}
                  </div>
                  <div className="pt-1.5">
                    <p
                      className={`text-sm font-medium ${
                        isDone ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {step.label}
                    </p>
                    {isCurrent && idx < steps.length - 1 && (
                      <p className="text-xs text-muted-foreground mt-0.5">Aguardando...</p>
                    )}
                    {isDone && idx < activeIdx && (
                      <p className="text-xs text-primary mt-0.5">Concluído ✓</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 space-y-3">
            <Button
              className="w-full gap-2 bg-[hsl(142,70%,45%)] hover:bg-[hsl(142,70%,38%)] text-white"
              onClick={handleWhatsApp}
            >
              <MessageCircle className="w-4 h-4" />
              Confirmar Pedido pelo WhatsApp
            </Button>
            <Button variant="outline" className="w-full" onClick={() => navigate("/")}>
              Voltar à Loja
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default OrderTracking;