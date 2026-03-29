import type { FeatureItem } from "@/components/admin/layout/types";
import { ICON_MAP, DEFAULT_FEATURES } from "@/components/admin/layout/constants";
import { Truck, Shield, RefreshCw, CreditCard } from "lucide-react";

interface FeaturesBarProps {
  features?: FeatureItem[];
}

const FALLBACK_ICONS: Record<string, React.ComponentType<any>> = { Truck, Shield, RefreshCw, CreditCard };

const FeaturesBar = ({ features }: FeaturesBarProps) => {
  const items = features && features.length > 0 ? features : DEFAULT_FEATURES();

  return (
    <section className="py-10 border-t border-border">
      <div className="container">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {items.map((f, i) => {
            const Icon = ICON_MAP[f.icon] || FALLBACK_ICONS[f.icon] || Shield;
            return (
              <div key={i} className="flex items-center gap-3">
                <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{f.title}</p>
                  <p className="text-xs text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturesBar;
