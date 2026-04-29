import { useEffect, useRef, useState, ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  children: ReactNode;
  className?: string;
  /** Pixels to scroll on arrow click */
  scrollAmount?: number;
};

/**
 * Mobile-only horizontal scroll container with discreet left/right arrows.
 * Arrows auto-hide when at start/end. Hidden scrollbar; touch drag works natively.
 */
const HorizontalScroller = ({ children, className = "", scrollAmount = 160 }: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = () => {
    const el = ref.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, []);

  const scrollBy = (dir: 1 | -1) => {
    ref.current?.scrollBy({ left: dir * scrollAmount, behavior: "smooth" });
  };

  return (
    <div className={`relative ${className}`}>
      <div
        ref={ref}
        className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-1 snap-x snap-mandatory scroll-smooth"
      >
        {children}
      </div>

      {canLeft && (
        <button
          type="button"
          aria-label="Rolar para a esquerda"
          onClick={() => scrollBy(-1)}
          className="absolute left-1 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center rounded-full bg-background/80 backdrop-blur-sm text-primary/60 hover:text-primary transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}
      {canRight && (
        <button
          type="button"
          aria-label="Rolar para a direita"
          onClick={() => scrollBy(1)}
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center rounded-full bg-background/80 backdrop-blur-sm text-primary/60 hover:text-primary transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default HorizontalScroller;
