import { Truck, Sparkles, Star, Heart } from "lucide-react";

export interface FreeShippingBarProps {
  title?: string;
  region1_label?: string;
  region1_value?: string;
  region2_label?: string;
  region2_value?: string;
  bg_color?: string;
  text_color?: string;
  accent_color_1?: string;
  accent_color_2?: string;
}

const FreeShippingBar = ({
  title = "Frete Grátis",
  region1_label = "Sul e Sudeste",
  region1_value = "compras acima de R$299",
  region2_label = "Demais Regiões",
  region2_value = "compras acima de R$399",
  bg_color = "199 90% 92%",
  text_color = "210 90% 35%",
  accent_color_1 = "332 80% 70%",
  accent_color_2 = "271 60% 65%",
}: FreeShippingBarProps) => {
  const bgStyle = { backgroundColor: `hsl(${bg_color})` };
  const textStyle = { color: `hsl(${text_color})` };
  const accent1 = `hsl(${accent_color_1})`;
  const accent2 = `hsl(${accent_color_2})`;

  return (
    <section className="relative overflow-hidden border-y border-border" style={bgStyle}>
      {/* Decorative left */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 flex items-center gap-1 opacity-80">
        <Heart className="w-5 h-5 md:w-7 md:h-7" style={{ color: accent1 }} fill={accent1} />
        <Star className="hidden sm:block w-4 h-4 md:w-6 md:h-6" style={{ color: accent2 }} fill={accent2} />
        <Sparkles className="hidden md:block w-5 h-5" style={{ color: accent1 }} />
      </div>
      {/* Decorative right */}
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 flex items-center gap-1 opacity-80">
        <Sparkles className="hidden md:block w-5 h-5" style={{ color: accent2 }} />
        <Star className="hidden sm:block w-4 h-4 md:w-6 md:h-6" style={{ color: accent1 }} fill={accent1} />
        <Heart className="w-5 h-5 md:w-7 md:h-7" style={{ color: accent2 }} fill={accent2} />
      </div>

      <div className="container py-3 md:py-4">
        <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-6 text-center">
          <div className="flex items-center gap-2 shrink-0">
            <Truck className="w-6 h-6 md:w-8 md:h-8" style={textStyle} />
            <span
              className="text-xl md:text-3xl font-extrabold font-heading tracking-tight"
              style={textStyle}
            >
              {title}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-4 md:gap-6">
            <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
              <span className="text-xs md:text-sm font-bold" style={textStyle}>
                {region1_label}
              </span>
              <span className="text-[11px] md:text-sm opacity-90" style={textStyle}>
                {region1_value}
              </span>
            </div>
            <span className="hidden sm:inline opacity-40" style={textStyle}>•</span>
            <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
              <span className="text-xs md:text-sm font-bold" style={textStyle}>
                {region2_label}
              </span>
              <span className="text-[11px] md:text-sm opacity-90" style={textStyle}>
                {region2_value}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FreeShippingBar;
