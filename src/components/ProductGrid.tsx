import { useRef, useEffect, useState, memo, useCallback } from "react";
import { ChevronLeft, ChevronRight, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import CartConfirmDialog from "@/components/CartConfirmDialog";
import ProductBottomSheet, { type BottomSheetProduct } from "@/components/ProductBottomSheet";
import { useCart } from "@/hooks/useCart";
import { useIsMobile } from "@/hooks/use-mobile";

type Product = {
  id: string;
  name: string;
  brand: string;
  image: string;
  oldPrice: number | null;
  price: number;
  discount: number;
  sizes: string[];
  category: "meninas" | "meninos";
  sku?: string;
  stock: number;
};

const AGE_LABELS: Record<string, string> = {
  "meninos-baby-rn": "Baby RN", "meninos-baby-p": "Baby P", "meninos-baby-m": "Baby M", "meninos-baby-g": "Baby G",
  "menino-idade1": "1 ano", "menino-idade2": "2 anos", "menino-idade3": "3 anos",
  "menino-idade4": "4 anos", "menino-idade6": "6 anos", "menino-idade8": "8 anos",
  "menino-idade10": "10 anos", "menino-idade12": "12 anos", "menino-idade14": "14 anos", "menino-idade16": "16 anos",
  "meninas-baby-rn": "Baby RN", "meninas-baby-p": "Baby P", "meninas-baby-m": "Baby M", "meninas-baby-g": "Baby G",
  "menina-baby-rn": "Baby RN", "menina-baby-p": "Baby P", "menina-baby-m": "Baby M", "menina-baby-g": "Baby G",
  "menina-idade1": "1 ano", "menina-idade2": "2 anos", "menina-idade3": "3 anos",
  "menina-idade4": "4 anos", "menina-idade6": "6 anos", "menina-idade8": "8 anos",
  "menina-idade10": "10 anos", "menina-idade12": "12 anos", "menina-idade14": "14 anos", "menina-idade16": "16 anos",
};

function detectCategory(sizes: string[] | null): "meninas" | "meninos" {
  if (!sizes || sizes.length === 0) return "meninos";
  if (sizes.some(s => s.startsWith("menina"))) return "meninas";
  return "meninos";
}

const ProductCard = memo(({ product, onClick, index }: { product: Product; onClick: () => void; index: number }) => {
  const isEager = index < 4;

  return (
    <div className="group bg-card rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow border border-border shrink-0 w-[180px] md:w-[220px] flex flex-col">
      <div
        className="relative overflow-hidden cursor-pointer"
        style={{ aspectRatio: "3/4" }}
        onClick={onClick}
      >
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading={isEager ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={isEager ? "high" : "low"}
          width={220}
          height={293}
        />
        {product.discount > 0 && (
          <span className="absolute top-2 left-2 bg-badge-discount text-accent-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
            {product.discount}% OFF
          </span>
        )}
        {product.stock === 1 && (
          <span className="absolute top-2 right-2 bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
            PEÇA ÚNICA
          </span>
        )}
        {product.stock > 1 && (
          <span className="absolute top-2 right-2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
            {product.stock} em estoque
          </span>
        )}
      </div>
      <div className="p-3 flex flex-col flex-1">
        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">
          {product.brand}
        </p>
        <div className="flex items-start gap-1.5 mt-1">
          <h3 className="text-xs font-bold text-foreground leading-tight line-clamp-2 flex-1">
            {product.name}
          </h3>
          <div className="flex flex-wrap gap-0.5 shrink-0">
            {product.sizes.map((size) => (
              <span key={size} className="bg-muted text-muted-foreground text-[9px] font-bold px-1.5 py-0.5 rounded">
                {size}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-auto pt-2">
          <div className="flex items-baseline gap-2">
            {product.oldPrice && (
              <p className="text-[10px] text-price-old line-through">
                R$ {product.oldPrice.toFixed(2).replace(".", ",")}
              </p>
            )}
            <p className="text-lg font-extrabold text-price-new leading-none">
              R$ {product.price.toFixed(2).replace(".", ",")}
            </p>
          </div>
          <Button
            size="sm"
            className="w-full mt-2 gap-1.5 text-xs font-bold"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            Escolher
          </Button>
        </div>
      </div>
    </div>
  );
});

ProductCard.displayName = "ProductCard";

const ProductGrid = ({ title, category, productIds, maxCount = 10 }: { title: string; category: string; productIds?: string[]; maxCount?: number }) => {
  const [dbProducts, setDbProducts] = useState<Product[]>([]);
  const [showCartConfirm, setShowCartConfirm] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { addItem } = useCart();

  const handleAddToCart = useCallback((product: Product) => {
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
    setShowCartConfirm(true);
  }, [addItem]);

  useEffect(() => {
    const fetchProducts = async () => {
      let query = supabase
        .from("products")
        .select("id, name, brand, image_url, old_price, price, discount, sizes, sku, stock")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(maxCount);

      if (productIds && productIds.length > 0) {
        query = query.in("id", productIds);
      } else if (category === "meninas") {
        query = query.or("sizes.cs.{menina-idade1},sizes.cs.{menina-idade2},sizes.cs.{menina-idade3},sizes.cs.{menina-idade4},sizes.cs.{menina-idade6},sizes.cs.{menina-idade8},sizes.cs.{menina-idade10},sizes.cs.{menina-idade12},sizes.cs.{menina-idade14},sizes.cs.{menina-idade16},sizes.cs.{menina-baby-rn},sizes.cs.{menina-baby-p},sizes.cs.{menina-baby-m},sizes.cs.{menina-baby-g},sizes.cs.{meninas-baby-rn},sizes.cs.{meninas-baby-p},sizes.cs.{meninas-baby-m},sizes.cs.{meninas-baby-g}");
      } else if (category === "meninos") {
        query = query.or("sizes.cs.{menino-idade1},sizes.cs.{menino-idade2},sizes.cs.{menino-idade3},sizes.cs.{menino-idade4},sizes.cs.{menino-idade6},sizes.cs.{menino-idade8},sizes.cs.{menino-idade10},sizes.cs.{menino-idade12},sizes.cs.{menino-idade14},sizes.cs.{menino-idade16},sizes.cs.{meninos-baby-rn},sizes.cs.{meninos-baby-p},sizes.cs.{meninos-baby-m},sizes.cs.{meninos-baby-g}");
      }

      const { data } = await query;

      if (data) {
        const mapped: Product[] = data.map((p: any) => ({
          id: p.id,
          name: p.name,
          brand: p.brand || "",
          image: p.image_url || "",
          oldPrice: p.old_price ? Number(p.old_price) : null,
          price: Number(p.price),
          discount: p.discount || 0,
          sizes: (p.sizes || []).map((s: string) => AGE_LABELS[s] || s),
          category: detectCategory(p.sizes),
          sku: p.sku || undefined,
          stock: p.stock ?? 0,
        }));
        setDbProducts(mapped);
      }
    };
    fetchProducts();
  }, [category, productIds, maxCount]);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = dir === "left" ? -300 : 300;
    scrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
  };

  return (
    <section className="py-8 md:py-12" id={category}>
      <div className="container">
        <div className="flex items-center justify-between mb-6">
          <h2 className="section-title">{title}</h2>
          <div className="flex gap-2">
            <button onClick={() => scroll("left")} className="bg-card border border-border rounded-full p-2 hover:bg-muted transition-colors">
              <ChevronLeft className="w-4 h-4 text-foreground" />
            </button>
            <button onClick={() => scroll("right")} className="bg-card border border-border rounded-full p-2 hover:bg-muted transition-colors">
              <ChevronRight className="w-4 h-4 text-foreground" />
            </button>
          </div>
        </div>

        <div className="flex gap-4">
          <div ref={scrollRef} className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-2 min-w-0">
            {dbProducts.map((product, idx) => (
              <ProductCard key={product.id} product={product} onClick={() => handleAddToCart(product)} index={idx} />
            ))}
          </div>
        </div>

        <CartConfirmDialog
          open={showCartConfirm}
          onClose={() => setShowCartConfirm(false)}
        />
      </div>
    </section>
  );
};

export default ProductGrid;
