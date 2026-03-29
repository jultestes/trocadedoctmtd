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
  const [search, setSearch] = useState("");

  useEffect(() => {
    supabase
      .from("products")
      .select("id, name, image_url, sku")
      .order("name")
      .limit(200)
      .then(({ data }) => data && setProducts(data));
  }, []);

  const filtered = products.filter(
    (p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku?.includes(search)
  );

  const toggle = (id: string) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id]
    );
  };

  return (
    <div className="space-y-2">
      <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
        Produtos selecionados ({selectedIds.length})
      </label>
      <Input
        placeholder="Buscar produto..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-7 text-xs"
      />
      <div className="max-h-40 overflow-y-auto space-y-1 border border-border rounded-md p-1.5">
        {filtered.map((p) => (
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
        {filtered.length === 0 && (
          <p className="text-[10px] text-muted-foreground text-center py-3">Nenhum produto</p>
        )}
      </div>
    </div>
  );
}
