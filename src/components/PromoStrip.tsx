import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import type { PromoStripItem } from "@/components/admin/layout/types";

interface PromoStripProps {
  items?: PromoStripItem[];
  bg_color?: string;
}

const DEFAULT_ITEMS: PromoStripItem[] = [
  { text: "3 conjuntos por R$100", link: "/categoria/meninas" },
  { text: "5 peças por R$150", link: "/categoria/meninos" },
];

const PromoStrip = ({ items, bg_color }: PromoStripProps) => {
  const list = items && items.length > 0 ? items : DEFAULT_ITEMS;
  const style = bg_color ? { backgroundColor: `hsl(${bg_color})` } : undefined;

  return (
    <section
      className="py-3 border-y border-border bg-primary/10"
      style={style}
    >
      <div className="container">
        <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4">
          <Sparkles className="w-4 h-4 text-primary shrink-0" />
          {list.map((item, i) => (
            <Link
              key={i}
              to={item.link || "#"}
              className="text-xs md:text-sm font-bold text-foreground hover:text-primary transition-colors px-3 py-1 rounded-full hover:bg-background/60"
            >
              {item.text}
              {i < list.length - 1 && <span className="ml-3 md:ml-4 text-foreground/30">|</span>}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PromoStrip;
