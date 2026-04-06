import { useState, useEffect, useLayoutEffect, useCallback, useRef } from "react";
import { trackInitiateCheckout } from "@/lib/fbpixel";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { MapPin, Search, Loader2, Truck, ShoppingBag, User, Check, Store, ChevronRight, ChevronLeft, CreditCard, QrCode, Banknote } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useCart } from "@/hooks/useCart";
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

const Checkout = () => {
  const { items, totalPrice, totalItems, clearCart } = useCart();
  const navigate = useNavigate();
  const checkoutTopRef = useRef<HTMLHeadingElement | null>(null);

  const scrollCheckoutToTop = useCallback(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    checkoutTopRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
  }, []);

  useEffect(() => { trackInitiateCheckout({ value: totalPrice, currency: "BRL", num_items: totalItems }); }, []);

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

  // Reset payment method when switching to pickup if cash is selected
  useEffect(() => {
    if (deliveryType === "pickup" && paymentMethod === "cash") {
      setPaymentMethod("pix");
    }
  }, [deliveryType]);

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

  const grandTotal = totalPrice + shippingPrice;

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

  const saveSaleToDB = async (orderNsu: string) => {
    const phoneDigits = telefone.replace(/\D/g, "");

    const saleItems = items.map((item) => ({
      product_id: item.id,
      product_name: `${item.brand} - ${item.name} (Tam: ${item.size})`,
      product_sku: item.sku || null,
      unit_price: item.price,
    }));

    const { data, error } = await supabase.rpc("create_sale_with_items", {
      _order_nsu: orderNsu,
      _delivery_type: deliveryType,
      _customer_name: nome.trim(),
      _customer_email: email.trim(),
      _customer_phone: phoneDigits,
      _total_original: totalPrice,
      _discount: 0,
      _total_paid: grandTotal,
      _shipping_price: shippingPrice,
      _payment_method: paymentMethod,
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

    return { saleId: (data as any).sale_id, orderNsu };
  };

  const handleFinalize = async () => {
    if (items.length === 0) {
      toast.error("Carrinho vazio");
      return;
    }

    setCheckoutLoading(true);
    try {
      const orderNsu = `TMTD-${Date.now()}`;

      // Save sale
      await saveSaleToDB(orderNsu);

      if (paymentMethod === "cash") {
        // Cash: go directly to success page
        clearCart();
        navigate(`/pedido-recebido?order_nsu=${orderNsu}&payment_method=cash`);
        return;
      }

      // Pix/Credit card: generate InfinitePay link
      const phoneDigits = telefone.replace(/\D/g, "");
      const redirectUrl = `${window.location.origin}/pedido-recebido`;

      const payload: Record<string, unknown> = {
        items: [
          ...items.map((item) => ({
            description: `${item.brand} - ${item.name} (Tam: ${item.size})`,
            quantity: item.quantity,
            price: item.price,
          })),
          ...(shippingPrice > 0
            ? [{ description: "Frete", quantity: 1, price: shippingPrice }]
            : []),
        ],
        order_nsu: orderNsu,
        redirect_url: redirectUrl,
        customer: {
          name: nome.trim(),
          email: email.trim(),
          phone_number: `+55${phoneDigits}`,
        },
      };

      if (deliveryType === "delivery" && address) {
        payload.address = {
          cep: cep.replace(/\D/g, ""),
          street: logradouro,
          neighborhood: bairro,
          number: numero,
          complement: complemento,
        };
      }

      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: payload,
      });

      if (error) throw error;

      const checkoutUrl = data?.checkout_url || data?.url || data?.link;
      if (!checkoutUrl) {
        console.log("InfinitePay response:", JSON.stringify(data));
        throw new Error("Link de pagamento não retornado");
      }

      clearCart();
      window.location.href = checkoutUrl;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Checkout error:", msg, err);
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

  const paymentMethodLabel: Record<PaymentMethod, string> = {
    pix: "PIX",
    credit_card: "Cartão de Crédito",
    cash: "Dinheiro",
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 space-y-6">
        <h1 ref={checkoutTopRef} className="text-2xl font-bold text-foreground font-heading">Checkout</h1>

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

        {/* Step 2: Endereço ou Retirada */}
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
                  <p>Você poderá retirar seu pedido após a confirmação do pagamento. Entraremos em contato pelo telefone informado.</p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="gap-2" onClick={() => setStep(1)}>
                <ChevronLeft className="w-4 h-4" /> Voltar
              </Button>
              {canGoToStep3 && (
                <Button
                  className="flex-1 gap-2"
                  onClick={() => setStep(3)}
                >
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
              <div className={`grid gap-3 ${deliveryType === "pickup" ? "grid-cols-2" : "grid-cols-3"}`}>
                {([
                  { id: "pix" as PaymentMethod, icon: QrCode, label: "PIX" },
                  { id: "credit_card" as PaymentMethod, icon: CreditCard, label: "Cartão de Crédito" },
                  ...(deliveryType === "delivery" ? [{ id: "cash" as PaymentMethod, icon: Banknote, label: "Dinheiro" }] : []),
                ]).map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setPaymentMethod(opt.id)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${
                      paymentMethod === opt.id ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/50"
                    }`}
                  >
                    <opt.icon className={`w-6 h-6 ${paymentMethod === opt.id ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`text-sm font-medium ${paymentMethod === opt.id ? "text-primary" : "text-foreground"}`}>{opt.label}</span>
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
                      // Remove tudo que não é dígito
                      const digits = e.target.value.replace(/\D/g, "");
                      if (digits === "") {
                        setChangeFor("");
                        return;
                      }
                      // Converte centavos para reais
                      const numericValue = (parseInt(digits, 10) / 100).toFixed(2);
                      // Formata como R$ X.XXX,XX
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
                <p className="text-sm text-muted-foreground">Entraremos em contato após a confirmação do pagamento.</p>
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
              <Button className="flex-1 gap-2" size="lg" onClick={handleFinalize} disabled={checkoutLoading}>
                {checkoutLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  "CONFIRMAR E PAGAR"
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

export default Checkout;
