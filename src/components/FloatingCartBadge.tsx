import { ShoppingBag } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";

const FloatingCartBadge = () => {
  const { totalItems, isOpen, setIsOpen, productSheetOpen } = useCart();
  const { maintenanceEnabled } = useSiteSettings();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const prevItems = useRef(totalItems);

  // When items increase (product added), after a short delay collapse the text
  useEffect(() => {
    if (totalItems > prevItems.current && totalItems > 0) {
      // Show full badge briefly, then collapse
      setCollapsed(false);
      const timer = setTimeout(() => setCollapsed(true), 1800);
      return () => clearTimeout(timer);
    }
    prevItems.current = totalItems;
  }, [totalItems]);

  // Also collapse if cart was open then closed
  useEffect(() => {
    if (!isOpen && totalItems > 0) {
      const timer = setTimeout(() => setCollapsed(true), 1200);
      return () => clearTimeout(timer);
    }
    if (totalItems === 0) {
      setCollapsed(false);
    }
  }, [isOpen, totalItems]);

  if (maintenanceEnabled || totalItems === 0 || isOpen || location.pathname === "/checkout" || location.pathname === "/admin" || productSheetOpen) return null;

  return (
    <button
      onClick={() => setIsOpen(true)}
      className="fixed top-20 right-0 z-[9999] flex items-center bg-background border-2 border-r-0 border-border rounded-l-2xl shadow-2xl hover:shadow-xl transition-all duration-500 ease-in-out overflow-hidden"
      style={{
        padding: collapsed ? "0.75rem 1rem" : "0.75rem 1.25rem",
      }}
    >
      <div className="relative flex-shrink-0">
        <ShoppingBag className="w-6 h-6 text-foreground" />
        {totalItems > 0 && (
          <span className="absolute -top-2.5 -left-2.5 bg-accent text-accent-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {totalItems}
          </span>
        )}
      </div>
      <span
        className="text-base font-bold text-foreground whitespace-nowrap transition-all duration-500 ease-in-out"
        style={{
          maxWidth: collapsed ? "0px" : "120px",
          opacity: collapsed ? 0 : 1,
          marginLeft: collapsed ? "0px" : "0.625rem",
        }}
      >
        Carrinho
      </span>
    </button>
  );
};

export default FloatingCartBadge;
