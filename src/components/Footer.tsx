import { useEffect, useState } from "react";
import { Mail, Phone, MapPin, Instagram, Facebook, MessageCircle, Youtube, Twitter } from "lucide-react";
import logo from "@/assets/logo-tmtd.svg";
import { supabase } from "@/integrations/supabase/client";

type StoreInfo = {
  location: string;
  whatsapp: string;
  email: string;
};

type SocialLink = {
  platform: string;
  url: string;
};

const SOCIAL_ICONS: Record<string, React.ElementType> = {
  instagram: Instagram,
  facebook: Facebook,
  whatsapp: MessageCircle,
  youtube: Youtube,
  twitter: Twitter,
  tiktok: Youtube,
  telegram: MessageCircle,
  pinterest: Instagram,
};

const Footer = () => {
  const [storeInfo, setStoreInfo] = useState<StoreInfo>({
    location: "",
    whatsapp: "",
    email: "",
  });
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("key, value")
      .in("key", ["store_info", "social_links"])
      .then(({ data }) => {
        if (data) {
          for (const row of data) {
            if (row.key === "store_info") {
              setStoreInfo(row.value as unknown as StoreInfo);
            }
            if (row.key === "social_links") {
              setSocialLinks(row.value as unknown as SocialLink[]);
            }
          }
        }
      });
  }, []);

  return (
    <footer className="bg-footer-bg text-footer-fg">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <img src={logo} alt="TMTD Kids" className="h-10 w-auto" />
            </div>
            <p className="text-sm opacity-80">
              A infância é uma só. Vista seu filho com carinho e estilo.
            </p>
            {socialLinks.length > 0 && (
              <div className="flex gap-3">
                {socialLinks.map((link, i) => {
                  const Icon = SOCIAL_ICONS[link.platform] || Instagram;
                  return (
                    <a
                      key={i}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-accent transition-colors"
                      aria-label={link.platform}
                    >
                      <Icon className="w-5 h-5" />
                    </a>
                  );
                })}
              </div>
            )}
            {socialLinks.length === 0 && (
              <div className="flex gap-3">
                <a href="#" className="hover:text-accent transition-colors">
                  <Instagram className="w-5 h-5" />
                </a>
                <a href="#" className="hover:text-accent transition-colors">
                  <Facebook className="w-5 h-5" />
                </a>
              </div>
            )}
          </div>

          {/* Links */}
          <div>
            <h4 className="font-heading font-semibold text-primary-foreground mb-4">
              Categorias
            </h4>
            <ul className="space-y-2 text-sm opacity-80">
              <li><a href="#" className="hover:text-accent transition-colors">Meninas</a></li>
              <li><a href="#" className="hover:text-accent transition-colors">Meninos</a></li>
              <li><a href="#" className="hover:text-accent transition-colors">Bebês</a></li>
              <li><a href="#" className="hover:text-accent transition-colors">Outlet</a></li>
              <li><a href="#" className="hover:text-accent transition-colors">Lançamentos</a></li>
            </ul>
          </div>

          {/* Institutional */}
          <div>
            <h4 className="font-heading font-semibold text-primary-foreground mb-4">
              Institucional
            </h4>
            <ul className="space-y-2 text-sm opacity-80">
              <li><a href="/acompanhar-pedido" className="hover:text-accent transition-colors">Acompanhar Pedido</a></li>
              <li><a href="#" className="hover:text-accent transition-colors">Sobre Nós</a></li>
              <li><a href="#" className="hover:text-accent transition-colors">Política de Troca</a></li>
              <li><a href="#" className="hover:text-accent transition-colors">Política de Privacidade</a></li>
              <li><a href="#" className="hover:text-accent transition-colors">Termos de Uso</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-heading font-semibold text-primary-foreground mb-4">
              Contato
            </h4>
            <ul className="space-y-3 text-sm opacity-80">
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 shrink-0" />
                <span>{storeInfo.whatsapp || "Carregando..."}</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 shrink-0" />
                <span>{storeInfo.email || "Carregando..."}</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{storeInfo.location || "Carregando..."}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-primary/20">
        <div className="container py-4 text-center text-xs opacity-60">
          © 2026 TMTD Kids. Todos os direitos reservados. ✨
        </div>
      </div>
    </footer>
  );
};

export default Footer;
