import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ShoppingBag } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { toast } from "sonner";

export type ProductDetail = {
  id: string;
  name: string;
  brand: string;
  image: string;
  extraImages: string[];
  oldPrice: number | null;
  price: number;
  discount: number;
  sizes: string[];
  description?: string;
  sku?: string;
  stock: number;
};

type Props = {
  product: ProductDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const ProductDetailDialog = ({ product, open, onOpenChange }: Props) => {
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [imgIdx, setImgIdx] = useState(0);
  const { addItem, setIsOpen } = useCart();

  if (!product) return null;

  const allImages = [product.image, ...product.extraImages].filter(Boolean);

  const handleAdd = () => {
    if (!selectedSize) {
      toast.error("Selecione um tamanho");
      return;
    }
    addItem({
      id: product.id,
      name: product.name,
      brand: product.brand,
      image: product.image,
      price: product.price,
      oldPrice: product.oldPrice,
      size: selectedSize,
      sku: product.sku,
      stock: product.stock,
    });
    toast.success("Adicionado ao carrinho!");
    setSelectedSize(null);
    onOpenChange(false);
    setIsOpen(true);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) { setSelectedSize(null); setImgIdx(0); } }}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <DialogTitle className="sr-only">{product.name}</DialogTitle>
        {/* Image carousel */}
        <div className="relative aspect-square bg-muted">
          <img src={allImages[imgIdx] || product.image} alt={product.name} className="w-full h-full object-cover" />
          {allImages.length > 1 && (
            <>
              <button onClick={() => setImgIdx(i => (i === 0 ? allImages.length - 1 : i - 1))} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/80 flex items-center justify-center">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setImgIdx(i => (i === allImages.length - 1 ? 0 : i + 1))} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/80 flex items-center justify-center">
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
          {product.discount > 0 && (
            <span className="absolute top-3 left-3 bg-badge-discount text-accent-foreground text-xs font-bold px-2 py-1 rounded-full">
              {product.discount}% OFF
            </span>
          )}
        </div>

        <div className="p-5 space-y-4">
          <div>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">{product.brand}</p>
            <h2 className="text-lg font-bold text-foreground font-heading">{product.name}</h2>
            {product.sku && <p className="text-[10px] font-mono text-muted-foreground">SKU: {product.sku}</p>}
          </div>

          <div className="flex items-baseline gap-2">
            {product.oldPrice && (
              <span className="text-sm text-price-old line-through">
                R$ {product.oldPrice.toFixed(2).replace(".", ",")}
              </span>
            )}
            <span className="text-2xl font-bold text-price-new">
              R$ {product.price.toFixed(2).replace(".", ",")}
            </span>
          </div>

          {product.description && <p className="text-sm text-muted-foreground">{product.description}</p>}

          {/* Sizes */}
          <div>
            <p className="text-sm font-medium text-foreground mb-2">Tamanho</p>
            <div className="flex gap-2 flex-wrap">
              {product.sizes.map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`text-xs font-semibold border rounded-lg px-3 py-1.5 transition-colors ${
                    selectedSize === size
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:border-primary"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <Button onClick={handleAdd} className="w-full gap-2" size="lg">
            <ShoppingBag className="w-4 h-4" />
            Adicionar ao Carrinho
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductDetailDialog;
