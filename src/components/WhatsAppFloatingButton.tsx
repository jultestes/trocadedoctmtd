import { useLocation } from "react-router-dom";
import { useCart } from "@/hooks/useCart";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const PHONE = "5592993339711";
const MESSAGE = "Oi! Vim pelo site e quero fazer um pedido 😊";
const WHATSAPP_URL = `https://wa.me/${PHONE}?text=${encodeURIComponent(MESSAGE)}`;

const WhatsAppFloatingButton = () => {
  const location = useLocation();
  const { isOpen, productSheetOpen } = useCart();
  const { maintenanceEnabled } = useSiteSettings();

  const hiddenRoutes = ["/checkout", "/checkout-whatsapp", "/admin"];
  if (
    maintenanceEnabled ||
    hiddenRoutes.some((r) => location.pathname.startsWith(r)) ||
    isOpen ||
    productSheetOpen
  ) {
    return null;
  }

  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Fale conosco no WhatsApp"
      className="fixed bottom-5 right-5 z-[9998] flex items-center gap-2 group"
    >
      {/* Tooltip - desktop only */}
      <span className="hidden md:inline-block bg-background text-foreground text-sm font-medium px-3 py-2 rounded-lg shadow-lg border border-border opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
        Fale conosco no WhatsApp
      </span>

      {/* Button */}
      <span className="relative flex items-center justify-center">
        {/* Pulse ring */}
        <span
          className="absolute inset-0 rounded-full animate-ping opacity-60"
          style={{ backgroundColor: "#25D366", animationDuration: "2.5s" }}
        />
        <span
          className="relative flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all duration-300 hover:scale-110"
          style={{ backgroundColor: "#25D366" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1DA851")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#25D366")}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 32 32"
            className="w-7 h-7 fill-white"
            aria-hidden="true"
          >
            <path d="M19.11 17.205c-.372 0-1.088 1.39-1.518 1.39-.065 0-.114-.03-.197-.082-.628-.348-1.16-.694-1.79-1.107-.624-.41-1.323-.99-1.83-1.617a3.31 3.31 0 0 1-.224-.288c-.207-.305-.337-.453-.337-.621 0-.16.157-.326.273-.448.205-.219.394-.395.508-.522.12-.13.245-.301.245-.444 0-.061-.024-.122-.057-.196-.024-.06-.122-.293-.207-.488l-.207-.488c-.144-.34-.265-.616-.354-.816-.045-.097-.087-.165-.116-.226-.066-.139-.197-.355-.337-.355-.09 0-.18-.014-.27-.014-.16 0-.34.014-.493.073-.16.06-.297.156-.42.27-.139.13-.245.273-.353.434-.16.243-.26.547-.293.84-.026.243-.018.49.024.732.052.302.144.6.27.882.4.876.928 1.704 1.557 2.45.63.747 1.367 1.405 2.18 1.952.49.33 1.013.61 1.555.835.523.218 1.07.396 1.633.493a3.94 3.94 0 0 0 .82.082c.252.005.503-.022.748-.073.272-.057.532-.145.778-.262.244-.117.473-.265.681-.443.207-.176.39-.382.546-.61.15-.222.265-.466.337-.726.073-.265.107-.54.097-.815-.005-.142-.026-.283-.058-.42-.038-.15-.103-.235-.215-.292-.4-.207-.836-.42-1.222-.62z"/>
            <path d="M16.001 0C7.165 0 .001 7.164.001 16c0 2.823.737 5.6 2.137 8.039L0 32l8.16-2.136A15.93 15.93 0 0 0 16.001 32c8.836 0 16-7.164 16-16S24.837 0 16.001 0zm0 29.328a13.3 13.3 0 0 1-6.787-1.857l-.487-.29-5.029 1.317 1.342-4.9-.317-.504a13.27 13.27 0 0 1-2.034-7.094c0-7.357 5.985-13.342 13.343-13.342 7.357 0 13.342 5.985 13.342 13.342S23.358 29.328 16.001 29.328z"/>
          </svg>
        </span>
      </span>
    </a>
  );
};

export default WhatsAppFloatingButton;
