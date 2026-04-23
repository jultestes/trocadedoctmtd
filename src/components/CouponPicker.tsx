import { useEffect, useRef, useState } from "react";
import { Ticket, Check, Lock, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/hooks/useCart";
import { useCoupon, type AppliedCoupon } from "@/hooks/useCoupon";
import { calculateCouponDiscount } from "@/lib/couponDiscount";
import { cn } from "@/lib/utils";

const formatBRL = (n: number) => `R$ ${n.toFixed(2).replace(".", ",")}`;

const CouponPicker = () => {
  const { items, totalItems } = useCart();
  const { coupon, applyCoupon, remove } = useCoupon();
  const [list, setList] = useState<AppliedCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const autoAppliedRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await (supabase as any)
        .from("coupons")
        .select("*")
        .eq("active", true)
        .eq("show_in_cart", true)
        .order("display_order", { ascending: true })
        .order("min_quantity", { ascending: true });
      if (mounted) {
        setList((data as AppliedCoupon[]) || []);
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Auto-select the best eligible coupon (highest min_quantity the user qualifies for)
  useEffect(() => {
    if (loading || list.length === 0) return;
    const eligible = list.filter((c) => totalItems >= c.min_quantity);
    if (eligible.length === 0) return;
    // Pick the one with the highest min_quantity (best discount tier reached)
    const best = eligible.reduce((a, b) => (a.min_quantity >= b.min_quantity ? a : b));
    // Only auto-apply if no coupon selected, or if a different "best" tier is now available
    if (!coupon && autoAppliedRef.current !== best.id) {
      applyCoupon(best);
      autoAppliedRef.current = best.id;
    } else if (coupon && coupon.id !== best.id && autoAppliedRef.current !== best.id) {
      // Upgrade to a better tier automatically
      const currentEligible = eligible.find((c) => c.id === coupon.id);
      if (!currentEligible || best.min_quantity > coupon.min_quantity) {
        applyCoupon(best);
        autoAppliedRef.current = best.id;
      }
    }
  }, [totalItems, list, loading, coupon, applyCoupon]);

  if (loading) return null;
  if (list.length === 0) return null;

  return (
    <div className="rounded-xl border-2 border-amber-300/70 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 p-4 space-y-3 shadow-sm">
      <div className="space-y-1">
        <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2 leading-tight">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-orange-500 text-white shadow-sm">
            <Sparkles className="w-4 h-4" />
          </span>
          🔥 Aplique seu desconto agora
        </h3>
        <p className="text-[11px] text-muted-foreground leading-snug pl-9">
          Selecione uma promoção para ativar o desconto automático no seu pedido
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {list.map((c) => {
          const isSelected = coupon?.id === c.id;
          const missing = Math.max(0, c.min_quantity - totalItems);
          const eligible = totalItems >= c.min_quantity;
          const preview = calculateCouponDiscount(items, c);

          return (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                if (isSelected) remove();
                else applyCoupon(c);
              }}
              className={cn(
                "group relative text-left rounded-lg border-2 px-3 py-3 transition-all flex items-center gap-3 overflow-hidden",
                isSelected
                  ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 shadow-md ring-2 ring-emerald-500/20"
                  : eligible
                    ? "border-orange-300 bg-white dark:bg-background hover:border-orange-500 hover:shadow-md hover:-translate-y-0.5"
                    : "border-dashed border-border bg-muted/40 opacity-80",
              )}
            >
              <div
                className={cn(
                  "shrink-0 w-12 h-12 rounded-lg flex items-center justify-center transition-colors",
                  isSelected
                    ? "bg-emerald-500 text-white"
                    : eligible
                      ? "bg-orange-500 text-white group-hover:scale-105 transition-transform"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {isSelected ? <Check className="w-6 h-6" /> : eligible ? <Ticket className="w-6 h-6" /> : <Lock className="w-5 h-5" />}
              </div>

              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-base font-extrabold leading-tight tracking-tight",
                  isSelected ? "text-emerald-700 dark:text-emerald-400" : eligible ? "text-foreground" : "text-muted-foreground",
                )}>
                  {c.display_title || c.name || `${c.min_quantity} POR ${formatBRL(Number(c.bundle_price))}`}
                </p>
                <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                  {c.description || `${c.min_quantity} conjuntos por ${formatBRL(Number(c.bundle_price))}`}
                </p>
                {!eligible && (
                  <p className="text-[11px] text-orange-600 dark:text-orange-400 font-semibold mt-1">
                    Adicione mais {missing} {missing === 1 ? "produto" : "produtos"} para ativar esta promoção
                  </p>
                )}
                {isSelected && preview.applied && (
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 font-bold mt-1 flex items-center gap-1">
                    ✅ Desconto aplicado · você economiza {formatBRL(preview.discount)}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {coupon && (
        <button
          type="button"
          onClick={remove}
          className="text-[11px] text-muted-foreground hover:text-destructive underline underline-offset-2"
        >
          Remover promoção selecionada
        </button>
      )}
    </div>
  );
};

export default CouponPicker;
