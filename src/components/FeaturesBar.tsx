import type { FeatureItem } from "@/components/admin/layout/types";
import { ICON_MAP, DEFAULT_FEATURES } from "@/components/admin/layout/constants";
import { Truck, Shield, RefreshCw, CreditCard } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface FeaturesBarProps {
  features?: FeatureItem[];
}

const FALLBACK_ICONS: Record<string, React.ComponentType<any>> = { Truck, Shield, RefreshCw, CreditCard };

const FeaturesBar = ({ features }: FeaturesBarProps) => {
  const items = features && features.length > 0 ? features : DEFAULT_FEATURES();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);

  // Duplicamos a lista para garantir loop contínuo no mobile
  const loopItems = [...items, ...items];

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (window.matchMedia("(min-width: 768px)").matches) return;

    let rafId: number;
    let last = performance.now();
    const speed = 0.04; // px por ms (suave)

    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      if (!paused && el) {
        el.scrollLeft += speed * dt;
        // Ao chegar na metade (segunda cópia), reseta sem salto perceptível
        const half = el.scrollWidth / 2;
        if (el.scrollLeft >= half) {
          el.scrollLeft -= half;
        }
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [paused, items.length]);

  const renderCard = (f: FeatureItem, i: number) => {
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
  };

  return (
    <section className="py-10 border-t border-border">
      <div className="container">
        {/* Mobile: carrossel auto-scroll */}
        <div
          ref={scrollRef}
          onTouchStart={() => setPaused(true)}
          onTouchEnd={() => setPaused(false)}
          onMouseDown={() => setPaused(true)}
          onMouseUp={() => setPaused(false)}
          onMouseLeave={() => setPaused(false)}
          className="md:hidden flex gap-4 overflow-x-auto scroll-smooth no-scrollbar -mx-4 px-4 snap-x"
          style={{ scrollbarWidth: "none" }}
        >
          {loopItems.map((f, i) => (
            <div
              key={i}
              className="shrink-0 w-[68%] xs:w-[60%] snap-start bg-card border border-border rounded-xl px-4 py-3 shadow-sm"
            >
              {renderCard(f, i)}
            </div>
          ))}
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
