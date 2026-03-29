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
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import CategoryPage from "./pages/Category.tsx";
import Admin from "./pages/Admin.tsx";
import AdminGuard from "./components/AdminGuard.tsx";
import NotFound from "./pages/NotFound.tsx";
import Checkout from "./pages/Checkout.tsx";
import PaymentSuccess from "./pages/PaymentSuccess.tsx";
import OrderTracking from "./pages/OrderTracking.tsx";
import WhatsAppCheckout from "./pages/WhatsAppCheckout.tsx";

const queryClient = new QueryClient();

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
              <Routes>
                <Route path="/" element={<MaintenanceGuard><Index /></MaintenanceGuard>} />
                <Route path="/categoria/:slug" element={<MaintenanceGuard><CategoryPage /></MaintenanceGuard>} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/checkout" element={<MaintenanceGuard><Checkout /></MaintenanceGuard>} />
                <Route path="/checkout-whatsapp" element={<MaintenanceGuard><WhatsAppCheckout /></MaintenanceGuard>} />
                <Route path="/pagamento-concluido" element={<PaymentSuccess />} />
                <Route path="/pedido-recebido" element={<PaymentSuccess />} />
                <Route path="/acompanhar-pedido" element={<OrderTracking />} />
                <Route path="/admin" element={<AdminGuard><Admin /></AdminGuard>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </CartProvider>
          </SiteSettingsProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
