import { Image, LayoutGrid } from "lucide-react";
import { sectionLabel, ICON_MAP, DEFAULT_FEATURES, DEFAULT_BANNERS } from "./constants";
import type { LayoutSection, BannerSlide, FeatureItem } from "./types";

interface PreviewBlockProps {
  section: LayoutSection;
  isSelected: boolean;
  onClick: () => void;
}

export default function PreviewBlock({ section, isSelected, onClick }: PreviewBlockProps) {
  if (!section.visible) return null;

  const wrapperClass = `relative cursor-pointer transition-all border-2 rounded-lg ${
    isSelected ? "border-primary shadow-md shadow-primary/10" : "border-transparent hover:border-primary/30"
  }`;

  const overlay = isSelected && (
    <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-[10px] px-2 py-0.5 rounded font-medium z-10">
      {sectionLabel(section.type)}
    </div>
  );

  const props = section.props || {};

  switch (section.type) {
    case "hero_banner": {
      const banners: BannerSlide[] = props.banners?.length ? props.banners : DEFAULT_BANNERS();
      const first = banners[0];
      return (
        <div className={wrapperClass} onClick={onClick}>
          {overlay}
          {first?.image_url ? (
            <div className="h-40 md:h-56 rounded-lg overflow-hidden relative">
              <img src={first.image_url} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <div className="text-center text-white space-y-1">
                  <p className="text-lg font-bold">{first.title}</p>
                  <p className="text-xs opacity-80">{first.subtitle}</p>
                </div>
              </div>
            </div>
          ) : (
            <div
              className="h-40 md:h-56 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: first?.bg_color ? `hsl(${first.bg_color})` : "hsl(var(--primary) / 0.2)" }}
            >
              <div className="text-center space-y-2">
                <Image className="w-10 h-10 text-white/60 mx-auto" />
                <p className="text-sm font-bold text-white/80">{first?.title || "Banner Principal"}</p>
                <p className="text-[10px] text-white/60">{banners.length} banner(s)</p>
              </div>
            </div>
          )}
        </div>
      );
    }
    case "size_selector":
      return (
        <div className={wrapperClass} onClick={onClick}>
          {overlay}
          <div className="py-4 px-6 bg-card rounded-lg">
            <div className="flex gap-2 justify-center flex-wrap">
              {["RN", "P", "M", "G", "GG", "1", "2", "3", "4"].map((s) => (
                <span key={s} className="bg-primary/10 text-primary text-xs px-3 py-1.5 rounded-full font-medium">{s}</span>
              ))}
            </div>
          </div>
        </div>
      );
    case "product_grid":
      return (
        <div className={wrapperClass} onClick={onClick}>
          {overlay}
          <div className="py-4 px-6 bg-card rounded-lg">
            <p className="text-sm font-bold text-foreground mb-1">{props.title || "Produtos"}</p>
            <p className="text-[10px] text-muted-foreground mb-3">
              {(props.product_ids?.length || 0) > 0
                ? `${props.product_ids.length} produto(s) selecionado(s)`
                : `Categoria: ${props.category || "todas"}`}
              {" · Máx: "}{props.max_count || "8"}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="bg-muted rounded-lg aspect-square" />
                  <div className="space-y-1">
                    <div className="bg-muted rounded h-3 w-3/4" />
                    <div className="bg-muted rounded h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    case "features_bar": {
      const features: FeatureItem[] = props.features?.length ? props.features : DEFAULT_FEATURES();
      return (
        <div className={wrapperClass} onClick={onClick}>
          {overlay}
          <div className="py-4 px-6 bg-card rounded-lg">
            <div className="flex gap-6 justify-center flex-wrap">
              {features.map((f, i) => {
                const Icon = ICON_MAP[f.icon];
                return (
                  <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                    {Icon ? <Icon className="w-4 h-4 text-primary" /> : <span className="text-lg">⭐</span>}
                    <div>
                      <span className="font-medium text-foreground">{f.title}</span>
                      <span className="ml-1 text-[10px]">{f.desc}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }
    case "brands_carousel":
      return (
        <div className={wrapperClass} onClick={onClick}>
          {overlay}
          <div className="py-4 px-6 bg-card rounded-lg">
            <div className="flex gap-4 justify-center">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="w-16 h-10 bg-muted rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      );
    case "spacer":
      return (
        <div className={wrapperClass} onClick={onClick}>
          {overlay}
          <div
            className="bg-muted/20 border border-dashed border-muted-foreground/20 rounded-lg flex items-center justify-center text-xs text-muted-foreground"
            style={{ height: `${Math.min(Number(props.height || 40), 120)}px` }}
          >
            ↕ Espaçador ({props.height || 40}px)
          </div>
        </div>
      );
    default:
      return <div className="bg-muted h-16 rounded-lg" />;
  }
}
