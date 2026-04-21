import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Settings2, X, Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { sectionLabel } from "./constants";
import type { LayoutSection, BannerSlide, FeatureItem, PromoStripItem, ShortcutCard, SecondaryBannerSlide, MiniBannerItem, MiniBannerWidth } from "./types";
import { DEFAULT_FEATURES, DEFAULT_BANNERS } from "./constants";
import IconPicker from "./IconPicker";
import ImageUploader from "./ImageUploader";
import ProductPicker from "./ProductPicker";
import ColorPickerField from "./ColorPickerField";

interface SectionEditorProps {
  section: LayoutSection;
  onUpdateProps: (props: Record<string, any>) => void;
  onClose: () => void;
}

export default function SectionEditor({ section, onUpdateProps, onClose }: SectionEditorProps) {
  const props = section.props || {};

  const updateProp = (key: string, value: any) => {
    onUpdateProps({ ...props, [key]: value });
  };

  return (
    <div className="border-t border-border bg-card p-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <Settings2 className="w-3.5 h-3.5 text-primary" />
          Editar: {sectionLabel(section.type)}
        </p>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ─── Product Grid Editor ─── */}
      {section.type === "product_grid" && (
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Título</label>
            <Input
              placeholder="Ex: Meninas"
              value={props.title ?? ""}
              onChange={(e) => updateProp("title", e.target.value)}
              className="h-8 text-xs mt-1"
            />
          </div>
          <div>
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Slug da Categoria</label>
            <Input
              placeholder="Ex: meninas"
              value={props.category ?? ""}
              onChange={(e) => updateProp("category", e.target.value)}
              className="h-8 text-xs mt-1"
            />
          </div>
          <div>
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Máx. produtos</label>
            <Input
              type="number"
              value={props.max_count ?? "8"}
              onChange={(e) => updateProp("max_count", e.target.value)}
              className="h-8 text-xs w-24 mt-1"
              min="1"
              max="20"
            />
          </div>
          <ProductPicker
            selectedIds={props.product_ids || []}
            onChange={(ids) => updateProp("product_ids", ids)}
          />
        </div>
      )}

      {/* ─── Hero Banner Editor ─── */}
      {section.type === "hero_banner" && (
        <BannerEditor
          banners={props.banners || DEFAULT_BANNERS()}
          onChange={(banners) => updateProp("banners", banners)}
        />
      )}

      {/* ─── Features Bar Editor ─── */}
      {section.type === "features_bar" && (
        <FeaturesEditor
          features={props.features || DEFAULT_FEATURES()}
          onChange={(features) => updateProp("features", features)}
        />
      )}

      {/* ─── Spacer Editor ─── */}
      {section.type === "spacer" && (
        <div>
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Altura (px)</label>
          <Input
            type="number"
            value={props.height ?? "40"}
            onChange={(e) => updateProp("height", e.target.value)}
            className="h-8 text-xs w-24 mt-1"
          />
        </div>
      )}

      {/* ─── Promo Strip Editor ─── */}
      {section.type === "promo_strip" && (
        <PromoStripEditor
          items={props.items || []}
          onChange={(items) => updateProp("items", items)}
        />
      )}

      {/* ─── Shortcut Cards Editor ─── */}
      {section.type === "shortcut_cards" && (
        <ShortcutCardsEditor
          cards={props.cards || []}
          onChange={(cards) => updateProp("cards", cards)}
        />
      )}

      {/* ─── Secondary Banner Carousel Editor ─── */}
      {section.type === "secondary_banner" && (
        <SecondaryBannerCarouselEditor
          slides={
            props.slides && Array.isArray(props.slides)
              ? props.slides
              : props.image_url || props.title
                ? [{
                    image_url: props.image_url, image_url_mobile: props.image_url_mobile,
                    title: props.title, subtitle: props.subtitle, cta_text: props.cta_text,
                    link: props.link, bg_color: props.bg_color, active: true,
                  }]
                : []
          }
          onChange={(slides) => onUpdateProps({ slides })}
        />
      )}

      {/* ─── Mini Banners Editor ─── */}
      {section.type === "mini_banners" && (
        <MiniBannersEditor
          items={props.items || []}
          onChange={(items) => updateProp("items", items)}
        />
      )}

      {["size_selector", "brands_carousel"].includes(section.type) && (
        <p className="text-xs text-muted-foreground italic">Essa seção não tem opções editáveis.</p>
      )}
    </div>
  );
}

/* ─── Banner Sub-Editor ─── */
function BannerEditor({ banners, onChange }: { banners: BannerSlide[]; onChange: (b: BannerSlide[]) => void }) {
  const update = (idx: number, key: keyof BannerSlide, value: any) => {
    const next = [...banners];
    next[idx] = { ...next[idx], [key]: value };
    onChange(next);
  };

  const add = () => onChange([...banners, { image_url: "", image_url_mobile: "", title: "Novo Banner", subtitle: "", cta_text: "Ver Mais", bg_color: "199 30% 68%", clickable: false, link: "" }]);
  const remove = (idx: number) => onChange(banners.filter((_, i) => i !== idx));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          Banners ({banners.length})
        </label>
        <Button size="sm" variant="outline" onClick={add} className="h-6 text-[10px] gap-1">
          <Plus className="w-3 h-3" /> Adicionar
        </Button>
      </div>
      {banners.map((banner, i) => (
        <div key={i} className="border border-border rounded-lg p-2 space-y-2 bg-muted/20">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-semibold text-muted-foreground">Banner {i + 1}</span>
            <div className="flex items-center gap-1">
              <button disabled={i === 0} onClick={() => { const n=[...banners]; [n[i-1],n[i]]=[n[i],n[i-1]]; onChange(n); }} className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ArrowUp className="w-3 h-3"/></button>
              <button disabled={i === banners.length-1} onClick={() => { const n=[...banners]; [n[i+1],n[i]]=[n[i],n[i+1]]; onChange(n); }} className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ArrowDown className="w-3 h-3"/></button>
              <Switch checked={banner.active !== false} onCheckedChange={(v) => update(i, "active", v)} />
              <button onClick={() => remove(i)} className="text-muted-foreground hover:text-destructive ml-1">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
          <ImageUploader
            value={banner.image_url}
            onChange={(url) => update(i, "image_url", url)}
            folder="banners"
            label="Imagem Desktop"
          />
          <ImageUploader
            value={banner.image_url_mobile || ""}
            onChange={(url) => update(i, "image_url_mobile", url)}
            folder="banners"
            label="Imagem Mobile"
          />
          <div>
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Cor de fundo</label>
            <div className="mt-1">
              <ColorPickerField
                value={banner.bg_color ?? ""}
                onChange={(v) => update(i, "bg_color", v)}
                size="sm"
                placeholder="199 30% 68%"
              />
            </div>
          </div>

          {/* Toggle: texto sobre banner vs clicável */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Banner clicável (sem texto)</label>
            <Switch
              checked={!!banner.clickable}
              onCheckedChange={(v) => update(i, "clickable", v)}
            />
          </div>

          {banner.clickable ? (
            <div>
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Link de destino</label>
              <Input
                placeholder="Ex: /categoria/meninas"
                value={banner.link ?? ""}
                onChange={(e) => update(i, "link", e.target.value)}
                className="h-7 text-xs mt-1"
              />
            </div>
          ) : (
            <>
              <Input
                placeholder="Título"
                value={banner.title}
                onChange={(e) => update(i, "title", e.target.value)}
                className="h-7 text-xs"
              />
              <Input
                placeholder="Subtítulo"
                value={banner.subtitle}
                onChange={(e) => update(i, "subtitle", e.target.value)}
                className="h-7 text-xs"
              />
              <Input
                placeholder="Texto do botão"
                value={banner.cta_text}
                onChange={(e) => update(i, "cta_text", e.target.value)}
                className="h-7 text-xs"
              />
            </>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Features Sub-Editor ─── */
function FeaturesEditor({ features, onChange }: { features: FeatureItem[]; onChange: (f: FeatureItem[]) => void }) {
  const update = (idx: number, key: keyof FeatureItem, value: string) => {
    const next = [...features];
    next[idx] = { ...next[idx], [key]: value };
    onChange(next);
  };

  const add = () => onChange([...features, { icon: "Star", title: "Novo", desc: "Descrição" }]);
  const remove = (idx: number) => onChange(features.filter((_, i) => i !== idx));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          Vantagens ({features.length})
        </label>
        <Button size="sm" variant="outline" onClick={add} className="h-6 text-[10px] gap-1">
          <Plus className="w-3 h-3" /> Adicionar
        </Button>
      </div>
      {features.map((feat, i) => (
        <div key={i} className="border border-border rounded-lg p-2 space-y-2 bg-muted/20">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-muted-foreground">Item {i + 1}</span>
            <button onClick={() => remove(i)} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
          <div>
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Ícone</label>
            <div className="mt-1">
              <IconPicker value={feat.icon} onChange={(v) => update(i, "icon", v)} />
            </div>
          </div>
          <Input
            placeholder="Título"
            value={feat.title}
            onChange={(e) => update(i, "title", e.target.value)}
            className="h-7 text-xs"
          />
          <Input
            placeholder="Descrição"
            value={feat.desc}
            onChange={(e) => update(i, "desc", e.target.value)}
            className="h-7 text-xs"
          />
        </div>
      ))}
    </div>
  );
}

/* ─── Promo Strip Sub-Editor ─── */
function PromoStripEditor({ items, onChange }: { items: PromoStripItem[]; onChange: (i: PromoStripItem[]) => void }) {
  const update = (idx: number, key: keyof PromoStripItem, value: string) => {
    const next = [...items];
    next[idx] = { ...next[idx], [key]: value };
    onChange(next);
  };
  const add = () => onChange([...items, { text: "Nova oferta", link: "" }]);
  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Ofertas ({items.length})</label>
        <Button size="sm" variant="outline" onClick={add} className="h-6 text-[10px] gap-1">
          <Plus className="w-3 h-3" /> Adicionar
        </Button>
      </div>
      {items.map((item, i) => (
        <div key={i} className="border border-border rounded-lg p-2 space-y-2 bg-muted/20">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-muted-foreground">Oferta {i + 1}</span>
            <button onClick={() => remove(i)} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
          <Input placeholder="Texto da oferta" value={item.text} onChange={(e) => update(i, "text", e.target.value)} className="h-7 text-xs" />
          <Input placeholder="Link (ex: /categoria/meninas)" value={item.link ?? ""} onChange={(e) => update(i, "link", e.target.value)} className="h-7 text-xs" />
        </div>
      ))}
    </div>
  );
}

/* ─── Shortcut Cards Sub-Editor ─── */
function ShortcutCardsEditor({ cards, onChange }: { cards: ShortcutCard[]; onChange: (c: ShortcutCard[]) => void }) {
  const update = (idx: number, key: keyof ShortcutCard, value: string) => {
    const next = [...cards];
    next[idx] = { ...next[idx], [key]: value };
    onChange(next);
  };
  const add = () => onChange([...cards, { title: "Novo", subtitle: "", link: "/", bg_color: "199 80% 90%" }]);
  const remove = (idx: number) => onChange(cards.filter((_, i) => i !== idx));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Cards ({cards.length})</label>
        <Button size="sm" variant="outline" onClick={add} className="h-6 text-[10px] gap-1">
          <Plus className="w-3 h-3" /> Adicionar
        </Button>
      </div>
      {cards.map((card, i) => (
        <div key={i} className="border border-border rounded-lg p-2 space-y-2 bg-muted/20">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-muted-foreground">Card {i + 1}</span>
            <button onClick={() => remove(i)} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
          <ImageUploader value={card.image_url || ""} onChange={(url) => update(i, "image_url", url)} folder="banners" label="Imagem (opcional)" />
          <Input placeholder="Título" value={card.title} onChange={(e) => update(i, "title", e.target.value)} className="h-7 text-xs" />
          <Input placeholder="Subtítulo" value={card.subtitle ?? ""} onChange={(e) => update(i, "subtitle", e.target.value)} className="h-7 text-xs" />
          <Input placeholder="Link" value={card.link} onChange={(e) => update(i, "link", e.target.value)} className="h-7 text-xs" />
          <div>
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Cor de fundo</label>
            <ColorPickerField value={card.bg_color ?? ""} onChange={(v) => update(i, "bg_color", v)} size="sm" placeholder="199 80% 90%" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Secondary Banner Carousel Sub-Editor ─── */
function SecondaryBannerCarouselEditor({
  slides,
  onChange,
}: { slides: SecondaryBannerSlide[]; onChange: (s: SecondaryBannerSlide[]) => void }) {
  const update = (idx: number, key: keyof SecondaryBannerSlide, value: any) => {
    const next = [...slides];
    next[idx] = { ...next[idx], [key]: value };
    onChange(next);
  };
  const add = () =>
    onChange([
      ...slides,
      { title: "Novo Slide", subtitle: "", cta_text: "Ver mais", link: "/", bg_color: "332 60% 80%", active: true },
    ]);
  const remove = (idx: number) => onChange(slides.filter((_, i) => i !== idx));
  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= slides.length) return;
    const n = [...slides];
    [n[idx], n[j]] = [n[j], n[idx]];
    onChange(n);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          Slides ({slides.length})
        </label>
        <Button size="sm" variant="outline" onClick={add} className="h-6 text-[10px] gap-1">
          <Plus className="w-3 h-3" /> Adicionar
        </Button>
      </div>
      {slides.map((s, i) => (
        <div key={i} className="border border-border rounded-lg p-2 space-y-2 bg-muted/20">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-semibold text-muted-foreground">Slide {i + 1}</span>
            <div className="flex items-center gap-1">
              <button disabled={i === 0} onClick={() => move(i, -1)} className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ArrowUp className="w-3 h-3"/></button>
              <button disabled={i === slides.length-1} onClick={() => move(i, 1)} className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ArrowDown className="w-3 h-3"/></button>
              <Switch checked={s.active !== false} onCheckedChange={(v) => update(i, "active", v)} />
              <button onClick={() => remove(i)} className="text-muted-foreground hover:text-destructive ml-1"><Trash2 className="w-3 h-3"/></button>
            </div>
          </div>
          <ImageUploader value={s.image_url || ""} onChange={(url) => update(i, "image_url", url)} folder="banners" label="Imagem Desktop" />
          <ImageUploader value={s.image_url_mobile || ""} onChange={(url) => update(i, "image_url_mobile", url)} folder="banners" label="Imagem Mobile" />
          <Input placeholder="Título" value={s.title ?? ""} onChange={(e) => update(i, "title", e.target.value)} className="h-7 text-xs" />
          <Input placeholder="Subtítulo" value={s.subtitle ?? ""} onChange={(e) => update(i, "subtitle", e.target.value)} className="h-7 text-xs" />
          <Input placeholder="Texto do botão" value={s.cta_text ?? ""} onChange={(e) => update(i, "cta_text", e.target.value)} className="h-7 text-xs" />
          <Input placeholder="Link" value={s.link ?? ""} onChange={(e) => update(i, "link", e.target.value)} className="h-7 text-xs" />
          <div>
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Cor de fundo</label>
            <ColorPickerField value={s.bg_color ?? ""} onChange={(v) => update(i, "bg_color", v)} size="sm" placeholder="332 60% 80%" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Mini Banners Sub-Editor ─── */
const WIDTH_OPTIONS: { value: MiniBannerWidth; label: string }[] = [
  { value: "third", label: "1/3 (pequeno)" },
  { value: "half", label: "1/2 (médio)" },
  { value: "two_thirds", label: "2/3 (grande)" },
  { value: "full", label: "Largura total" },
];

function MiniBannersEditor({
  items,
  onChange,
}: { items: MiniBannerItem[]; onChange: (i: MiniBannerItem[]) => void }) {
  const update = (idx: number, key: keyof MiniBannerItem, value: any) => {
    const next = [...items];
    next[idx] = { ...next[idx], [key]: value };
    onChange(next);
  };
  const add = () =>
    onChange([
      ...items,
      { title: "Novo banner", cta_text: "Ver", link: "/", bg_color: "199 80% 90%", width: "third", active: true },
    ]);
  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));
  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= items.length) return;
    const n = [...items];
    [n[idx], n[j]] = [n[j], n[idx]];
    onChange(n);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          Mini banners ({items.length})
        </label>
        <Button size="sm" variant="outline" onClick={add} className="h-6 text-[10px] gap-1">
          <Plus className="w-3 h-3" /> Adicionar
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground italic">
        Combine larguras para montar linhas: ex. 2× "1/2", 3× "1/3", ou "2/3" + "1/3".
      </p>
      {items.map((item, i) => (
        <div key={i} className="border border-border rounded-lg p-2 space-y-2 bg-muted/20">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-semibold text-muted-foreground">Banner {i + 1}</span>
            <div className="flex items-center gap-1">
              <button disabled={i === 0} onClick={() => move(i, -1)} className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ArrowUp className="w-3 h-3"/></button>
              <button disabled={i === items.length-1} onClick={() => move(i, 1)} className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ArrowDown className="w-3 h-3"/></button>
              <Switch checked={item.active !== false} onCheckedChange={(v) => update(i, "active", v)} />
              <button onClick={() => remove(i)} className="text-muted-foreground hover:text-destructive ml-1"><Trash2 className="w-3 h-3"/></button>
            </div>
          </div>
          <ImageUploader value={item.image_url || ""} onChange={(url) => update(i, "image_url", url)} folder="banners" label="Imagem Desktop" />
          <ImageUploader value={item.image_url_mobile || ""} onChange={(url) => update(i, "image_url_mobile", url)} folder="banners" label="Imagem Mobile" />
          <Input placeholder="Título (opcional)" value={item.title ?? ""} onChange={(e) => update(i, "title", e.target.value)} className="h-7 text-xs" />
          <Input placeholder="Texto do botão (opcional)" value={item.cta_text ?? ""} onChange={(e) => update(i, "cta_text", e.target.value)} className="h-7 text-xs" />
          <Input placeholder="Link" value={item.link ?? ""} onChange={(e) => update(i, "link", e.target.value)} className="h-7 text-xs" />
          <div>
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Largura</label>
            <select
              value={item.width || "third"}
              onChange={(e) => update(i, "width", e.target.value as MiniBannerWidth)}
              className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
            >
              {WIDTH_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Cor de fundo</label>
            <ColorPickerField value={item.bg_color ?? ""} onChange={(v) => update(i, "bg_color", v)} size="sm" placeholder="199 80% 90%" />
          </div>
        </div>
      ))}
    </div>
  );
}
