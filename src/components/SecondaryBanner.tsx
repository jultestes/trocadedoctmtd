import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { SecondaryBannerSlide } from "@/components/admin/layout/types";
import { useIsMobile } from "@/hooks/use-mobile";

interface SecondaryBannerProps {
  // New format: array of slides (carousel)
  slides?: SecondaryBannerSlide[];
  // Legacy single-banner props (back-compat)
  image_url?: string;
  image_url_mobile?: string;
  title?: string;
  subtitle?: string;
  cta_text?: string;
  link?: string;
  bg_color?: string;
}

const SecondaryBanner = (props: SecondaryBannerProps) => {
  const isMobile = useIsMobile();

  // Normalize to slides array (legacy single-banner support)
  const rawSlides: SecondaryBannerSlide[] =
    props.slides && props.slides.length > 0
      ? props.slides
      : props.image_url || props.title
        ? [
            {
              image_url: props.image_url,
              image_url_mobile: props.image_url_mobile,
              title: props.title,
              subtitle: props.subtitle,
              cta_text: props.cta_text,
              link: props.link,
              bg_color: props.bg_color,
              active: true,
            },
          ]
        : [];

  const slides = rawSlides.filter((s) => s.active !== false);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => setCurrent((c) => (c + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, [slides.length]);

  if (slides.length === 0) return null;

  const prev = () => setCurrent((c) => (c === 0 ? slides.length - 1 : c - 1));
  const next = () => setCurrent((c) => (c + 1) % slides.length);

  const getImg = (s: SecondaryBannerSlide) =>
    isMobile && s.image_url_mobile ? s.image_url_mobile : s.image_url;

  return (
    <section className="py-6 md:py-10">
      <div className="container">
        <div className="relative">
          {slides.map((slide, i) => {
            const aspect =
              (isMobile ? slide.aspect_mobile : slide.aspect_desktop) ||
              (isMobile ? "16/6" : "16/5");
            const content = (
              <div
                className="relative overflow-hidden rounded-3xl shadow-sm"
                style={{
                  aspectRatio: aspect,
                  backgroundColor: slide.bg_color ? `hsl(${slide.bg_color})` : undefined,
                }}
              >
                {getImg(slide) && (
                  <img
                    src={getImg(slide) || ""}
                    alt={slide.title || "Banner promocional"}
                    loading={i === 0 ? "eager" : "lazy"}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}
                {(slide.title || slide.subtitle || slide.cta_text) && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-r from-foreground/45 via-foreground/20 to-transparent" />
                    <div className="absolute inset-0 flex flex-col justify-center px-6 md:px-12 text-primary-foreground max-w-xl">
                      {slide.title && (
                        <h3 className="font-heading font-extrabold text-2xl md:text-4xl leading-tight drop-shadow">
                          {slide.title}
                        </h3>
                      )}
                      {slide.subtitle && (
                        <p className="text-sm md:text-base mt-2 opacity-95">{slide.subtitle}</p>
                      )}
                      {slide.cta_text && (
                        <span className="inline-flex w-fit mt-4 px-5 py-2.5 rounded-full bg-background text-foreground text-sm font-bold shadow hover:scale-105 transition-transform">
                          {slide.cta_text}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            );

            return (
              <div
                key={i}
                className={`${i === current ? "relative" : "absolute inset-0"} transition-opacity duration-700 ${i === current ? "opacity-100" : "opacity-0 pointer-events-none"}`}
              >
                {slide.link ? <Link to={slide.link}>{content}</Link> : content}
              </div>
            );
          })}

          {slides.length > 1 && (
            <>
              <button
                onClick={prev}
                aria-label="Anterior"
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-background/85 hover:bg-background rounded-full p-2 shadow-lg transition-colors z-10"
              >
                <ChevronLeft className="w-5 h-5 text-primary" />
              </button>
              <button
                onClick={next}
                aria-label="Próximo"
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-background/85 hover:bg-background rounded-full p-2 shadow-lg transition-colors z-10"
              >
                <ChevronRight className="w-5 h-5 text-primary" />
              </button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrent(i)}
                    aria-label={`Ir para slide ${i + 1}`}
                    className={`h-2.5 rounded-full transition-all ${i === current ? "bg-accent w-6" : "bg-background/70 w-2.5"}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default SecondaryBanner;
