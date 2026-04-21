import { useParams, Link, useSearchParams } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { trackPageView } from "@/lib/fbpixel";
import { ChevronLeft, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import TopBar from "@/components/TopBar";
import Header from "@/components/Header";
import FeaturesBar from "@/components/FeaturesBar";
import Footer from "@/components/Footer";
import CartConfirmDialog from "@/components/CartConfirmDialog";
import ProductBottomSheet, { type BottomSheetProduct } from "@/components/ProductBottomSheet";
import ProductImageCarousel from "@/components/ProductImageCarousel";
import PromoBanner, { type PromoBannerConfig } from "@/components/PromoBanner";
import { useCart } from "@/hooks/useCart";
import { useIsMobile } from "@/hooks/use-mobile";

const LETTER_SIZES = ["p", "m", "g"];
const INFANTIL_AGES = ["idade1", "idade2", "idade3", "idade4", "idade6", "idade8", "idade10"];
const TEEN_AGES = ["idade12", "idade14", "idade16"];

const AGE_DISPLAY: Record<string, string> = {
  "p": "P", "m": "M", "g": "G",
  "idade1": "1 ano", "idade2": "2 anos", "idade3": "3 anos", "idade4": "4 anos",
  "idade6": "6 anos", "idade8": "8 anos", "idade10": "10 anos",
  "idade12": "12 anos", "idade14": "14 anos", "idade16": "16 anos",
};

const AGE_LABELS: Record<string, string> = {
  "menino-p": "P", "menino-m": "M", "menino-g": "G",
  "menino-idade1": "1 ano", "menino-idade2": "2 anos", "menino-idade3": "3 anos",
  "menino-idade4": "4 anos", "menino-idade6": "6 anos", "menino-idade8": "8 anos",
  "menino-idade10": "10 anos", "menino-idade12": "12 anos", "menino-idade14": "14 anos", "menino-idade16": "16 anos",
  "menina-p": "P", "menina-m": "M", "menina-g": "G",
  "menina-idade1": "1 ano", "menina-idade2": "2 anos", "menina-idade3": "3 anos",
  "menina-idade4": "4 anos", "menina-idade6": "6 anos", "menina-idade8": "8 anos",
  "menina-idade10": "10 anos", "menina-idade12": "12 anos", "menina-idade14": "14 anos", "menina-idade16": "16 anos",
};

const ALL_AGE_KEYS = [...LETTER_SIZES, ...INFANTIL_AGES, ...TEEN_AGES].sort((a, b) => b.length - a.length);
const extractAgeKey = (raw: string): string | null => {
  for (const key of ALL_AGE_KEYS) {
    const regex = new RegExp(`(^|[-_])${key}($|[-_])`);
    if (regex.test(raw)) return key;
  }
  return null;
};

type RawProduct = {
  id: string;
  name: string;
  brand: string | null;
  image_url: string | null;
  extra_images?: string[] | null;
  old_price: number | null;
  price: number;
  discount: number | null;
  sizes: string[] | null;
  sku: string | null;
  description?: string | null;
};

type Product = {
  id: string;
  name: string;
  brand: string;
  image: string;
  extraImages: string[];
  oldPrice: number | null;
  price: number;
  discount: number;
  sizes: string[];
  rawSizes: string[];
  sku?: string;
  stock: number;
  categoryIds: string[];
  description?: string;
};

type SubcategoryInfo = {
  id: string;
  name: string;
  slug: string;
  ages: string[];
};

type CategoryData = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  ages: string[];
};

const bannerStyles: Record<string, string> = {
  meninas: "from-pink-300 via-pink-200 to-rose-200",
  meninos: "from-sky-300 via-sky-200 to-blue-200",
  bebes: "from-amber-200 via-amber-100 to-yellow-100",
  outlet: "from-emerald-300 via-emerald-200 to-green-200",
};

const cloudColor: Record<string, string> = {
  meninas: "text-white/70",
  meninos: "text-white/70",
  bebes: "text-white/70",
  outlet: "text-white/70",
};

const filterBgStyles: Record<string, string> = {
  meninas: "bg-pink-50",
  meninos: "bg-sky-50",
  bebes: "bg-amber-50",
};

const Category = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [category, setCategory] = useState<CategoryData | null>(null);
  const [subcategories, setSubcategories] = useState<SubcategoryInfo[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCartConfirm, setShowCartConfirm] = useState(false);
  const [sheetProduct, setSheetProduct] = useState<BottomSheetProduct | null>(null);
  const [promoBanner, setPromoBanner] = useState<PromoBannerConfig | null>(null);
  const { addItem, setProductSheetOpen } = useCart();
  const isMobile = useIsMobile();

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("value")
      .eq("key", "category_promo_banner")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) setPromoBanner(data.value as unknown as PromoBannerConfig);
      });
  }, []);

  const selectedAge = searchParams.get("idade") || null;

  useEffect(() => { trackPageView(); }, [slug, selectedAge]);
  const selectedCatSlug = searchParams.get("cat") || null;

  const handleAddToCart = useCallback((product: Product) => {
    const bsProduct: BottomSheetProduct = {
      id: product.id,
      name: product.name,
      brand: product.brand,
      image: product.image,
      extraImages: product.extraImages,
      oldPrice: product.oldPrice,
      price: product.price,
      discount: product.discount,
      sizes: product.sizes,
      rawSizes: product.rawSizes,
      sku: product.sku,
      stock: product.stock,
      category: product.rawSizes?.some(s => s.startsWith("menina")) ? "meninas" : "meninos",
      description: product.description,
    };
    setSheetProduct(bsProduct);
    setProductSheetOpen(true);
  }, [setProductSheetOpen]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const { data: catData } = await supabase
        .from("categories")
        .select("*")
        .eq("slug", slug || "")
        .is("parent_id", null)
        .single();

      if (!catData) {
        setLoading(false);
        return;
      }

      const parentCat = catData as unknown as CategoryData;
      setCategory(parentCat);

      const { data: subData } = await supabase
        .from("categories")
        .select("id, name, slug, ages")
        .eq("parent_id", parentCat.id)
        .order("name");

      const subs = (subData || []) as unknown as SubcategoryInfo[];
      setSubcategories(subs);

      const allCatIds = [parentCat.id, ...subs.map(s => s.id)];

      const { data: pcData } = await supabase
        .from("product_categories")
        .select("product_id, category_id")
        .in("category_id", allCatIds);

      const productCatMap = new Map<string, string[]>();
      for (const pc of pcData || []) {
        if (!productCatMap.has(pc.product_id)) productCatMap.set(pc.product_id, []);
        productCatMap.get(pc.product_id)!.push(pc.category_id);
      }

      const productIds = [...new Set((pcData || []).map(r => r.product_id))];

      if (productIds.length > 0) {
        const { data: prodData } = await supabase
          .from("products")
          .select("id, name, brand, image_url, extra_images, old_price, price, discount, sizes, sku, stock, description")
          .in("id", productIds)
          .eq("active", true)
          .order("created_at", { ascending: false });

        if (prodData) {
          setProducts(
            (prodData as RawProduct[]).map((p) => ({
              id: p.id,
              name: p.name,
              brand: p.brand || "",
              image: p.image_url || "",
              extraImages: p.extra_images || [],
              oldPrice: p.old_price ? Number(p.old_price) : null,
              price: Number(p.price),
              discount: p.discount || 0,
              sizes: (p.sizes || []).map((s) => AGE_LABELS[s] || s),
              rawSizes: p.sizes || [],
              sku: p.sku || undefined,
              stock: (p as any).stock ?? 0,
              categoryIds: productCatMap.get(p.id) || [],
              description: p.description || undefined,
            }))
          );
        }
      } else {
        setProducts([]);
      }

      setLoading(false);
    };

    fetchData();
  }, [slug]);

  // Build filter groups: parent + each subcategory with available ages
  const buildFilterGroups = () => {
    const groups: { id: string; name: string; slug: string | null; ages: string[] }[] = [];

    // Parent direct ages
    const parentAges = (category?.ages || []).filter((ageKey) =>
      products.some((p) =>
        p.categoryIds.includes(category!.id) &&
        p.rawSizes.some((raw) => extractAgeKey(raw) === ageKey)
      )
    );
    if (parentAges.length > 0) {
      groups.push({ id: category!.id, name: category!.name, slug: null, ages: parentAges });
    }

    // Subcategory ages
    for (const sub of subcategories) {
      const subAges = (category?.ages || []).filter((ageKey) =>
        products.some((p) =>
          p.categoryIds.includes(sub.id) &&
          p.rawSizes.some((raw) => extractAgeKey(raw) === ageKey)
        )
      );
      if (subAges.length > 0) {
        groups.push({ id: sub.id, name: sub.name, slug: sub.slug, ages: subAges });
      }
    }

    return groups;
  };

  const filterGroups = !loading && category ? buildFilterGroups() : [];

  // Resolve selectedCatSlug to a subcategory ID
  const selectedSubId = selectedCatSlug
    ? subcategories.find(s => s.slug === selectedCatSlug)?.id || null
    : null;

  // Filter products
  const filteredProducts = products.filter((p) => {
    if (selectedSubId) {
      if (!p.categoryIds.includes(selectedSubId)) return false;
    }
    if (selectedAge) {
      const regex = new RegExp(`(^|[-_])${selectedAge}($|[-_])`);
      if (!p.rawSizes.some((raw) => regex.test(raw))) return false;
    }
    return true;
  });

  const gradient = bannerStyles[slug || ""] || "from-primary to-primary/70";
  const filterBg = filterBgStyles[slug || ""] || "bg-muted/50";
  const hasActiveFilter = selectedAge || selectedCatSlug;

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <Header />

      {/* Category Hero - soft sky with diffused clouds */}
      <div
        className={`relative overflow-hidden bg-gradient-to-b ${gradient} py-5 md:py-8 min-h-[120px] md:min-h-[150px] flex items-center`}
      >
        {/* Diffused, organic clouds (blurred for natural sky look) */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {/* Top-left cloud cluster */}
          <div className="absolute -top-8 -left-10 w-56 md:w-72 h-20 md:h-24 bg-white/50 rounded-full blur-2xl" />
          <div className="absolute -top-4 left-16 w-32 md:w-40 h-14 md:h-16 bg-white/40 rounded-full blur-xl" />

          {/* Bottom-right cloud cluster */}
          <div className="absolute -bottom-10 -right-8 w-64 md:w-80 h-20 md:h-28 bg-white/45 rounded-full blur-2xl" />
          <div className="absolute -bottom-4 right-24 w-32 md:w-44 h-14 md:h-16 bg-white/35 rounded-full blur-xl" />

          {/* Bottom-left subtle cloud */}
          <div className="absolute -bottom-6 left-1/4 w-40 md:w-52 h-16 md:h-20 bg-white/30 rounded-full blur-2xl" />

          {/* Top-right small cloud (desktop only) */}
          <div className="absolute top-2 right-1/3 w-28 md:w-36 h-10 md:h-12 bg-white/30 rounded-full blur-xl hidden sm:block" />
        </div>

        <div className="container relative">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-white/90 hover:text-white text-xs md:text-sm mb-1.5 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Voltar
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold font-heading text-white drop-shadow-md">
            {category?.name || slug}
          </h1>
          {category?.description && (
            <p className="text-white/90 mt-1 text-xs md:text-sm max-w-lg line-clamp-2">
              {category.description}
            </p>
          )}
        </div>
      </div>

      {/* Filters + Products */}
      <div className="container py-8 md:py-12">
        {promoBanner && (slug === "meninos" || slug === "meninas") && (
          <PromoBanner variant={slug as "meninos" | "meninas"} config={promoBanner} />
        )}
        {/* Age filter groups — same design as SizeSelector on main site */}
        {!loading && filterGroups.length > 0 && (
          <div className={`rounded-2xl p-6 md:p-8 mb-6 ${filterBg}`}>
            <div className="space-y-4">
              {filterGroups.map((group) => {
                return (
                  <div key={group.id}>
                    <p className="text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-2">
                      {group.name}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {group.ages.map((ageKey) => {
                        const isActive = selectedAge === ageKey && selectedCatSlug === group.slug;
                        return (
                          <button
                            key={ageKey}
                            onClick={() => {
                              if (isActive) {
                                setSearchParams({}, { replace: true });
                              } else {
                                const next: Record<string, string> = { idade: ageKey };
                                if (group.slug) next.cat = group.slug;
                                setSearchParams(next, { replace: true });
                              }
                            }}
                            className={`px-4 h-10 rounded-full text-xs font-bold border-2 transition-all flex items-center justify-center whitespace-nowrap ${
                              isActive
                                ? "bg-primary text-primary-foreground border-primary shadow-md scale-110"
                                : "border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground"
                            }`}
                          >
                            {AGE_DISPLAY[ageKey] || ageKey}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            {hasActiveFilter && (
              <button
                onClick={() => setSearchParams({}, { replace: true })}
                className="mt-4 text-xs text-primary font-semibold hover:underline"
              >
                Limpar filtros
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-muted rounded-xl aspect-[3/4] animate-pulse" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">
              {hasActiveFilter ? "Nenhum produto encontrado para esse filtro." : "Nenhum produto encontrado nesta categoria."}
            </p>
            {hasActiveFilter ? (
              <button
                onClick={() => setSearchParams({}, { replace: true })}
                className="inline-block mt-4 text-primary font-semibold hover:underline"
              >
                Limpar filtros
              </button>
            ) : (
              <Link
                to="/"
                className="inline-block mt-4 text-primary font-semibold hover:underline"
              >
                Voltar à loja
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.map((product, index) => (
              <div
                key={product.id}
                className="group bg-card rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow border border-border flex flex-col"
              >
                <div className="relative overflow-hidden aspect-[3/4]">
                  <ProductImageCarousel
                    images={[product.image, ...product.extraImages]}
                    alt={product.name}
                    eager={index < 4}
                    optimized
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                    onImageClick={() => handleAddToCart(product)}
                  />
                  {product.discount > 0 && (
                    <span className="absolute top-2 left-2 bg-badge-discount text-accent-foreground text-[10px] font-bold px-2 py-0.5 rounded-full z-10">
                      {product.discount}% OFF
                    </span>
                  )}
                  {product.stock === 1 && (
                    <span className="absolute top-2 right-2 bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse z-10">
                      PEÇA ÚNICA
                    </span>
                  )}
                  {product.stock > 1 && (
                    <span className="absolute top-2 right-2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full z-10">
                      {product.stock} em estoque
                    </span>
                  )}
                  <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1 z-10 pointer-events-none">
                    {product.sizes.map((size) => (
                      <span
                        key={size}
                        className="bg-background/90 backdrop-blur-sm text-foreground text-[10px] font-bold px-1.5 py-0.5 rounded"
                      >
                        {size}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="p-3 flex flex-col flex-1">
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">
                    {product.brand}
                  </p>
                  <h3 className="text-xs font-bold text-foreground leading-tight line-clamp-2 mt-1">
                    {product.name}
                  </h3>
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
                      onClick={() => handleAddToCart(product)}
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      Adicionar ao pedido
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ProductBottomSheet
        product={sheetProduct}
        open={!!sheetProduct}
        onOpenChange={(o) => {
          if (!o) {
            setSheetProduct(null);
            setProductSheetOpen(false);
          }
        }}
        onAddedToCart={() => setShowCartConfirm(true)}
      />

      <CartConfirmDialog
        open={showCartConfirm}
        onClose={() => setShowCartConfirm(false)}
      />

      <FeaturesBar />
      <Footer />
    </div>
  );
};

export default Category;
