import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, X, Ticket } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Coupon = {
  id: string;
  name: string;
  description: string | null;
  coupon_type: string;
  min_quantity: number;
  bundle_price: number;
  active: boolean;
  created_at: string;
};

const AdminCoupons = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [minQuantity, setMinQuantity] = useState(3);
  const [bundlePrice, setBundlePrice] = useState(100);

  const fetchCoupons = async () => {
    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setCoupons(data);
    setLoading(false);
  };

  useEffect(() => { fetchCoupons(); }, []);

  const resetForm = () => {
    setName("");
    setDescription("");
    setMinQuantity(3);
    setBundlePrice(100);
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (c: Coupon) => {
    setName(c.name);
    setDescription(c.description || "");
    setMinQuantity(c.min_quantity);
    setBundlePrice(c.bundle_price);
    setEditingId(c.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      coupon_type: "bundle_price",
      min_quantity: minQuantity,
      bundle_price: bundlePrice,
    };

    if (editingId) {
      const { error } = await supabase.from("coupons").update(payload).eq("id", editingId);
      if (error) {
        toast({ title: "Erro ao atualizar cupom", variant: "destructive" });
        return;
      }
      toast({ title: "Cupom atualizado!" });
    } else {
      const { error } = await supabase.from("coupons").insert(payload);
      if (error) {
        toast({ title: "Erro ao criar cupom", variant: "destructive" });
        return;
      }
      toast({ title: "Cupom criado!" });
    }

    resetForm();
    fetchCoupons();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("coupons").delete().eq("id", id);
    if (!error) {
      toast({ title: "Cupom excluído!" });
      fetchCoupons();
    }
    setDeleteId(null);
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("coupons").update({ active: !active }).eq("id", id);
    fetchCoupons();
  };

  if (loading) return <p className="text-muted-foreground">Carregando cupons...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold font-heading text-foreground">Cupons</h2>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Novo Cupom
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-card border border-border rounded-xl p-6 mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">
              {editingId ? "Editar Cupom" : "Novo Cupom"}
            </h3>
            <Button variant="ghost" size="icon" onClick={resetForm}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Nome do Cupom</label>
              <Input
                placeholder="Ex: Combo Família"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Descrição</label>
              <Input
                placeholder="Ex: 3 produtos por R$ 100,00"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Qtd. mínima de produtos</label>
              <Input
                type="number"
                min={1}
                value={minQuantity}
                onChange={(e) => setMinQuantity(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Preço do combo (R$)</label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={bundlePrice}
                onChange={(e) => setBundlePrice(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={resetForm}>Cancelar</Button>
            <Button onClick={handleSave}>{editingId ? "Salvar" : "Criar"}</Button>
          </div>
        </div>
      )}

      {/* List */}
      {coupons.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Ticket className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>Nenhum cupom cadastrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {coupons.map((c) => (
            <div
              key={c.id}
              className={`bg-card border border-border rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                !c.active ? "opacity-60" : ""
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-foreground">{c.name}</span>
                  {!c.active && (
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
                      Inativo
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {c.min_quantity} produto(s) por R$ {Number(c.bundle_price).toFixed(2).replace(".", ",")}
                </p>
                {c.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={c.active}
                  onCheckedChange={() => toggleActive(c.id, c.active)}
                />
                <Button variant="ghost" size="icon" onClick={() => handleEdit(c)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setDeleteId(c.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cupom</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este cupom? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminCoupons;
