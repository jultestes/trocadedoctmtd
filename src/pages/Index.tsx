import { useEffect, useState } from "react";
import { trackPageView } from "@/lib/fbpixel";
import TopBar from "@/components/TopBar";
import Header from "@/components/Header";
import HeroBanner from "@/components/HeroBanner";
import SizeSelector from "@/components/SizeSelector";
import ProductGrid from "@/components/ProductGrid";
import FeaturesBar from "@/components/FeaturesBar";
import BrandsCarousel from "@/components/BrandsCarousel";
import PromoStrip from "@/components/PromoStrip";
import ShortcutCards from "@/components/ShortcutCards";
import SecondaryBanner from "@/components/SecondaryBanner";
import MiniBanners from "@/components/MiniBanners";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import type { LayoutSection } from "@/components/admin/layout/types";
import { DEFAULT_LAYOUT } from "@/components/admin/layout/constants";

// Tipos de seção que NÃO devem receber wrapper alternado (já têm largura total ou bg próprio)
const FULL_BLEED_TYPES = new Set(["hero_banner", "promo_strip", "spacer"]);

const renderSection = (section: LayoutSection, gridIndex: { current: number }) => {
  if (!section.visible) return null;
  switch (section.type) {
    case "hero_banner":
      return <HeroBanner banners={section.props?.banners} />;
    case "size_selector":
      return <SizeSelector />;
    case "product_grid": {
      const isEager = gridIndex.current === 0;
      gridIndex.current += 1;
      return (
        <ProductGrid
          title={section.props?.title || "Produtos"}
          category={section.props?.category || ""}
          productIds={section.props?.product_ids}
          maxCount={Number(section.props?.max_count) || 10}
          eager={isEager}
        />
      );
    }
    case "features_bar":
      return <FeaturesBar features={section.props?.features} />;
    case "brands_carousel":
      return <BrandsCarousel />;
    case "promo_strip":
      return <PromoStrip items={section.props?.items} bg_color={section.props?.bg_color} />;
    case "shortcut_cards":
      return <ShortcutCards cards={section.props?.cards} />;
    case "secondary_banner":
      return <SecondaryBanner {...(section.props || {})} />;
    case "mini_banners":
      return <MiniBanners items={section.props?.items} />;
    case "spacer":
      return <div style={{ height: `${section.props?.height || 40}px` }} />;
    default:
      return null;
  }
};

const Index = () => {
  const [sections, setSections] = useState<LayoutSection[]>(DEFAULT_LAYOUT);

  useEffect(() => { trackPageView(); }, []);

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("value")
      .eq("key", "homepage_layout")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value && Array.isArray(data.value)) {
          setSections(data.value as unknown as LayoutSection[]);
        }
      });
  }, []);

  // Alterna fundos entre seções "wrapáveis"
  let altIndex = 0;
  const visible = sections.filter((s) => s.visible);

  const gridIndex = { current: 0 };

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <Header />
      {visible.map((section) => {
        const node = renderSection(section, gridIndex);
        if (!node) return null;
        if (FULL_BLEED_TYPES.has(section.type)) {
          return <div key={section.id}>{node}</div>;
        }
        const bg = altIndex % 2 === 0 ? "bg-background" : "bg-muted/40";
        altIndex++;
        return (
          <div key={section.id} className={bg}>
            {node}
          </div>
        );
      })}
      <Footer />
    </div>
  );
};

export default Index;
