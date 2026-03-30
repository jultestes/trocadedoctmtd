import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, TrendingDown, TrendingUp, ShoppingCart, Plus, X, Search, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";

type Sale = {
  id: string;
  total_original: number;
  discount: number;
  total_paid: number;
  shipping_price: number;
  actual_delivery_cost: number | null;
  created_at: string;
  status: string;
};

type Coupon = {
  id: string;
  name: string;
  min_quantity: number;
  bundle_price: number;
  active: boolean;
};

type SkuProduct = {
  id: string;
  name: string;
  sku: string;
  price: number;
};

type DateFilter = "today" | "yesterday" | "7days" | "15days" | "30days" | "custom";

const AdminOverview = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilter>("today");
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();
  const [showSaleDialog, setShowSaleDialog] = useState(false);
  const { toast } = useToast();

  // Sale form state
  const [skuInput, setSkuInput] = useState("");
  const [saleProducts, setSaleProducts] = useState<SkuProduct[]>([]);
  const [selectedCouponId, setSelectedCouponId] = useState<string>("");
  const [skuLoading, setSkuLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const getDateRange = (): { from: string; to: string } => {
    const now = new Date();
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

    switch (dateFilter) {
      case "today":
        return { from: startOfDay(now).toISOString(), to: endOfDay(now).toISOString() };
      case "yesterday": {
        const y = new Date(now);
        y.setDate(y.getDate() - 1);
        return { from: startOfDay(y).toISOString(), to: endOfDay(y).toISOString() };
      }
      case "7days": {
        const d = new Date(now);
        d.setDate(d.getDate() - 7);
        return { from: startOfDay(d).toISOString(), to: endOfDay(now).toISOString() };
      }
      case "15days": {
        const d = new Date(now);
        d.setDate(d.getDate() - 15);
        return { from: startOfDay(d).toISOString(), to: endOfDay(now).toISOString() };
      }
      case "30days": {
        const d = new Date(now);
        d.setDate(d.getDate() - 30);
        return { from: startOfDay(d).toISOString(), to: endOfDay(now).toISOString() };
      }
      case "custom":
        return {
          from: customFrom ? startOfDay(customFrom).toISOString() : startOfDay(now).toISOString(),
          to: customTo ? endOfDay(customTo).toISOString() : endOfDay(now).toISOString(),
        };
      default:
        return { from: startOfDay(now).toISOString(), to: endOfDay(now).toISOString() };
    }
  };

  const fetchSales = async () => {
    const { from, to } = getDateRange();
    const { data, error } = await supabase
      .from("sales")
      .select("*")
      .in("status", ["paid", "completed", "separating", "delivering", "ready_pickup"])
      .gte("created_at", from)
      .lte("created_at", to)
      .order("created_at", { ascending: false });
    if (!error && data) setSales(data);
  };

  const fetchCoupons = async () => {
    const { data } = await supabase.from("coupons").select("*").eq("active", true);
    if (data) setCoupons(data);
  };

  useEffect(() => {
    fetchSales();
  }, [dateFilter, customFrom, customTo]);

  useEffect(() => {
    fetchCoupons();
  }, []);

  const stats = useMemo(() => {
    const totalSales = sales.length;
    const revenue = sales.reduce((s, v) => s + Number(v.total_paid), 0);
    const totalOriginal = sales.reduce((s, v) => s + Number(v.total_original), 0);
    const discount = sales.reduce((s, v) => s + Number(v.discount), 0);
    const netProfit = sales.reduce((s, v) => {
      const cost = v.actual_delivery_cost !== null && v.actual_delivery_cost !== undefined ? Number(v.actual_delivery_cost) : 0;
      return s + (Number(v.total_paid) - cost);
    }, 0);
    return { totalSales, revenue, totalOriginal, discount, netProfit };
  }, [sales]);

  // --- Sale dialog logic ---
  const addSkuProduct = async () => {
    const sku = skuInput.trim();
    if (!sku) return;
    setSkuLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("id, name, sku, price")
      .eq("sku", sku)
      .maybeSingle();
    setSkuLoading(false);
    if (error || !data) {
      toast({ title: `Produto com SKU "${sku}" não encontrado`, variant: "destructive" });
      return;
    }
    setSaleProducts((prev) => [...prev, data as SkuProduct]);
    setSkuInput("");
  };

  const removeProduct = (index: number) => {
    setSaleProducts((prev) => prev.filter((_, i) => i !== index));
  };

  const selectedCoupon = coupons.find((c) => c.id === selectedCouponId);

  const saleCalculation = useMemo(() => {
    const totalOriginal = saleProducts.reduce((s, p) => s + Number(p.price), 0);

    if (!selectedCoupon || saleProducts.length === 0) {
      return { totalOriginal, discount: 0, totalPaid: totalOriginal };
    }

    const qty = selectedCoupon.min_quantity;
    const bundlePrice = Number(selectedCoupon.bundle_price);
    const bundles = Math.floor(saleProducts.length / qty);
    const remainder = saleProducts.length % qty;

    // Sort by price descending so the most expensive items get the bundle discount
    const sorted = [...saleProducts].sort((a, b) => Number(b.price) - Number(a.price));
    const bundledCount = bundles * qty;
    const bundledTotal = bundles * bundlePrice;
    const remainderTotal = sorted.slice(bundledCount).reduce((s, p) => s + Number(p.price), 0);

    const totalPaid = bundledTotal + remainderTotal;
    const discount = totalOriginal - totalPaid;

    return { totalOriginal, discount: Math.max(0, discount), totalPaid };
  }, [saleProducts, selectedCoupon]);

  const handleSaveSale = async () => {
    if (saleProducts.length === 0) {
      toast({ title: "Adicione pelo menos 1 produto", variant: "destructive" });
      return;
    }
    setSaving(true);

    const { data: sale, error: saleError } = await supabase
      .from("sales")
      .insert({
        coupon_id: selectedCouponId || null,
        total_original: saleCalculation.totalOriginal,
        discount: saleCalculation.discount,
        total_paid: saleCalculation.totalPaid,
      })
      .select("id")
      .single();

    if (saleError || !sale) {
      toast({ title: "Erro ao registrar venda", variant: "destructive" });
      setSaving(false);
      return;
    }

    const items = saleProducts.map((p) => ({
      sale_id: sale.id,
      product_id: p.id,
      product_name: p.name,
      product_sku: p.sku,
      unit_price: p.price,
    }));

    const { error: itemsError } = await supabase.from("sale_items").insert(items);
    setSaving(false);

    if (itemsError) {
      toast({ title: "Erro ao salvar itens da venda", variant: "destructive" });
      return;
    }

    // Decrease stock for each product sold
    for (const p of saleProducts) {
      const { data: prod } = await supabase.from("products").select("stock").eq("id", p.id).single();
      if (prod) {
        await supabase.from("products").update({ stock: Math.max(0, prod.stock - 1) }).eq("id", p.id);
      }
    }

    toast({ title: "Venda registrada com sucesso!" });
    setShowSaleDialog(false);
    setSaleProducts([]);
    setSelectedCouponId("");
    fetchSales();
  };

  const dateLabels: Record<DateFilter, string> = {
    today: "Hoje",
    yesterday: "Ontem",
    "7days": "7 dias",
    "15days": "15 dias",
    "30days": "30 dias",
    custom: "Personalizado",
  };

  const cards = [
    { label: "Receita Gerada", value: `R$ ${stats.revenue.toFixed(2).replace(".", ",")}`, icon: DollarSign, color: "text-green-600" },
    { label: "Lucro Líquido", value: `R$ ${stats.netProfit.toFixed(2).replace(".", ",")}`, icon: Wallet, color: "text-emerald-600" },
    { label: "Desconto Total", value: `R$ ${stats.discount.toFixed(2).replace(".", ",")}`, icon: TrendingDown, color: "text-orange-500" },
    { label: "Total de Vendas", value: stats.totalSales, icon: ShoppingCart, color: "text-accent-foreground" },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold text-foreground font-heading">Visão Geral</h2>
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(dateLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {dateFilter === "custom" && (
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("gap-1", !customFrom && "text-muted-foreground")}>
                    <CalendarIcon className="w-3.5 h-3.5" />
                    {customFrom ? format(customFrom, "dd/MM/yy") : "De"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={customFrom} onSelect={setCustomFrom} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("gap-1", !customTo && "text-muted-foreground")}>
                    <CalendarIcon className="w-3.5 h-3.5" />
                    {customTo ? format(customTo, "dd/MM/yy") : "Até"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={customTo} onSelect={setCustomTo} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          )}

          <Button onClick={() => setShowSaleDialog(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Adicionar Venda
          </Button>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => (
          <div key={c.label} className="bg-card rounded-xl border border-border p-4 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <c.icon className={`w-5 h-5 shrink-0 ${c.color}`} />
              <span className="text-xs sm:text-sm text-muted-foreground font-medium truncate">{c.label}</span>
            </div>
            <p className="text-xl sm:text-3xl font-bold text-foreground break-all">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Recent sales list */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Vendas Recentes</h3>
        {sales.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhuma venda neste período.</p>
        ) : (
          <div className="space-y-2">
            {sales.slice(0, 10).map((s) => (
              <div key={s.id} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    R$ {Number(s.total_paid).toFixed(2).replace(".", ",")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(s.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    {Number(s.discount) > 0 && (
                      <span className="ml-2 text-orange-500">
                        -R$ {Number(s.discount).toFixed(2).replace(".", ",")}
                      </span>
                    )}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Original: R$ {Number(s.total_original).toFixed(2).replace(".", ",")}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Register Sale Dialog */}
      <Dialog open={showSaleDialog} onOpenChange={setShowSaleDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Venda</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* SKU Input */}
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">SKU do Produto</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: 123456"
                  value={skuInput}
                  onChange={(e) => setSkuInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addSkuProduct()}
                  maxLength={6}
                />
                <Button onClick={addSkuProduct} disabled={skuLoading} size="icon" variant="outline">
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Added products */}
            {saleProducts.length > 0 && (
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {saleProducts.map((p, i) => (
                  <div key={`${p.id}-${i}`} className="flex items-center justify-between bg-muted rounded-lg px-3 py-2 text-sm">
                    <div>
                      <span className="font-mono text-xs text-muted-foreground mr-2">{p.sku}</span>
                      <span className="text-foreground">{p.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-foreground font-medium">
                        R$ {Number(p.price).toFixed(2).replace(".", ",")}
                      </span>
                      <button onClick={() => removeProduct(i)} className="text-destructive hover:opacity-70">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Coupon select */}
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Cupom</label>
              <Select value={selectedCouponId} onValueChange={setSelectedCouponId}>
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum cupom" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum cupom</SelectItem>
                  {coupons.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.min_quantity} por R$ {Number(c.bundle_price).toFixed(2).replace(".", ",")})
                    </SelectItem>
                  ))}
                </SelectContent>
            </Select>
              {selectedCoupon && saleProducts.length > 0 && saleProducts.length < selectedCoupon.min_quantity && (
                <p className="text-xs text-orange-500 mt-1">
                  Adicione mais {selectedCoupon.min_quantity - saleProducts.length} produto(s) para ativar o cupom
                </p>
              )}
              {selectedCoupon && saleProducts.length > 0 && saleProducts.length >= selectedCoupon.min_quantity && (
                <p className="text-xs text-green-600 mt-1">
                  ✓ Cupom aplicado! {Math.floor(saleProducts.length / selectedCoupon.min_quantity)} combo(s) de {selectedCoupon.min_quantity} produtos
                </p>
              )}
            </div>

            {/* Summary */}
            <div className="bg-muted rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Valor Total</span>
                <span className="text-foreground font-medium">
                  R$ {saleCalculation.totalOriginal.toFixed(2).replace(".", ",")}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Desconto</span>
                <span className="text-orange-500 font-medium">
                  -R$ {saleCalculation.discount.toFixed(2).replace(".", ",")}
                </span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between text-base font-bold">
                <span className="text-foreground">Valor a Pagar</span>
                <span className="text-primary">
                  R$ {saleCalculation.totalPaid.toFixed(2).replace(".", ",")}
                </span>
              </div>
            </div>

            <Button className="w-full" onClick={handleSaveSale} disabled={saving || saleProducts.length === 0}>
              {saving ? "Salvando..." : "Registrar Venda"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminOverview;
