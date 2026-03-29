import { useEffect, useState } from "react";
import TopBar from "@/components/TopBar";
import Header from "@/components/Header";
import HeroBanner from "@/components/HeroBanner";
import SizeSelector from "@/components/SizeSelector";
import ProductGrid from "@/components/ProductGrid";
import FeaturesBar from "@/components/FeaturesBar";
import BrandsCarousel from "@/components/BrandsCarousel";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import type { LayoutSection } from "@/components/admin/layout/types";

const DEFAULT_SECTIONS: LayoutSection[] = [
  { id: "hero_banner_1", type: "hero_banner", visible: true },
  { id: "product_grid_meninas", type: "product_grid", visible: true, props: { title: "Meninas", category: "meninas" } },
  { id: "product_grid_meninos", type: "product_grid", visible: true, props: { title: "Meninos", category: "meninos" } },
  { id: "features_bar_1", type: "features_bar", visible: true },
];

const renderSection = (section: LayoutSection) => {
  if (!section.visible) return null;
  switch (section.type) {
    case "hero_banner":
      return <HeroBanner key={section.id} banners={section.props?.banners} />;
    case "size_selector":
      return <SizeSelector key={section.id} />;
    case "product_grid":
      return (
        <ProductGrid
          key={section.id}
          title={section.props?.title || "Produtos"}
          category={section.props?.category || ""}
          productIds={section.props?.product_ids}
          maxCount={Number(section.props?.max_count) || 10}
        />
      );
    case "features_bar":
      return <FeaturesBar key={section.id} features={section.props?.features} />;
    case "brands_carousel":
      return <BrandsCarousel key={section.id} />;
    case "spacer":
      return <div key={section.id} style={{ height: `${section.props?.height || 40}px` }} />;
    default:
      return null;
  }
};

const Index = () => {
  const [sections, setSections] = useState<LayoutSection[]>(DEFAULT_SECTIONS);

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

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <Header />
      {sections.map(renderSection)}
      <Footer />
    </div>
  );
};

export default Index;
