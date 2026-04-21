import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import type { MiniBannerItem } from "@/components/admin/layout/types";

interface MiniBannersProps {
  items?: MiniBannerItem[];
}

const widthClass = (w?: string) => {
  switch (w) {
    case "full":
      return "col-span-12";
    case "two_thirds":
      return "col-span-12 md:col-span-8";
    case "half":
      return "col-span-12 md:col-span-6";
    case "third":
    default:
      return "col-span-12 sm:col-span-6 md:col-span-4";
  }
};

const MiniBanners = ({ items }: MiniBannersProps) => {
  const list = (items || []).filter((i) => i.active !== false && (i.image_url || i.title));
  if (list.length === 0) return null;

  return (
    <section className="py-6 md:py-10">
      <div className="container">
        <div className="grid grid-cols-12 gap-3 md:gap-4">
          {list.map((item, i) => {
            const inner = (
              <div
                className="relative w-full h-full overflow-hidden rounded-2xl shadow-sm hover:shadow-md transition-all group"
                style={{ backgroundColor: item.bg_color ? `hsl(${item.bg_color})` : undefined }}
              >
                {item.image_url && (
                  <picture>
                    {item.image_url_mobile && (
                      <source media="(max-width: 768px)" srcSet={item.image_url_mobile} />
                    )}
                    <img
                      src={item.image_url}
                      alt={item.title || "Mini banner"}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </picture>
                )}
                {(item.title || item.cta_text) && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-t from-foreground/40 via-transparent to-transparent" />
                    <div className="absolute inset-0 flex flex-col justify-end p-4 md:p-5 text-primary-foreground">
                      {item.title && (
                        <h3 className="font-heading font-extrabold text-base md:text-xl drop-shadow">
                          {item.title}
                        </h3>
                      )}
                      {item.cta_text && (
                        <span className="inline-flex items-center gap-1 mt-1.5 text-xs font-bold opacity-95 group-hover:gap-2 transition-all">
                          {item.cta_text} <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
            const aspect = item.aspect_desktop || "16/9";
            const aspectMobile = item.aspect_mobile || aspect;
            return (
              <div
                key={i}
                className={widthClass(item.width)}
                style={{
                  aspectRatio: aspect,
                  ["--mb-aspect-mobile" as any]: aspectMobile,
                }}
              >
                {item.link ? (
                  <Link to={item.link} className="block w-full h-full">
                    {inner}
                  </Link>
                ) : (
                  inner
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default MiniBanners;
