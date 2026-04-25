import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

interface ProductPickerProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

type MiniProduct = { id: string; name: string; image_url: string | null; sku: string | null };

export default function ProductPicker({ selectedIds, onChange }: ProductPickerProps) {
  const [products, setProducts] = useState<MiniProduct[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<MiniProduct[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // Load selected products (always visible, even if outside search results)
  useEffect(() => {
    if (selectedIds.length === 0) {
      setSelectedProducts([]);
      return;
    }
    supabase
      .from("products")
      .select("id, name, image_url, sku")
      .in("id", selectedIds)
      .then(({ data }) => data && setSelectedProducts(data));
  }, [selectedIds]);

  // Server-side search
  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);
      const term = search.trim();
      let query = supabase
        .from("products")
        .select("id, name, image_url, sku")
        .order("name")
        .limit(100);

      if (term) {
        query = query.or(`name.ilike.%${term}%,sku.ilike.%${term}%`);
      }

      const { data } = await query;
      if (data) setProducts(data);
      setLoading(false);
    }, 250);

    return () => clearTimeout(timer);
  }, [search]);

  const toggle = (id: string) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id]
    );
  };

  // Merge: selected first, then search results (excluding already-selected to avoid duplicates)
  const selectedSet = new Set(selectedIds);
  const searchResults = products.filter((p) => !selectedSet.has(p.id));
  const display = [...selectedProducts, ...searchResults];

  return (
    <div className="space-y-2">
      <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
        Produtos selecionados ({selectedIds.length})
      </label>
      <Input
        placeholder="Buscar produto por nome ou SKU..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-7 text-xs"
      />
      <div className="max-h-40 overflow-y-auto space-y-1 border border-border rounded-md p-1.5">
        {display.map((p) => (
          <label
            key={p.id}
            className={`flex items-center gap-2 p-1.5 rounded cursor-pointer hover:bg-muted/50 text-xs ${
              selectedIds.includes(p.id) ? "bg-primary/5" : ""
            }`}
          >
            <Checkbox
              checked={selectedIds.includes(p.id)}
              onCheckedChange={() => toggle(p.id)}
            />
            {p.image_url && (
              <img src={p.image_url} alt="" className="w-6 h-6 rounded object-cover" />
            )}
            <span className="truncate flex-1">{p.name}</span>
            {p.sku && <span className="text-muted-foreground text-[10px]">#{p.sku}</span>}
          </label>
        ))}
        {display.length === 0 && (
          <p className="text-[10px] text-muted-foreground text-center py-3">
            {loading ? "Buscando..." : "Nenhum produto"}
          </p>
        )}
      </div>
    </div>
  );
}
