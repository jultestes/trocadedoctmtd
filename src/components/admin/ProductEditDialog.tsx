import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { X, ChevronDown, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type GenderType = "menina" | "menino";

const AGE_OPTIONS: Record<GenderType, { value: string; label: string }[]> = {
  menino: [
    { value: "menino-p", label: "P" },
    { value: "menino-m", label: "M" },
    { value: "menino-g", label: "G" },
    { value: "menino-idade1", label: "1 ano" },
    { value: "menino-idade2", label: "2 anos" },
    { value: "menino-idade3", label: "3 anos" },
    { value: "menino-idade4", label: "4 anos" },
    { value: "menino-idade6", label: "6 anos" },
    { value: "menino-idade8", label: "8 anos" },
    { value: "menino-idade10", label: "10 anos" },
    { value: "menino-idade12", label: "12 anos" },
    { value: "menino-idade14", label: "14 anos" },
    { value: "menino-idade16", label: "16 anos" },
  ],
  menina: [
    { value: "menina-p", label: "P" },
    { value: "menina-m", label: "M" },
    { value: "menina-g", label: "G" },
    { value: "menina-idade1", label: "1 ano" },
    { value: "menina-idade2", label: "2 anos" },
    { value: "menina-idade3", label: "3 anos" },
    { value: "menina-idade4", label: "4 anos" },
    { value: "menina-idade6", label: "6 anos" },
    { value: "menina-idade8", label: "8 anos" },
    { value: "menina-idade10", label: "10 anos" },
    { value: "menina-idade12", label: "12 anos" },
    { value: "menina-idade14", label: "14 anos" },
    { value: "menina-idade16", label: "16 anos" },
  ],
};

type ProductRow = {
  id: string;
  name: string;
  brand: string | null;
  price: number;
  old_price: number | null;
  discount: number | null;
  image_url: string | null;
  extra_images: string[] | null;
  sizes: string[] | null;
  stock: number;
  active: boolean;
  category_id: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string | null;
  onSaved: () => void;
};

const ProductEditDialog = ({ open, onOpenChange, productId, onSaved }: Props) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState<ProductRow | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: string; displayName: string }[]>([]);
  const [productCategories, setProductCategories] = useState<string[]>([]);
  const [categoryPickerValue, setCategoryPickerValue] = useState<string | undefined>(undefined);

  // Form state
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [oldPrice, setOldPrice] = useState("");
  const [stock, setStock] = useState("");
  const [active, setActive] = useState(true);
  const [gender, setGender] = useState<GenderType | "">("");
  const [selectedAges, setSelectedAges] = useState<string[]>([]);
  const [ageDropdownOpen, setAgeDropdownOpen] = useState(false);

  useEffect(() => {
    if (!open || !productId) return;
    setLoading(true);
    setAgeDropdownOpen(false);

    const load = async () => {
      const [{ data: prod }, { data: cats }, { data: pcData }] = await Promise.all([
        supabase.from("products").select("*").eq("id", productId).single(),
        supabase.from("categories").select("id, name, parent_id").order("name"),
        supabase.from("product_categories").select("category_id").eq("product_id", productId),
      ]);

      if (prod) {
        const p = prod as unknown as ProductRow;
        setProduct(p);
        setName(p.name);
        setPrice(String(p.price));
        setOldPrice(p.old_price ? String(p.old_price) : "");
        setStock(String(p.stock));
        setActive(p.active);

        const sizes = p.sizes || [];
        setSelectedAges(sizes);
        if (sizes.some((s) => s.startsWith("menina"))) setGender("menina");
        else if (sizes.some((s) => s.startsWith("menino"))) setGender("menino");
        else setGender("");
      }
      if (cats) {
        // Build display names: append parent name for subcategories with duplicate names
        const nameCounts: Record<string, number> = {};
        cats.forEach((c: any) => { nameCounts[c.name] = (nameCounts[c.name] || 0) + 1; });
        const enriched = cats.map((c: any) => {
          let displayName = c.name;
          if (c.parent_id && nameCounts[c.name] > 1) {
            const parent = cats.find((p: any) => p.id === c.parent_id);
            if (parent) displayName = `${c.name} (${parent.name})`;
          }
          return { id: c.id, name: c.name, displayName };
        });
        setCategories(enriched);
      }
      if (pcData) setProductCategories(pcData.map((r) => r.category_id));

      setLoading(false);
    };
    load();
  }, [open, productId]);

  const currentAgeOptions = gender ? AGE_OPTIONS[gender] : [];

  const toggleAge = (val: string) => {
    setSelectedAges((prev) =>
      prev.includes(val) ? prev.filter((a) => a !== val) : [...prev, val]
    );
  };

  const handleSave = async () => {
    if (!productId || !product) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        price: parseFloat(price) || 0,
        old_price: oldPrice ? parseFloat(oldPrice) : null,
        stock: parseInt(stock) || 0,
        active,
        sizes: selectedAges,
        category_id: productCategories[0] || null,
      };

      const { error } = await supabase.from("products").update(payload).eq("id", productId);
      if (error) throw error;

      // Update product_categories
      await supabase.from("product_categories").delete().eq("product_id", productId);
      if (productCategories.length > 0) {
        await supabase.from("product_categories").insert(
          productCategories.map((cid) => ({ product_id: productId, category_id: cid }))
        );
      }

      toast({ title: "Produto atualizado!" });
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Produto</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : product ? (
          <div className="space-y-4 pt-2">
            {/* Image preview */}
            {product.image_url && (
              <div className="flex items-center gap-3">
                <img src={product.image_url} alt={product.name} className="w-16 h-16 rounded-lg object-cover border border-border" />
                {(product.extra_images || []).map((url, i) => (
                  <img key={i} src={url} alt={`Extra ${i}`} className="w-12 h-12 rounded-lg object-cover border border-border" />
                ))}
              </div>
            )}

            <Input placeholder="Nome *" value={name} onChange={(e) => setName(e.target.value)} />

            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Preço *" type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
              <Input placeholder="Preço antigo" type="number" step="0.01" value={oldPrice} onChange={(e) => setOldPrice(e.target.value)} />
            </div>

            <Input placeholder="Estoque" type="number" value={stock} onChange={(e) => setStock(e.target.value)} />

            {/* Gender */}
            <select
              value={gender}
              onChange={(e) => { setGender(e.target.value as GenderType | ""); setSelectedAges([]); }}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Selecione o gênero</option>
              <option value="menina">Menina</option>
              <option value="menino">Menino</option>
            </select>

            {/* Ages */}
            <div className="relative">
              <button
                type="button"
                onClick={() => gender && setAgeDropdownOpen(!ageDropdownOpen)}
                disabled={!gender}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
              >
                <span className={selectedAges.length === 0 ? "text-muted-foreground" : "text-foreground"}>
                  {selectedAges.length === 0 ? "Selecione as idades" : `${selectedAges.length} idade(s)`}
                </span>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>
              {ageDropdownOpen && currentAgeOptions.length > 0 && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md max-h-52 overflow-y-auto">
                  {currentAgeOptions.map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2 px-3 py-2 hover:bg-accent cursor-pointer text-sm text-foreground">
                      <input type="checkbox" checked={selectedAges.includes(opt.value)} onChange={() => toggleAge(opt.value)} className="rounded" />
                      {opt.label}
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Categories */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Categorias</label>
              <Select
                value={categoryPickerValue}
                onValueChange={(val) => {
                  if (!productCategories.includes(val)) {
                    setProductCategories((prev) => [...prev, val]);
                  }
                  setCategoryPickerValue(undefined);
                }}
              >
                <SelectTrigger><SelectValue placeholder="Adicionar categoria" /></SelectTrigger>
                <SelectContent>
                  {categories.filter((c) => !productCategories.includes(c.id)).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.displayName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {productCategories.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {productCategories.map((cid) => {
                    const cat = categories.find((c) => c.id === cid);
                    return (
                      <button
                        key={cid}
                        type="button"
                        onClick={() => setProductCategories((prev) => prev.filter((id) => id !== cid))}
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-1 text-xs text-foreground hover:bg-accent"
                      >
                        {cat?.displayName || "?"} <X className="h-3 w-3" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Active toggle */}
            <label className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 cursor-pointer transition-all ${active ? "border-primary bg-primary/10" : "border-border bg-muted/50"}`}>
              <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${active ? "bg-primary" : "bg-muted-foreground/30"}`}>
                {active && (
                  <svg className="w-4 h-4 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="hidden" />
              <div className="flex flex-col">
                <span className={`font-semibold text-sm ${active ? "text-primary" : "text-muted-foreground"}`}>
                  {active ? "✓ Produto Ativo" : "Produto Inativo"}
                </span>
                <span className="text-xs text-muted-foreground">{active ? "Visível no site" : "Não aparece no site"}</span>
              </div>
            </label>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export default ProductEditDialog;
