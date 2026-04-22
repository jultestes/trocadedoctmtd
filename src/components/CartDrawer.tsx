import { useState } from "react";
import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft, Check, X } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useCoupon } from "@/hooks/useCoupon";
import { calculateCouponDiscount } from "@/lib/couponDiscount";
import CouponPicker from "@/components/CouponPicker";
import { useNavigate } from "react-router-dom";

const CartDrawer = () => {
  const { items, isOpen, setIsOpen, removeItem, updateQuantity, totalPrice, totalItems } = useCart();
  const { coupon, remove: removeCoupon } = useCoupon();
  const couponCalc = calculateCouponDiscount(items, coupon);
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleCheckout = () => {
    setShowConfirm(false);
    setIsOpen(false);
    navigate("/checkout");
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });
  };

  const handleWhatsApp = () => {
    setShowConfirm(false);
    setIsOpen(false);
    navigate("/checkout-whatsapp");
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent
        className="flex flex-col w-full sm:max-w-md [&>button[class*='close']]:hidden [&>button:has(svg)]:hidden"
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <SheetHeader className="flex-row items-center gap-0 space-y-0">
          <button
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors mr-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
          <span className="text-lg font-bold font-heading flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            Carrinho ({totalItems})
          </span>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground text-sm">Seu carrinho está vazio</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto space-y-3 py-4">
              {items.map((item) => (
                <div key={`${item.id}-${item.size}`} className="flex gap-3 bg-muted/50 rounded-lg p-3">
                  <img src={item.image} alt={item.name} className="w-16 h-20 object-cover rounded-md shrink-0" />
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-xs text-muted-foreground font-semibold uppercase">{item.brand}</p>
                    <p className="text-sm font-bold text-foreground truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">Tam: {item.size}</p>
                    <p className="text-sm font-bold text-price-new">
                      R$ {item.price.toFixed(2).replace(".", ",")}
                    </p>
                    {item.stock === 1 ? (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-destructive uppercase tracking-wide">Peça Única</span>
                        <button
                          onClick={() => removeItem(item.id, item.size)}
                          className="ml-auto text-destructive hover:text-destructive/80"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          onClick={() => updateQuantity(item.id, item.size, item.quantity - 1)}
                          className="w-6 h-6 rounded-full border border-border flex items-center justify-center hover:bg-muted"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-sm font-semibold w-5 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.size, item.quantity + 1)}
                          className={`w-6 h-6 rounded-full border border-border flex items-center justify-center ${
                            item.quantity >= item.stock ? "opacity-30 cursor-not-allowed" : "hover:bg-muted"
                          }`}
                          disabled={item.quantity >= item.stock}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => removeItem(item.id, item.size)}
                          className="ml-auto text-destructive hover:text-destructive/80"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-4 space-y-3">
              {/* Coupon section */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Ticket className="w-3.5 h-3.5" /> Cupom de desconto
                </label>
                {coupon ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 bg-primary/5 border border-primary/30 rounded-md px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Check className="w-4 h-4 text-primary shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-foreground truncate">{coupon.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {coupon.min_quantity} por R$ {Number(coupon.bundle_price).toFixed(2).replace(".", ",")}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => { removeCoupon(); setCouponInput(""); }}
                        className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                        aria-label="Remover cupom"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {!couponCalc.applied && (
                      <p className="text-[11px] text-muted-foreground px-1">
                        Adicione mais {coupon.min_quantity - totalItems} {coupon.min_quantity - totalItems === 1 ? "peça" : "peças"} para ativar o desconto.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Digite o código"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                      className="h-10"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleApplyCoupon}
                      disabled={couponLoading || !couponInput.trim()}
                      className="h-10 shrink-0"
                    >
                      {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Aplicar"}
                    </Button>
                  </div>
                )}
              </div>

              {couponCalc.applied && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Desconto do cupom</span>
                  <span className="font-semibold text-primary">
                    − R$ {couponCalc.discount.toFixed(2).replace(".", ",")}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-foreground">Subtotal</span>
                <div className="text-right">
                  {couponCalc.applied && (
                    <div className="text-xs text-muted-foreground line-through leading-tight">
                      R$ {couponCalc.originalTotal.toFixed(2).replace(".", ",")}
                    </div>
                  )}
                  <span className="text-xl font-bold text-foreground">
                    R$ {couponCalc.finalTotal.toFixed(2).replace(".", ",")}
                  </span>
                </div>
              </div>
              <Button
                className="w-full h-12 text-base font-bold"
                size="lg"
                onClick={() => setShowConfirm(true)}
              >
                Finalizar Compra
              </Button>
            </div>
          </>
        )}

        <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
          <AlertDialogContent className="max-w-sm text-center">
            <div className="flex flex-col items-center gap-4 py-2">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-primary" />
              </div>
              <AlertDialogTitle className="text-lg font-bold text-foreground">
                Deseja finalizar sua compra?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm text-muted-foreground">
                Escolha como deseja concluir seu pedido.
              </AlertDialogDescription>
              <div className="flex flex-col w-full gap-2 mt-2">
                <Button
                  className="w-full h-12 text-base font-bold"
                  size="lg"
                  onClick={handleCheckout}
                >
                  Finalizar aqui no catálogo
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-10 gap-2 text-sm"
                  size="lg"
                  onClick={handleWhatsApp}
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  Pelo WhatsApp
                </Button>
              </div>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
};

export default CartDrawer;
