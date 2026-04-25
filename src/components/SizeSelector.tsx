import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const AGE_DISPLAY: Record<string, string> = {
  "p": "P", "m": "M", "g": "G",
  "idade1": "1 ano", "idade2": "2 anos", "idade3": "3 anos", "idade4": "4 anos",
  "idade6": "6 anos", "idade8": "8 anos", "idade10": "10 anos",
  "idade12": "12 anos", "idade14": "14 anos", "idade16": "16 anos",
};

const LETTER_SIZES = ["p", "m", "g"];
const INFANTIL_AGES = ["idade1", "idade2", "idade3", "idade4", "idade6", "idade8", "idade10"];
const TEEN_AGES = ["idade12", "idade14", "idade16"];

const ALL_AGE_KEYS = [...LETTER_SIZES, ...INFANTIL_AGES, ...TEEN_AGES].sort((a, b) => b.length - a.length);

// Ordem de exibição: P, M, G, depois idades crescentes (1, 2, 3, 4, 6, 8, 10, 12, 14, 16)
const AGE_SORT_ORDER = ["p", "m", "g", "idade1", "idade2", "idade3", "idade4", "idade6", "idade8", "idade10", "idade12", "idade14", "idade16"];
const sortAges = (ages: string[]) =>
  [...ages].sort((a, b) => AGE_SORT_ORDER.indexOf(a) - AGE_SORT_ORDER.indexOf(b));
const extractAgeKey = (raw: string): string | null => {
  for (const key of ALL_AGE_KEYS) {
    const regex = new RegExp(`(^|[-_])${key}($|[-_])`);
    if (regex.test(raw)) return key;
  }
  return null;
};

const CATEGORY_STYLES: Record<string, string> = {
  meninas: "bg-section-pink",
  meninos: "bg-section-blue",
  bebes: "bg-amber-50",
};

type SubcategoryWithAges = {
  id: string;
  name: string;
  slug: string;
  ages: string[];
};

type ParentCategory = {
  id: string;
  name: string;
  slug: string;
  ages: string[];
  subcategories: SubcategoryWithAges[];
};

const SizeSelector = () => {
  const [parents, setParents] = useState<ParentCategory[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      // Fetch all categories
      const { data: allCats } = await supabase
        .from("categories")
        .select("id, name, slug, ages, parent_id")
        .order("name");

      if (!allCats) return;

      const parentCats = allCats.filter(c => !c.parent_id);
      const childCats = allCats.filter(c => c.parent_id);

      // Get all category IDs (parents + children)
      const allCatIds = allCats.map(c => c.id);

      // Fetch product_categories for all categories
      const { data: pcData } = await supabase
        .from("product_categories")
        .select("product_id, category_id")
        .in("category_id", allCatIds);

      // Fetch active products with sizes
      const { data: prodData } = await supabase
        .from("products")
        .select("id, sizes")
        .eq("active", true);

      const productSizesMap = new Map<string, string[]>();
      for (const p of prodData || []) {
        productSizesMap.set(p.id, (p as any).sizes || []);
      }

      // Build age keys per category
      const categoryProductAges = new Map<string, Set<string>>();
      for (const pc of pcData || []) {
        const sizes = productSizesMap.get(pc.product_id);
        if (!sizes) continue;
        if (!categoryProductAges.has(pc.category_id)) {
          categoryProductAges.set(pc.category_id, new Set());
        }
        const ageSet = categoryProductAges.get(pc.category_id)!;
        for (const raw of sizes) {
          const key = extractAgeKey(raw);
          if (key) ageSet.add(key);
        }
      }

      const result: ParentCategory[] = [];
      for (const parent of parentCats) {
        if (!parent.ages || parent.ages.length === 0) continue;

        // Get subcategories for this parent
        const subs = childCats.filter(c => c.parent_id === parent.id);
        const subcategories: SubcategoryWithAges[] = [];

        for (const sub of subs) {
          // Subcategory inherits parent ages, filtered by real products
          const realAges = categoryProductAges.get(sub.id);
          const filteredAges = parent.ages.filter(a => realAges?.has(a));
          if (filteredAges.length > 0) {
            subcategories.push({ id: sub.id, name: sub.name, slug: sub.slug, ages: sortAges(filteredAges) });
          }
        }

        // Also show the parent itself with its own direct product ages
        const parentRealAges = categoryProductAges.get(parent.id);
        const parentFilteredAges = sortAges(parent.ages.filter(a => parentRealAges?.has(a)));

        if (subcategories.length > 0 || parentFilteredAges.length > 0) {
          result.push({
            id: parent.id,
            name: parent.name,
            slug: parent.slug,
            ages: parentFilteredAges,
            subcategories,
          });
        }
      }

      setParents(result);
    };

    fetchData();
  }, []);

  if (parents.length === 0) return null;

  return (
    <section className="py-8 md:py-20">
      <div className="container">
        <div className="text-center mb-6 md:mb-12">
          <span className="inline-block text-[11px] md:text-sm font-bold uppercase tracking-[0.2em] text-primary mb-2 md:mb-3">
            Encontre o tamanho ideal
          </span>
          <h2 className="font-heading font-extrabold text-2xl md:text-5xl text-foreground">
            Compre por Tamanho
          </h2>
          <div className="w-12 md:w-16 h-1 bg-primary rounded-full mx-auto mt-3 md:mt-4" />
        </div>

        <div className={`grid grid-cols-1 ${parents.length >= 2 ? "md:grid-cols-2" : ""} gap-6 md:gap-8`}>
          {parents.map((parent) => {
            const bgClass = CATEGORY_STYLES[parent.slug] || "bg-muted/50";
            const rows: { label: string; parentSlug: string; catSlug: string | null; ages: string[] }[] = [];

            if (parent.ages.length > 0) {
              rows.push({ label: parent.name, parentSlug: parent.slug, catSlug: null, ages: parent.ages });
            }
            for (const sub of parent.subcategories) {
              rows.push({ label: sub.name, parentSlug: parent.slug, catSlug: sub.slug, ages: sub.ages });
            }

            return (
              <div key={parent.id} className={`${bgClass} rounded-2xl md:rounded-3xl p-4 md:p-8 shadow-sm`}>
                <h3 className="text-xl md:text-3xl font-extrabold font-heading text-foreground mb-3 md:mb-6">
                  {parent.name}
                </h3>
                <div className="space-y-3 md:space-y-5">
                  {rows.map((row) => (
                    <div key={row.label}>
                      {row.label !== parent.name && (
                        <p className="text-[11px] md:text-xs font-bold text-foreground/60 uppercase tracking-wider mb-2 md:mb-3">
                          {row.label}
                        </p>
                      )}
                      <div className="grid grid-cols-4 sm:grid-cols-5 md:flex md:flex-wrap gap-2">
                        {row.ages.map((ageKey) => (
                          <button
                            key={ageKey}
                            onClick={() => {
                              const params = new URLSearchParams();
                              if (row.catSlug) params.set("cat", row.catSlug);
                              params.set("idade", ageKey);
                              navigate(`/categoria/${row.parentSlug}?${params.toString()}`);
                            }}
                            className="h-9 md:h-11 px-2.5 md:px-5 rounded-full bg-background/80 border border-primary/30 md:border-2 md:border-primary/40 text-xs md:text-sm font-semibold md:font-bold text-primary hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-md transition-all whitespace-nowrap flex items-center justify-center"
                          >
                            {AGE_DISPLAY[ageKey] || ageKey}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default SizeSelector;
