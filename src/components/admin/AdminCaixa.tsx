import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  Lock,
  Loader2,
  CreditCard,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRangeFilter, computeRange, type PeriodPreset } from "./DateRangeFilter";
import type { DateRange } from "react-day-picker";

interface CashRegister {
  id: string;
  opened_at: string;
  initial_amount: number;
  register_date: string;
}

interface CashWithdrawal {
  id: string;
  cash_register_id: string;
  amount: number;
  description: string;
  created_at: string;
}

interface CashDeposit {
  id: string;
  cash_register_id: string;
  amount: number;
  description: string;
  created_at: string;
}

interface CashSale {
  id: string;
  total_paid: number;
  customer_name: string | null;
  created_at: string;
  order_nsu: string | null;
  payment_method: string;
  actual_delivery_cost: number | null;
  shipping_price: number;
}

const AdminCaixa = () => {
  const { toast } = useToast();
  const today = format(new Date(), "yyyy-MM-dd");

  const [register, setRegister] = useState<CashRegister | null>(null);
  const [withdrawals, setWithdrawals] = useState<CashWithdrawal[]>([]);
  const [deposits, setDeposits] = useState<CashDeposit[]>([]);
  const [cashSales, setCashSales] = useState<CashSale[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [initialAmount, setInitialAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Dialog states
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [showDepositDialog, setShowDepositDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawDesc, setWithdrawDesc] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [depositDesc, setDepositDesc] = useState("");

  // Period & payment filters (for movements list)
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("today");
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined);
  const [paymentFilter, setPaymentFilter] = useState<string>("all");

  const loadData = useCallback(async () => {
    setLoading(true);

    const { data: reg } = await supabase
      .from("cash_registers")
      .select("*")
      .eq("register_date", today)
      .maybeSingle();

    setRegister(reg);

    // Withdrawals/deposits são do caixa do dia (sempre)
    if (reg) {
      const [{ data: wds }, { data: deps }] = await Promise.all([
        supabase
          .from("cash_withdrawals")
          .select("*")
          .eq("cash_register_id", reg.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("cash_deposits")
          .select("*")
          .eq("cash_register_id", reg.id)
          .order("created_at", { ascending: false }),
      ]);
      setWithdrawals(wds || []);
      setDeposits(deps || []);
    } else {
      setWithdrawals([]);
      setDeposits([]);
    }

    // Vendas seguem o filtro de período
    const range = computeRange(periodPreset, customRange ? { from: customRange.from, to: customRange.to } : undefined);
    const { data: sales } = await supabase
      .from("sales")
      .select("id, total_paid, customer_name, created_at, order_nsu, payment_method, actual_delivery_cost, shipping_price")
      .in("status", ["paid", "completed", "separating", "delivering", "ready_pickup"])
      .gte("created_at", range.from.toISOString())
      .lte("created_at", range.to.toISOString())
      .order("created_at", { ascending: false });
    setCashSales(sales || []);

    setLoading(false);
  }, [today, periodPreset, customRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenRegister = async () => {
    const amount = parseFloat(initialAmount.replace(",", "."));
    if (isNaN(amount) || amount < 0) {
      toast({ title: "Valor inválido", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("cash_registers").insert({
      initial_amount: amount,
      register_date: today,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Erro ao abrir caixa", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Caixa aberto com sucesso!" });
    setInitialAmount("");
    loadData();
  };

  const handleAddWithdrawal = async () => {
    if (!register) return;
    const amount = parseFloat(withdrawAmount.replace(",", "."));
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Valor inválido", variant: "destructive" });
      return;
    }
    if (!withdrawDesc.trim()) {
      toast({ title: "Informe o motivo da sangria", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("cash_withdrawals").insert({
      cash_register_id: register.id,
      amount,
      description: withdrawDesc.trim(),
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Erro ao registrar sangria", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Sangria registrada!" });
    setWithdrawAmount("");
    setWithdrawDesc("");
    setShowWithdrawDialog(false);
    loadData();
  };

  const handleAddDeposit = async () => {
    if (!register) return;
    const amount = parseFloat(depositAmount.replace(",", "."));
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Valor inválido", variant: "destructive" });
      return;
    }
    if (!depositDesc.trim()) {
      toast({ title: "Informe o motivo da entrada", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("cash_deposits").insert({
      cash_register_id: register.id,
      amount,
      description: depositDesc.trim(),
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Erro ao registrar entrada", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Entrada registrada!" });
    setDepositAmount("");
    setDepositDesc("");
    setShowDepositDialog(false);
    loadData();
  };

  const totalVendas = cashSales.reduce((s, sale) => s + Number(sale.total_paid), 0);
  const totalDepositos = deposits.reduce((s, d) => s + Number(d.amount), 0);
  const totalEntradas = totalVendas + totalDepositos;
  const totalCustosEntrega = cashSales.reduce((s, sale) => s + Number(sale.actual_delivery_cost || 0), 0);
  const totalSaidas = withdrawals.reduce((s, w) => s + Number(w.amount), 0) + totalCustosEntrega;
  const saldoInicial = register ? Number(register.initial_amount) : 0;
  const saldoAtual = saldoInicial + totalEntradas - totalSaidas;

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // Normaliza método para uma das categorias do filtro
  const normalizePayment = (method: string): "pix" | "credit" | "debit" | "cash" | "other" => {
    const m = (method || "").toLowerCase();
    if (m === "pix") return "pix";
    if (m === "cash" || m === "dinheiro") return "cash";
    if (m === "credit" || m === "credit_card" || m === "cartao_credito" || m === "cartão_crédito") return "credit";
    if (m === "debit" || m === "debit_card" || m === "cartao_debito") return "debit";
    return "other";
  };

  const paymentLabel = (method: string) => {
    switch (normalizePayment(method)) {
      case "cash": return "Dinheiro";
      case "pix": return "PIX";
      case "credit": return "Cartão de Crédito";
      case "debit": return "Cartão de Débito";
      default: return "Outros";
    }
  };

  // Vendas filtradas pela forma de pagamento
  const filteredSales = useMemo(() => {
    if (paymentFilter === "all") return cashSales;
    return cashSales.filter((s) => normalizePayment(s.payment_method) === paymentFilter);
  }, [cashSales, paymentFilter]);

  const totalFiltered = filteredSales.reduce((s, sale) => s + Number(sale.total_paid), 0);

  // Merge all movements (apenas vendas filtradas + manuais do dia)
  const movements = [
    ...filteredSales.map((s) => ({
      type: "entrada" as const,
      value: Number(s.total_paid),
      description: `${s.customer_name || s.order_nsu || "Venda"} (${paymentLabel(s.payment_method)})`,
      time: s.created_at,
    })),
    ...filteredSales
      .filter((s) => s.actual_delivery_cost && Number(s.actual_delivery_cost) > 0)
      .map((s) => ({
        type: "saida" as const,
        value: Number(s.actual_delivery_cost),
        description: `Frete - ${s.customer_name || s.order_nsu || "Pedido"}`,
        time: s.created_at,
      })),
    ...(paymentFilter === "all" ? deposits.map((d) => ({
      type: "entrada" as const,
      value: Number(d.amount),
      description: d.description || "Entrada manual",
      time: d.created_at,
    })) : []),
    ...(paymentFilter === "all" ? withdrawals.map((w) => ({
      type: "saida" as const,
      value: Number(w.amount),
      description: w.description,
      time: w.created_at,
    })) : []),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!register) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold">Controle de Caixa</h2>
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <Lock className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
            <CardTitle className="text-lg">Abrir Caixa do Dia</CardTitle>
            <p className="text-sm text-muted-foreground">
              {format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Valor Inicial (R$)</label>
              <Input
                placeholder="0,00"
                value={initialAmount}
                onChange={(e) => setInitialAmount(e.target.value)}
                inputMode="decimal"
              />
            </div>
            <Button onClick={handleOpenRegister} disabled={submitting} className="w-full">
              <DollarSign className="w-4 h-4 mr-2" /> Abrir Caixa
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h2 className="text-xl sm:text-2xl font-bold">Controle de Caixa</h2>
        <div className="flex items-center gap-2 text-sm text-muted-foreground border border-border rounded-lg px-3 py-1.5">
          <Wallet className="w-4 h-4" />
          {format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </div>
      </div>

      {/* Status + Action Buttons row */}
      <div className="flex flex-wrap items-center gap-3">
        {isClosed ? (
          <Badge className="bg-muted text-muted-foreground border border-border gap-1.5 px-3 py-1.5 text-xs font-semibold">
            <Lock className="w-3.5 h-3.5" /> Caixa Fechado
          </Badge>
        ) : (
          <Badge className="bg-green-700 text-white gap-1.5 px-3 py-1.5 text-xs font-semibold hover:bg-green-700">
            <Lock className="w-3.5 h-3.5" /> Caixa Aberto
          </Badge>
        )}
        <span className="text-sm text-muted-foreground">
          Aberto às {format(new Date(register.opened_at), "HH:mm")} — {format(new Date(), "dd/MM/yyyy")}
        </span>

        {!isClosed && (
          <div className="flex items-center gap-2 ml-auto">
            <Button
              onClick={() => setShowDepositDialog(true)}
              variant="outline"
              className="gap-2 border-green-600 text-green-700 hover:bg-green-50"
            >
              <ArrowUpCircle className="w-4 h-4" /> Registrar Entrada
            </Button>
            <Button
              onClick={() => setShowWithdrawDialog(true)}
              variant="outline"
              className="gap-2 border-destructive text-destructive hover:bg-destructive/5"
            >
              <ArrowDownCircle className="w-4 h-4" /> Registrar Sangria
            </Button>
            <Button
              onClick={() => setShowCloseDialog(true)}
              className="gap-2 bg-red-700 hover:bg-red-800 text-white"
            >
              <Lock className="w-4 h-4" /> Fechar Caixa
            </Button>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground truncate">Saldo Inicial</span>
            </div>
            <p className="text-base sm:text-xl font-bold break-all">{fmt(saldoInicial)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-green-600 shrink-0" />
              <span className="text-xs text-muted-foreground truncate">Entradas</span>
            </div>
            <p className="text-base sm:text-xl font-bold text-green-600 break-all">{fmt(totalEntradas)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="w-4 h-4 text-destructive shrink-0" />
              <span className="text-xs text-muted-foreground truncate">Saídas</span>
            </div>
            <p className="text-base sm:text-xl font-bold text-destructive break-all">{fmt(totalSaidas)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-primary shrink-0" />
              <span className="text-xs text-muted-foreground truncate">Saldo Atual</span>
            </div>
            <p className={`text-base sm:text-xl font-bold break-all ${saldoAtual < 0 ? "text-destructive" : "text-primary"}`}>
              {fmt(saldoAtual)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Deposit Dialog */}
      <Dialog open={showDepositDialog} onOpenChange={setShowDepositDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpCircle className="w-5 h-5 text-green-600" />
              Registrar Entrada
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Valor (R$)</label>
              <Input
                placeholder="0,00"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                inputMode="decimal"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Motivo / Descrição</label>
              <Input
                placeholder="Ex: Troco recebido, depósito..."
                value={depositDesc}
                onChange={(e) => setDepositDesc(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDepositDialog(false)}>Cancelar</Button>
            <Button
              onClick={handleAddDeposit}
              disabled={submitting}
              className="bg-green-600 hover:bg-green-700 text-white gap-1"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Confirmar Entrada
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Withdraw Dialog */}
      <Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowDownCircle className="w-5 h-5 text-destructive" />
              Registrar Sangria
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Valor (R$)</label>
              <Input
                placeholder="0,00"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                inputMode="decimal"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Motivo / Descrição</label>
              <Input
                placeholder="Ex: Pagamento de fornecedor..."
                value={withdrawDesc}
                onChange={(e) => setWithdrawDesc(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWithdrawDialog(false)}>Cancelar</Button>
            <Button
              onClick={handleAddWithdrawal}
              disabled={submitting}
              variant="destructive"
              className="gap-1"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Confirmar Sangria
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Register Dialog */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              Fechar Caixa
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">Resumo do caixa de hoje:</p>
            <div className="space-y-2 rounded-lg border border-border p-3 bg-muted/30">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Saldo Inicial</span>
                <span className="font-medium">{fmt(saldoInicial)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Vendas em Dinheiro</span>
                <span className="font-medium text-green-600">+{fmt(totalVendas)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Entradas Manuais</span>
                <span className="font-medium text-green-600">+{fmt(totalDepositos)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sangrias</span>
                <span className="font-medium text-destructive">-{fmt(totalSaidas)}</span>
              </div>
              <div className="border-t border-border pt-2 mt-2 flex justify-between text-sm font-bold">
                <span>Saldo Final</span>
                <span className={saldoAtual < 0 ? "text-destructive" : "text-primary"}>{fmt(saldoAtual)}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Após fechar, não será possível registrar novas movimentações hoje.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloseDialog(false)}>Cancelar</Button>
            <Button
              onClick={() => {
                setIsClosed(true);
                setShowCloseDialog(false);
                toast({ title: "Caixa fechado com sucesso!" });
              }}
              className="gap-1"
            >
              <Lock className="w-4 h-4" /> Confirmar Fechamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Movements Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg">Movimentações do Dia</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {movements.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma movimentação registrada hoje.
            </p>
          ) : (
            <div className="divide-y">
              {movements.map((m, i) => (
                <div key={i} className="flex items-center gap-3 px-4 sm:px-2 py-3">
                  {m.type === "entrada" ? (
                    <ArrowUpCircle className="w-5 h-5 text-green-600 shrink-0" />
                  ) : (
                    <ArrowDownCircle className="w-5 h-5 text-destructive shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{m.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(m.time), "HH:mm")}
                    </p>
                  </div>
                  <Badge variant={m.type === "entrada" ? "default" : "destructive"} className="shrink-0 text-xs">
                    {m.type === "entrada" ? "+" : "-"} {fmt(m.value)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCaixa;
