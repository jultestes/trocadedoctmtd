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
            subcategories.push({ id: sub.id, name: sub.name, slug: sub.slug, ages: filteredAges });
          }
        }

        // Also show the parent itself with its own direct product ages
        const parentRealAges = categoryProductAges.get(parent.id);
        const parentFilteredAges = parent.ages.filter(a => parentRealAges?.has(a));

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
    <section className="py-12 md:py-16">
      <div className="container">
        <h2 className="section-title mb-10">Compre por Tamanho</h2>

        <div className={`grid grid-cols-1 ${parents.length >= 2 ? "md:grid-cols-2" : ""} gap-6`}>
          {parents.map((parent) => {
            const bgClass = CATEGORY_STYLES[parent.slug] || "bg-muted/50";
            // Combine: show parent row (if it has direct ages) + subcategory rows
            const rows: { label: string; parentSlug: string; catSlug: string | null; ages: string[] }[] = [];

            // Parent row with all its ages
            if (parent.ages.length > 0) {
              rows.push({ label: parent.name, parentSlug: parent.slug, catSlug: null, ages: parent.ages });
            }

            // Subcategory rows
            for (const sub of parent.subcategories) {
              rows.push({ label: sub.name, parentSlug: parent.slug, catSlug: sub.slug, ages: sub.ages });
            }

            return (
              <div key={parent.id} className={`${bgClass} rounded-2xl p-6 md:p-8`}>
                <h3 className="text-2xl font-bold font-heading text-foreground/60 mb-5">
                  {parent.name}
                </h3>
                <div className="space-y-4">
                  {rows.map((row) => (
                    <div key={row.label}>
                      <p className="text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-2">
                        {row.label}
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        {row.ages.map((ageKey) => (
                          <button
                            key={ageKey}
                            onClick={() => {
                              const params = new URLSearchParams();
                              if (row.catSlug) params.set("cat", row.catSlug);
                              params.set("idade", ageKey);
                              navigate(`/categoria/${row.parentSlug}?${params.toString()}`);
                            }}
                            className="px-4 h-10 rounded-full border-2 border-primary/30 text-xs font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-all whitespace-nowrap"
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
