import { Link } from "react-router-dom";
import HorizontalScroller from "./HorizontalScroller";
import type { CategoryCircle } from "@/components/admin/layout/types";

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

const Circle = ({ item }: { item: CategoryCircle }) => (
  <Link
    to={item.link || "/"}
    className="group flex flex-col items-center gap-3 snap-start shrink-0"
  >
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
    <span className="text-sm md:text-base font-semibold text-foreground text-center max-w-[6rem] md:max-w-[10rem] truncate">
      {item.title}
    </span>
  </Link>
);

const CategoryCircles = ({ title, items }: CategoryCirclesProps) => {
  const list = (items && items.length > 0 ? items : DEFAULT_ITEMS).filter((i) => i.active !== false);
  if (list.length === 0) return null;

  return (
    <section className="py-6 md:py-10 bg-background">
      <div className="container">
        {title && (
          <h2 className="text-base md:text-xl font-heading font-bold text-foreground text-center mb-4 md:mb-6">
            {title}
          </h2>
        )}

        {/* Desktop: linha centralizada */}
        <div className="hidden md:flex items-start justify-center gap-8 flex-wrap">
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
