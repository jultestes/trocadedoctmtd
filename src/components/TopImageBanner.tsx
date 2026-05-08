import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TopImageBannerConfig {
  enabled?: boolean;
  image_url?: string;
  image_url_mobile?: string;
  link?: string;
  height_desktop?: number; // px, 0 = auto
  height_mobile?: number;
}

const TopImageBanner = () => {
  const [cfg, setCfg] = useState<TopImageBannerConfig | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("value")
      .eq("key", "top_image_banner")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) setCfg(data.value as unknown as TopImageBannerConfig);
      });
  }, []);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  if (!cfg?.enabled) return null;
  const desktopSrc = cfg.image_url || cfg.image_url_mobile;
  const mobileSrc = cfg.image_url_mobile || cfg.image_url;
  const src = isMobile ? mobileSrc : desktopSrc;
  if (!src) return null;

  const height = isMobile ? cfg.height_mobile : cfg.height_desktop;
  const style: React.CSSProperties = height && height > 0
    ? { height: `${height}px`, objectFit: "cover" as const }
    : { height: "auto" };

  const img = (
    <img
      src={src}
      alt=""
      className="block w-full"
      style={style}
      loading="eager"
      decoding="async"
    />
  );

  return (
    <div className="w-full">
      {cfg.link ? (
        <a href={cfg.link} className="block w-full">{img}</a>
      ) : img}
    </div>
  );
};

export default TopImageBanner;
