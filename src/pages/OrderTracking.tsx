import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  CheckCircle,
  Package,
  Truck,
  Store,
  Clock,
  Loader2,
  MessageCircle,
  Search,
  ShoppingBag,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
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
  { key: "pending", label: "Pedido recebido", icon: Clock },
  { key: "separating", label: "Em separação", icon: Package },
  { key: "delivering", label: "Em entrega", icon: Truck },
  { key: "completed", label: "Entregue", icon: CheckCircle },
];

const STEPS_PICKUP = [
  { key: "pending", label: "Pedido recebido", icon: Clock },
  { key: "separating", label: "Em separação", icon: Package },
  { key: "ready_pickup", label: "Pronto para retirada", icon: Store },
  { key: "completed", label: "Retirado", icon: CheckCircle },
];

const WHATSAPP_NUMBER = "5592993339711";

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("pt-BR") +
    " às " +
    d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  );
};

const paymentLabel: Record<string, string> = {
  pix: "PIX",
  cash: "Dinheiro",
  card: "Cartão",
  credit_card: "Cartão de Crédito",
  whatsapp: "WhatsApp",
};

const isWhatsAppOrder = (sale: Pick<SaleInfo, "order_nsu" | "payment_method">) =>
  sale.payment_method === "whatsapp" || (sale.order_nsu?.startsWith("WA-") ?? false);

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length > 6)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length > 2) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return digits;
};

const OrderTracking = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderNsu = searchParams.get("order_nsu");

  const [sale, setSale] = useState<SaleInfo | null>(null);
  const [items, setItems] = useState<SaleItem[]>([]);
  const [loading, setLoading] = useState(Boolean(orderNsu));
  const [notFound, setNotFound] = useState(false);

  // Search form
  const [searchNsu, setSearchNsu] = useState("");
  const [searchPhone, setSearchPhone] = useState("");
  const [searching, setSearching] = useState(false);

  const fetchSaleByNsu = async (nsu: string) => {
    const { data, error } = await supabase
      .rpc("get_sale_by_nsu", { _nsu: nsu })
      .maybeSingle();
    if (error) {
      console.error("[OrderTracking] error", error.message);
      return null;
    }
    return (data as SaleInfo) || null;
  };

  const fetchItems = async (saleId: string, nsu?: string) => {
    // Direct table SELECT is blocked by RLS for anonymous users.
    // Use the security-definer RPC when we have the NSU (customer flow).
    if (nsu) {
      const { data, error } = await supabase.rpc(
        // @ts-expect-error - RPC pending migration apply; falls back gracefully
        "get_sale_items_by_nsu",
        { _nsu: nsu }
      );
      if (!error && data) return (data as SaleItem[]) || [];
    }
    const { data } = await supabase
      .from("sale_items")
      .select("product_name, unit_price, product_sku")
      .eq("sale_id", saleId);
    return (data as SaleItem[]) || [];
  };

  // Load sale when ?order_nsu= is present (with polling)
  useEffect(() => {
    if (!orderNsu) {
      setSale(null);
      setItems([]);
      setLoading(false);
      setNotFound(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setNotFound(false);

    const load = async () => {
      const data = await fetchSaleByNsu(orderNsu);
      if (cancelled) return;
      if (!data) {
        setSale(null);
        setNotFound(true);
        setLoading(false);
        return;
      }
      setSale(data);
      setNotFound(false);
      setLoading(false);

      // Items: only fetch once
      const itemsData = await fetchItems(data.id, orderNsu);
      if (!cancelled) setItems(itemsData);
    };

    load();
    const interval = setInterval(load, 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [orderNsu]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const nsu = searchNsu.trim();
    const phone = searchPhone.replace(/\D/g, "");

    if (!nsu && !phone) {
      toast.error("Informe o número do pedido ou seu telefone.");
      return;
    }

    setSearching(true);
    try {
      // Strategy 1: if NSU provided, use it (works without phone)
      if (nsu) {
        const data = await fetchSaleByNsu(nsu);
        if (!data) {
          toast.error("Pedido não encontrado. Verifique o número.");
          return;
        }
        // If phone was also provided, validate it matches
        if (phone) {
          const salePhone = (data.customer_phone || "").replace(/\D/g, "");
          if (salePhone !== phone) {
            toast.error("Pedido não encontrado para esse telefone.");
            return;
          }
        }
        // Navigate so the page shows full details + polling
        setSearchParams({ order_nsu: data.order_nsu || nsu });
        return;
      }

      // Strategy 2: phone-only search via RPC.
      // Requires the `get_sales_by_phone` RPC to be applied to the database.
      const { data, error } = await supabase.rpc(
        // @ts-expect-error - RPC pending migration apply; falls back gracefully
        "get_sales_by_phone",
        { _phone: phone }
      );

      if (error) {
        toast.error(
          "Para buscar apenas pelo telefone, é preciso aplicar a migration. Use o número do pedido enquanto isso."
        );
        return;
      }

      const list = (data as SaleInfo[]) || [];
      if (list.length === 0) {
        toast.error("Nenhum pedido encontrado para esse telefone.");
        return;
      }

      // Show the most recent order
      const first = list[0];
      setSearchParams({ order_nsu: first.order_nsu || "" });
    } finally {
      setSearching(false);
    }
  };

  const handleWhatsApp = () => {
    if (!sale) return;
    const itemsList = items
      .map(
        (i, idx) =>
          `  ${idx + 1}. ${i.product_name} (SKU: ${i.product_sku || "—"}) — ${formatCurrency(i.unit_price)}`
      )
      .join("\n");

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

    const msg = [
      `🛒 *CONFIRMAÇÃO DE PEDIDO*`,
      ``,
      `🔢 *Pedido:* ${sale.order_nsu || sale.id.slice(0, 8)}`,
      `📅 *Data:* ${formatDate(sale.created_at)}`,
      ``,
      `👤 *Cliente:* ${sale.customer_name || "—"}`,
      `📞 *Telefone:* ${sale.customer_phone || "—"}`,
      ``,
      `📦 *Itens:*`,
      itemsList || "  Nenhum item",
      ``,
      sale.discount > 0 ? `🏷️ *Desconto:* -${formatCurrency(sale.discount)}` : null,
      sale.shipping_price > 0 ? `🚚 *Frete:* ${formatCurrency(sale.shipping_price)}` : null,
      `✅ *Total:* ${formatCurrency(sale.total_paid)}`,
      ``,
      `💳 *Pagamento:* ${paymentLabel[sale.payment_method] || sale.payment_method}`,
      `🚛 *Tipo:* ${sale.delivery_type === "pickup" ? "Retirada" : "Entrega"}`,
      sale.delivery_type !== "pickup" && addressParts
        ? `📍 *Endereço:* ${addressParts}`
        : null,
    ]
      .filter(Boolean)
      .join("\n");

    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  const channelBadge = useMemo(() => {
    if (!sale) return null;
    const isWa = isWhatsAppOrder(sale);
    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
          isWa
            ? "bg-[hsl(142,70%,45%)]/10 text-[hsl(142,70%,38%)]"
            : "bg-primary/10 text-primary"
        }`}
      >
        {isWa ? (
          <MessageCircle className="w-3 h-3" />
        ) : (
          <ShoppingBag className="w-3 h-3" />
        )}
        Pedido via {isWa ? "WhatsApp" : "Site"}
      </span>
    );
  }, [sale]);

  // ============= NO ORDER YET → search form =============
  if (!orderNsu) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 max-w-md w-full space-y-6">
            <div className="text-center space-y-1">
              <h1 className="text-xl font-bold text-foreground font-heading">
                Acompanhar Pedido
              </h1>
              <p className="text-sm text-muted-foreground">
                Consulte pelo número do pedido ou pelo seu telefone.
              </p>
            </div>

            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">
                  Número do pedido
                </label>
                <Input
                  value={searchNsu}
                  onChange={(e) => setSearchNsu(e.target.value)}
                  placeholder="Ex: WA-1750000000000"
                />
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="h-px flex-1 bg-border" />
                ou
                <div className="h-px flex-1 bg-border" />
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">
                  Telefone usado no pedido
                </label>
                <Input
                  value={searchPhone}
                  onChange={(e) => setSearchPhone(formatPhone(e.target.value))}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                />
              </div>

              <Button type="submit" className="w-full gap-2" disabled={searching}>
                {searching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                Buscar pedido
              </Button>
            </form>

            <Button variant="outline" className="w-full" onClick={() => navigate("/")}>
              Voltar à Loja
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // ============= LOADING =============
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

  // ============= NOT FOUND =============
  if (notFound || !sale) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full text-center space-y-4">
            <XCircle className="w-12 h-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">Pedido não encontrado.</p>
            <Button onClick={() => setSearchParams({})} variant="outline" className="w-full">
              Buscar outro pedido
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // ============= ORDER DETAILS =============
  const isCancelled = sale.status === "cancelled";
  const steps = sale.delivery_type === "pickup" ? STEPS_PICKUP : STEPS_DELIVERY;
  const currentIdx = steps.findIndex((s) => s.key === sale.status);
  const activeIdx = currentIdx === -1 ? 0 : currentIdx;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 max-w-md w-full mx-auto px-4 py-10 sm:py-16">
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-xl font-bold text-foreground font-heading">
              Acompanhe seu Pedido
            </h1>
            <p className="text-sm text-muted-foreground font-mono">
              {sale.order_nsu || sale.id.slice(0, 8)}
            </p>
            <div className="flex justify-center">{channelBadge}</div>
            <p className="text-xs text-muted-foreground">{formatDate(sale.created_at)}</p>
          </div>

          {/* Cancelled banner */}
          {isCancelled && (
            <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm font-medium text-center">
              Pedido cancelado
            </div>
          )}

          {/* Timeline */}
          {!isCancelled && (
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
                        } ${
                          isCurrent
                            ? "ring-2 ring-primary ring-offset-2 ring-offset-card"
                            : ""
                        }`}
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
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Aguardando...
                        </p>
                      )}
                      {isDone && idx < activeIdx && (
                        <p className="text-xs text-primary mt-0.5">Concluído ✓</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Items */}
          {items.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border">
              <p className="text-sm font-semibold text-foreground">Itens</p>
              <ul className="space-y-1.5 text-sm">
                {items.map((it, idx) => (
                  <li
                    key={idx}
                    className="flex justify-between gap-2 text-muted-foreground"
                  >
                    <span className="truncate">{it.product_name}</span>
                    <span className="text-foreground shrink-0">
                      {formatCurrency(it.unit_price)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Totals */}
          <div className="space-y-1 pt-2 border-t border-border text-sm">
            {sale.discount > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Desconto</span>
                <span>-{formatCurrency(sale.discount)}</span>
              </div>
            )}
            {sale.shipping_price > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Frete</span>
                <span>{formatCurrency(sale.shipping_price)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-foreground pt-1">
              <span>Total</span>
              <span>{formatCurrency(sale.total_paid)}</span>
            </div>
            <p className="text-xs text-muted-foreground pt-1">
              Pagamento:{" "}
              <span className="text-foreground">
                {paymentLabel[sale.payment_method] || sale.payment_method}
              </span>
            </p>
          </div>

          {/* Actions */}
          <div className="pt-2 space-y-3">
            <Button
              className="w-full gap-2 bg-[hsl(142,70%,45%)] hover:bg-[hsl(142,70%,38%)] text-white"
              onClick={handleWhatsApp}
            >
              <MessageCircle className="w-4 h-4" />
              Falar no WhatsApp sobre o pedido
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setSearchParams({})}
            >
              Buscar outro pedido
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => navigate("/")}>
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
