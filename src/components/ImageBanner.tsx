import { Image as ImageIcon } from "lucide-react";

export interface ImageBannerProps {
  image_url?: string;
  image_url_mobile?: string;
  alt?: string;
  link?: string;
  clickable?: boolean;
}

const ImageBanner = ({ image_url, image_url_mobile, alt = "", link, clickable }: ImageBannerProps) => {
  if (!image_url && !image_url_mobile) {
    return (
      <div className="w-full bg-muted/30 border-y border-border py-6 flex items-center justify-center gap-2 text-muted-foreground text-sm">
        <ImageIcon className="w-4 h-4" />
        Envie uma imagem para a faixa promocional
      </div>
    );
  }

  const desktopSrc = image_url || image_url_mobile;
  const mobileSrc = image_url_mobile || image_url;

  const content = (
    <picture className="block w-full">
      {mobileSrc && <source media="(max-width: 767px)" srcSet={mobileSrc} />}
      <img
        src={desktopSrc}
        alt={alt}
        className="block w-full h-auto"
        loading="eager"
        decoding="async"
      />
    </picture>
  );

  return (
    <section className="w-full">
      {clickable && link ? (
        <a href={link} className="block w-full" aria-label={alt || "Faixa promocional"}>
          {content}
        </a>
      ) : (
        content
      )}
    </section>
  );
};

export default ImageBanner;
