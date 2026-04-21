import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import type { ShortcutCard } from "@/components/admin/layout/types";

interface ShortcutCardsProps {
  cards?: ShortcutCard[];
}

const DEFAULT_CARDS: ShortcutCard[] = [
  { title: "Meninos", subtitle: "Estilo e conforto", link: "/categoria/meninos", bg_color: "199 80% 90%" },
  { title: "Meninas", subtitle: "Looks delicados", link: "/categoria/meninas", bg_color: "332 80% 92%" },
  { title: "Promoções", subtitle: "Ofertas especiais", link: "/categoria/meninas", bg_color: "45 90% 88%" },
];

const ShortcutCards = ({ cards }: ShortcutCardsProps) => {
  const list = cards && cards.length > 0 ? cards : DEFAULT_CARDS;

  return (
    <section className="py-10 md:py-14">
      <div className="container">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
          {list.map((card, i) => (
            <Link
              key={i}
              to={card.link}
              className="group relative overflow-hidden rounded-3xl aspect-[4/3] sm:aspect-[3/4] md:aspect-[4/3] shadow-sm hover:shadow-lg transition-all duration-300"
              style={{ backgroundColor: card.bg_color ? `hsl(${card.bg_color})` : undefined }}
            >
              {card.image_url && (
                <img
                  src={card.image_url}
                  alt={card.title}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/40 via-transparent to-transparent" />
              <div className="absolute inset-0 flex flex-col justify-end p-5 md:p-6 text-white">
                <h3 className="font-heading font-extrabold text-xl md:text-2xl drop-shadow">
                  {card.title}
                </h3>
                {card.subtitle && (
                  <p className="text-xs md:text-sm font-medium opacity-90 mt-1">{card.subtitle}</p>
                )}
                <span className="inline-flex items-center gap-1 mt-2 text-xs font-bold opacity-90 group-hover:gap-2 transition-all">
                  Ver mais <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ShortcutCards;
