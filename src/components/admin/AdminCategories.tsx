import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, X, Check, ChevronRight, ChevronLeft, Settings } from "lucide-react";
import AdminCategoryDetail from "./AdminCategoryDetail";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type AgeOption = { value: string; label: string };

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parent_id: string | null;
  ages: string[];
};

const AdminCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [agesPage, setAgesPage] = useState(1);
  const AGES_PER_PAGE = 10;
  const { toast } = useToast();

  // Dialog states
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [globalAges, setGlobalAges] = useState<AgeOption[]>([]);
  const [newAgeValue, setNewAgeValue] = useState("");
  const [newAgeLabel, setNewAgeLabel] = useState("");
  const [editAgeIdx, setEditAgeIdx] = useState<number | null>(null);
  const [editAgeValue, setEditAgeValue] = useState("");
  const [editAgeLabel, setEditAgeLabel] = useState("");

  const fetchCategories = async () => {
    const { data } = await supabase.from("categories").select("*").order("name");
    if (data) setCategories(data as unknown as Category[]);
  };

  const fetchGlobalAges = async () => {
    const { data } = await supabase
      .from("site_settings")
      .select("*")
      .eq("key", "available_ages")
      .maybeSingle();
    if (data?.value) {
      setGlobalAges(data.value as unknown as AgeOption[]);
    }
  };

  const saveGlobalAges = async (ages: AgeOption[]) => {
    const { data: existing } = await supabase
      .from("site_settings")
      .select("id")
      .eq("key", "available_ages")
      .maybeSingle();

    if (existing) {
      await supabase
        .from("site_settings")
        .update({ value: ages as any })
        .eq("key", "available_ages");
    } else {
      await supabase
        .from("site_settings")
        .insert({ key: "available_ages", value: ages as any });
    }
    setGlobalAges(ages);
  };

  useEffect(() => {
    fetchCategories();
    fetchGlobalAges();
  }, []);

  const parents = categories.filter(c => !c.parent_id);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    const slug = newSlug.trim() || newName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const { error } = await supabase.from("categories").insert({ name: newName.trim(), slug } as any);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setNewName(""); setNewSlug("");
      setAddOpen(false);
      fetchCategories();
      toast({ title: "Categoria criada!" });
    }
  };

  const handleUpdate = async (id: string) => {
    const { error } = await supabase.from("categories").update({ name: editName.trim() } as any).eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setEditingId(null);
      fetchCategories();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setDeleteId(null);
      fetchCategories();
      toast({ title: "Removido" });
    }
  };

  // Age management
  const addAge = () => {
    if (!newAgeValue.trim() || !newAgeLabel.trim()) return;
    const slug = newAgeValue.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    if (globalAges.some(a => a.value === slug)) {
      toast({ title: "Erro", description: "Já existe uma idade com esse valor", variant: "destructive" });
      return;
    }
    const updated = [...globalAges, { value: slug, label: newAgeLabel.trim() }];
    saveGlobalAges(updated);
    setNewAgeValue("");
    setNewAgeLabel("");
    toast({ title: "Idade adicionada!" });
  };

  const updateAge = (idx: number) => {
    if (!editAgeLabel.trim()) return;
    const updated = globalAges.map((a, i) =>
      i === idx ? { ...a, label: editAgeLabel.trim() } : a
    );
    saveGlobalAges(updated);
    setEditAgeIdx(null);
  };

  const removeAge = (idx: number) => {
    const updated = globalAges.filter((_, i) => i !== idx);
    saveGlobalAges(updated);
    toast({ title: "Idade removida" });
  };

  // Detail view
  if (selectedId) {
    const cat = categories.find(c => c.id === selectedId);
    if (!cat) return null;
    return (
      <AdminCategoryDetail
        category={cat}
        allCategories={categories}
        globalAges={globalAges}
        onBack={() => { setSelectedId(null); fetchCategories(); }}
        onRefresh={fetchCategories}
      />
    );
  }

  // List view
  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h2 className="text-2xl font-bold text-foreground font-heading">Categorias</h2>
        <div className="flex gap-2">
          <Button onClick={() => setAddOpen(true)} size="sm" className="gap-1">
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Adicionar</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)} className="gap-1">
            <Settings className="w-4 h-4" /> <span className="hidden sm:inline">Config</span>
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border divide-y divide-border">
        {parents.map((cat) => {
          const children = categories.filter(c => c.parent_id === cat.id);
          return (
            <div key={cat.id} className="flex items-center justify-between p-4">
              {editingId === cat.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="max-w-xs" />
                  <Button size="icon" variant="ghost" onClick={() => handleUpdate(cat.id)}><Check className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}><X className="w-4 h-4" /></Button>
                </div>
              ) : (
                <>
                  <div className="min-w-0">
                    <button
                      onClick={() => setSelectedId(cat.id)}
                      className="font-semibold text-primary hover:underline cursor-pointer text-left flex items-center gap-1"
                    >
                      {cat.name}
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <p className="text-xs text-muted-foreground">
                      {cat.slug} · {children.length} subcategorias · {(cat.ages || []).length} idades
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" onClick={() => { setEditingId(cat.id); setEditName(cat.name); }}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setDeleteId(cat.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          );
        })}
        {parents.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground text-center">Nenhuma categoria</p>
        )}
      </div>

      {/* Add Category Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Categoria</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Input placeholder="Nome (ex: Meninas)" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <Input placeholder="Slug (opcional, ex: meninas)" value={newSlug} onChange={(e) => setNewSlug(e.target.value)} />
            <Button onClick={handleAdd} className="w-full gap-1">
              <Plus className="w-4 h-4" /> Criar Categoria
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog - Global Ages */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configurações — Idades Disponíveis</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Gerencie as idades que ficam disponíveis para todas as categorias.
          </p>

          {/* Add age - TOP */}
          <div className="flex flex-col sm:flex-row gap-2 mt-3">
            <div className="flex gap-2 flex-1">
              <Input placeholder="Valor (ex: baby-rn)" value={newAgeValue} onChange={(e) => setNewAgeValue(e.target.value)} className="flex-1 h-9 text-sm" />
              <Input placeholder="Label (ex: RN)" value={newAgeLabel} onChange={(e) => setNewAgeLabel(e.target.value)} className="flex-1 h-9 text-sm" />
            </div>
            <Button size="sm" onClick={() => { addAge(); setAgesPage(1); }} className="gap-1 w-full sm:w-auto">
              <Plus className="w-3 h-3" /> Adicionar
            </Button>
          </div>

          <div className="space-y-2 mt-3">
            {(() => {
              const totalAgesPages = Math.ceil(globalAges.length / AGES_PER_PAGE);
              const pagedAges = globalAges.slice((agesPage - 1) * AGES_PER_PAGE, agesPage * AGES_PER_PAGE);
              return (
                <>
                  {pagedAges.map((age) => {
                    const idx = globalAges.indexOf(age);
                    return (
                      <div key={age.value} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                        {editAgeIdx === idx ? (
                          <>
                            <Input
                              value={editAgeLabel}
                              onChange={(e) => setEditAgeLabel(e.target.value)}
                              className="h-8 text-sm flex-1"
                              placeholder="Label"
                            />
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateAge(idx)}>
                              <Check className="w-3 h-3" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditAgeIdx(null)}>
                              <X className="w-3 h-3" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium text-foreground">{age.label}</span>
                              <span className="text-xs text-muted-foreground ml-2">{age.value}</span>
                            </div>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditAgeIdx(idx); setEditAgeLabel(age.label); setEditAgeValue(age.value); }}>
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeAge(idx)}>
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    );
                  })}
                  {globalAges.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhuma idade cadastrada</p>
                  )}
                  {totalAgesPages > 1 && (
                    <div className="flex items-center justify-center gap-1 pt-2">
                      <Button size="icon" variant="ghost" className="h-7 w-7" disabled={agesPage === 1} onClick={() => setAgesPage(p => p - 1)}>
                        <ChevronLeft className="w-3 h-3" />
                      </Button>
                      {Array.from({ length: Math.min(totalAgesPages, 3) }, (_, i) => {
                        let n: number;
                        if (totalAgesPages <= 3) n = i + 1;
                        else if (agesPage <= 2) n = i + 1;
                        else if (agesPage >= totalAgesPages - 1) n = totalAgesPages - 2 + i;
                        else n = agesPage - 1 + i;
                        return (
                          <Button key={n} size="icon" variant={n === agesPage ? "default" : "ghost"} className="h-7 w-7 text-xs" onClick={() => setAgesPage(n)}>
                            {n}
                          </Button>
                        );
                      })}
                      <Button size="icon" variant="ghost" className="h-7 w-7" disabled={agesPage === totalAgesPages} onClick={() => setAgesPage(p => p + 1)}>
                        <ChevronRight className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. Todas as subcategorias também serão removidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && handleDelete(deleteId)}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminCategories;
