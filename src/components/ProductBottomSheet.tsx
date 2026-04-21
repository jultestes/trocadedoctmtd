import { useState, useEffect } from "react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  CreditCard,
  Banknote,
  QrCode,
  ShoppingBag,
  Minus,
  Plus,
  Clock,
  ChevronDown,
} from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useIsMobile } from "@/hooks/use-mobile";
import ProductImageCarousel from "@/components/ProductImageCarousel";

export type BottomSheetProduct = {
  id: string;
  name: string;
  brand: string;
  image: string;
  extraImages?: string[];
  oldPrice: number | null;
  price: number;
  discount: number;
  sizes: string[];
  rawSizes?: string[];
  sku?: string;
  stock: number;
  category: "meninas" | "meninos";
  description?: string;
};

type Props = {
  product: BottomSheetProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddedToCart?: () => void;
};

const formatBRL = (n: number) => `R$ ${n.toFixed(2).replace(".", ",")}`;

const ProductContent = ({
  product,
  onClose,
  onAdded,
  isMobile,
}: {
  product: BottomSheetProduct;
  onClose: () => void;
  onAdded?: () => void;
  isMobile: boolean;
}) => {
  const [imgIdx, setImgIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [showPayments, setShowPayments] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(20 * 60);
  const { addItem } = useCart();

  useEffect(() => {
    const id = setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? 20 * 60 : s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  const allImages = [product.image, ...(product.extraImages || [])].filter(Boolean);
  const isUnique = product.stock === 1;
  const gender = product.category === "meninas" ? "Menina" : "Menino";

  // Normaliza preço promocional vs original — usa sempre o MAIOR como "de" e o MENOR como "por",
  // protegendo contra cadastros invertidos no Admin.
  const rawOld = product.oldPrice ?? null;
  const rawNew = product.price;
  const hasTwoPrices = rawOld !== null && rawOld !== rawNew;
  const displayOldPrice = hasTwoPrices ? Math.max(rawOld as number, rawNew) : null;
  const displayPrice = hasTwoPrices ? Math.min(rawOld as number, rawNew) : rawNew;
  const hasValidOldPrice = displayOldPrice !== null && displayOldPrice > displayPrice;
  const savings = hasValidOldPrice ? (displayOldPrice as number) - displayPrice : 0;
  const computedDiscount =
    product.discount > 0
      ? product.discount
      : hasValidOldPrice
      ? Math.round(((displayOldPrice as number) - displayPrice) / (displayOldPrice as number) * 100)
      : 0;

  // Card 1x with juros (~3.29% — typical InfinitePay)
  const cardInstallment = displayPrice * 1.0329;

  const handleChoose = () => {
    for (let i = 0; i < quantity; i++) {
      addItem({
        id: product.id,
        name: product.name,
        brand: product.brand,
        image: product.image,
        price: displayPrice,
        oldPrice: displayOldPrice,
        size: product.sizes[0] || "",
        sku: product.sku,
        stock: product.stock,
      });
    }
    onClose();
    setImgIdx(0);
    setQuantity(1);
    onAdded?.();
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-2 pb-3 border-b border-border">
        {isMobile && (
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-muted flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
        )}
        <span className="text-sm font-semibold text-foreground truncate flex-1">
          {product.name}
        </span>
      </div>

      <div className="overflow-y-auto flex-1 md:max-h-[70vh]">
        <div className="md:grid md:grid-cols-2 md:gap-0">
          {/* Image area */}
          <div>
            <div className="relative aspect-square bg-muted">
              <ProductImageCarousel
                images={allImages}
                alt={product.name}
                eager
                showArrows={!isMobile}
                showDots
                optimized={false}
                sizes={isMobile ? "100vw" : "50vw"}
              />
              {computedDiscount > 0 && (
                <span className="absolute top-3 left-3 bg-badge-discount text-accent-foreground text-xs font-bold px-2.5 py-1 rounded-full z-10">
                  {computedDiscount}% OFF
                </span>
              )}
              {isUnique && (
                <span className="absolute top-3 right-3 bg-destructive text-destructive-foreground text-xs font-bold px-2.5 py-1 rounded-full animate-pulse z-10">
                  PEÇA ÚNICA
                </span>
              )}
            </div>

            {allImages.length > 1 && (
              <div className="flex gap-2 px-4 py-3 overflow-x-auto">
                {allImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setImgIdx(i)}
                    className={`w-14 h-14 rounded-lg overflow-hidden border-2 shrink-0 transition-colors ${
                      i === imgIdx ? "border-primary" : "border-transparent"
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info area */}
          <div className="px-4 pt-3 pb-4 space-y-4 md:border-l md:border-border">
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">
                {product.brand}
              </p>
              <h2 className="text-lg md:text-xl font-bold text-foreground mt-0.5 font-heading">
                {product.name}
              </h2>
              {product.sku && (
                <p className="text-[10px] font-mono text-muted-foreground">
                  SKU: {product.sku}
                </p>
              )}
            </div>

            {/* Price block */}
            <div className="space-y-1">
              {hasValidOldPrice && (
                <span className="text-sm text-price-old line-through block">
                  De {formatBRL(product.oldPrice as number)}
                </span>
              )}
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-3xl font-extrabold text-price-new">
                  {formatBRL(product.price)}
                </span>
                {computedDiscount > 0 && (
                  <span className="bg-badge-discount text-accent-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                    {computedDiscount}% OFF
                  </span>
                )}
              </div>
              {savings > 0 && (
                <p className="text-sm font-bold text-price-new">
                  Economize {formatBRL(savings)}
                </p>
              )}
            </div>

            {/* Limited time offer */}
            {savings > 0 && (
              <div className="bg-badge-discount/15 border border-badge-discount/40 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 shrink-0 text-badge-discount" />
                  <span className="text-xs font-bold uppercase tracking-wide text-foreground">
                    Oferta por tempo limitado
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 ml-6">
                  Promoção termina em:{" "}
                  <span className="font-mono font-bold text-primary tabular-nums">
                    {mm}:{ss}
                  </span>
                </p>
              </div>
            )}

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {product.sizes.map((size) => (
                <span
                  key={size}
                  className="bg-muted text-muted-foreground text-xs font-bold px-3 py-1.5 rounded-lg"
                >
                  {size}
                </span>
              ))}
              <span className="bg-primary/10 text-primary text-xs font-bold px-3 py-1.5 rounded-lg">
                {gender}
              </span>
              {isUnique ? (
                <span className="bg-destructive/10 text-destructive text-xs font-bold px-3 py-1.5 rounded-lg">
                  Peça Única
                </span>
              ) : (
                <span className="bg-muted text-muted-foreground text-xs font-bold px-3 py-1.5 rounded-lg">
                  {product.stock} em estoque
                </span>
              )}
            </div>

            {/* Description */}
            {product.description && product.description.trim() && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold text-foreground uppercase tracking-wide">
                  Descrição
                </p>
                <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                  {product.description}
                </p>
              </div>
            )}

            {/* Payment methods (collapsible) */}
            <div className="border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => setShowPayments((v) => !v)}
                className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-muted/50 transition-colors"
              >
                <span className="text-xs font-bold text-foreground uppercase tracking-wide">
                  Formas de pagamento
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-muted-foreground transition-transform ${
                    showPayments ? "rotate-180" : ""
                  }`}
                />
              </button>
              {showPayments && (
                <div className="px-3 pb-3 pt-1 space-y-2 border-t border-border">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-foreground">
                      <QrCode className="w-4 h-4 text-primary" />
                      Pix
                    </span>
                    <span className="font-bold text-foreground">
                      {formatBRL(product.price)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-foreground">
                      <Banknote className="w-4 h-4 text-primary" />
                      Dinheiro
                    </span>
                    <span className="font-bold text-foreground">
                      {formatBRL(product.price)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-foreground">
                      <CreditCard className="w-4 h-4 text-primary" />
                      Cartão de crédito
                    </span>
                    <span className="font-bold text-foreground">
                      1x de {formatBRL(cardInstallment)}{" "}
                      <span className="text-[10px] font-medium text-muted-foreground">
                        (com juros)
                      </span>
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="p-4 border-t border-border bg-background space-y-3">
        {!isUnique && product.stock > 1 && (
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              className="w-10 h-10 rounded-full border border-border flex items-center justify-center disabled:opacity-30 hover:bg-muted transition-colors"
            >
              <Minus className="w-4 h-4 text-foreground" />
            </button>
            <span className="text-lg font-bold text-foreground w-8 text-center">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
              disabled={quantity >= product.stock}
              className="w-10 h-10 rounded-full border border-border flex items-center justify-center disabled:opacity-30 hover:bg-muted transition-colors"
            >
              <Plus className="w-4 h-4 text-foreground" />
            </button>
          </div>
        )}
        <Button
          onClick={handleChoose}
          className="w-full gap-2 h-12 text-base font-bold"
          size="lg"
        >
          <ShoppingBag className="w-5 h-5" />
          Adicionar ao pedido
        </Button>
      </div>
    </>
  );
};

const ProductBottomSheet = ({ product, open, onOpenChange, onAddedToCart }: Props) => {
  const isMobile = useIsMobile();

  if (!product) return null;

  const handleClose = () => onOpenChange(false);

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[92vh] rounded-t-3xl">
          <ProductContent
            product={product}
            onClose={handleClose}
            onAdded={onAddedToCart}
            isMobile
          />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden gap-0 flex flex-col max-h-[90vh]">
        <DialogTitle className="sr-only">{product.name}</DialogTitle>
        <ProductContent
          product={product}
          onClose={handleClose}
          onAdded={onAddedToCart}
          isMobile={false}
        />
      </DialogContent>
    </Dialog>
  );
};

export default ProductBottomSheet;
