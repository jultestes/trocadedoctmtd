import { useState, useEffect } from "react";
import logoFallback from "@/assets/logo-tmtd.svg";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Printer, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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

const formatPhone = (phone: string | null) => {
  if (!phone) return "—";
  const d = phone.replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  return phone;
};

const LabelOptionsModal = ({ open, onOpenChange, sale, items }: Props) => {
  const [showSender, setShowSender] = useState(false);
  const [showOrderInfo, setShowOrderInfo] = useState(false);
  const [storeInfo, setStoreInfo] = useState<any>(null);
  const [logoUrl, setLogoUrl] = useState("");

  useEffect(() => {
    if (open) {
      supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["store_info", "site_logo"])
        .then(({ data }) => {
          if (data) {
            for (const row of data) {
              if (row.key === "store_info") setStoreInfo(row.value);
              if (row.key === "site_logo") setLogoUrl((row.value as any)?.url || "");
            }
          }
        });
    }
  }, [open]);

  const customerAddress = [
    sale.address_street,
    sale.address_number ? `Nº ${sale.address_number}` : null,
    sale.address_complement,
    sale.address_neighborhood,
    sale.address_city && sale.address_uf ? `${sale.address_city}/${sale.address_uf}` : null,
    sale.address_cep ? `CEP: ${sale.address_cep}` : null,
  ].filter(Boolean).join(", ");

  const handleGenerate = () => {
    const win = window.open("", "_blank", "width=800,height=600");
    if (!win) return;

    let html = "";

    // --- LOGO (always shown) ---
    const finalLogo = logoUrl || logoFallback;
    html += `<div class="logo-header"><img src="${finalLogo}" alt="Logo" /></div>`;

    // --- DESTINATÁRIO (always shown) ---
    html += `
      <div class="section">
        <div class="section-title">DESTINATÁRIO</div>
        <div class="field"><span class="label">Nome:</span> <span class="value">${sale.customer_name || "—"}</span></div>
        <div class="field"><span class="label">Telefone:</span> <span class="value">${formatPhone(sale.customer_phone)}</span></div>
        ${sale.customer_email ? `<div class="field"><span class="label">Email:</span> <span class="value">${sale.customer_email}</span></div>` : ""}
        ${sale.delivery_type === "delivery" && customerAddress
          ? `<div class="field"><span class="label">Endereço:</span> <span class="value">${customerAddress}</span></div>`
          : `<div class="field"><span class="label">Entrega:</span> <span class="value">Retirada na loja</span></div>`
        }
      </div>
    `;

    // --- INFORMAÇÕES DO PEDIDO (optional) ---
    if (showOrderInfo) {
      const itemsRows = items.map((item) => `
        <tr>
          <td>${item.product_name}</td>
          <td class="mono">${item.product_sku || "—"}</td>
          <td class="right">${fmt(Number(item.unit_price))}</td>
        </tr>
      `).join("");

      html += `
        <div class="section">
          <div class="section-title">INFORMAÇÕES DO PEDIDO</div>
          <div class="field"><span class="label">Pedido:</span> <span class="value">${sale.order_nsu || sale.id.slice(0, 8)}</span></div>
          <div class="field"><span class="label">Data:</span> <span class="value">${format(new Date(sale.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span></div>
          <div class="field"><span class="label">Cliente:</span> <span class="value">${sale.customer_name || "—"}</span></div>
          
          <table>
            <thead>
              <tr>
                <th>Produto</th>
                <th>SKU</th>
                <th class="right">Valor</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>
          
          <div class="totals">
            <div class="total-row"><span>Subtotal</span><span>${fmt(Number(sale.total_original))}</span></div>
            ${Number(sale.discount) > 0 ? `<div class="total-row"><span>Desconto</span><span class="discount">-${fmt(Number(sale.discount))}</span></div>` : ""}
            <div class="total-row"><span>Frete</span><span>${Number(sale.shipping_price) === 0 ? "Grátis" : fmt(Number(sale.shipping_price))}</span></div>
            <div class="total-row total-final"><span>Total a Pagar</span><span>${fmt(Number(sale.total_paid))}</span></div>
          </div>
        </div>
      `;
    }

    // --- REMETENTE (optional) ---
    if (showSender && storeInfo) {
      const senderAddress = [
        storeInfo.address,
        storeInfo.city,
        storeInfo.state,
      ].filter(Boolean).join(", ");

      html += `
        <div class="section sender">
          <div class="section-title">REMETENTE</div>
          <div class="field"><span class="label">Loja:</span> <span class="value">TMTD Kids</span></div>
          ${storeInfo.whatsapp ? `<div class="field"><span class="label">WhatsApp:</span> <span class="value">${storeInfo.whatsapp}</span></div>` : ""}
          ${storeInfo.email ? `<div class="field"><span class="label">Email:</span> <span class="value">${storeInfo.email}</span></div>` : ""}
          ${senderAddress ? `<div class="field"><span class="label">Endereço:</span> <span class="value">${senderAddress}</span></div>` : ""}
        </div>
      `;
    }

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Etiqueta - ${sale.order_nsu || sale.id.slice(0, 8)}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          @page { margin: 8mm; }
          body {
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            padding: 8px;
            color: #1a1a1a;
            font-size: 12px;
            max-width: 500px;
            margin: 0 auto;
          }
          .section {
            border: 1.5px solid #333;
            border-radius: 4px;
            padding: 10px;
            margin-bottom: 8px;
          }
          .logo-header {
            text-align: center;
            margin-bottom: 8px;
            padding-bottom: 6px;
            border-bottom: 1px solid #ddd;
          }
          .logo-header img {
            max-height: 44px;
            max-width: 160px;
            object-fit: contain;
          }
          .section-title {
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 1.2px;
            color: #fff;
            background: #333;
            display: inline-block;
            padding: 2px 8px;
            border-radius: 3px;
            margin-bottom: 6px;
          }
          .field {
            padding: 1.5px 0;
            font-size: 12px;
          }
          .label {
            font-weight: 600;
            color: #555;
            min-width: 70px;
            display: inline-block;
          }
          .value {
            color: #1a1a1a;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 6px;
          }
          th {
            text-align: left;
            font-size: 9px;
            text-transform: uppercase;
            color: #888;
            font-weight: 700;
            padding: 4px 0;
            border-bottom: 1px solid #ddd;
          }
          td {
            padding: 3px 0;
            border-bottom: 1px solid #f0f0f0;
            font-size: 11px;
          }
          .mono { font-family: monospace; color: #888; font-size: 10px; }
          .right { text-align: right; }
          th.right { text-align: right; }
          .totals {
            margin-top: 6px;
            border-top: 1px solid #ddd;
            padding-top: 4px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            padding: 1px 0;
            font-size: 11px;
          }
          .total-row span:first-child { color: #555; }
          .total-final {
            font-size: 13px;
            font-weight: 700;
            margin-top: 3px;
            padding-top: 3px;
            border-top: 1px solid #ddd;
          }
          .total-final span { color: #1a1a1a !important; }
          .discount { color: #e67e22; }
          .sender {
            border-style: dashed;
          }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>${html}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            Informações da etiqueta
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            A etiqueta sempre exibe os dados do destinatário. Selecione o que mais deseja incluir:
          </p>

          <div className="flex items-center space-x-3">
            <Checkbox
              id="showSender"
              checked={showSender}
              onCheckedChange={(v) => setShowSender(!!v)}
            />
            <Label htmlFor="showSender" className="text-sm font-medium cursor-pointer">
              Exibir remetente
            </Label>
          </div>
          <p className="text-xs text-muted-foreground ml-7 -mt-2">
            Inclui a localização da loja cadastrada nas configurações.
          </p>

          <div className="flex items-center space-x-3">
            <Checkbox
              id="showOrderInfo"
              checked={showOrderInfo}
              onCheckedChange={(v) => setShowOrderInfo(!!v)}
            />
            <Label htmlFor="showOrderInfo" className="text-sm font-medium cursor-pointer">
              Exibir informações do pedido
            </Label>
          </div>
          <p className="text-xs text-muted-foreground ml-7 -mt-2">
            Produtos com SKU, valores unitários, frete e total a pagar.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button className="gap-2" onClick={handleGenerate}>
            <Printer className="w-4 h-4" /> Gerar Etiqueta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LabelOptionsModal;
