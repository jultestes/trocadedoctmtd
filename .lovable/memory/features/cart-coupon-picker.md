---
name: Cart Coupon Picker
description: Visual coupon picker in cart drawer; one coupon per order; admin controls show_in_cart, display_order, display_title
type: feature
---
Cupons agora podem ser selecionados visualmente no carrinho (CouponPicker) em vez de digitar código.
- Apenas 1 cupom por pedido — selecionar outro substitui o anterior automaticamente.
- Cupons com `active=true` AND `show_in_cart=true` aparecem no carrinho, ordenados por `display_order`.
- Se o cliente não atingir `min_quantity`, o card mostra "Adicione mais X produtos para ativar" e fica em estilo desabilitado (border-dashed, ícone de cadeado).
- Links com `?cupom=...` continuam funcionando para campanhas (preservado em useCoupon).
- Admin (AdminCoupons) configura: `display_title`, `display_order`, `show_in_cart` (Switch).
- RLS: política pública permite SELECT em coupons quando `active=true AND show_in_cart=true`.
