import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { CartProvider } from "@/hooks/useCart";
import { SiteSettingsProvider } from "@/hooks/useSiteSettings";
import CartDrawer from "@/components/CartDrawer";
import MaintenanceGuard from "@/components/MaintenanceGuard";
import FloatingCartBadge from "@/components/FloatingCartBadge";
import ScrollToTop from "@/components/ScrollToTop";
import Index from "./pages/Index";

// Lazy load all non-home routes
const Auth = lazy(() => import("./pages/Auth"));
const CategoryPage = lazy(() => import("./pages/Category"));
const Admin = lazy(() => import("./pages/Admin"));
const AdminGuard = lazy(() => import("./components/AdminGuard"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Checkout = lazy(() => import("./pages/Checkout"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const OrderTracking = lazy(() => import("./pages/OrderTracking"));
const WhatsAppCheckout = lazy(() => import("./pages/WhatsAppCheckout"));

const queryClient = new QueryClient();

const Loading = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
          <SiteSettingsProvider>
            <CartProvider>
              <CartDrawer />
              <FloatingCartBadge />
              <Suspense fallback={<Loading />}>
                <Routes>
                  <Route path="/" element={<MaintenanceGuard><Index /></MaintenanceGuard>} />
                  <Route path="/categoria/:slug" element={<MaintenanceGuard><CategoryPage /></MaintenanceGuard>} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/checkout" element={<MaintenanceGuard><Checkout /></MaintenanceGuard>} />
                  <Route path="/checkout-whatsapp" element={<MaintenanceGuard><WhatsAppCheckout /></MaintenanceGuard>} />
                  <Route path="/pagamento-concluido" element={<PaymentSuccess />} />
                  <Route path="/pedido-recebido" element={<PaymentSuccess />} />
                  <Route path="/acompanhar-pedido" element={<OrderTracking />} />
                  <Route path="/admin" element={
                    <Suspense fallback={<Loading />}>
                      <AdminGuard><Admin /></AdminGuard>
                    </Suspense>
                  } />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </CartProvider>
          </SiteSettingsProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
