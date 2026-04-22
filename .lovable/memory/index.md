# Memory: index.md
Updated: now

# Project Memory

## Core
SPA deployed on Vercel with vercel.json rewrites.
Vite preload error auto-recovery in App.tsx (reloads page once per session via sessionStorage).
Supabase images use `OptimizedImage`; Cloudflare R2 images use standard `<img>`.
Fixed aspect-ratio for product cards/banners to prevent CLS. Eager load top 4 images, lazy load rest.
No public user registration. Auth is admin-only via email/password.
Cart state in localStorage `tmtd_cart`. Age labels always full text "X ano(s)" (e.g. "1 ano").
Sales metrics/Caixa only include status >= 'paid'. Deleting sales restores stock automatically.
Only 1 coupon per order; selecting another in cart replaces the previous one.

## Memories
- [Cart Coupon Picker](mem://features/cart-coupon-picker) — Visual coupon selection in cart, admin show_in_cart/order/title
- [Fluxo de Caixa Integração](mem://logic/fluxo-caixa-integracao) — Sales revenue as Entry, actual delivery cost as Exit
- [Caixa UI Style](mem://style/admin-caixa) — Admin Caixa visual guidelines and color coding
- [Sale Status Criteria](mem://logic/venda-status-criterio) — Only 'paid'+ sales integrate into metrics/caixa
- [Vercel SPA Routing](mem://infrastructure/vercel-spa-routing) — vercel.json SPA rewrites config
- [Catalog Optimization](mem://performance/otimizacao-catalogo) — Server-side filtering, partial columns, eager/lazy loading limits
- [Image Optimization](mem://performance/otimizacao-imagens) — Supabase storage compression, dynamic resizing, OptimizedImage component
- [Caixa Closure Constraint](mem://logic/caixa-fechamento-restricao) — Caixa closure is UI-only, DB missing 'closed_at'
- [Code Splitting](mem://performance/code-splitting) — React.lazy and Suspense for secondary pages
- [R2 Image Handling](mem://performance/gerenciamento-imagens-r2) — Cloudflare R2 uses standard img tags, main image only
- [PWA Assets](mem://performance/ativos-pwa) — PWA icons kept under 20KB
- [Layout Stability](mem://performance/layout-estabilidade) — Fixed aspect-ratio for containers to avoid CLS
- [Admin Bulk Edit](mem://features/admin-bulk-edit) — Bulk update product price, stock, status, metadata
- [Mobile Product Selection](mem://features/mobile-product-selection) — Bottom sheet flow for mobile product selection
- [Cart Checkout Flow](mem://features/cart-checkout-flow) — Single finalize button leading to Site or WhatsApp options
- [Cart Persistence](mem://features/cart-persistence) — LocalStorage 'tmtd_cart'
- [Cart UI Constraints](mem://style/cart-ui-constraints) — Badge logic and hiding during bottom sheet
- [Stock Restore on Delete](mem://logic/estoque-restauracao-venda) — Deleting sale restores stock and sets product active
- [Age Labels Style](mem://style/rotulos-idade-extenso) — Full text format "X ano(s)"
- [Admin Only Access](mem://auth/admin-only-access) — No public registration, admin email/pass only
- [Sale Deletion Confirmation](mem://features/admin-vendas-confirmacao-exclusao) — Delete dialog with stock restore preview
- [Deploy Cache Recovery](mem://infrastructure/recuperacao-cache-deploy) — Vite preload error reload handler in App.tsx
- [Facebook Pixel](mem://marketing/facebook-pixel-tracking) — FB Pixel tracking logic for views, checkout, and purchase
- [Admin Freight Search](mem://features/admin-frete-search) — Accent-insensitive search for neighborhoods
