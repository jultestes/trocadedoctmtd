import { useEffect, useState } from "react";
import { Ticket, Check, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/hooks/useCart";
import { useCoupon, type AppliedCoupon } from "@/hooks/useCoupon";
import { cn } from "@/lib/utils";

const CouponPicker = () => {
  const { totalItems } = useCart();
  const { coupon, applyCoupon, remove } = useCoupon();
  const [list, setList] = useState<AppliedCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [open, setOpen] = useState(true);

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

  if (loading || list.length === 0) return null;

  // STATE 2 — Coupon applied (compact card, with optional expanded picker)
  if (coupon) {
    return (
      <div className="space-y-2">
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
            onClick={() => setExpanded((v) => !v)}
            className="shrink-0 text-xs font-bold text-primary border border-primary/40 rounded-full px-3 py-1.5 hover:bg-primary/10 transition-colors"
          >
            {expanded ? "Fechar" : "Alterar"}
          </button>
        </div>

        {expanded && (
          <div className="rounded-xl border border-orange-300/70 bg-orange-50/70 dark:bg-orange-950/20 px-3 py-2.5 space-y-2">
            <p className="text-[11px] font-semibold text-muted-foreground leading-snug">
              Escolha outro cupom:
            </p>
            <div className="flex flex-wrap gap-2">
              {list.map((c) => {
                const eligible = totalItems >= c.min_quantity;
                const isCurrent = c.id === coupon.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    disabled={!eligible && !isCurrent}
                    onClick={() => {
                      if (isCurrent) {
                        remove();
                        setExpanded(false);
                        return;
                      }
                      if (!eligible) return;
                      applyCoupon(c);
                      setExpanded(false);
                    }}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-xs font-extrabold tracking-tight transition-all",
                      isCurrent
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : eligible
                          ? "border-orange-400 bg-white dark:bg-background text-orange-600 dark:text-orange-400 hover:border-orange-500 hover:shadow-sm hover:-translate-y-px"
                          : "border-dashed border-border bg-muted/40 text-muted-foreground cursor-not-allowed",
                    )}
                    title={!eligible && !isCurrent ? `Adicione mais ${c.min_quantity - totalItems} para ativar` : undefined}
                  >
                    {isCurrent ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : <Ticket className="w-3.5 h-3.5" />}
                    {c.display_title || c.name}
                    {isCurrent && <span className="ml-1 opacity-90">(atual)</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // STATE 1 — No coupon applied: highlighted card with two big options
  return (
    <div className="rounded-2xl bg-gradient-to-br from-orange-100 to-orange-200/80 dark:from-orange-950/40 dark:to-orange-900/30 p-3 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 mb-2"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="shrink-0 w-7 h-7 rounded-full bg-orange-500 text-white flex items-center justify-center shadow">
            <Ticket className="w-4 h-4" strokeWidth={2.5} />
          </div>
          <div className="text-left min-w-0">
            <p className="text-sm font-extrabold text-orange-700 dark:text-orange-300 leading-tight tracking-tight truncate">
              Aplique seu CUPOM
            </p>
          </div>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-orange-700 dark:text-orange-300 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-orange-700 dark:text-orange-300 shrink-0" />
        )}
      </button>

      {open && (
        <>
          <p className="text-[11px] text-orange-900/80 dark:text-orange-200/80 leading-snug mb-2.5 px-0.5">
            Selecione uma promoção para ativar o desconto automático.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {list.map((c) => {
              const eligible = totalItems >= c.min_quantity;
              const isPink = c.min_quantity >= 5;
              return (
                <button
                  key={c.id}
                  type="button"
                  disabled={!eligible}
                  onClick={() => eligible && applyCoupon(c)}
                  className={cn(
                    "min-w-0 rounded-xl bg-white dark:bg-background border-2 px-2 py-2 flex flex-col items-start gap-0.5 transition-all text-left",
                    eligible
                      ? "border-transparent hover:border-orange-400 hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
                      : "border-dashed border-border opacity-60 cursor-not-allowed",
                  )}
                  title={!eligible ? `Adicione mais ${c.min_quantity - totalItems} para ativar` : undefined}
                >
                  <span className="flex items-center gap-1 min-w-0 w-full">
                    <Ticket
                      className={cn(
                        "w-3.5 h-3.5 shrink-0",
                        isPink ? "text-pink-500" : "text-orange-500",
                      )}
                      strokeWidth={2.5}
                    />
                    <span
                      className={cn(
                        "text-sm font-extrabold tracking-tight truncate",
                        isPink ? "text-pink-500" : "text-orange-500",
                      )}
                    >
                      {c.display_title || c.name}
                    </span>
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium leading-tight truncate w-full">
                    {c.min_quantity} conjuntos · R${Math.round(c.bundle_price)}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default CouponPicker;
