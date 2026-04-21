import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";

export type PromoBannerConfig = {
  enabled: boolean;
  show_on: "meninos" | "meninas" | "ambos";
  title: string;
  subtitle: string;
  small_text: string;
};

interface PromoBannerProps {
  variant: "meninos" | "meninas";
  config: PromoBannerConfig;
}

const PromoBanner = ({ variant, config }: PromoBannerProps) => {
  if (!config.enabled) return null;
  if (config.show_on !== "ambos" && config.show_on !== variant) return null;

  const isMenina = variant === "meninas";
  const palette = isMenina
    ? {
        bg: "bg-pink-50",
        ring: "ring-pink-200",
        title: "text-pink-700",
        subtitle: "text-pink-900/70",
        small: "text-pink-900/50",
        blob1: "bg-pink-200/60",
        blob2: "bg-rose-200/50",
        blob3: "bg-fuchsia-200/40",
      }
    : {
        bg: "bg-sky-50",
        ring: "ring-sky-200",
        title: "text-sky-700",
        subtitle: "text-sky-900/70",
        small: "text-sky-900/50",
        blob1: "bg-sky-200/60",
        blob2: "bg-blue-200/50",
        blob3: "bg-indigo-200/40",
      };

  return (
    <section
      className={`relative overflow-hidden rounded-2xl ring-1 ${palette.ring} ${palette.bg} px-5 py-6 md:px-10 md:py-8 mb-6`}
    >
      {/* Decorative organic blobs */}
      <div className={`pointer-events-none absolute -top-10 -left-10 h-40 w-40 rounded-full blur-2xl ${palette.blob1}`} />
      <div className={`pointer-events-none absolute -bottom-12 right-0 h-44 w-44 rounded-full blur-3xl ${palette.blob2}`} />
      <div className={`pointer-events-none absolute top-1/2 left-1/3 h-24 w-24 rounded-full blur-2xl ${palette.blob3}`} />

      <div className="relative flex flex-col items-center text-center gap-3">
        <span className={`inline-flex items-center gap-1.5 text-[10px] md:text-xs font-bold uppercase tracking-widest ${palette.subtitle}`}>
          <Sparkles className="w-3.5 h-3.5" />
          Promoção especial
        </span>

        <h2 className={`font-heading font-extrabold leading-tight text-2xl md:text-4xl ${palette.title}`}>
          {config.title}
        </h2>

        {config.subtitle && (
          <p className={`text-sm md:text-base font-semibold ${palette.subtitle}`}>
            {config.subtitle}
          </p>
        )}

        {config.small_text && (
          <p className={`text-xs md:text-sm ${palette.small}`}>
            {config.small_text}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
          <Link
            to="/categoria/meninas"
            className="inline-flex items-center gap-2 rounded-full bg-pink-500 hover:bg-pink-600 text-white px-5 py-2.5 text-sm font-bold shadow-sm transition-colors"
          >
            <span aria-hidden>👧</span>
            MENINA
          </Link>
          <Link
            to="/categoria/meninos"
            className="inline-flex items-center gap-2 rounded-full bg-sky-500 hover:bg-sky-600 text-white px-5 py-2.5 text-sm font-bold shadow-sm transition-colors"
          >
            <span aria-hidden>👦</span>
            MENINO
          </Link>
        </div>
      </div>
    </section>
  );
};

export default PromoBanner;
