import React from "react";
import {
  Image, LayoutGrid, ShoppingBag, Star, Megaphone, Layers,
  Truck, Shield, RefreshCw, CreditCard, Heart, Gift, Package,
  Clock, Zap, Award, ThumbsUp, Lock, Percent, Tag, MapPin,
  Phone, Mail, Home, Check, X, AlertCircle, Info, HelpCircle,
  Bell, Bookmark, Camera, Download, Upload, Edit, Eye, Search,
  Settings, User, Users, Calendar, Globe, Sparkles, Crown,
  Flame, Leaf, Sun, Moon, CloudRain, Smile, Baby, Shirt,
} from "lucide-react";
import type { SectionType, LayoutSection, FeatureItem, BannerSlide } from "./types";

export const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Truck, Shield, RefreshCw, CreditCard, Heart, Gift, Package,
  Clock, Zap, Award, ThumbsUp, Lock, ShoppingBag, Percent, Tag,
  MapPin, Phone, Mail, Home, Check, X, AlertCircle, Info, HelpCircle,
  Bell, Bookmark, Camera, Download, Upload, Edit, Eye, Search,
  Settings, User, Users, Calendar, Globe, Star, Sparkles, Crown,
  Flame, Leaf, Sun, Moon, CloudRain, Smile, Baby, Shirt, Image, Layers,
  LayoutGrid, Megaphone,
};

export const ICON_NAMES = Object.keys(ICON_MAP);

export const SECTION_CATALOG: {
  type: SectionType;
  label: string;
  icon: React.ReactNode;
  defaultProps?: Record<string, any>;
}[] = [
  { type: "hero_banner", label: "Banner Principal", icon: React.createElement(Image, { className: "w-5 h-5" }), defaultProps: { banners: [] } },
  {
    type: "promo_strip", label: "Faixa Promocional", icon: React.createElement(Megaphone, { className: "w-5 h-5" }),
    defaultProps: { items: [{ text: "3 conjuntos por R$100", link: "/categoria/meninas" }, { text: "5 peças por R$150", link: "/categoria/meninos" }] },
  },
  {
    type: "shortcut_cards", label: "Cards de Atalho", icon: React.createElement(LayoutGrid, { className: "w-5 h-5" }),
    defaultProps: {
      cards: [
        { title: "Meninos", subtitle: "Estilo e conforto", link: "/categoria/meninos", bg_color: "199 80% 90%" },
        { title: "Meninas", subtitle: "Looks delicados", link: "/categoria/meninas", bg_color: "332 80% 92%" },
        { title: "Promoções", subtitle: "Ofertas especiais", link: "/categoria/meninas", bg_color: "45 90% 88%" },
      ],
    },
  },
  { type: "size_selector", label: "Seletor de Tamanhos", icon: React.createElement(LayoutGrid, { className: "w-5 h-5" }) },
  {
    type: "product_grid", label: "Grade de Produtos", icon: React.createElement(ShoppingBag, { className: "w-5 h-5" }),
    defaultProps: { title: "Nova Seção", category: "", product_ids: [], max_count: "8" },
  },
  {
    type: "secondary_banner", label: "Banner Secundário", icon: React.createElement(Image, { className: "w-5 h-5" }),
    defaultProps: { title: "Promoção Especial", subtitle: "Confira nossas ofertas", cta_text: "Ver agora", link: "/categoria/meninas", bg_color: "332 60% 80%" },
  },
  {
    type: "features_bar", label: "Barra de Vantagens", icon: React.createElement(Star, { className: "w-5 h-5" }),
    defaultProps: { features: DEFAULT_FEATURES() },
  },
  { type: "brands_carousel", label: "Carrossel de Marcas", icon: React.createElement(Megaphone, { className: "w-5 h-5" }) },
  { type: "spacer", label: "Espaçador", icon: React.createElement(Layers, { className: "w-5 h-5" }), defaultProps: { height: "40" } },
];

export function DEFAULT_FEATURES(): FeatureItem[] {
  return [
    { icon: "Truck", title: "Entrega Rápida", desc: "Para todo o Brasil" },
    { icon: "Shield", title: "Compra Segura", desc: "Pagamento 100% seguro" },
    { icon: "CreditCard", title: "Parcelamento", desc: "Até 10x sem juros" },
    { icon: "Star", title: "Bem Avaliado", desc: "Clientes satisfeitos" },
  ];
}

export function DEFAULT_BANNERS(): BannerSlide[] {
  return [
    { image_url: "", title: "Coleção Verão 2026", subtitle: "Looks fresquinhos e cheios de estilo!", cta_text: "Ver Coleção", bg_color: "199 30% 68%" },
    { image_url: "", title: "Promoção de Inverno", subtitle: "Até 50% OFF em peças selecionadas!", cta_text: "Aproveitar", bg_color: "332 42% 53%" },
  ];
}

export const DEFAULT_LAYOUT: LayoutSection[] = [
  { id: "hero_banner_1", type: "hero_banner", visible: true, props: { banners: DEFAULT_BANNERS() } },
  { id: "features_bar_1", type: "features_bar", visible: true, props: { features: DEFAULT_FEATURES() } },
  { id: "promo_strip_1", type: "promo_strip", visible: true, props: { items: [{ text: "3 conjuntos por R$100", link: "/categoria/meninas" }, { text: "5 peças por R$150", link: "/categoria/meninos" }] } },
  { id: "shortcut_cards_1", type: "shortcut_cards", visible: true },
  { id: "size_selector_1", type: "size_selector", visible: true },
  { id: "product_grid_meninas", type: "product_grid", visible: true, props: { title: "Meninas", category: "meninas", product_ids: [], max_count: "10" } },
  { id: "secondary_banner_1", type: "secondary_banner", visible: true, props: { title: "Promoção Especial", subtitle: "Aproveite os melhores preços", cta_text: "Ver agora", link: "/categoria/meninas", bg_color: "332 60% 80%" } },
  { id: "product_grid_meninos", type: "product_grid", visible: true, props: { title: "Meninos", category: "meninos", product_ids: [], max_count: "10" } },
];

export const sectionLabel = (type: SectionType) =>
  SECTION_CATALOG.find((s) => s.type === type)?.label ?? type;

export const sectionIcon = (type: SectionType) =>
  SECTION_CATALOG.find((s) => s.type === type)?.icon ?? React.createElement(LayoutGrid, { className: "w-5 h-5" });
