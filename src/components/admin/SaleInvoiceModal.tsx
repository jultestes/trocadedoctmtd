import { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type Sale = {
  id: string;
  order_nsu: string | null;
  delivery_type: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  address_street: string | null;
  address_neighborhood: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_city: string | null;
  address_uf: string | null;
  address_cep: string | null;
  shipping_price: number;
  total_original: number;
  discount: number;
  total_paid: number;
  status: string;
  payment_method: string;
  change_for: number | null;
  created_at: string;
};

type SaleItem = {
  id: string;
  product_name: string;
  product_sku: string | null;
  unit_price: number;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: Sale;
  items: SaleItem[];
}

const fmt = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

const paymentLabel: Record<string, string> = {
  pix: "PIX",
  cash: "Dinheiro",
  card: "Cartão",
  credit_card: "Cartão de Crédito",
  whatsapp: "WhatsApp",
};

const formatPhone = (phone: string | null) => {
  if (!phone) return "—";
  const d = phone.replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  return phone;
};

const SaleInvoiceModal = ({ open, onOpenChange, sale, items }: Props) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!printRef.current) return;
    const content = printRef.current.innerHTML;
    const win = window.open("", "_blank", "width=800,height=600");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Nota - ${sale.order_nsu || sale.id.slice(0, 8)}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 32px; color: #1a1a1a; font-size: 13px; }
          .invoice-header { text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #e5e5e5; }
          .invoice-header h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
          .invoice-header p { color: #666; font-size: 12px; }
          .section { margin-bottom: 16px; }
          .section-title { font-size: 11px; text-transform: uppercase; font-weight: 700; color: #888; letter-spacing: 0.5px; margin-bottom: 6px; }
          .row { display: flex; justify-content: space-between; padding: 3px 0; }
          .row span:first-child { color: #555; }
          .row span:last-child { font-weight: 500; }
          table { width: 100%; border-collapse: collapse; margin-top: 6px; }
          th { text-align: left; font-size: 11px; text-transform: uppercase; color: #888; font-weight: 600; padding: 6px 0; border-bottom: 1px solid #e5e5e5; }
          td { padding: 6px 0; border-bottom: 1px solid #f0f0f0; }
          td:last-child { text-align: right; font-weight: 500; }
          th:last-child { text-align: right; }
          .totals { border-top: 2px solid #e5e5e5; padding-top: 12px; margin-top: 12px; }
          .total-final { font-size: 16px; font-weight: 700; }
          .footer { margin-top: 32px; text-align: center; color: #aaa; font-size: 11px; border-top: 1px solid #e5e5e5; padding-top: 12px; }
          @media print { body { padding: 16px; } }
        </style>
      </head>
      <body>${content}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 400);
  };

  const address = [
    sale.address_street,
    sale.address_number ? `Nº ${sale.address_number}` : null,
    sale.address_complement,
    sale.address_neighborhood,
    sale.address_city && sale.address_uf ? `${sale.address_city}/${sale.address_uf}` : null,
    sale.address_cep ? `CEP: ${sale.address_cep}` : null,
  ].filter(Boolean).join(", ");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2">
            <span>Nota do Pedido</span>
            <Button size="sm" variant="outline" className="gap-2" onClick={handlePrint}>
              <Printer className="w-4 h-4" /> Imprimir / Salvar PDF
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div ref={printRef}>
          {/* Header */}
          <div className="invoice-header" style={{ textAlign: "center", marginBottom: 20, paddingBottom: 12, borderBottom: "2px solid #e5e5e5" }}>
            <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>TMTD Kids</h1>
            <p style={{ color: "#666", fontSize: 12 }}>
              Pedido {sale.order_nsu || sale.id.slice(0, 8)} — {format(new Date(sale.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>

          {/* Customer */}
          <div className="section" style={{ marginBottom: 14 }}>
            <div className="section-title" style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 700, color: "#888", letterSpacing: 0.5, marginBottom: 6 }}>
              Dados do Cliente
            </div>
            <div style={{ fontSize: 13 }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                <span style={{ color: "#555" }}>Nome</span>
                <span style={{ fontWeight: 500 }}>{sale.customer_name || "—"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                <span style={{ color: "#555" }}>Telefone</span>
                <span style={{ fontWeight: 500 }}>{formatPhone(sale.customer_phone)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                <span style={{ color: "#555" }}>Email</span>
                <span style={{ fontWeight: 500 }}>{sale.customer_email || "—"}</span>
              </div>
            </div>
          </div>

          {/* Delivery */}
          <div className="section" style={{ marginBottom: 14 }}>
            <div className="section-title" style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 700, color: "#888", letterSpacing: 0.5, marginBottom: 6 }}>
              {sale.delivery_type === "pickup" ? "Retirada na Loja" : "Endereço de Entrega"}
            </div>
            {sale.delivery_type !== "pickup" && address ? (
              <p style={{ fontSize: 13 }}>{address}</p>
            ) : (
              <p style={{ fontSize: 13, color: "#666" }}>Retirada na loja</p>
            )}
          </div>

          {/* Items */}
          <div className="section" style={{ marginBottom: 14 }}>
            <div className="section-title" style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 700, color: "#888", letterSpacing: 0.5, marginBottom: 6 }}>
              Itens do Pedido
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", fontSize: 11, textTransform: "uppercase", color: "#888", fontWeight: 600, padding: "6px 0", borderBottom: "1px solid #e5e5e5" }}>Produto</th>
                  <th style={{ textAlign: "left", fontSize: 11, textTransform: "uppercase", color: "#888", fontWeight: 600, padding: "6px 0", borderBottom: "1px solid #e5e5e5" }}>SKU</th>
                  <th style={{ textAlign: "right", fontSize: 11, textTransform: "uppercase", color: "#888", fontWeight: 600, padding: "6px 0", borderBottom: "1px solid #e5e5e5" }}>Valor</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td style={{ padding: "6px 0", borderBottom: "1px solid #f0f0f0" }}>{item.product_name}</td>
                    <td style={{ padding: "6px 0", borderBottom: "1px solid #f0f0f0", fontFamily: "monospace", fontSize: 12, color: "#888" }}>{item.product_sku || "—"}</td>
                    <td style={{ padding: "6px 0", borderBottom: "1px solid #f0f0f0", textAlign: "right", fontWeight: 500 }}>{fmt(Number(item.unit_price))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div style={{ borderTop: "2px solid #e5e5e5", paddingTop: 12, marginTop: 12, fontSize: 13 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
              <span style={{ color: "#555" }}>Subtotal</span>
              <span>{fmt(Number(sale.total_original))}</span>
            </div>
            {Number(sale.discount) > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                <span style={{ color: "#555" }}>Desconto</span>
                <span style={{ color: "#e67e22" }}>-{fmt(Number(sale.discount))}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
              <span style={{ color: "#555" }}>Frete</span>
              <span>{Number(sale.shipping_price) === 0 ? "Grátis" : fmt(Number(sale.shipping_price))}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 16, fontWeight: 700, marginTop: 4 }}>
              <span>Total</span>
              <span>{fmt(Number(sale.total_paid))}</span>
            </div>
          </div>

          {/* Payment */}
          <div style={{ marginTop: 12, fontSize: 13 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
              <span style={{ color: "#555" }}>Forma de Pagamento</span>
              <span style={{ fontWeight: 500 }}>{paymentLabel[sale.payment_method] || sale.payment_method}</span>
            </div>
            {sale.payment_method === "cash" && sale.change_for && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                <span style={{ color: "#555" }}>Troco para</span>
                <span>{fmt(Number(sale.change_for))}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="footer" style={{ marginTop: 24, textAlign: "center", color: "#aaa", fontSize: 11, borderTop: "1px solid #e5e5e5", paddingTop: 10 }}>
            Documento gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} — TMTD Kids
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SaleInvoiceModal;
