import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { BannerSlide } from "@/components/admin/layout/types";
import { useIsMobile } from "@/hooks/use-mobile";

interface HeroBannerProps {
  banners?: BannerSlide[];
}

const HeroBanner = ({ banners }: HeroBannerProps) => {
  const slides = banners && banners.length > 0 ? banners : [];
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  if (slides.length === 0) return null;

  const prev = () => setCurrent((c) => (c === 0 ? slides.length - 1 : c - 1));
  const next = () => setCurrent((c) => (c + 1) % slides.length);

  const handleBannerClick = (slide: BannerSlide) => {
    if (!slide.clickable || !slide.link) return;
    if (slide.link.startsWith("http")) {
      window.location.href = slide.link;
    } else {
      navigate(slide.link);
    }
  };

  const getImageUrl = (slide: BannerSlide) => {
    if (isMobile && slide.image_url_mobile) return slide.image_url_mobile;
    return slide.image_url;
  };

  return (
    <section className="relative w-full overflow-hidden" style={{ aspectRatio: isMobile ? "4/5" : "16/5" }}>
      {slides.map((slide, i) => (
        <div
          key={i}
          className={`${i === current ? "relative" : "absolute inset-0"} transition-opacity duration-700 ${i === current ? "opacity-100" : "opacity-0 pointer-events-none"} ${slide.clickable && slide.link ? "cursor-pointer" : ""}`}
          style={{ aspectRatio: isMobile ? "4/5" : "16/5" }}
          onClick={() => handleBannerClick(slide)}
        >
          {getImageUrl(slide) ? (
            <img
              src={getImageUrl(slide) || ""}
              alt={slide.title}
              className="w-full h-full object-cover block"
              loading={i === 0 ? "eager" : "lazy"}
              decoding="async"
              fetchPriority={i === 0 ? "high" : "low"}
            />
          ) : (
            <div
              className="w-full aspect-[16/5]"
              style={{ backgroundColor: slide.bg_color ? `hsl(${slide.bg_color})` : "hsl(var(--primary))" }}
            />
          )}

          {!slide.clickable && (slide.title || slide.subtitle || slide.cta_text) && (
            <>
              <div className="absolute inset-0 bg-gradient-to-r from-foreground/50 to-transparent" />
              <div className="absolute inset-0 flex items-center">
                <div className="container">
                  <div className="max-w-lg space-y-4 animate-fade-in">
                    {slide.title && (
                      <h2 className="text-3xl md:text-5xl font-bold font-heading text-primary-foreground drop-shadow-lg">
                        {slide.title}
                      </h2>
                    )}
                    {slide.subtitle && (
                      <p className="text-base md:text-lg text-primary-foreground/90 drop-shadow">
                        {slide.subtitle}
                      </p>
                    )}
                    {slide.cta_text && (
                      <button className="bg-accent text-accent-foreground font-bold px-6 py-3 rounded-full text-sm hover:brightness-110 transition-all shadow-lg">
                        {slide.cta_text}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      ))}

      {slides.length > 1 && (
        <>
          <button onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 bg-primary-foreground/80 hover:bg-primary-foreground rounded-full p-2 shadow-lg transition-colors z-10">
            <ChevronLeft className="w-5 h-5 text-primary" />
          </button>
          <button onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 bg-primary-foreground/80 hover:bg-primary-foreground rounded-full p-2 shadow-lg transition-colors z-10">
            <ChevronRight className="w-5 h-5 text-primary" />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-3 h-3 rounded-full transition-all ${i === current ? "bg-accent w-8" : "bg-primary-foreground/50"}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
};

export default HeroBanner;
