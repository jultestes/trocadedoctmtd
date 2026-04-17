import { useEffect, useState, memo } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import OptimizedImage from "@/components/OptimizedImage";

type Props = {
  images: string[];
  alt: string;
  /** Show arrow controls on hover (desktop). Default: true */
  showArrows?: boolean;
  /** Show dot indicators. Default: true when >1 image */
  showDots?: boolean;
  /** Eager load first image (LCP). Default: false */
  eager?: boolean;
  /** Optional aspect ratio applied to wrapper. Default container controls size */
  className?: string;
  /** Use OptimizedImage (Supabase) vs plain img (R2). Default: true */
  optimized?: boolean;
  /** Sizes attr for responsive */
  sizes?: string;
  /** Click handler on the image area */
  onImageClick?: () => void;
};

const ProductImageCarousel = memo(({
  images,
  alt,
  showArrows = true,
  showDots = true,
  eager = false,
  className = "",
  optimized = true,
  sizes = "(max-width: 768px) 50vw, 25vw",
  onImageClick,
}: Props) => {
  const validImages = images.filter(Boolean);
  const hasMultiple = validImages.length > 1;
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: hasMultiple,
    align: "start",
    containScroll: "trimSnaps",
    dragFree: false,
  });
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelected(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi]);

  if (validImages.length === 0) {
    return <div className={`bg-muted ${className}`} />;
  }

  return (
    <div className={`relative group/carousel h-full w-full ${className}`}>
      <div ref={emblaRef} className="overflow-hidden h-full w-full">
        <div className="flex h-full">
          {validImages.map((src, i) => (
            <div
              key={i}
              className="relative shrink-0 grow-0 basis-full h-full"
              onClick={onImageClick}
            >
              {optimized ? (
                <OptimizedImage
                  src={src}
                  alt={alt}
                  className="w-full h-full object-cover"
                  sizes={sizes}
                  widths={[240, 360, 480, 720]}
                  transformWidth={480}
                  quality={45}
                  loading={eager && i === 0 ? "eager" : "lazy"}
                  fetchPriority={eager && i === 0 ? "high" : "low"}
                  decoding="async"
                />
              ) : (
                <img
                  src={src}
                  alt={alt}
                  className="w-full h-full object-cover"
                  loading={eager && i === 0 ? "eager" : "lazy"}
                  decoding="async"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {hasMultiple && showArrows && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              emblaApi?.scrollPrev();
            }}
            aria-label="Imagem anterior"
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/90 backdrop-blur-sm shadow-md flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity z-10"
          >
            <ChevronLeft className="w-4 h-4 text-foreground" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              emblaApi?.scrollNext();
            }}
            aria-label="Próxima imagem"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/90 backdrop-blur-sm shadow-md flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity z-10"
          >
            <ChevronRight className="w-4 h-4 text-foreground" />
          </button>
        </>
      )}

      {hasMultiple && showDots && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {validImages.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                emblaApi?.scrollTo(i);
              }}
              aria-label={`Ir para imagem ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === selected ? "w-4 bg-primary" : "w-1.5 bg-background/70"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
});

ProductImageCarousel.displayName = "ProductImageCarousel";

export default ProductImageCarousel;
