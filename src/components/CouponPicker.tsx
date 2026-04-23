import { useEffect, useRef, useState } from "react";
import { Ticket, Check, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/hooks/useCart";
import { useCoupon, type AppliedCoupon } from "@/hooks/useCoupon";
import { cn } from "@/lib/utils";

const CouponPicker = () => {
  const { totalItems } = useCart();
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

  // Auto-select the best eligible coupon
  useEffect(() => {
    if (loading || list.length === 0) return;
    const eligible = list.filter((c) => totalItems >= c.min_quantity);
    if (eligible.length === 0) return;
    const best = eligible.reduce((a, b) => (a.min_quantity >= b.min_quantity ? a : b));
    if (!coupon && autoAppliedRef.current !== best.id) {
      applyCoupon(best);
      autoAppliedRef.current = best.id;
    } else if (coupon && coupon.id !== best.id && autoAppliedRef.current !== best.id) {
      const currentEligible = eligible.find((c) => c.id === coupon.id);
      if (!currentEligible || best.min_quantity > coupon.min_quantity) {
        applyCoupon(best);
        autoAppliedRef.current = best.id;
      }
    }
  }, [totalItems, list, loading, coupon, applyCoupon]);

  if (loading || list.length === 0) return null;

  // STATE 2 — Coupon applied (compact card)
  if (coupon) {
    return (
      <div className="flex items-center gap-3 rounded-xl border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2.5">
        <div className="shrink-0 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center">
          <Check className="w-5 h-5" strokeWidth={3} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400 leading-tight tracking-tight">
            {coupon.display_title || coupon.name}
          </p>
          <p className="text-[11px] text-muted-foreground leading-tight">Cupom aplicado</p>
        </div>
        <button
          type="button"
          onClick={() => {
            autoAppliedRef.current = "__manual__";
            remove();
          }}
          className="shrink-0 text-xs font-bold text-primary border border-primary/40 rounded-full px-3 py-1.5 hover:bg-primary/10 transition-colors"
        >
          Alterar
        </button>
      </div>
    );
  }

  // STATE 1 — Compact (default): headline + pill buttons
  return (
    <div className="rounded-xl border border-orange-300/70 bg-orange-50/70 dark:bg-orange-950/20 px-3 py-2.5 space-y-2">
      <p className="text-[11px] font-semibold text-foreground leading-snug flex items-start gap-1.5">
        <Flame className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />
        <span>
          <span className="text-orange-600 dark:text-orange-400 font-bold">Promoção ativa:</span>{" "}
          escolha entre 3 por R$100 ou 5 por R$150
        </span>
      </p>
      <div className="flex flex-wrap gap-2">
        {list.map((c) => {
          const eligible = totalItems >= c.min_quantity;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => applyCoupon(c)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-xs font-extrabold tracking-tight transition-all",
                eligible
                  ? "border-orange-400 bg-white dark:bg-background text-orange-600 dark:text-orange-400 hover:border-orange-500 hover:shadow-sm hover:-translate-y-px"
                  : "border-dashed border-border bg-muted/40 text-muted-foreground",
              )}
              title={!eligible ? `Adicione mais ${c.min_quantity - totalItems} para ativar` : undefined}
            >
              <Ticket className="w-3.5 h-3.5" />
              {c.display_title || c.name}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CouponPicker;
