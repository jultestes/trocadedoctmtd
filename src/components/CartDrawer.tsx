import { useState } from "react";
import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useNavigate } from "react-router-dom";

const CartDrawer = () => {
  const { items, isOpen, setIsOpen, removeItem, updateQuantity, totalPrice, totalItems } = useCart();
  const navigate = useNavigate();

  const handleCheckout = () => {
    setIsOpen(false);
    navigate("/checkout");

    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
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
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-foreground">Subtotal</span>
                <span className="text-xl font-bold text-foreground">
                  R$ {totalPrice.toFixed(2).replace(".", ",")}
                </span>
              </div>
              <Button
                className="w-full"
                size="lg"
                onClick={handleCheckout}
              >
                Finalizar Compra Agora
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2 border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700"
                size="lg"
                onClick={() => {
                  setIsOpen(false);
                  navigate("/checkout-whatsapp");
                  requestAnimationFrame(() => {
                    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
                  });
                }}
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Finalizar no WhatsApp
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default CartDrawer;
