import { useState, useEffect, useLayoutEffect, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { MapPin, Loader2, Truck, ShoppingBag, User, Check, Store, ChevronRight, ChevronLeft, CreditCard, QrCode, Banknote } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useCart } from "@/hooks/useCart";
import { useCoupon } from "@/hooks/useCoupon";
import { calculateCouponDiscount } from "@/lib/couponDiscount";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";

interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  unidade: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

const DEFAULT_SHIPPING = 15.0;

type DeliveryType = "delivery" | "pickup";
type PaymentMethod = "pix" | "credit_card" | "cash";

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className}>
    <path fill="currentColor" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const WhatsAppCheckout = () => {
  const { items, totalPrice, totalItems, clearCart } = useCart();
  const { coupon } = useCoupon();
  const couponCalc = calculateCouponDiscount(items, coupon);
  const subtotalAfterCoupon = couponCalc.finalTotal;
  const couponDiscount = couponCalc.discount;
  const navigate = useNavigate();
  const checkoutTopRef = useRef<HTMLHeadingElement | null>(null);

  const scrollCheckoutToTop = useCallback(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    checkoutTopRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
  }, []);

  const [step, setStep] = useState(1);

  useLayoutEffect(() => {
    const forceTop = () => scrollCheckoutToTop();
    forceTop();
    const rafId = requestAnimationFrame(forceTop);
    return () => cancelAnimationFrame(rafId);
  }, [step, scrollCheckoutToTop]);

  // Step 1 - Customer info
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");

  // Step 2 - Delivery
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("delivery");
  const [cep, setCep] = useState("");
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState<ViaCepResponse | null>(null);
  const [logradouro, setLogradouro] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [numero, setNumero] = useState("");

  // Step 3 - Payment method
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [changeFor, setChangeFor] = useState("");

  // Checkout
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [storeLocation, setStoreLocation] = useState("");

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("value")
      .eq("key", "store_info")
      .single()
      .then(({ data }) => {
        if (data?.value) {
          const info = data.value as unknown as { location: string };
          setStoreLocation(info.location || "");
        }
      });
  }, []);

  const { data: neighborhoods = [] } = useQuery({
    queryKey: ["shipping_neighborhoods"],
    queryFn: async () => {
      const { data, error } = await supabase.from("shipping_neighborhoods").select("*");
      if (error) throw error;
      return data;
    },
  });

  const shippingPrice = (() => {
    if (deliveryType === "pickup") return 0;
    if (!bairro) return DEFAULT_SHIPPING;
    const match = neighborhoods.find(
      (n) => n.name.toLowerCase().trim() === bairro.toLowerCase().trim()
    );
    return match ? Number(match.price) : DEFAULT_SHIPPING;
  })();

  const grandTotal = subtotalAfterCoupon + shippingPrice;

  const formatCep = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    if (digits.length > 5) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    return digits;
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length > 6) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    if (digits.length > 2) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return digits;
  };

  const fetchAddress = async () => {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) {
      toast.error("CEP deve ter 8 dígitos");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data: ViaCepResponse = await res.json();
      if (data.erro) {
        toast.error("CEP não encontrado");
        setAddress(null);
        return;
      }
      setAddress(data);
      setLogradouro(data.logradouro || "");
      setComplemento(data.complemento || "");
      setBairro(data.bairro || "");
      setNumero("");
    } catch {
      toast.error("Erro ao buscar CEP");
    } finally {
      setLoading(false);
    }
  };

  const canGoToStep2 = nome.trim() && email.trim() && telefone.trim();
  const canGoToStep3 = deliveryType === "pickup" || (deliveryType === "delivery" && address && logradouro.trim() && bairro.trim() && numero.trim());

  // Reset payment when delivery type changes (clear incompatible options)
  useEffect(() => {
    if (deliveryType === "pickup" && paymentMethod === "cash") {
      setPaymentMethod("pix");
    }
  }, [deliveryType]);

  const paymentMethodLabel: Record<PaymentMethod, string> = {
    pix: "PIX",
    credit_card: "Cartão de Crédito",
    cash: "Dinheiro",
  };

  const handleFinalize = async () => {
    if (items.length === 0) {
      toast.error("Carrinho vazio");
      return;
    }

    setCheckoutLoading(true);
    try {
      const orderNsu = `WA-${Date.now()}`;
      const phoneDigits = telefone.replace(/\D/g, "");

      const scale = totalPrice > 0 ? subtotalAfterCoupon / totalPrice : 1;
      const saleItems = items.map((item) => ({
        product_id: item.id,
        product_name: `${item.brand} - ${item.name} (Tam: ${item.size})`,
        product_sku: item.sku || null,
        unit_price: Number((item.price * scale).toFixed(2)),
      }));

      // Store the actual payment method chosen by the customer
      const dbPaymentMethod = paymentMethod;

      const { data, error } = await supabase.rpc("create_sale_with_items", {
        _order_nsu: orderNsu,
        _delivery_type: deliveryType,
        _customer_name: nome.trim(),
        _customer_email: email.trim(),
        _customer_phone: phoneDigits,
        _total_original: totalPrice,
        _discount: couponDiscount,
        _total_paid: grandTotal,
        _shipping_price: shippingPrice,
        _payment_method: dbPaymentMethod,
        _change_for: paymentMethod === "cash" && changeFor ? parseFloat(changeFor.replace(/[R$\s.]/g, "").replace(",", ".")) : null,
        _status: "pending",
        _address_cep: deliveryType === "delivery" && address ? cep.replace(/\D/g, "") : null,
        _address_street: deliveryType === "delivery" && address ? logradouro : null,
        _address_neighborhood: deliveryType === "delivery" && address ? bairro : null,
        _address_number: deliveryType === "delivery" && address ? numero : null,
        _address_complement: deliveryType === "delivery" && address ? complemento : null,
        _address_city: deliveryType === "delivery" && address ? address.localidade : null,
        _address_uf: deliveryType === "delivery" && address ? address.uf : null,
        _items: saleItems,
      });

      if (error || !data) {
        console.error("Sale error:", error);
        throw new Error("Erro ao registrar venda");
      }

      clearCart();

      // Open WhatsApp with the order number, then redirect to tracking page
      const waNumber = "5592993339711";
      const waMsg = `Oi! Quero finalizar o pedido nº ${orderNsu} 🛍️\n\nNome: ${nome.trim()}\nTelefone: ${telefone}`;
      const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(waMsg)}`;
      // Open in new tab so the user keeps the tracking page in this tab
      window.open(waUrl, "_blank");

      navigate(`/pedido-recebido?order_nsu=${orderNsu}&payment_method=whatsapp`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("WhatsApp checkout error:", msg, err);
      toast.error(`Erro ao processar pedido: ${msg}`);
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (totalItems === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center space-y-4">
            <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">Seu carrinho está vazio</p>
            <Button onClick={() => navigate("/")}>Voltar à Loja</Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const stepLabels = ["Dados", "Entrega", "Pagamento", "Confirmação"];
  const totalSteps = 4;

  const paymentOptions = (() => {
    const base: { id: PaymentMethod; icon: any; label: string }[] = [
      { id: "pix", icon: QrCode, label: "PIX" },
      { id: "credit_card", icon: CreditCard, label: "Cartão de Crédito" },
    ];
    if (deliveryType === "delivery") {
      base.push({ id: "cash", icon: Banknote, label: "Dinheiro" });
    }
    return base;
  })();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 space-y-6">
        {/* WhatsApp Banner */}
        <div ref={checkoutTopRef} className="bg-green-600 text-white rounded-xl p-4 text-center flex items-center justify-center gap-3">
          <WhatsAppIcon className="w-6 h-6 shrink-0" />
          <span className="text-sm sm:text-base font-bold uppercase tracking-wide">
            Responda as perguntas e finalize no WhatsApp
          </span>
        </div>

        {/* Stepper */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs sm:text-sm">
            {stepLabels.map((label, i) => (
              <div key={label} className={`flex flex-col sm:flex-row items-center gap-1 font-medium ${step >= i + 1 ? "text-primary" : "text-muted-foreground"}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                  step > i + 1 ? "bg-primary border-primary text-primary-foreground" :
                  step === i + 1 ? "border-primary text-primary" : "border-muted-foreground/30 text-muted-foreground"
                }`}>
                  {step > i + 1 ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                <span className="text-center leading-tight">{label}</span>
              </div>
            ))}
          </div>
          <Progress value={(step / totalSteps) * 100} className="h-1.5" />
        </div>

        {/* Step 1: Dados */}
        {step === 1 && (
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <User className="h-5 w-5 text-primary" /> Seus Dados
            </h2>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">Nome completo</label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">E-mail</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Telefone</label>
                <Input value={telefone} onChange={(e) => setTelefone(formatPhone(e.target.value))} placeholder="(00) 00000-0000" maxLength={15} />
              </div>
            </div>
            <Button
              className="w-full gap-2"
              onClick={() => {
                if (!canGoToStep2) {
                  toast.error("Preencha todos os campos");
                  return;
                }
                setStep(2);
              }}
            >
              Continuar <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Step 2: Entrega */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" /> Como deseja receber?
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setDeliveryType("delivery")}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${
                    deliveryType === "delivery" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/50"
                  }`}
                >
                  <Truck className={`w-6 h-6 ${deliveryType === "delivery" ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={`text-sm font-medium ${deliveryType === "delivery" ? "text-primary" : "text-foreground"}`}>Entrega</span>
                </button>
                <button
                  onClick={() => setDeliveryType("pickup")}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${
                    deliveryType === "pickup" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/50"
                  }`}
                >
                  <Store className={`w-6 h-6 ${deliveryType === "pickup" ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={`text-sm font-medium ${deliveryType === "pickup" ? "text-primary" : "text-foreground"}`}>Retirada</span>
                </button>
              </div>

              {deliveryType === "delivery" && (
                <div className="space-y-4 pt-2">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-1 block">CEP</label>
                    <Input
                      placeholder="00000-000"
                      value={cep}
                      onChange={(e) => setCep(formatCep(e.target.value))}
                      maxLength={9}
                      onKeyDown={(e) => e.key === "Enter" && fetchAddress()}
                    />
                    <Button
                      onClick={fetchAddress}
                      disabled={loading}
                      className="w-full gap-2 mt-2 bg-accent text-accent-foreground hover:bg-accent/80 font-semibold text-base h-11"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                      Confirmar Endereço
                    </Button>
                  </div>

                  {address && (
                    <>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground mb-1 block">Logradouro</label>
                        <Input value={logradouro} onChange={(e) => setLogradouro(e.target.value)} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground mb-1 block">Número</label>
                          <Input placeholder="Nº" value={numero} onChange={(e) => setNumero(e.target.value)} />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground mb-1 block">Complemento <span className="text-muted-foreground/60 font-normal">(opcional)</span></label>
                          <Input value={complemento} onChange={(e) => setComplemento(e.target.value)} />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground mb-1 block">Bairro</label>
                        <Input value={bairro} onChange={(e) => setBairro(e.target.value)} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground mb-1 block">Cidade</label>
                          <Input value={address.localidade} disabled className="opacity-70" />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground mb-1 block">UF</label>
                          <Input value={address.uf} disabled className="opacity-70" />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {deliveryType === "pickup" && (
                <div className="bg-muted rounded-xl p-4 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Retirada na loja</p>
                  {storeLocation && (
                    <p className="flex items-start gap-1.5 mb-1">
                      <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
                      <span className="font-medium text-foreground">{storeLocation}</span>
                    </p>
                  )}
                  <p>Você poderá retirar seu pedido após a confirmação. Entraremos em contato pelo telefone informado.</p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="gap-2" onClick={() => setStep(1)}>
                <ChevronLeft className="w-4 h-4" /> Voltar
              </Button>
              {canGoToStep3 && (
                <Button className="flex-1 gap-2" onClick={() => setStep(3)}>
                  Continuar <ChevronRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Forma de Pagamento */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" /> Forma de Pagamento
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {paymentOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setPaymentMethod(opt.id)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${
                      paymentMethod === opt.id ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/50"
                    }`}
                  >
                    <opt.icon className={`w-6 h-6 ${paymentMethod === opt.id ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`text-xs sm:text-sm font-medium text-center ${paymentMethod === opt.id ? "text-primary" : "text-foreground"}`}>{opt.label}</span>
                  </button>
                ))}
              </div>

              {paymentMethod === "cash" && (
                <div className="space-y-2 pt-2">
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">Troco pra quanto?</label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder={`Total: R$ ${grandTotal.toFixed(2).replace(".", ",")}`}
                    value={changeFor}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "");
                      if (digits === "") {
                        setChangeFor("");
                        return;
                      }
                      const numericValue = (parseInt(digits, 10) / 100).toFixed(2);
                      const [intPart, decPart] = numericValue.split(".");
                      const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
                      setChangeFor(`R$ ${formattedInt},${decPart}`);
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Deixe em branco se não precisa de troco
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="gap-2" onClick={() => setStep(2)}>
                <ChevronLeft className="w-4 h-4" /> Voltar
              </Button>
              <Button className="flex-1 gap-2" onClick={() => setStep(4)}>
                Continuar <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Confirmação */}
        {step === 4 && (
          <div className="space-y-4">
            {/* Order Summary */}
            <div className="bg-card border border-border rounded-xl p-6 space-y-3">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-primary" /> Resumo do Pedido
              </h2>
              {items.map((item) => (
                <div key={`${item.id}-${item.size}`} className="flex justify-between items-center text-sm">
                  <span className="text-foreground">
                    {item.quantity}x {item.brand} - {item.name} (Tam: {item.size})
                  </span>
                  <span className="font-semibold text-foreground">
                    R$ {(item.price * item.quantity).toFixed(2).replace(".", ",")}
                  </span>
                </div>
              ))}
            </div>

            {/* Customer summary */}
            <div className="bg-card border border-border rounded-xl p-6 space-y-2">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <User className="h-4 w-4 text-primary" /> Dados do Cliente
              </h3>
              <p className="text-sm text-muted-foreground">{nome}</p>
              <p className="text-sm text-muted-foreground">{email}</p>
              <p className="text-sm text-muted-foreground">{telefone}</p>
            </div>

            {/* Delivery summary */}
            <div className="bg-card border border-border rounded-xl p-6 space-y-2">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                {deliveryType === "delivery" ? <MapPin className="h-4 w-4 text-primary" /> : <Store className="h-4 w-4 text-primary" />}
                {deliveryType === "delivery" ? "Endereço de Entrega" : "Retirada na Loja"}
              </h3>
              {deliveryType === "delivery" ? (
                <>
                  <p className="text-sm text-muted-foreground">{logradouro}, {numero} {complemento && `- ${complemento}`}</p>
                  <p className="text-sm text-muted-foreground">{bairro} - {address?.localidade}/{address?.uf}</p>
                  <p className="text-sm text-muted-foreground">CEP: {cep}</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Entraremos em contato após a confirmação.</p>
              )}
            </div>

            {/* Payment method summary */}
            <div className="bg-card border border-border rounded-xl p-6 space-y-2">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" /> Forma de Pagamento
              </h3>
              <p className="text-sm text-muted-foreground">{paymentMethodLabel[paymentMethod]}</p>
              {paymentMethod === "cash" && changeFor && (
                <p className="text-sm text-muted-foreground">Troco para: {changeFor}</p>
              )}
            </div>

            {/* Totals */}
            <div className="bg-card border-2 border-primary/30 rounded-xl p-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground font-medium">R$ {totalPrice.toFixed(2).replace(".", ",")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {deliveryType === "delivery" ? `Frete (${bairro})` : "Frete (retirada)"}
                </span>
                <span className="text-foreground font-medium">
                  {shippingPrice === 0 ? "Grátis" : `R$ ${shippingPrice.toFixed(2).replace(".", ",")}`}
                </span>
              </div>
              <div className="border-t border-border pt-3 flex justify-between items-center">
                <span className="text-lg font-semibold text-foreground">Total</span>
                <span className="text-2xl font-bold text-foreground">
                  R$ {grandTotal.toFixed(2).replace(".", ",")}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="gap-2" onClick={() => setStep(3)}>
                <ChevronLeft className="w-4 h-4" /> Voltar
              </Button>
              <Button
                className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white"
                size="lg"
                onClick={handleFinalize}
                disabled={checkoutLoading}
              >
                {checkoutLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <WhatsAppIcon className="w-5 h-5" />
                    Confirmar Pedido
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default WhatsAppCheckout;
