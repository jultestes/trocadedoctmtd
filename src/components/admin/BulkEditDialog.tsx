import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ChevronDown, X, Pencil } from "lucide-react";
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

type ProductData = {
  id: string;
  name: string;
  image_url: string | null;
  sizes: string[];
  stock: number;
  price: number;
  active: boolean;
  sku: string | null;
};

type CategoryOption = {
  id: string;
  name: string;
  displayName: string;
};

type EditableProduct = {
  id: string;
  name: string;
  image_url: string | null;
  sku: string | null;
  price: string;
  // editable fields
  stock: string;
  gender: GenderType | "";
  selectedAges: string[];
  categories: string[];
  active: boolean;
  ageDropdownOpen: boolean;
  expanded: boolean;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productIds: string[];
  onSaved: () => void;
};

const getCategoryOptions = (cats: { id: string; name: string; parent_id: string | null }[]): CategoryOption[] => {
  const nameCounts = cats.reduce<Record<string, number>>((acc, cat) => {
    acc[cat.name] = (acc[cat.name] || 0) + 1;
    return acc;
  }, {});

  const categoriesById = new Map(cats.map((cat) => [cat.id, cat]));

  return cats.map((cat) => {
    if (!cat.parent_id || nameCounts[cat.name] <= 1) {
      return { id: cat.id, name: cat.name, displayName: cat.name };
    }

    const parent = categoriesById.get(cat.parent_id);
    return {
      id: cat.id,
      name: cat.name,
      displayName: parent ? `${cat.name} (${parent.name})` : cat.name,
    };
  });
};

const BulkEditDialog = ({ open, onOpenChange, productIds, onSaved }: Props) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);
  const [items, setItems] = useState<EditableProduct[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  // Bulk edit fields
  const [bulkStock, setBulkStock] = useState("");
  const [bulkGender, setBulkGender] = useState<GenderType | "">("");
  const [bulkAges, setBulkAges] = useState<string[]>([]);
  const [bulkAgeDropdownOpen, setBulkAgeDropdownOpen] = useState(false);
  const [bulkCategories, setBulkCategories] = useState<string[]>([]);
  const [bulkCategoryPicker, setBulkCategoryPicker] = useState<string | undefined>(undefined);
  const [bulkActive, setBulkActive] = useState<"" | "true" | "false">("");

  useEffect(() => {
    if (!open || productIds.length === 0) return;
    setLoading(true);
    setBulkStock("");
    setBulkGender("");
    setBulkAges([]);
    setBulkAgeDropdownOpen(false);
    setBulkCategories([]);
    setBulkActive("");

    const load = async () => {
      const [{ data: prods }, { data: cats }, { data: pcData }] = await Promise.all([
        supabase.from("products").select("*").in("id", productIds),
        supabase.from("categories").select("id, name, parent_id").order("name"),
        supabase.from("product_categories").select("product_id, category_id").in("product_id", productIds),
      ]);

      if (cats) setCategories(getCategoryOptions(cats));

      const pcMap: Record<string, string[]> = {};
      pcData?.forEach((r) => {
        if (!pcMap[r.product_id]) pcMap[r.product_id] = [];
        pcMap[r.product_id].push(r.category_id);
      });

      if (prods) {
        setItems(
          prods.map((p) => {
            const sizes = (p as any).sizes || [];
            let gender: GenderType | "" = "";
            if (sizes.some((s: string) => s.startsWith("menina"))) gender = "menina";
            else if (sizes.some((s: string) => s.startsWith("menino"))) gender = "menino";
            return {
              id: p.id,
              name: p.name,
              image_url: (p as any).image_url,
              sku: (p as any).sku,
              price: p.price,
              stock: String((p as any).stock),
              gender,
              selectedAges: sizes,
              categories: pcMap[p.id] || [],
              active: p.active,
              ageDropdownOpen: false,
              expanded: false,
            };
          })
        );
      }
      setLoading(false);
    };
    load();
  }, [open, productIds]);

  const updateItem = (index: number, updates: Partial<EditableProduct>) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...updates } : item)));
  };

  const applyBulk = () => {
    setItems((prev) =>
      prev.map((item) => {
        const updated = { ...item };
        if (bulkStock !== "") updated.stock = bulkStock;
        if (bulkGender !== "") {
          updated.gender = bulkGender;
          updated.selectedAges = bulkAges;
        } else if (bulkAges.length > 0) {
          updated.selectedAges = bulkAges;
        }
        if (bulkCategories.length > 0) updated.categories = bulkCategories;
        if (bulkActive !== "") updated.active = bulkActive === "true";
        return updated;
      })
    );
    toast({ title: "Alterações em massa aplicadas!" });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveProgress(0);
    try {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        setSaveProgress(i + 1);
        const payload = {
          stock: parseInt(item.stock) || 0,
          sizes: item.selectedAges,
          active: item.active,
        };
        const { error } = await supabase.from("products").update(payload).eq("id", item.id);
        if (error) throw error;

        // Update categories
        await supabase.from("product_categories").delete().eq("product_id", item.id);
        if (item.categories.length > 0) {
          await supabase.from("product_categories").insert(
            item.categories.map((cid) => ({ product_id: item.id, category_id: cid }))
          );
        }
      }
      toast({ title: `${items.length} produto(s) atualizado(s)!` });
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
      setSaveProgress(0);
    }
  };

  const bulkAgeOptions = bulkGender ? AGE_OPTIONS[bulkGender] : [];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!saving) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar {productIds.length} produto(s)</DialogTitle>
        </DialogHeader>

        {saving ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm font-semibold text-foreground">
              Salvando {saveProgress} de {items.length} produto(s)...
            </p>
            <div className="w-full max-w-xs bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="bg-primary h-full rounded-full transition-all duration-300"
                style={{ width: `${(saveProgress / items.length) * 100}%` }}
              />
            </div>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* BULK SECTION */}
            <div className="bg-muted/50 rounded-xl border border-border p-4 space-y-3">
              <p className="text-sm font-bold text-foreground">Alterar todos de uma vez</p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Estoque</label>
                  <Input
                    type="number"
                    placeholder="Novo estoque"
                    value={bulkStock}
                    onChange={(e) => setBulkStock(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Status</label>
                  <select
                    value={bulkActive}
                    onChange={(e) => setBulkActive(e.target.value as "" | "true" | "false")}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Manter atual</option>
                    <option value="true">Ativo</option>
                    <option value="false">Inativo</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Gênero</label>
                  <select
                    value={bulkGender}
                    onChange={(e) => { setBulkGender(e.target.value as GenderType | ""); setBulkAges([]); }}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Manter atual</option>
                    <option value="menina">Menina</option>
                    <option value="menino">Menino</option>
                  </select>
                </div>
                <div className="relative">
                  <label className="text-xs text-muted-foreground">Idades</label>
                  <button
                    type="button"
                    onClick={() => bulkGender && setBulkAgeDropdownOpen(!bulkAgeDropdownOpen)}
                    disabled={!bulkGender}
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
                  >
                    <span className={bulkAges.length === 0 ? "text-muted-foreground" : "text-foreground"}>
                      {bulkAges.length === 0 ? "Selecione" : `${bulkAges.length} idade(s)`}
                    </span>
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </button>
                  {bulkAgeDropdownOpen && bulkAgeOptions.length > 0 && (
                    <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md max-h-52 overflow-y-auto">
                      {bulkAgeOptions.map((opt) => (
                        <label key={opt.value} className="flex items-center gap-2 px-3 py-2 hover:bg-accent cursor-pointer text-sm text-foreground">
                          <input
                            type="checkbox"
                            checked={bulkAges.includes(opt.value)}
                            onChange={() => setBulkAges((prev) => prev.includes(opt.value) ? prev.filter((a) => a !== opt.value) : [...prev, opt.value])}
                            className="rounded"
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Bulk categories */}
              <div>
                <label className="text-xs text-muted-foreground">Categorias (substituir)</label>
                <Select
                  value={bulkCategoryPicker}
                  onValueChange={(val) => {
                    if (!bulkCategories.includes(val)) setBulkCategories((prev) => [...prev, val]);
                    setBulkCategoryPicker(undefined);
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Adicionar categoria" /></SelectTrigger>
                  <SelectContent>
                    {categories.filter((c) => !bulkCategories.includes(c.id)).map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.displayName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {bulkCategories.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {bulkCategories.map((cid) => {
                      const cat = categories.find((c) => c.id === cid);
                      return (
                        <button
                          key={cid}
                          type="button"
                          onClick={() => setBulkCategories((prev) => prev.filter((id) => id !== cid))}
                          className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground hover:bg-accent"
                        >
                          {cat?.displayName || "?"} <X className="h-3 w-3" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <Button size="sm" onClick={applyBulk} className="w-full">
                Aplicar a todos
              </Button>
            </div>

            {/* INDIVIDUAL ITEMS */}
            <div className="space-y-2">
              <p className="text-sm font-bold text-foreground">Editar individualmente</p>
              {items.map((item, idx) => (
                <div key={item.id} className="bg-card rounded-xl border border-border overflow-hidden">
                  {/* Header row */}
                  <button
                    type="button"
                    onClick={() => updateItem(idx, { expanded: !item.expanded })}
                    className="w-full flex items-center gap-3 p-3 hover:bg-accent/50 transition-colors text-left"
                  >
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-muted shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground">SKU: {item.sku || "—"} · Est: {item.stock} · R$ {Number(item.price).toFixed(2)}</p>
                    </div>
                    <Pencil className={`w-4 h-4 text-muted-foreground transition-transform ${item.expanded ? "rotate-45" : ""}`} />
                  </button>

                  {/* Expanded edit */}
                  {item.expanded && (
                    <div className="border-t border-border p-3 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground">Estoque</label>
                          <Input
                            type="number"
                            value={item.stock}
                            onChange={(e) => updateItem(idx, { stock: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Status</label>
                          <select
                            value={item.active ? "true" : "false"}
                            onChange={(e) => updateItem(idx, { active: e.target.value === "true" })}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          >
                            <option value="true">Ativo</option>
                            <option value="false">Inativo</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground">Gênero</label>
                          <select
                            value={item.gender}
                            onChange={(e) => updateItem(idx, { gender: e.target.value as GenderType | "", selectedAges: [] })}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          >
                            <option value="">Selecione</option>
                            <option value="menina">Menina</option>
                            <option value="menino">Menino</option>
                          </select>
                        </div>
                        <div className="relative">
                          <label className="text-xs text-muted-foreground">Idades</label>
                          <button
                            type="button"
                            onClick={() => updateItem(idx, { ageDropdownOpen: !item.ageDropdownOpen })}
                            disabled={!item.gender}
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
                          >
                            <span className={item.selectedAges.length === 0 ? "text-muted-foreground" : "text-foreground"}>
                              {item.selectedAges.length === 0 ? "Selecione" : `${item.selectedAges.length} idade(s)`}
                            </span>
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          </button>
                          {item.ageDropdownOpen && item.gender && (
                            <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md max-h-40 overflow-y-auto">
                              {AGE_OPTIONS[item.gender].map((opt) => (
                                <label key={opt.value} className="flex items-center gap-2 px-3 py-1.5 hover:bg-accent cursor-pointer text-sm text-foreground">
                                  <input
                                    type="checkbox"
                                    checked={item.selectedAges.includes(opt.value)}
                                    onChange={() => {
                                      const newAges = item.selectedAges.includes(opt.value)
                                        ? item.selectedAges.filter((a) => a !== opt.value)
                                        : [...item.selectedAges, opt.value];
                                      updateItem(idx, { selectedAges: newAges });
                                    }}
                                    className="rounded"
                                  />
                                  {opt.label}
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Individual categories */}
                      <div>
                        <label className="text-xs text-muted-foreground">Categorias</label>
                        <Select
                          value={undefined}
                          onValueChange={(val) => {
                            if (!item.categories.includes(val)) {
                              updateItem(idx, { categories: [...item.categories, val] });
                            }
                          }}
                        >
                          <SelectTrigger><SelectValue placeholder="Adicionar categoria" /></SelectTrigger>
                          <SelectContent>
                            {categories.filter((c) => !item.categories.includes(c.id)).map((c) => (
                              <SelectItem key={c.id} value={c.id}>{c.displayName}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {item.categories.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.categories.map((cid) => {
                              const cat = categories.find((c) => c.id === cid);
                              return (
                                <button
                                  key={cid}
                                  type="button"
                                  onClick={() => updateItem(idx, { categories: item.categories.filter((id) => id !== cid) })}
                                  className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-0.5 text-[10px] text-foreground hover:bg-accent"
                                >
                                  {cat?.displayName || "?"} <X className="h-2.5 w-2.5" />
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BulkEditDialog;
