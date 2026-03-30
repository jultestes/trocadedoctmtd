import { useState } from "react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CreditCard, Banknote, QrCode, ShoppingBag, Minus, Plus } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import CartConfirmDialog from "@/components/CartConfirmDialog";

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
};

type Props = {
  product: BottomSheetProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const ProductBottomSheet = ({ product, open, onOpenChange }: Props) => {
  const [imgIdx, setImgIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [showCartConfirm, setShowCartConfirm] = useState(false);
  const { addItem } = useCart();

  if (!product) return null;

  const allImages = [product.image, ...(product.extraImages || [])].filter(Boolean);
  const isUnique = product.stock === 1;
  const gender = product.category === "meninas" ? "Menina" : "Menino";

  const handleChoose = () => {
    for (let i = 0; i < quantity; i++) {
      addItem({
        id: product.id,
        name: product.name,
        brand: product.brand,
        image: product.image,
        price: product.price,
        oldPrice: product.oldPrice,
        size: product.sizes[0] || "",
        sku: product.sku,
        stock: product.stock,
      });
    }
    onOpenChange(false);
    setImgIdx(0);
    setQuantity(1);
    setTimeout(() => setShowCartConfirm(true), 200);
  };

  return (
    <>
      <Drawer open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) { setImgIdx(0); setQuantity(1); } }}>
        <DrawerContent className="max-h-[92vh] rounded-t-3xl">
          {/* Header with back button */}
          <div className="flex items-center gap-3 px-4 pt-2 pb-3 border-b border-border">
            <button
              onClick={() => onOpenChange(false)}
              className="w-9 h-9 rounded-full bg-muted flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <span className="text-sm font-semibold text-foreground truncate flex-1">
              {product.name}
            </span>
          </div>

          <div className="overflow-y-auto flex-1">
            {/* Product Images */}
            <div className="relative">
              <div className="aspect-square bg-muted">
                <img
                  src={allImages[imgIdx] || product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  loading="eager"
                />
              </div>
              {product.discount > 0 && (
                <span className="absolute top-3 left-3 bg-badge-discount text-accent-foreground text-xs font-bold px-2.5 py-1 rounded-full">
                  {product.discount}% OFF
                </span>
              )}
              {isUnique && (
                <span className="absolute top-3 right-3 bg-destructive text-destructive-foreground text-xs font-bold px-2.5 py-1 rounded-full animate-pulse">
                  PEÇA ÚNICA
                </span>
              )}
            </div>

            {/* Image thumbnails */}
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

            {/* Product Info */}
            <div className="px-4 pt-3 pb-4 space-y-4">
              {/* Brand + Name */}
              <div>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">
                  {product.brand}
                </p>
                <h2 className="text-lg font-bold text-foreground mt-0.5">{product.name}</h2>
                {product.sku && (
                  <p className="text-[10px] font-mono text-muted-foreground">SKU: {product.sku}</p>
                )}
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-2">
                {product.oldPrice && (
                  <span className="text-sm text-price-old line-through">
                    R$ {product.oldPrice.toFixed(2).replace(".", ",")}
                  </span>
                )}
                <span className="text-2xl font-extrabold text-price-new">
                  R$ {product.price.toFixed(2).replace(".", ",")}
                </span>
              </div>

              {/* Tags: Age, Gender, Stock */}
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

              {/* Payment Methods */}
              <div className="border border-border rounded-xl p-3">
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mb-2">
                  Formas de Pagamento
                </p>
                <div className="flex gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                    <QrCode className="w-4 h-4 text-primary" />
                    Pix
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                    <Banknote className="w-4 h-4 text-primary" />
                    Dinheiro
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                    <CreditCard className="w-4 h-4 text-primary" />
                    Cartão
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Fixed bottom CTA */}
          <div className="p-4 border-t border-border bg-background space-y-3">
            {/* Quantity counter - only show when stock > 1 */}
            {!isUnique && product.stock > 1 && (
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  className="w-10 h-10 rounded-full border border-border flex items-center justify-center disabled:opacity-30 hover:bg-muted transition-colors"
                >
                  <Minus className="w-4 h-4 text-foreground" />
                </button>
                <span className="text-lg font-bold text-foreground w-8 text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(q => Math.min(product.stock, q + 1))}
                  disabled={quantity >= product.stock}
                  className="w-10 h-10 rounded-full border border-border flex items-center justify-center disabled:opacity-30 hover:bg-muted transition-colors"
                >
                  <Plus className="w-4 h-4 text-foreground" />
                </button>
              </div>
            )}
            <Button onClick={handleChoose} className="w-full gap-2 h-12 text-base font-bold" size="lg">
              <ShoppingBag className="w-5 h-5" />
              Escolher
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      <CartConfirmDialog
        open={showCartConfirm}
        onClose={() => setShowCartConfirm(false)}
      />
    </>
  );
};

export default ProductBottomSheet;
