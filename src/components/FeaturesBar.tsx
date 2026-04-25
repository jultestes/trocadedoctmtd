import type { FeatureItem } from "@/components/admin/layout/types";
import { ICON_MAP, DEFAULT_FEATURES } from "@/components/admin/layout/constants";
import { Truck, Shield, RefreshCw, CreditCard } from "lucide-react";

interface FeaturesBarProps {
  features?: FeatureItem[];
}

const FALLBACK_ICONS: Record<string, React.ComponentType<any>> = { Truck, Shield, RefreshCw, CreditCard };

const FeaturesBar = ({ features }: FeaturesBarProps) => {
  const items = features && features.length > 0 ? features : DEFAULT_FEATURES();

  // Duplicamos para criar loop contínuo sem corte
  const loopItems = [...items, ...items];

  const renderCard = (f: FeatureItem, key: string | number) => {
    const Icon = ICON_MAP[f.icon] || FALLBACK_ICONS[f.icon] || Shield;
    return (
      <div key={key} className="flex items-center gap-3">
        <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground whitespace-nowrap">{f.title}</p>
          <p className="text-xs text-muted-foreground whitespace-nowrap">{f.desc}</p>
        </div>
      </div>
    );
  };

  return (
    <section className="py-10 border-t border-border overflow-hidden">
      <div className="container">
        {/* Mobile: marquee auto-scroll contínuo */}
        <div className="md:hidden relative w-full overflow-hidden">
          <div
            className="flex gap-4 w-max animate-marquee hover:[animation-play-state:paused]"
          >
            {loopItems.map((f, i) => (
              <div
                key={i}
                className="shrink-0 w-[260px] bg-card border border-border rounded-xl px-4 py-3 shadow-sm"
              >
                {renderCard(f, i)}
              </div>
            ))}
          </div>
        </div>

        {/* Desktop: grid original */}
        <div className="hidden md:grid md:grid-cols-4 gap-6">
          {items.map((f, i) => renderCard(f, i))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesBar;
