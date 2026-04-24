import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ShoppingBag, Truck, Store, ChevronDown, ChevronUp, User, MapPin, Package, CreditCard, QrCode, Banknote, ArrowRight, Trash2, FileText, DollarSign } from "lucide-react";
import LabelOptionsModal from "./LabelOptionsModal";
import SaleTimeline from "./SaleTimeline";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DateRangeFilter, computeRange, type PeriodPreset } from "./DateRangeFilter";
import type { DateRange } from "react-day-picker";

type Sale = {
  id: string;
  order_nsu: string | null;
  delivery_type: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  address_street: string | null;
  address_neighborhood: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_city: string | null;
  address_uf: string | null;
  address_cep: string | null;
  shipping_price: number;
  total_original: number;
  discount: number;
  total_paid: number;
  status: string;
  payment_method: string;
  change_for: number | null;
  created_at: string;
  actual_delivery_cost: number | null;
};

type SaleItem = {
  id: string;
  product_name: string;
  product_sku: string | null;
  unit_price: number;
  product_id: string | null;
  product_image_url?: string | null;
};



const ITEMS_PER_PAGE = 10;

const AdminSales = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saleItems, setSaleItems] = useState<Record<string, SaleItem[]>>({});
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("today");
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletePreview, setDeletePreview] = useState<{name: string; currentStock: number; newStock: number; willReactivate: boolean}[] | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [invoiceSale, setInvoiceSale] = useState<Sale | null>(null);
  const [deliveryCostInputs, setDeliveryCostInputs] = useState<Record<string, string>>({});
  const getDateRange = () => {
    return computeRange(periodPreset, customRange ? { from: customRange.from, to: customRange.to } : undefined);
  };

  const fetchSales = async () => {
    const range = getDateRange();
    const query = supabase.from("sales").select("*")
      .gte("created_at", range.from.toISOString())
      .lte("created_at", range.to.toISOString())
      .order("created_at", { ascending: false });
    const { data } = await query;
    if (data) setSales(data as Sale[]);
  };

  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fetchItems = async (saleId: string) => {
    if (saleItems[saleId]) return;
    const { data } = await supabase.from("sale_items").select("*").eq("sale_id", saleId);
    if (data) {
      const productIds = data.filter((i: any) => i.product_id).map((i: any) => i.product_id);
      let imageMap: Record<string, string> = {};
      if (productIds.length > 0) {
        const { data: products } = await supabase.from("products").select("id, image_url").in("id", productIds);
        if (products) {
          products.forEach((p: any) => { if (p.image_url) imageMap[p.id] = p.image_url; });
        }
      }
      const items = (data as SaleItem[]).map((item) => ({
        ...item,
        product_image_url: item.product_id ? imageMap[item.product_id] || null : null,
      }));
      setSaleItems((prev) => ({ ...prev, [saleId]: items }));
    }
  };

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      fetchItems(id);
    }
  };

  useEffect(() => { fetchSales(); setPage(1); setSelectedIds(new Set()); }, [periodPreset, customRange]);

  const totalPages = Math.max(1, Math.ceil(sales.length / ITEMS_PER_PAGE));
  const paginatedSales = sales.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleCheckbox = useCallback((index: number, checked: boolean, shiftKey: boolean) => {
    const globalIndex = (page - 1) * ITEMS_PER_PAGE + index;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (shiftKey && lastClickedIndex !== null) {
        const start = Math.min(lastClickedIndex, globalIndex);
        const end = Math.max(lastClickedIndex, globalIndex);
        for (let i = start; i <= end; i++) {
          if (i < sales.length) next.add(sales[i].id);
        }
      } else {
        if (checked) next.add(sales[globalIndex].id);
        else next.delete(sales[globalIndex].id);
      }
      return next;
    });
    setLastClickedIndex(globalIndex);
  }, [lastClickedIndex, page, sales]);

  const handleSelectAll = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      paginatedSales.forEach((s) => {
        if (checked) next.add(s.id);
        else next.delete(s.id);
      });
      return next;
    });
  };

  const allPageSelected = paginatedSales.length > 0 && paginatedSales.every((s) => selectedIds.has(s.id));

  const handleDeleteSelected = async () => {
    setDeleting(true);
    const ids = Array.from(selectedIds);

    try {
      // 1. Fetch sale_items to know which products to restore stock
      const { data: itemsToRestore, error: fetchErr } = await supabase
        .from("sale_items")
        .select("product_id")
        .in("sale_id", ids);

      if (fetchErr) {
        console.error("Erro ao buscar itens:", fetchErr);
        toast.error("Erro ao buscar itens das vendas");
        setDeleting(false);
        return;
      }

      // 2. Delete sale_items first (before stock restore to avoid FK issues)
      const { error: itemsErr } = await supabase.from("sale_items").delete().in("sale_id", ids);
      if (itemsErr) {
        console.error("Erro ao apagar sale_items:", itemsErr);
        toast.error("Erro ao apagar itens das vendas");
        setDeleting(false);
        return;
      }

      // 3. Delete sales
      const { error: salesErr } = await supabase.from("sales").delete().in("id", ids);
      if (salesErr) {
        console.error("Erro ao apagar sales:", salesErr);
        toast.error("Erro ao apagar vendas");
        setDeleting(false);
        return;
      }

      // 4. Restore stock for each product (after deletes succeeded)
      if (itemsToRestore && itemsToRestore.length > 0) {
        const countMap: Record<string, number> = {};
        for (const item of itemsToRestore) {
          if (item.product_id) {
            countMap[item.product_id] = (countMap[item.product_id] || 0) + 1;
          }
        }
        for (const [productId, qty] of Object.entries(countMap)) {
          const { data: prod, error: prodErr } = await supabase
            .from("products")
            .select("stock, active")
            .eq("id", productId)
            .single();
          
          if (prodErr) {
            console.error(`Erro ao buscar produto ${productId}:`, prodErr);
            continue;
          }
          if (prod) {
            const newStock = (prod.stock || 0) + qty;
            const { error: updateErr } = await supabase
              .from("products")
              .update({ stock: newStock, active: true })
              .eq("id", productId);
            if (updateErr) {
              console.error(`Erro ao restaurar estoque do produto ${productId}:`, updateErr);
              toast.error(`Erro ao restaurar estoque de um produto`);
            }
          }
        }
      }

      toast.success(`${ids.length} venda(s) apagada(s) e estoque restaurado`);
      setSelectedIds(new Set());
      setShowDeleteDialog(false);
      fetchSales();
    } catch (err) {
      console.error("Erro inesperado:", err);
      toast.error("Erro inesperado ao apagar vendas");
    } finally {
      setDeleting(false);
    }
  };

  const statusLabel: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    pending: { label: "Pagamento Pendente", variant: "destructive" },
    paid: { label: "Pagamento Concluído", variant: "default" },
    separating: { label: "Separando", variant: "outline" },
    ready_pickup: { label: "Pronto p/ Retirada", variant: "default" },
    delivering: { label: "A Caminho", variant: "default" },
    completed: { label: "Concluído", variant: "default" },
    cancelled: { label: "Cancelado", variant: "destructive" },
  };

  const getNextStatus = (sale: Sale): { label: string; status: string } | null => {
    const isPickup = sale.delivery_type === "pickup";
    switch (sale.status) {
      case "pending": return { label: "Confirmar Pagamento", status: "paid" };
      case "paid": return { label: "Começar a Separar", status: "separating" };
      case "separating":
        return isPickup
          ? { label: "Pronto p/ Retirada", status: "ready_pickup" }
          : { label: "Enviar / A Caminho", status: "delivering" };
      case "ready_pickup": return { label: "Marcar como Retirado", status: "completed" };
      case "delivering": return { label: "Marcar como Entregue", status: "completed" };
      default: return null;
    }
  };

  const advanceStatus = async (saleId: string, newStatus: string) => {
    const { error } = await supabase.from("sales").update({ status: newStatus }).eq("id", saleId);
    if (error) {
      toast.error("Erro ao atualizar status");
      return;
    }
    toast.success("Status atualizado!");
    fetchSales();
  };

  const saveDeliveryCost = async (saleId: string) => {
    const val = deliveryCostInputs[saleId];
    const cost = parseFloat(val?.replace(",", ".") || "0");
    if (isNaN(cost) || cost < 0) {
      toast.error("Valor inválido");
      return;
    }
    const { error } = await supabase.from("sales").update({ actual_delivery_cost: cost } as any).eq("id", saleId);
    if (error) {
      toast.error("Erro ao salvar custo de entrega");
      return;
    }
    toast.success("Custo de entrega salvo!");
    fetchSales();
  };

  const formatPhone = (phone: string | null) => {
    if (!phone) return "";
    const d = phone.replace(/\D/g, "");
    if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    return phone;
  };

  const getPageNumbers = () => {
    const pages: number[] = [];
    if (totalPages <= 3) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (page === 1) { pages.push(1, 2, 3); }
      else if (page === totalPages) { pages.push(totalPages - 2, totalPages - 1, totalPages); }
      else { pages.push(page - 1, page, page + 1); }
    }
    return pages.filter((p) => p >= 1 && p <= totalPages);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-foreground font-heading">Vendas</h2>
        <div className="flex items-center gap-3">
          {selectedIds.size > 0 && (
            <Button variant="destructive" size="sm" className="gap-2" onClick={async () => {
              setShowDeleteDialog(true);
              setLoadingPreview(true);
              setDeletePreview(null);
              try {
                const ids = Array.from(selectedIds);
                const { data: items } = await supabase.from("sale_items").select("product_id, product_name").in("sale_id", ids);
                if (items && items.length > 0) {
                  const countMap: Record<string, { qty: number; name: string }> = {};
                  for (const item of items) {
                    if (item.product_id) {
                      if (!countMap[item.product_id]) countMap[item.product_id] = { qty: 0, name: item.product_name || "Produto" };
                      countMap[item.product_id].qty += 1;
                    }
                  }
                  const productIds = Object.keys(countMap);
                  const { data: products } = await supabase.from("products").select("id, stock, active").in("id", productIds);
                  const preview = productIds.map((pid) => {
                    const prod = products?.find((p: any) => p.id === pid);
                    const currentStock = prod?.stock || 0;
                    const newStock = currentStock + countMap[pid].qty;
                    return {
                      name: countMap[pid].name,
                      currentStock,
                      newStock,
                      willReactivate: !prod?.active,
                    };
                  });
                  setDeletePreview(preview);
                } else {
                  setDeletePreview([]);
                }
              } catch { setDeletePreview([]); }
              finally { setLoadingPreview(false); }
            }}>
              <Trash2 className="w-4 h-4" /> Apagar ({selectedIds.size})
            </Button>
          )}
          <DateRangeFilter
            preset={periodPreset}
            customRange={customRange}
            onChange={(p, r) => {
              setPeriodPreset(p);
              if (p === "custom" && r) setCustomRange(r);
            }}
          />

        </div>
      </div>

      {sales.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <ShoppingBag className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">Nenhuma venda neste período.</p>
        </div>
      ) : (
        <>
          {/* Select all checkbox */}
          <div className="flex items-center gap-2 mb-3 px-1">
            <Checkbox
              checked={allPageSelected}
              onCheckedChange={(checked) => handleSelectAll(!!checked)}
            />
            <span className="text-xs text-muted-foreground">Selecionar todos da página</span>
          </div>

          <div className="space-y-3">
            {paginatedSales.map((s, idx) => {
              const isExpanded = expandedId === s.id;
              const st = statusLabel[s.status] || statusLabel.pending;
              const isSelected = selectedIds.has(s.id);
              return (
                <div key={s.id} className={`bg-card border rounded-xl overflow-hidden ${isSelected ? "border-primary" : "border-border"}`}>
                  <div className="flex items-center">
                    <div
                      className="pl-4 py-4 flex items-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleCheckbox(idx, !!checked, (window.event as any)?.shiftKey || false)}
                        onClick={(e: React.MouseEvent) => {
                          handleCheckbox(idx, !isSelected, e.shiftKey);
                          e.stopPropagation();
                        }}
                      />
                    </div>
                    <button
                      onClick={() => toggleExpand(s.id)}
                      className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 text-left hover:bg-muted/50 transition-colors gap-2"
                    >
                       <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2 rounded-lg shrink-0 ${
                          (s.payment_method === "whatsapp" || s.order_nsu?.startsWith("WA-")) ? "bg-green-100" :
                          s.delivery_type === "pickup" ? "bg-accent/10" : "bg-primary/10"
                        }`}>
                          {(s.payment_method === "whatsapp" || s.order_nsu?.startsWith("WA-")) ? (
                            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-green-600"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                          ) : s.delivery_type === "pickup" ? (
                            <Store className="w-4 h-4 text-accent-foreground" />
                          ) : (
                            <Truck className="w-4 h-4 text-primary" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {s.customer_name || "Cliente"} — R$ {Number(s.total_paid).toFixed(2).replace(".", ",")}
                          </p>
                          <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
                            {format(new Date(s.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            {s.order_nsu && <span className="ml-2 font-mono">{s.order_nsu}</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        <Badge variant={st.variant} className="text-[10px] sm:text-xs">{st.label}</Badge>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-border px-4 pb-4 pt-3 space-y-4">
                      {/* Timeline */}
                      <SaleTimeline status={s.status} deliveryType={s.delivery_type} />
                      {/* Customer */}
                      <div className="space-y-1">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                          <User className="w-3 h-3" /> Cliente
                        </h4>
                        <p className="text-sm text-foreground">{s.customer_name}</p>
                        <p className="text-sm text-muted-foreground">{s.customer_email}</p>
                        <p className="text-sm text-muted-foreground">{formatPhone(s.customer_phone)}</p>
                      </div>

                      {/* Address */}
                      {s.delivery_type === "delivery" && s.address_street && (
                        <div className="space-y-1">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> Endereço
                          </h4>
                          <p className="text-sm text-foreground">
                            {s.address_street}, {s.address_number} {s.address_complement && `- ${s.address_complement}`}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {s.address_neighborhood} - {s.address_city}/{s.address_uf} — CEP {s.address_cep}
                          </p>
                        </div>
                      )}

                      {s.delivery_type === "pickup" && (
                        <div className="space-y-1">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                            <Store className="w-3 h-3" /> Retirada na loja
                          </h4>
                        </div>
                      )}

                      {/* Payment Method */}
                      <div className="space-y-1">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                          {(s.payment_method === "whatsapp" || s.order_nsu?.startsWith("WA-")) ? (
                            <svg viewBox="0 0 24 24" className="w-3 h-3 fill-green-600"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                          ) : s.payment_method === "pix" ? <QrCode className="w-3 h-3" /> : s.payment_method === "cash" ? <Banknote className="w-3 h-3" /> : <CreditCard className="w-3 h-3" />}
                          Pagamento
                        </h4>
                        <p className="text-sm text-foreground flex items-center gap-1.5">
                          {(s.payment_method === "whatsapp" || s.order_nsu?.startsWith("WA-")) ? (
                            <span className="inline-flex items-center gap-1.5 text-green-600 font-medium">
                              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-green-600"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                              WhatsApp — {s.payment_method === "pix" ? "PIX" : s.payment_method === "credit_card" ? "Cartão de Crédito" : s.payment_method === "cash" ? "Dinheiro" : "WhatsApp"}
                            </span>
                          ) : s.payment_method === "pix" ? "PIX" : s.payment_method === "credit_card" ? "Cartão de Crédito" : "Dinheiro"}
                        </p>
                        {s.payment_method === "cash" && s.change_for && (
                          <p className="text-sm text-muted-foreground">Troco para: R$ {Number(s.change_for).toFixed(2).replace(".", ",")}</p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                          <Package className="w-3 h-3" /> Itens
                        </h4>
                        {saleItems[s.id] ? (
                          saleItems[s.id].map((item) => (
                            <div key={item.id} className="flex items-center gap-3 text-sm py-1">
                              {item.product_image_url ? (
                                <img
                                  src={item.product_image_url}
                                  alt={item.product_name}
                                  className="w-12 h-12 rounded-lg object-cover cursor-pointer border border-border hover:opacity-80 transition-opacity"
                                  onClick={() => setPreviewImage(item.product_image_url!)}
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                                  <Package className="w-4 h-4 text-muted-foreground" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-foreground truncate">
                                  {item.product_sku && <span className="font-mono text-xs text-muted-foreground mr-2">{item.product_sku}</span>}
                                  {item.product_name}
                                </p>
                              </div>
                              <span className="font-medium text-foreground shrink-0">R$ {Number(item.unit_price).toFixed(2).replace(".", ",")}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">Carregando...</p>
                        )}
                      </div>

                      {/* Totals */}
                      <div className="border-t border-border pt-3 space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span className="text-foreground">R$ {Number(s.total_original).toFixed(2).replace(".", ",")}</span>
                        </div>
                        {Number(s.discount) > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Desconto</span>
                            <span className="text-orange-500">-R$ {Number(s.discount).toFixed(2).replace(".", ",")}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Frete</span>
                          <span className="text-foreground">
                            {Number(s.shipping_price) === 0 ? "Grátis" : `R$ ${Number(s.shipping_price).toFixed(2).replace(".", ",")}`}
                          </span>
                        </div>
                        <div className="flex justify-between font-bold text-base pt-1">
                          <span className="text-foreground">Total</span>
                          <span className="text-primary">R$ {Number(s.total_paid).toFixed(2).replace(".", ",")}</span>
                        </div>
                      </div>

                      {/* Post-sale: actual delivery cost */}
                      {s.status === "completed" && s.delivery_type === "delivery" && (
                        <div className="bg-muted/50 rounded-lg p-3 space-y-2 border border-border">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                            <DollarSign className="w-3 h-3" /> Pós-Venda — Custo Real de Entrega
                          </h4>
                          {s.actual_delivery_cost !== null && s.actual_delivery_cost !== undefined ? (
                            <div className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Frete cobrado do cliente</span>
                                <span className="text-foreground">R$ {Number(s.shipping_price).toFixed(2).replace(".", ",")}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Custo real de entrega</span>
                                <span className="text-foreground">R$ {Number(s.actual_delivery_cost).toFixed(2).replace(".", ",")}</span>
                              </div>
                              <div className="flex justify-between text-sm font-bold border-t border-border pt-1">
                                <span className="text-foreground">Lucro da venda</span>
                                <span className="text-green-600">
                                  R$ {(Number(s.total_paid) - Number(s.actual_delivery_cost)).toFixed(2).replace(".", ",")}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <Input
                                placeholder="Ex: 5,00"
                                value={deliveryCostInputs[s.id] || ""}
                                onChange={(e) => setDeliveryCostInputs((prev) => ({ ...prev, [s.id]: e.target.value }))}
                                className="flex-1"
                                onKeyDown={(e) => e.key === "Enter" && saveDeliveryCost(s.id)}
                              />
                              <Button size="sm" onClick={() => saveDeliveryCost(s.id)}>
                                Salvar
                              </Button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Pickup completed - show profit directly */}
                      {s.status === "completed" && s.delivery_type === "pickup" && (
                        <div className="bg-muted/50 rounded-lg p-3 border border-border">
                          <div className="flex justify-between text-sm font-bold">
                            <span className="text-foreground flex items-center gap-1">
                              <DollarSign className="w-3 h-3" /> Lucro da venda
                            </span>
                            <span className="text-green-600">
                              R$ {Number(s.total_paid).toFixed(2).replace(".", ",")}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                          variant="outline"
                          className="flex-1 gap-2 text-xs sm:text-sm"
                          onClick={() => { fetchItems(s.id); setInvoiceSale(s); }}
                        >
                          <FileText className="w-4 h-4" /> Gerar Nota
                        </Button>
                        {(() => {
                          const next = getNextStatus(s);
                          if (!next) return null;
                          return (
                            <Button
                              className="flex-1 gap-2 text-xs sm:text-sm"
                              onClick={() => advanceStatus(s.id, next.status)}
                            >
                              {next.label} <ArrowRight className="w-4 h-4" />
                            </Button>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                Anterior
              </Button>
              {getPageNumbers().map((p) => (
                <Button
                  key={p}
                  variant={p === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPage(p)}
                >
                  {p}
                </Button>
              ))}
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                Próximo
              </Button>
            </div>
          )}
        </>
      )}

      {/* Image preview dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-2xl p-2">
          {previewImage && (
            <img src={previewImage} alt="Produto" className="w-full h-auto rounded-lg" />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar {selectedIds.size} venda(s)?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>Essa ação não pode ser desfeita. Os produtos abaixo terão o estoque restaurado:</p>
                {loadingPreview ? (
                  <p className="text-xs text-muted-foreground">Carregando...</p>
                ) : deletePreview && deletePreview.length > 0 ? (
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {deletePreview.map((p, i) => (
                      <div key={i} className="bg-muted rounded-lg p-3 text-sm">
                        <p className="font-medium text-foreground truncate">{p.name}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs">
                          <span className="text-destructive font-mono">Estoque: {p.currentStock}</span>
                          <ArrowRight className="w-3 h-3 text-muted-foreground" />
                          <span className="text-primary font-mono font-bold">Estoque: {p.newStock}</span>
                        </div>
                        {p.willReactivate && (
                          <Badge variant="outline" className="mt-1 text-[10px] border-primary text-primary">
                            Será reativado
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Nenhum produto para restaurar.</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSelected} disabled={deleting || loadingPreview} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? "Apagando..." : "Confirmar e Apagar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Label options modal */}
      {invoiceSale && (
        <LabelOptionsModal
          open={!!invoiceSale}
          onOpenChange={(open) => { if (!open) setInvoiceSale(null); }}
          sale={invoiceSale}
          items={saleItems[invoiceSale.id] || []}
        />
      )}
    </div>
  );
};

export default AdminSales;
