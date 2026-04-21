import { Link } from "react-router-dom";
import type { SecondaryBannerProps } from "@/components/admin/layout/types";

const SecondaryBanner = (props: SecondaryBannerProps) => {
  const { image_url, image_url_mobile, title, subtitle, cta_text, link, bg_color } = props;
  if (!image_url && !title) return null;

  const style = bg_color ? { backgroundColor: `hsl(${bg_color})` } : undefined;

  const content = (
    <div
      className="relative overflow-hidden rounded-3xl aspect-[16/6] md:aspect-[16/5] shadow-sm"
      style={style}
    >
      {image_url && (
        <picture>
          {image_url_mobile && <source media="(max-width: 768px)" srcSet={image_url_mobile} />}
          <img
            src={image_url}
            alt={title || "Banner promocional"}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover"
          />
        </picture>
      )}
      {(title || subtitle || cta_text) && (
        <>
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/40 via-foreground/20 to-transparent" />
          <div className="absolute inset-0 flex flex-col justify-center px-6 md:px-12 text-white max-w-xl">
            {title && (
              <h3 className="font-heading font-extrabold text-2xl md:text-4xl leading-tight drop-shadow">
                {title}
              </h3>
            )}
            {subtitle && <p className="text-sm md:text-base mt-2 opacity-95">{subtitle}</p>}
            {cta_text && (
              <span className="inline-flex w-fit mt-4 px-5 py-2.5 rounded-full bg-white text-foreground text-sm font-bold shadow hover:scale-105 transition-transform">
                {cta_text}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );

  return (
    <section className="py-8 md:py-12">
      <div className="container">
        {link ? <Link to={link}>{content}</Link> : content}
      </div>
    </section>
  );
};

export default SecondaryBanner;
