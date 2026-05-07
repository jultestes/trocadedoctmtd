import { Link } from "react-router-dom";
import HorizontalScroller from "./HorizontalScroller";
import type { CategoryCircle } from "@/components/admin/layout/types";

const isVipItem = (title?: string) => {
  if (!title) return false;
  const t = title.toLowerCase();
  return t.includes("vip") || t.includes("ofertas exclusivas");
};

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 0 1 8.413 3.488 11.82 11.82 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l-.999 3.648 3.978-1.607zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.074-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/>
  </svg>
);

interface CategoryCirclesProps {
  title?: string;
  items?: CategoryCircle[];
}

const DEFAULT_ITEMS: CategoryCircle[] = [
  { title: "Meninas", link: "/categoria/meninas", bg_color: "332 80% 92%", active: true },
  { title: "Meninos", link: "/categoria/meninos", bg_color: "199 80% 90%", active: true },
  { title: "Promoções", link: "/categoria/promocoes", bg_color: "45 90% 88%", active: true },
  { title: "Pijamas", link: "/categoria/pijamas", bg_color: "271 60% 92%", active: true },
  { title: "Conjuntos", link: "/categoria/conjuntos", bg_color: "150 50% 88%", active: true },
  { title: "Vestidos", link: "/categoria/vestidos", bg_color: "10 80% 92%", active: true },
];

const Circle = ({ item }: { item: CategoryCircle }) => {
  const vip = isVipItem(item.title);
  return (
    <Link
      to={item.link || "/"}
      target={vip && item.link?.startsWith("http") ? "_blank" : undefined}
      rel={vip && item.link?.startsWith("http") ? "noopener noreferrer" : undefined}
      className="group flex flex-col items-center gap-3 snap-start shrink-0"
    >
      <div className="relative pb-3 md:pb-4">
        <div
          className="relative w-24 h-24 md:w-[160px] md:h-[160px] rounded-full overflow-hidden ring-2 ring-white shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-300"
          style={{ backgroundColor: item.bg_color ? `hsl(${item.bg_color})` : "hsl(var(--muted))" }}
        >
          {item.image_url && (
            <img
              src={item.image_url}
              alt={item.title}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
        </div>
        {vip && (
          <div className="absolute left-1/2 -translate-x-1/2 bottom-0 flex items-center gap-1 md:gap-1.5 bg-primary text-primary-foreground rounded-full pl-2 pr-1 py-0.5 md:pl-3 md:pr-1 md:py-1 shadow-md whitespace-nowrap">
            <span className="text-[8px] md:text-[11px] font-bold tracking-wide uppercase leading-none">
              Ofertas Exclusivas
            </span>
            <span className="flex items-center justify-center w-3.5 h-3.5 md:w-5 md:h-5 rounded-full bg-primary-foreground/20">
              <WhatsAppIcon className="w-2.5 h-2.5 md:w-3.5 md:h-3.5" />
            </span>
          </div>
        )}
      </div>
      <span className="text-[11px] md:text-base font-semibold text-foreground text-center leading-tight whitespace-nowrap">
        {item.title}
      </span>
    </Link>
  );
};

const CategoryCircles = ({ title, items }: CategoryCirclesProps) => {
  const list = (items && items.length > 0 ? items : DEFAULT_ITEMS).filter((i) => i.active !== false);
  if (list.length === 0) return null;

  return (
    <section className="py-4 md:py-6 bg-background">
      <div className="container">
        {title && (
          <h2 className="text-base md:text-xl font-heading font-bold text-foreground text-center mb-4 md:mb-5">
            {title}
          </h2>
        )}

        {/* Desktop: linha centralizada */}
        <div className="hidden md:flex items-start justify-center gap-10 lg:gap-14 flex-wrap">
          {list.map((item, i) => <Circle key={i} item={item} />)}
        </div>

        {/* Mobile: carrossel horizontal */}
        <div className="md:hidden -mx-4">
          <HorizontalScroller scrollAmount={200}>
            {list.map((item, i) => (
              <div key={i} className="snap-start">
                <Circle item={item} />
              </div>
            ))}
          </HorizontalScroller>
        </div>
      </div>
    </section>
  );
};

export default CategoryCircles;
