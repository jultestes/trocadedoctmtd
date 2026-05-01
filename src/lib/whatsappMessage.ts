// Mensagem padrão única de confirmação de pedido enviada via WhatsApp.
// Usada em todos os fluxos (checkout site, checkout WhatsApp, admin, tracking, sucesso).

export const WHATSAPP_NUMBER = "5592993339711";

export type OrderItemForMessage = {
  product_name: string;
  product_sku?: string | null;
  unit_price: number;
  quantity?: number;
};

export type OrderForMessage = {
  orderNumber: string;
  customerName?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  items: OrderItemForMessage[];
  total: number;
  paymentMethod?: string | null;
  deliveryMethod?: string | null;
};

const PAYMENT_LABEL: Record<string, string> = {
  pix: "PIX",
  cash: "Dinheiro",
  card: "Cartão",
  credit_card: "Cartão de Crédito",
  whatsapp: "A combinar",
};

const fmtBRL = (v: number) =>
  (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatPhone = (phone?: string | null) => {
  if (!phone) return "A informar";
  const d = phone.replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return phone;
};

export const buildAddressString = (parts: {
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  uf?: string | null;
  cep?: string | null;
}): string => {
  return [
    parts.street,
    parts.number ? `Nº ${parts.number}` : null,
    parts.complement,
    parts.neighborhood,
    parts.city && parts.uf ? `${parts.city}/${parts.uf}` : parts.city || parts.uf,
    parts.cep ? `CEP: ${parts.cep}` : null,
  ]
    .filter(Boolean)
    .join(", ");
};

/** Agrupa itens iguais (nome + sku + preço) somando quantidades. */
const groupItems = (items: OrderItemForMessage[]) => {
  const map = new Map<string, OrderItemForMessage & { quantity: number }>();
  for (const i of items) {
    const name = (i.product_name || "Produto").trim();
    const sku = (i.product_sku || "").trim();
    const price = Number(i.unit_price) || 0;
    const qty = Number(i.quantity) || 1;
    const key = `${name}__${sku}__${price}`;
    const existing = map.get(key);
    if (existing) existing.quantity += qty;
    else map.set(key, { product_name: name, product_sku: sku, unit_price: price, quantity: qty });
  }
  return Array.from(map.values());
};

/** Gera a mensagem padrão de confirmação de pedido. */
export const buildOrderWhatsAppMessage = (order: OrderForMessage): string => {
  const grouped = groupItems(order.items || []);
  const productsList = grouped.length
    ? grouped
        .map((i) => {
          const variant = i.product_sku ? ` (Tam: ${i.product_sku})` : "";
          return `• ${i.product_name}${variant} x${i.quantity} — ${fmtBRL((i.unit_price || 0) * (i.quantity || 1))}`;
        })
        .join("\n")
    : `• Produto x1 — ${fmtBRL(order.total)}`;

  const payment = order.paymentMethod
    ? PAYMENT_LABEL[order.paymentMethod] || order.paymentMethod
    : "A definir";

  const delivery = order.deliveryMethod || "A definir";

  return [
    `🛍️ *CONFIRMAÇÃO DE PEDIDO*`,
    ``,
    `📦 *Pedido:* ${order.orderNumber}`,
    `👤 *Cliente:* ${order.customerName?.trim() || "A informar"}`,
    `📞 *Telefone:* ${formatPhone(order.customerPhone)}`,
    `📍 *Endereço:* ${order.customerAddress?.trim() || "A combinar"}`,
    ``,
    `🛒 *Produtos:*`,
    productsList,
    ``,
    `💰 *Total:* ${fmtBRL(order.total)}`,
    `💳 *Pagamento:* ${payment}`,
    `🚚 *Entrega:* ${delivery}`,
  ].join("\n");
};

export const buildOrderWhatsAppUrl = (order: OrderForMessage, phone = WHATSAPP_NUMBER): string =>
  `https://wa.me/${phone}?text=${encodeURIComponent(buildOrderWhatsAppMessage(order))}`;
