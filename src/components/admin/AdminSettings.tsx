import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Wrench, MapPin, Phone, Mail, Save, Plus, Trash2, Share2, Instagram, Facebook, MessageCircle, Youtube, Twitter, Send, Moon, Sun, Megaphone } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { PromoBannerConfig } from "@/components/PromoBanner";

const PLATFORM_ICONS: Record<string, React.ElementType> = {
  instagram: Instagram,
  facebook: Facebook,
  whatsapp: MessageCircle,
  tiktok: Youtube,
  youtube: Youtube,
  twitter: Twitter,
  pinterest: Instagram,
  telegram: Send,
};

type MaintenanceValue = {
  enabled: boolean;
  title: string;
  subtitle: string;
};

type StoreInfoValue = {
  location: string;
  whatsapp: string;
  email: string;
};

type SocialLink = {
  platform: string;
  url: string;
};

const PLATFORM_OPTIONS = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
  { value: "twitter", label: "X (Twitter)" },
  { value: "pinterest", label: "Pinterest" },
  { value: "telegram", label: "Telegram" },
];

const AdminSettings = () => {
  const [maintenance, setMaintenance] = useState<MaintenanceValue>({
    enabled: false,
    title: "Site em Manutenção",
    subtitle: "Voltamos em breve!",
  });
  const [storeInfo, setStoreInfo] = useState<StoreInfoValue>({
    location: "",
    whatsapp: "",
    email: "",
  });
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [savingSocial, setSavingSocial] = useState(false);
  const [promoBanner, setPromoBanner] = useState<PromoBannerConfig>({
    enabled: false,
    show_on: "ambos",
    title: "3 CONJUNTOS POR R$100 | 5 POR R$150",
    subtitle: "Desconto automático no pedido",
    small_text: "Válido enquanto durar o estoque • Entrega em Manaus",
  });
  const [savingPromo, setSavingPromo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingStore, setSavingStore] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formSubtitle, setFormSubtitle] = useState("");
  const { toast } = useToast();
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains("dark"));

  const fetchSettings = async () => {
    const { data } = await supabase
      .from("site_settings")
      .select("key, value")
      .in("key", ["maintenance", "store_info", "social_links", "category_promo_banner"]);

    if (data) {
      for (const row of data) {
        if (row.key === "maintenance") {
          setMaintenance(row.value as unknown as MaintenanceValue);
        }
        if (row.key === "store_info") {
          setStoreInfo(row.value as unknown as StoreInfoValue);
        }
        if (row.key === "social_links") {
          setSocialLinks(row.value as unknown as SocialLink[]);
        }
        if (row.key === "category_promo_banner") {
          setPromoBanner(row.value as unknown as PromoBannerConfig);
        }
      }
    }
    setLoading(false);
  };

  const savePromoBanner = async () => {
    setSavingPromo(true);
    const { data: existing } = await supabase
      .from("site_settings")
      .select("id")
      .eq("key", "category_promo_banner")
      .maybeSingle();

    const value = JSON.parse(JSON.stringify(promoBanner));
    let error;
    if (existing) {
      ({ error } = await supabase
        .from("site_settings")
        .update({ value, updated_at: new Date().toISOString() })
        .eq("key", "category_promo_banner"));
    } else {
      ({ error } = await supabase
        .from("site_settings")
        .insert({ key: "category_promo_banner", value }));
    }

    setSavingPromo(false);
    if (error) {
      toast({ title: "Erro ao salvar banner promocional", variant: "destructive" });
      return;
    }
    toast({ title: "Banner promocional salvo!" });
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Restore dark mode on mount
  useEffect(() => {
    const saved = localStorage.getItem("admin-theme");
    if (saved === "dark") {
      document.documentElement.classList.add("dark");
      setDarkMode(true);
    }
  }, []);

  const handleToggle = (checked: boolean) => {
    if (checked) {
      setFormTitle(maintenance.title);
      setFormSubtitle(maintenance.subtitle);
      setShowDialog(true);
    } else {
      saveMaintenance({ ...maintenance, enabled: false });
    }
  };

  const handleConfirmEnable = () => {
    if (!formTitle.trim()) {
      toast({ title: "Título é obrigatório", variant: "destructive" });
      return;
    }
    saveMaintenance({
      enabled: true,
      title: formTitle.trim(),
      subtitle: formSubtitle.trim(),
    });
    setShowDialog(false);
  };

  const saveMaintenance = async (value: MaintenanceValue) => {
    const { error } = await supabase
      .from("site_settings")
      .update({ value: JSON.parse(JSON.stringify(value)), updated_at: new Date().toISOString() })
      .eq("key", "maintenance");

    if (error) {
      toast({ title: "Erro ao salvar configuração", variant: "destructive" });
      return;
    }

    setMaintenance(value);
    toast({
      title: value.enabled ? "Site em manutenção ativado" : "Site em manutenção desativado",
    });
  };

  const saveStoreInfo = async () => {
    setSavingStore(true);

    const { data: existing } = await supabase
      .from("site_settings")
      .select("id")
      .eq("key", "store_info")
      .single();

    const value = JSON.parse(JSON.stringify(storeInfo));

    let error;
    if (existing) {
      ({ error } = await supabase
        .from("site_settings")
        .update({ value, updated_at: new Date().toISOString() })
        .eq("key", "store_info"));
    } else {
      ({ error } = await supabase
        .from("site_settings")
        .insert({ key: "store_info", value }));
    }

    setSavingStore(false);

    if (error) {
      toast({ title: "Erro ao salvar dados da loja", variant: "destructive" });
      return;
    }

    toast({ title: "Dados da loja salvos com sucesso!" });
  };

  // Social links
  const addSocialLink = () => {
    setSocialLinks([...socialLinks, { platform: "instagram", url: "" }]);
  };

  const removeSocialLink = (index: number) => {
    setSocialLinks(socialLinks.filter((_, i) => i !== index));
  };

  const updateSocialLink = (index: number, field: keyof SocialLink, value: string) => {
    const updated = [...socialLinks];
    updated[index] = { ...updated[index], [field]: value };
    setSocialLinks(updated);
  };

  const saveSocialLinks = async () => {
    setSavingSocial(true);

    const { data: existing } = await supabase
      .from("site_settings")
      .select("id")
      .eq("key", "social_links")
      .single();

    const value = JSON.parse(JSON.stringify(socialLinks));

    let error;
    if (existing) {
      ({ error } = await supabase
        .from("site_settings")
        .update({ value, updated_at: new Date().toISOString() })
        .eq("key", "social_links"));
    } else {
      ({ error } = await supabase
        .from("site_settings")
        .insert({ key: "social_links", value }));
    }

    setSavingSocial(false);

    if (error) {
      toast({ title: "Erro ao salvar redes sociais", variant: "destructive" });
      return;
    }

    toast({ title: "Redes sociais salvas com sucesso!" });
  };

  if (loading) return <p className="text-muted-foreground">Carregando configurações...</p>;

  const toggleDarkMode = (checked: boolean) => {
    setDarkMode(checked);
    if (checked) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("admin-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("admin-theme", "light");
    }
  };


  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground font-heading mb-6">Configurações</h2>

      {/* Dark Mode */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {darkMode ? <Moon className="w-5 h-5 text-muted-foreground" /> : <Sun className="w-5 h-5 text-muted-foreground" />}
            <div>
              <p className="font-medium text-foreground">Tema Escuro</p>
              <p className="text-sm text-muted-foreground">
                {darkMode ? "Modo escuro ativado" : "Alternar para o tema escuro do painel"}
              </p>
            </div>
          </div>
          <Switch checked={darkMode} onCheckedChange={toggleDarkMode} />
        </div>
      </div>

      {/* Store Info */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-5">
        <h3 className="font-semibold text-foreground text-lg">Dados da Loja</h3>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              Localização da Loja Física
            </label>
            <Input
              placeholder="Ex: Rua Exemplo, 123 - Centro, Manaus - AM"
              value={storeInfo.location}
              onChange={(e) => setStoreInfo({ ...storeInfo, location: e.target.value })}
            />
            <p className="text-xs text-muted-foreground mt-1">Exibido para clientes que escolhem retirar na loja</p>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground" />
              Número de WhatsApp
            </label>
            <Input
              placeholder="Ex: +55 92 98516-6547"
              inputMode="numeric"
              value={storeInfo.whatsapp}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 13);
                let formatted = "";
                if (digits.length > 0) formatted = "+" + digits.slice(0, 2);
                if (digits.length > 2) formatted += " " + digits.slice(2, 4);
                if (digits.length > 4) formatted += " " + digits.slice(4, 9);
                if (digits.length > 9) formatted += "-" + digits.slice(9, 13);
                setStoreInfo({ ...storeInfo, whatsapp: formatted });
              }}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              Email da Loja
            </label>
            <Input
              type="email"
              placeholder="Ex: contato@tmtdkids.com"
              value={storeInfo.email}
              onChange={(e) => setStoreInfo({ ...storeInfo, email: e.target.value })}
            />
          </div>
        </div>

        <Button onClick={saveStoreInfo} disabled={savingStore} className="gap-2">
          <Save className="w-4 h-4" />
          {savingStore ? "Salvando..." : "Salvar Dados da Loja"}
        </Button>
      </div>

      {/* Social Links */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground text-lg flex items-center gap-2">
            <Share2 className="w-5 h-5 text-muted-foreground" />
            Redes Sociais
          </h3>
          <Button variant="outline" size="sm" onClick={addSocialLink} className="gap-1.5">
            <Plus className="w-4 h-4" /> Adicionar
          </Button>
        </div>

        {socialLinks.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma rede social cadastrada. Clique em "Adicionar" para começar.</p>
        )}

        <div className="space-y-3">
          {socialLinks.map((link, index) => (
            <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="flex items-center gap-2">
                <Select
                  value={link.platform}
                  onValueChange={(val) => updateSocialLink(index, "platform", val)}
                >
                  <SelectTrigger className="w-[56px] shrink-0">
                    {(() => {
                      const Icon = PLATFORM_ICONS[link.platform] || Share2;
                      return <Icon className="w-5 h-5" />;
                    })()}
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORM_OPTIONS.map((opt) => {
                      const Icon = PLATFORM_ICONS[opt.value] || Share2;
                      return (
                        <SelectItem key={opt.value} value={opt.value}>
                          <span className="flex items-center gap-2">
                            <Icon className="w-4 h-4" />
                            {opt.label}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeSocialLink(index)}
                  className="text-destructive hover:text-destructive/80 shrink-0 sm:hidden"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2 flex-1">
                <Input
                  placeholder="https://..."
                  value={link.url}
                  onChange={(e) => updateSocialLink(index, "url", e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeSocialLink(index)}
                  className="text-destructive hover:text-destructive/80 shrink-0 hidden sm:flex"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {socialLinks.length > 0 && (
          <Button onClick={saveSocialLinks} disabled={savingSocial} className="gap-2">
            <Save className="w-4 h-4" />
            {savingSocial ? "Salvando..." : "Salvar Redes Sociais"}
          </Button>
        )}
      </div>

      {/* Promo Banner (Categorias) */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Megaphone className="w-5 h-5 text-muted-foreground" />
            <div>
              <h3 className="font-semibold text-foreground text-lg">Banner Promocional (Categorias)</h3>
              <p className="text-sm text-muted-foreground">Exibido no topo das páginas Meninos / Meninas</p>
            </div>
          </div>
          <Switch
            checked={promoBanner.enabled}
            onCheckedChange={(v) => setPromoBanner({ ...promoBanner, enabled: v })}
          />
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Título principal</label>
            <Input
              value={promoBanner.title}
              onChange={(e) => setPromoBanner({ ...promoBanner, title: e.target.value })}
              placeholder="Ex: 3 CONJUNTOS POR R$100 | 5 POR R$150"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Subtítulo</label>
            <Input
              value={promoBanner.subtitle}
              onChange={(e) => setPromoBanner({ ...promoBanner, subtitle: e.target.value })}
              placeholder="Ex: Desconto automático no pedido"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Texto menor</label>
            <Textarea
              rows={2}
              value={promoBanner.small_text}
              onChange={(e) => setPromoBanner({ ...promoBanner, small_text: e.target.value })}
              placeholder="Ex: Válido enquanto durar o estoque • Entrega em Manaus"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Exibir em</label>
            <Select
              value={promoBanner.show_on}
              onValueChange={(v) => setPromoBanner({ ...promoBanner, show_on: v as PromoBannerConfig["show_on"] })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ambos">Ambos (Meninos e Meninas)</SelectItem>
                <SelectItem value="meninos">Apenas Meninos</SelectItem>
                <SelectItem value="meninas">Apenas Meninas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button onClick={savePromoBanner} disabled={savingPromo} className="gap-2">
          <Save className="w-4 h-4" />
          {savingPromo ? "Salvando..." : "Salvar Banner Promocional"}
        </Button>
      </div>

      {/* Maintenance */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wrench className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="font-medium text-foreground">Colocar Site em Manutenção</p>
              <p className="text-sm text-muted-foreground">
                {maintenance.enabled
                  ? `Ativo — "${maintenance.title}"`
                  : "Os clientes verão uma mensagem personalizada"}
              </p>
            </div>
          </div>
          <Switch checked={maintenance.enabled} onCheckedChange={handleToggle} />
        </div>
      </div>

      {/* Dialog to set maintenance message */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Mensagem de Manutenção</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Título</label>
              <Input
                placeholder="Ex: Site em Manutenção"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Subtítulo</label>
              <Input
                placeholder="Ex: Voltamos em breve!"
                value={formSubtitle}
                onChange={(e) => setFormSubtitle(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleConfirmEnable}>Ativar Manutenção</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSettings;
