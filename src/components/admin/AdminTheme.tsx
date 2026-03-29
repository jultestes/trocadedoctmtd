import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Save, Palette, Image as ImageIcon, Type, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import type { ThemeColors, TopbarText } from "./layout/types";
import IconPicker from "./layout/IconPicker";
import ImageUploader from "./layout/ImageUploader";
import ColorPickerField from "./layout/ColorPickerField";

const DEFAULT_COLORS: ThemeColors = {
  primary: "199 30% 68%",
  secondary: "199 30% 95%",
  accent: "13 84% 75%",
  background: "0 0% 100%",
  topbar: "332 42% 53%",
};

const DEFAULT_TOPBAR: TopbarText[] = [
  { icon: "Truck", text: "Frete Grátis a partir de R$299" },
  { icon: "CreditCard", text: "Parcele em até 10x sem juros" },
  { icon: "RefreshCw", text: "Primeira troca grátis" },
];

export default function AdminTheme() {
  const { refresh } = useSiteSettings();
  const [colors, setColors] = useState<ThemeColors>(DEFAULT_COLORS);
  const [logoUrl, setLogoUrl] = useState("");
  const [topbarTexts, setTopbarTexts] = useState<TopbarText[]>(DEFAULT_TOPBAR);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("key, value")
      .in("key", ["theme_colors", "site_logo", "topbar_texts"])
      .then(({ data }) => {
        if (data) {
          for (const row of data) {
            if (row.key === "theme_colors") setColors(row.value as unknown as ThemeColors);
            if (row.key === "site_logo") setLogoUrl((row.value as any)?.url || "");
            if (row.key === "topbar_texts") setTopbarTexts(row.value as unknown as TopbarText[]);
          }
        }
        setLoaded(true);
      });
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (colors.primary) root.style.setProperty("--primary", colors.primary);
    if (colors.secondary) root.style.setProperty("--secondary", colors.secondary);
    if (colors.accent) root.style.setProperty("--accent", colors.accent);
    if (colors.background) root.style.setProperty("--background", colors.background);
    if (colors.topbar) root.style.setProperty("--topbar-bg", colors.topbar);
  }, [colors]);

  const save = async () => {
    setSaving(true);
    const upserts = [
      { key: "theme_colors", value: colors as any },
      { key: "site_logo", value: { url: logoUrl } as any },
      { key: "topbar_texts", value: topbarTexts as any },
    ];
    for (const item of upserts) {
      const { error } = await supabase
        .from("site_settings")
        .upsert(item, { onConflict: "key" });
      if (error) { toast.error(`Erro ao salvar ${item.key}`); setSaving(false); return; }
    }
    toast.success("Configurações salvas!");
    refresh();
    setSaving(false);
  };

  if (!loaded) return <div className="flex items-center justify-center py-20 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} size="sm" className="gap-2">
          <Save className="w-4 h-4" />
          {saving ? "Salvando..." : "Salvar Configs"}
        </Button>
      </div>

      {/* ─── Colors ─── */}
      <section className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Palette className="w-4 h-4 text-primary" /> Cores do Site
        </h3>
        <p className="text-xs text-muted-foreground">Clique na cor para abrir o seletor. Alterações aparecem em tempo real.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(["primary", "secondary", "accent", "background", "topbar"] as (keyof ThemeColors)[]).map((key) => (
            <div key={key} className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground capitalize">
                {key === "topbar" ? "Barra Superior" : key === "primary" ? "Primária" : key === "secondary" ? "Secundária" : key === "accent" ? "Destaque" : "Fundo"}
              </label>
              <ColorPickerField
                value={colors[key]}
                onChange={(v) => setColors({ ...colors, [key]: v })}
              />
            </div>
          ))}
        </div>
      </section>

      {/* ─── Logo ─── */}
      <section className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-primary" /> Logo do Site
        </h3>
        <ImageUploader
          value={logoUrl}
          onChange={setLogoUrl}
          folder="branding"
          label="Logo (recomendado: SVG ou PNG transparente)"
        />
      </section>

      {/* ─── TopBar Texts ─── */}
      <section className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Type className="w-4 h-4 text-primary" /> Textos da Barra Superior
          </h3>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setTopbarTexts([...topbarTexts, { icon: "Star", text: "Novo texto" }])}
            className="h-7 text-xs gap-1"
          >
            <Plus className="w-3 h-3" /> Adicionar
          </Button>
        </div>
        <div className="space-y-2">
          {topbarTexts.map((item, i) => (
            <div key={i} className="flex items-center gap-2 p-2 border border-border rounded-lg bg-muted/20">
              <IconPicker value={item.icon} onChange={(v) => {
                const next = [...topbarTexts];
                next[i] = { ...next[i], icon: v };
                setTopbarTexts(next);
              }} />
              <Input
                value={item.text}
                onChange={(e) => {
                  const next = [...topbarTexts];
                  next[i] = { ...next[i], text: e.target.value };
                  setTopbarTexts(next);
                }}
                className="h-8 text-xs flex-1"
              />
              <button
                onClick={() => setTopbarTexts(topbarTexts.filter((_, idx) => idx !== i))}
                className="text-muted-foreground hover:text-destructive shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}