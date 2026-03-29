import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Pencil, Trash2, X, Check, Package, PackageCheck, PackageX, ChevronLeft, ChevronRight, List, LayoutGrid } from "lucide-react";
import ProductEditDialog from "./ProductEditDialog";
import BulkEditDialog from "./BulkEditDialog";

type AgeOption = { value: string; label: string };

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parent_id: string | null;
  ages: string[];
};

type Product = {
  id: string;
  name: string;
  brand: string | null;
  price: number;
  image_url: string | null;
  sizes: string[];
  stock: number;
  active: boolean;
  sku: string | null;
};

type Props = {
  category: Category;
  allCategories: Category[];
  globalAges: AgeOption[];
  onBack: () => void;
  onRefresh: () => void;
};

const AGE_LABELS_FROM_LIST = (ages: AgeOption[]): Record<string, string> => {
  const map: Record<string, string> = {};
  ages.forEach(a => { map[a.value] = a.label; });
  return map;
};

const extractAgeKey = (raw: string, ages: AgeOption[]): string | null => {
  // Sort by value length descending to match longer keys first (e.g., "idade3" before "m")
  const sorted = [...ages].sort((a, b) => b.value.length - a.value.length);
  for (const age of sorted) {
    const regex = new RegExp(`(^|[-_])${age.value}($|[-_])`);
    if (regex.test(raw)) return age.value;
  }
  return null;
};

const AdminCategoryDetail = ({ category, allCategories, globalAges, onBack, onRefresh }: Props) => {
  const { toast } = useToast();
  const [cat, setCat] = useState(category);
  const subcategories = allCategories.filter(c => c.parent_id === cat.id);
  const ageLabels = AGE_LABELS_FROM_LIST(globalAges);

  // Editing state
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(cat.name);
  const [subName, setSubName] = useState("");
  const [subSlug, setSubSlug] = useState("");
  const [editSubId, setEditSubId] = useState<string | null>(null);
  const [editSubName, setEditSubName] = useState("");

  // Products state
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [ageFilter, setAgeFilter] = useState("");
  const [subFilter, setSubFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  // Product IDs per subcategory
  const [subProductMap, setSubProductMap] = useState<Record<string, string[]>>({});

  // Edit dialog state
  const [editProductId, setEditProductId] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // View mode
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);

  const isSelected = (id: string) => selectedIds.includes(id);

  useEffect(() => { fetchProducts(); }, [cat.id]);

  const fetchProducts = async () => {
    setLoadingProducts(true);
    const { data: pcData } = await supabase
      .from("product_categories")
      .select("product_id, category_id")
      .in("category_id", [cat.id, ...subcategories.map(s => s.id)]);

    const allProductIds = [...new Set(pcData?.map(r => r.product_id) || [])];

    const map: Record<string, string[]> = {};
    pcData?.forEach(r => {
      if (r.category_id !== cat.id) {
        if (!map[r.category_id]) map[r.category_id] = [];
        map[r.category_id].push(r.product_id);
      }
    });
    setSubProductMap(map);

    if (allProductIds.length > 0) {
      const { data } = await supabase
        .from("products")
        .select("*")
        .in("id", allProductIds)
        .order("created_at", { ascending: false });
      if (data) setProducts(data as unknown as Product[]);
    } else {
      setProducts([]);
    }
    setLoadingProducts(false);
  };

  // Filtered + paginated
  const filteredProducts = products.filter(p => {
    if (ageFilter) {
      const regex = new RegExp(`(^|[-_])${ageFilter}($|[-_])`);
      if (!(p.sizes ?? []).some(s => regex.test(s))) return false;
    }
    if (subFilter && !(subProductMap[subFilter] || []).includes(p.id)) return false;
    return true;
  });

  useEffect(() => { setCurrentPage(1); }, [ageFilter, subFilter]);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleRowSelect = useCallback((productId: string, index: number, shiftKey: boolean) => {
    setSelectedIds((prev) => {
      if (shiftKey && lastClickedIndex !== null) {
        const start = Math.min(lastClickedIndex, index);
        const end = Math.max(lastClickedIndex, index);
        const rangeIds = filteredProducts.slice(start, end + 1).map((p) => p.id);
        const merged = new Set([...prev, ...rangeIds]);
        return Array.from(merged);
      } else {
        return prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId];
      }
    });
    setLastClickedIndex(index);
  }, [lastClickedIndex, filteredProducts]);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.length === filteredProducts.length) return [];
      return filteredProducts.map((p) => p.id);
    });
  }, [filteredProducts]);

  const totalCount = products.length;
  const activeCount = products.filter(p => p.active).length;
  const inactiveCount = totalCount - activeCount;

  const getPageNumbers = () => {
    if (totalPages <= 3) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (currentPage <= 2) return [1, 2, 3];
    if (currentPage >= totalPages - 1) return [totalPages - 2, totalPages - 1, totalPages];
    return [currentPage - 1, currentPage, currentPage + 1];
  };

  // Handlers
  const saveName = async () => {
    if (!nameVal.trim()) return;
    const { error } = await supabase.from("categories").update({ name: nameVal.trim() } as any).eq("id", cat.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setCat({ ...cat, name: nameVal.trim() });
      setEditingName(false);
      onRefresh();
    }
  };

  const toggleAge = async (ageValue: string) => {
    const current = cat.ages || [];
    const updated = current.includes(ageValue)
      ? current.filter(a => a !== ageValue)
      : [...current, ageValue];
    const { error } = await supabase.from("categories").update({ ages: updated } as any).eq("id", cat.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setCat({ ...cat, ages: updated });
      onRefresh();
    }
  };

  const addSub = async () => {
    if (!subName.trim()) return;
    const slug = subSlug.trim() || subName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const { error } = await supabase.from("categories").insert({ name: subName.trim(), slug, parent_id: cat.id } as any);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setSubName(""); setSubSlug("");
      onRefresh();
      toast({ title: "Subcategoria criada!" });
    }
  };

  const updateSub = async (id: string) => {
    const { error } = await supabase.from("categories").update({ name: editSubName.trim() } as any).eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setEditSubId(null);
      onRefresh();
    }
  };

  const deleteSub = async (id: string) => {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      onRefresh();
      toast({ title: "Removido" });
    }
  };

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar para categorias
      </button>

      {/* ====== EDITING SECTION ====== */}
      <div className="bg-card rounded-xl border border-border p-5 mb-6">
        {/* Category name */}
        <div className="mb-5">
          {editingName ? (
            <div className="flex items-center gap-2">
              <Input value={nameVal} onChange={(e) => setNameVal(e.target.value)} className="max-w-xs text-lg font-bold" />
              <Button size="icon" variant="ghost" onClick={saveName}><Check className="w-4 h-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => { setEditingName(false); setNameVal(cat.name); }}><X className="w-4 h-4" /></Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-foreground font-heading">{cat.name}</h2>
              <Button size="icon" variant="ghost" onClick={() => setEditingName(true)}><Pencil className="w-4 h-4" /></Button>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-1">Slug: {cat.slug}</p>
        </div>

        {/* Ages */}
        <div className="mb-5">
          <p className="text-sm font-semibold text-foreground mb-2">Idades disponíveis</p>
          {globalAges.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma idade cadastrada. Vá em Configurações para adicionar.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {globalAges.map((age) => {
                const active = (cat.ages || []).includes(age.value);
                return (
                  <button
                    key={age.value}
                    onClick={() => toggleAge(age.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all ${
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:border-primary/50"
                    }`}
                  >
                    {age.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Subcategories */}
        <div>
          <p className="text-sm font-semibold text-foreground mb-2">Subcategorias</p>
          {subcategories.length > 0 && (
            <div className="space-y-2 mb-3">
              {subcategories.map(sub => (
                <div key={sub.id} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                  {editSubId === sub.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input value={editSubName} onChange={(e) => setEditSubName(e.target.value)} className="max-w-[200px] h-8 text-sm" />
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateSub(sub.id)}><Check className="w-3 h-3" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditSubId(null)}><X className="w-3 h-3" /></Button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <span className="text-sm font-medium text-foreground">{sub.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">{sub.slug}</span>
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditSubId(sub.id); setEditSubName(sub.name); }}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteSub(sub.id)}>
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2 flex-wrap">
            <Input placeholder="Nome (ex: Vestidos)" value={subName} onChange={(e) => setSubName(e.target.value)} className="flex-1 min-w-[120px] h-9 text-sm" />
            <Input placeholder="Slug (opcional)" value={subSlug} onChange={(e) => setSubSlug(e.target.value)} className="flex-1 min-w-[120px] h-9 text-sm" />
            <Button size="sm" onClick={addSub} className="gap-1"><Plus className="w-3 h-3" /> Adicionar</Button>
          </div>
        </div>
      </div>

      {/* ====== CATALOG SECTION ====== */}
      <div className="mb-4">
        <h3 className="text-lg font-bold text-foreground font-heading mb-3">Catálogo de Produtos</h3>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-card rounded-xl border border-border p-3 text-center">
            <Package className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xl font-bold text-foreground">{totalCount}</p>
            <p className="text-[10px] text-muted-foreground">Total</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-3 text-center">
            <PackageCheck className="w-4 h-4 mx-auto mb-1 text-primary" />
            <p className="text-xl font-bold text-primary">{activeCount}</p>
            <p className="text-[10px] text-muted-foreground">Ativos</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-3 text-center">
            <PackageX className="w-4 h-4 mx-auto mb-1 text-destructive" />
            <p className="text-xl font-bold text-destructive">{inactiveCount}</p>
            <p className="text-[10px] text-muted-foreground">Inativos</p>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <select
            value={ageFilter}
            onChange={(e) => setAgeFilter(e.target.value)}
            className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm min-w-[160px]"
          >
            <option value="">Todas as idades</option>
            {(cat.ages || []).map(ageVal => (
              <option key={ageVal} value={ageVal}>{ageLabels[ageVal] || ageVal}</option>
            ))}
          </select>

          {subcategories.length > 0 && (
            <select
              value={subFilter}
              onChange={(e) => setSubFilter(e.target.value)}
              className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm min-w-[160px]"
            >
              <option value="">Todos os tipos</option>
              {subcategories.map(sub => (
                <option key={sub.id} value={sub.id}>{sub.name}</option>
              ))}
            </select>
          )}

          {selectedIds.length > 0 && (
            <Button size="sm" onClick={() => setBulkEditOpen(true)} className="gap-1">
              <Pencil className="w-3 h-3" /> Editar tudo ({selectedIds.length})
            </Button>
          )}

          <div className="ml-auto flex gap-1">
            <Button
              size="icon"
              variant={viewMode === "list" ? "default" : "ghost"}
              className="h-9 w-9"
              onClick={() => setViewMode("list")}
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant={viewMode === "grid" ? "default" : "ghost"}
              className="h-9 w-9"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Product list */}
      {loadingProducts ? (
        <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {ageFilter || subFilter ? "Nenhum produto com esses filtros" : "Nenhum produto nesta categoria"}
          </p>
        </div>
      ) : (
        <>
          {/* LIST VIEW */}
          {viewMode === "list" && (
             <div className="bg-card rounded-xl border border-border divide-y divide-border">
              {/* Select all header */}
              <div className="flex items-center gap-3 px-3 py-2 bg-muted/30">
                <Checkbox
                  checked={selectedIds.length === filteredProducts.length && filteredProducts.length > 0}
                  onCheckedChange={toggleSelectAll}
                  className="shrink-0"
                />
                <span className="text-xs text-muted-foreground">Selecionar todos</span>
              </div>
              {paginatedProducts.map((p, idx) => {
                const globalIdx = (currentPage - 1) * ITEMS_PER_PAGE + idx;
                return (
                  <div key={p.id} className={`flex items-center gap-3 p-3 sm:p-4 ${isSelected(p.id) ? "bg-primary/5" : ""}`}>
                    <Checkbox
                      checked={isSelected(p.id)}
                      onCheckedChange={() => {}}
                      onClick={(e) => handleRowSelect(p.id, globalIdx, e.shiftKey)}
                      className="shrink-0"
                    />
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <span className="text-[10px] text-muted-foreground">Sem img</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm truncate">{p.name}</p>
                      <p className="text-[10px] font-mono text-muted-foreground">SKU: {p.sku || "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        R$ {Number(p.price).toFixed(2)} · Estoque: {p.stock}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(p.sizes ?? []).map((s) => {
                          const ageKey = extractAgeKey(s, globalAges);
                          return (
                            <span
                              key={s}
                              className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                ageFilter && ageKey === ageFilter
                                  ? "bg-primary/20 text-primary font-semibold"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {ageLabels[ageKey || ""] || s}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs px-2 py-1 rounded-full ${p.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {p.active ? "Ativo" : "Inativo"}
                      </span>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditProductId(p.id); setEditDialogOpen(true); }}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* GRID VIEW */}
          {viewMode === "grid" && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {paginatedProducts.map((p, idx) => {
                const globalIdx = (currentPage - 1) * ITEMS_PER_PAGE + idx;
                return (
                <div key={p.id} className={`bg-card rounded-xl border-2 overflow-hidden group flex flex-col ${isSelected(p.id) ? "border-primary" : "border-border"}`}>
                  <div className="relative aspect-[3/4] overflow-hidden">
                    <div className="absolute top-2 left-2 z-10">
                      <Checkbox
                        checked={isSelected(p.id)}
                        onCheckedChange={() => {}}
                        onClick={(e) => handleRowSelect(p.id, globalIdx, e.shiftKey)}
                        className="bg-background/90 backdrop-blur-sm"
                      />
                    </div>
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">Sem imagem</span>
                      </div>
                    )}
                    <span className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${p.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {p.active ? "Ativo" : "Inativo"}
                    </span>
                    <span className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm text-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
                      Est: {p.stock}
                    </span>
                    <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1">
                      {(p.sizes ?? []).map((s) => {
                        const ageKey = extractAgeKey(s, globalAges);
                        return (
                          <span
                            key={s}
                            className={`text-[10px] px-1.5 py-0.5 rounded ${
                              ageFilter && ageKey === ageFilter
                                ? "bg-primary text-primary-foreground font-bold"
                                : "bg-background/90 backdrop-blur-sm text-foreground font-bold"
                            }`}
                          >
                            {ageLabels[ageKey || ""] || s}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <div className="p-3 flex flex-col flex-1">
                    <p className="text-[10px] font-mono text-muted-foreground">SKU: {p.sku || "—"}</p>
                    <p className="font-semibold text-foreground text-sm leading-tight line-clamp-2 mt-0.5">{p.name}</p>
                    <div className="mt-auto pt-2 flex items-center justify-between">
                      <p className="text-lg font-extrabold text-foreground">
                        R$ {Number(p.price).toFixed(2).replace(".", ",")}
                      </p>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditProductId(p.id); setEditDialogOpen(true); }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 mt-4">
              <Button size="icon" variant="ghost" className="h-8 w-8" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {getPageNumbers().map(n => (
                <Button key={n} size="icon" variant={n === currentPage ? "default" : "ghost"} className="h-8 w-8 text-xs" onClick={() => setCurrentPage(n)}>
                  {n}
                </Button>
              ))}
              <Button size="icon" variant="ghost" className="h-8 w-8" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </>
      )}

      <ProductEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        productId={editProductId}
        onSaved={fetchProducts}
      />

      <BulkEditDialog
        open={bulkEditOpen}
        onOpenChange={(open) => { setBulkEditOpen(open); if (!open) setSelectedIds([]); }}
        productIds={selectedIds}
        onSaved={() => { fetchProducts(); setSelectedIds([]); }}
      />
    </div>
  );
};

export default AdminCategoryDetail;
