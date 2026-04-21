export type SectionType =
  | "hero_banner"
  | "size_selector"
  | "product_grid"
  | "features_bar"
  | "brands_carousel"
  | "custom_banner"
  | "promo_strip"
  | "shortcut_cards"
  | "secondary_banner"
  | "mini_banners"
  | "spacer";

export type MiniBannerWidth = "full" | "two_thirds" | "half" | "third";

export interface MiniBannerItem {
  image_url?: string;
  image_url_mobile?: string;
  title?: string;
  cta_text?: string;
  link?: string;
  bg_color?: string;
  width?: MiniBannerWidth; // grid width (default: third)
  aspect_desktop?: string; // e.g. "16/9", "4/3", "1/1", "16/6"
  aspect_mobile?: string;
  active?: boolean;
}

export interface SecondaryBannerSlide {
  image_url?: string;
  image_url_mobile?: string;
  title?: string;
  subtitle?: string;
  cta_text?: string;
  link?: string;
  bg_color?: string;
  aspect_desktop?: string;
  aspect_mobile?: string;
  active?: boolean;
}

export interface PromoStripItem {
  text: string;
  link?: string;
}

export interface ShortcutCard {
  title: string;
  subtitle?: string;
  image_url?: string;
  link: string;
  bg_color?: string;
}

export interface SecondaryBannerProps {
  image_url?: string;
  image_url_mobile?: string;
  title?: string;
  subtitle?: string;
  cta_text?: string;
  link?: string;
  bg_color?: string;
}

export interface BannerSlide {
  image_url: string;
  image_url_mobile?: string;
  title: string;
  subtitle: string;
  cta_text: string;
  bg_color?: string;
  clickable?: boolean;
  link?: string;
  aspect_desktop?: string;
  aspect_mobile?: string;
  active?: boolean;
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
