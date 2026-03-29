export type SectionType =
  | "hero_banner"
  | "size_selector"
  | "product_grid"
  | "features_bar"
  | "brands_carousel"
  | "custom_banner"
  | "spacer";

export interface BannerSlide {
  image_url: string;
  image_url_mobile?: string;
  title: string;
  subtitle: string;
  cta_text: string;
  bg_color?: string;
  clickable?: boolean;
  link?: string;
}

export interface FeatureItem {
  icon: string;
  title: string;
  desc: string;
}

export interface LayoutSection {
  id: string;
  type: SectionType;
  visible: boolean;
  props?: Record<string, any>;
}

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  topbar: string;
}

export interface TopbarText {
  icon: string;
  text: string;
}

export interface SiteSettingsData {
  themeColors: ThemeColors | null;
  logoUrl: string;
  topbarTexts: TopbarText[];
}
