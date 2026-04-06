import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trash2, Plus, MapPin, Pencil, ChevronLeft, ChevronRight, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const ITEMS_PER_PAGE = 15;

const AdminFrete = () => {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: neighborhoods = [], isLoading } = useQuery({
    queryKey: ["shipping_neighborhoods"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipping_neighborhoods")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const trimmed = name.trim();
      if (!trimmed || trimmed.length > 100) throw new Error("Nome inválido");
      const numPrice = parseFloat(price);
      if (isNaN(numPrice) || numPrice < 0) throw new Error("Valor inválido");
      const { error } = await supabase
        .from("shipping_neighborhoods")
        .insert({ name: trimmed, price: numPrice });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipping_neighborhoods"] });
      setName("");
      setPrice("");
      setOpen(false);
      toast.success("Bairro adicionado!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editId) throw new Error("ID inválido");
      const trimmed = editName.trim();
      if (!trimmed || trimmed.length > 100) throw new Error("Nome inválido");
      const numPrice = parseFloat(editPrice);
      if (isNaN(numPrice) || numPrice < 0) throw new Error("Valor inválido");
      const { error } = await supabase
        .from("shipping_neighborhoods")
        .update({ name: trimmed, price: numPrice })
        .eq("id", editId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipping_neighborhoods"] });
      setEditOpen(false);
      toast.success("Bairro atualizado!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("shipping_neighborhoods")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipping_neighborhoods"] });
      toast.success("Bairro removido!");
    },
    onError: () => toast.error("Erro ao remover bairro"),
  });

  const openEdit = (n: { id: string; name: string; price: number }) => {
    setEditId(n.id);
    setEditName(n.name);
    setEditPrice(String(n.price));
    setEditOpen(true);
  };

  const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const filtered = neighborhoods.filter((n) =>
    normalize(n.name).includes(normalize(search))
  );
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedNeighborhoods = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const getPageNumbers = () => {
    const pages: number[] = [];
    let start = Math.max(1, page - 1);
    let end = Math.min(totalPages, start + 2);
    if (end - start < 2) start = Math.max(1, end - 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-foreground font-heading">Frete por Bairro</h2>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setName(""); setPrice(""); } }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Novo Bairro</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Bairro</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); addMutation.mutate(); }} className="space-y-4 mt-2">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Nome do Bairro</label>
                <Input placeholder="Ex: Centro" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Valor do Frete (R$)</label>
                <Input type="number" step="0.01" min="0" placeholder="0,00" value={price} onChange={(e) => setPrice(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={addMutation.isPending}>Adicionar</Button>
            </form>
          </DialogContent>
      </Dialog>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar bairro..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="pl-9"
        />
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Bairro</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(); }} className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Nome do Bairro</label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={100} required />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Valor do Frete (R$)</label>
              <Input type="number" step="0.01" min="0" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={updateMutation.isPending}>Salvar</Button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <p className="p-6 text-center text-muted-foreground">Carregando...</p>
        ) : neighborhoods.length === 0 ? (
          <p className="p-6 text-center text-muted-foreground">Nenhum bairro cadastrado.</p>
        ) : (
          <>
            {/* Desktop table */}
            <table className="w-full text-sm hidden sm:table">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Bairro</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Valor</th>
                  <th className="w-24 p-3" />
                </tr>
              </thead>
              <tbody>
                {paginatedNeighborhoods.map((n) => (
                  <tr key={n.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="p-3 flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                      {n.name}
                    </td>
                    <td className="p-3 text-right font-medium">
                      R$ {Number(n.price).toFixed(2)}
                    </td>
                    <td className="p-3 text-center flex gap-1 justify-center">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(n)}>
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover bairro?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja remover "{n.name}"? Essa ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteMutation.mutate(n.id)}>Remover</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-border">
              {paginatedNeighborhoods.map((n) => (
                <div key={n.id} className="flex items-center justify-between p-3 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm text-foreground truncate">{n.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-medium text-foreground">R$ {Number(n.price).toFixed(2)}</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(n)}>
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover bairro?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja remover "{n.name}"? Essa ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMutation.mutate(n.id)}>Remover</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="h-4 w-4" /> Anterior
          </Button>
          {getPageNumbers().map((p) => (
            <Button key={p} variant={p === page ? "default" : "outline"} size="sm" onClick={() => setPage(p)}>
              {p}
            </Button>
          ))}
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
            Próximo <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default AdminFrete;
