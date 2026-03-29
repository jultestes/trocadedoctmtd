import { useSiteSettings } from "@/hooks/useSiteSettings";
import { ICON_MAP } from "@/components/admin/layout/constants";
import { Truck, CreditCard, RefreshCw } from "lucide-react";

const DEFAULT_ITEMS = [
  { icon: "Truck", text: "Frete Grátis a partir de R$299" },
  { icon: "CreditCard", text: "Parcele em até 10x sem juros" },
  { icon: "RefreshCw", text: "Primeira troca grátis" },
];

const TopBar = () => {
  const { topbarTexts } = useSiteSettings();
  const items = topbarTexts.length > 0 ? topbarTexts : DEFAULT_ITEMS;

  return (
    <div className="bg-topbar text-topbar-foreground py-2 text-sm">
      <div className="container flex items-center justify-center gap-6 md:gap-10 flex-wrap">
        {items.map((item, i) => {
          const Icon = ICON_MAP[item.icon] || Truck;
          return (
            <div key={i} className={`flex items-center gap-2 ${i > 0 ? "hidden md:flex" : ""}`}>
              <Icon className="w-4 h-4" />
              <span dangerouslySetInnerHTML={{ __html: item.text }} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TopBar;
