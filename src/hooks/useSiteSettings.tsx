import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ThemeColors, TopbarText } from "@/components/admin/layout/types";

interface SiteSettingsContextValue {
  themeColors: ThemeColors | null;
  logoUrl: string;
  topbarTexts: TopbarText[];
  maintenanceEnabled: boolean;
  loading: boolean;
  refresh: () => void;
}

const defaultCtx: SiteSettingsContextValue = {
  themeColors: null,
  logoUrl: "",
  topbarTexts: [],
  maintenanceEnabled: false,
  loading: true,
  refresh: () => {},
};

const SiteSettingsContext = createContext<SiteSettingsContextValue>(defaultCtx);

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [themeColors, setThemeColors] = useState<ThemeColors | null>(null);
  const [logoUrl, setLogoUrl] = useState("");
  const [topbarTexts, setTopbarTexts] = useState<TopbarText[]>([]);
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () => {
    supabase
      .from("site_settings")
      .select("key, value")
      .in("key", ["theme_colors", "site_logo", "topbar_texts", "maintenance"])
      .then(({ data }) => {
        if (data) {
          for (const row of data) {
            if (row.key === "theme_colors") setThemeColors(row.value as unknown as ThemeColors);
            if (row.key === "site_logo") setLogoUrl((row.value as any)?.url || "");
            if (row.key === "topbar_texts") setTopbarTexts(row.value as unknown as TopbarText[]);
            if (row.key === "maintenance") setMaintenanceEnabled(!!(row.value as any)?.enabled);
          }
        }
        setLoading(false);
      });
  };

  useEffect(() => { load(); }, []);

  // Apply CSS variables when theme changes
  useEffect(() => {
    if (!themeColors) return;
    const root = document.documentElement;
    if (themeColors.primary) root.style.setProperty("--primary", themeColors.primary);
    if (themeColors.secondary) root.style.setProperty("--secondary", themeColors.secondary);
    if (themeColors.accent) root.style.setProperty("--accent", themeColors.accent);
    if (themeColors.background) root.style.setProperty("--background", themeColors.background);
    if (themeColors.topbar) root.style.setProperty("--topbar-bg", themeColors.topbar);
  }, [themeColors]);

  return (
    <SiteSettingsContext.Provider value={{ themeColors, logoUrl, topbarTexts, maintenanceEnabled, loading, refresh: load }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}
