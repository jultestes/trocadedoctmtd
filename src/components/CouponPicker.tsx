import { useEffect, useState } from "react";
import { Ticket, Check, Lock } from "lucide-react";
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

  if (loading) return null;
  if (list.length === 0) return null;

  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
        <Ticket className="w-3.5 h-3.5" /> Escolha sua promoção
      </label>
      <div className="grid grid-cols-1 gap-2">
        {list.map((c) => {
          const isSelected = coupon?.id === c.id;
          const missing = Math.max(0, c.min_quantity - totalItems);
          const eligible = totalItems >= c.min_quantity;
          // Preview the discount this coupon would create
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
                "relative text-left rounded-lg border-2 px-3 py-2.5 transition-all flex items-center gap-3 overflow-hidden",
                isSelected
                  ? "border-primary bg-primary/5 shadow-sm"
                  : eligible
                    ? "border-border hover:border-primary/60 bg-background"
                    : "border-dashed border-border bg-muted/40",
              )}
            >
              <div
                className={cn(
                  "shrink-0 w-10 h-10 rounded-md flex items-center justify-center",
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : eligible
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {isSelected ? <Check className="w-5 h-5" /> : eligible ? <Ticket className="w-5 h-5" /> : <Lock className="w-4 h-4" />}
              </div>

              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-bold leading-tight", !eligible && "text-muted-foreground")}>
                  {c.display_title || c.name || `${c.min_quantity} por ${formatBRL(Number(c.bundle_price))}`}
                </p>
                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                  {c.description || `${c.min_quantity} peças por ${formatBRL(Number(c.bundle_price))}`}
                </p>
                {!eligible && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">
                    Adicione mais {missing} {missing === 1 ? "produto" : "produtos"} para ativar
                  </p>
                )}
                {isSelected && preview.applied && (
                  <p className="text-[11px] text-primary font-semibold mt-0.5">
                    Você economiza {formatBRL(preview.discount)}
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
