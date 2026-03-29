import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut, Package, Tag, BarChart3, Ticket, Settings, Truck, ShoppingBag, MoreHorizontal, LayoutDashboard, PanelLeftClose, PanelLeft, Landmark } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AdminProducts from "@/components/admin/AdminProducts";
import AdminCategories from "@/components/admin/AdminCategories";
import AdminOverview from "@/components/admin/AdminOverview";
import AdminCoupons from "@/components/admin/AdminCoupons";
import AdminSettings from "@/components/admin/AdminSettings";
import AdminFrete from "@/components/admin/AdminFrete";
import AdminCaixa from "@/components/admin/AdminCaixa";

import AdminSales from "@/components/admin/AdminSales";
import AdminLayout from "@/components/admin/AdminLayout";

import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type Tab = "overview" | "products" | "categories" | "coupons" | "sales" | "caixa" | "frete" | "layout" | "settings";

const Admin = () => {
  const { user, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const [moreOpen, setMoreOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { toast } = useToast();
  const lastSaleCountRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio("/sounds/sale-notification.mp3");
  }, []);

  const checkNewSales = useCallback(async () => {
    const { count, error } = await supabase
      .from("sales")
      .select("*", { count: "exact", head: true });
    if (error || count === null) return;

    if (lastSaleCountRef.current !== null && count > lastSaleCountRef.current) {
      const diff = count - lastSaleCountRef.current;
      toast({
        title: `🛒 Nova venda recebida!`,
        description: `${diff} novo(s) pedido(s) chegou(aram).`,
      });
      try {
        audioRef.current?.play();
      } catch {}
    }
    lastSaleCountRef.current = count;
  }, [toast]);

  useEffect(() => {
    checkNewSales();
    const interval = setInterval(checkNewSales, 5000);
    return () => clearInterval(interval);
  }, [checkNewSales]);

  const tabs = [
    { id: "overview" as Tab, label: "Visão Geral", icon: BarChart3 },
    { id: "products" as Tab, label: "Produtos", icon: Package },
    { id: "categories" as Tab, label: "Categorias", icon: Tag },
    { id: "coupons" as Tab, label: "Cupons", icon: Ticket },
    { id: "sales" as Tab, label: "Vendas", icon: ShoppingBag },
    { id: "caixa" as Tab, label: "Caixa", icon: Landmark },
    { id: "frete" as Tab, label: "Frete", icon: Truck },
    { id: "layout" as Tab, label: "Layout", icon: LayoutDashboard },
    { id: "settings" as Tab, label: "Configuração", icon: Settings },
  ];

  const mainTabs = tabs.slice(0, 3);
  const moreTabs = tabs.slice(3);
  const isMoreActive = moreTabs.some((t) => t.id === tab);

  const sidebarWidth = collapsed ? "w-16" : "w-56";
  const contentMargin = collapsed ? "md:ml-16" : "md:ml-56";

  return (
    <div className="min-h-screen bg-muted">
      <div className="flex">
        <aside className={`${sidebarWidth} bg-card border-r border-border min-h-screen p-3 hidden md:flex flex-col fixed top-0 left-0 z-40 transition-all duration-200`}>
          <div className={`mb-6 flex items-center ${collapsed ? "justify-center" : "justify-between"}`}>
            {!collapsed && (
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-primary font-heading">Admin</h1>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            )}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-muted transition-colors shrink-0"
            >
              {collapsed ? <PanelLeft className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
            </button>
          </div>

          <nav className="flex-1 space-y-1">
            {tabs.map((t) =>
              collapsed ? (
                <Tooltip key={t.id} delayDuration={0}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setTab(t.id)}
                      className={`w-full flex items-center justify-center p-2.5 rounded-lg transition-colors ${
                        tab === t.id ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
                      }`}
                    >
                      <t.icon className="w-5 h-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>{t.label}</TooltipContent>
                </Tooltip>
              ) : (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    tab === t.id ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
                  }`}
                >
                  <t.icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{t.label}</span>
                </button>
              )
            )}
          </nav>

          {collapsed ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button onClick={signOut} className="w-full flex items-center justify-center p-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors mt-4">
                  <LogOut className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>Sair</TooltipContent>
            </Tooltip>
          ) : (
            <Button variant="ghost" onClick={signOut} className="justify-start gap-2 mt-4">
              <LogOut className="w-4 h-4" /> Sair
            </Button>
          )}
        </aside>

        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border flex z-50 safe-area-bottom">
          {mainTabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                tab === t.id ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <t.icon className="w-5 h-5" />
              {t.label}
            </button>
          ))}
          <button
            onClick={() => setMoreOpen(true)}
            className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
              isMoreActive ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <MoreHorizontal className="w-5 h-5" />
            Mais
          </button>
        </div>

        <Drawer open={moreOpen} onOpenChange={setMoreOpen}>
          <DrawerContent>
            <DrawerHeader><DrawerTitle>Menu</DrawerTitle></DrawerHeader>
            <div className="grid grid-cols-3 gap-3 p-4 pb-8">
              {moreTabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setTab(t.id); setMoreOpen(false); }}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-colors ${
                    tab === t.id ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  <t.icon className="w-6 h-6" />
                  <span className="text-xs font-medium">{t.label}</span>
                </button>
              ))}
            </div>
          </DrawerContent>
        </Drawer>

        <main className={`flex-1 p-4 md:p-8 pb-24 md:pb-8 ${contentMargin} min-h-screen transition-all duration-200`}>
          <div className="md:hidden flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold text-primary font-heading">Admin</h1>
            <Button variant="ghost" size="icon" onClick={signOut}><LogOut className="w-4 h-4" /></Button>
          </div>
          {tab === "overview" && <AdminOverview />}
          {tab === "products" && <AdminProducts />}
          {tab === "categories" && <AdminCategories />}
          {tab === "coupons" && <AdminCoupons />}
          {tab === "sales" && <AdminSales />}
          {tab === "caixa" && <AdminCaixa />}
          {tab === "frete" && <AdminFrete />}
          {tab === "layout" && <AdminLayout />}
          {tab === "settings" && <AdminSettings />}
        </main>
      </div>
    </div>
  );
};

export default Admin;
