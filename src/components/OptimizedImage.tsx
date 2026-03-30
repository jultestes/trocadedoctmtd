import { ImgHTMLAttributes, useMemo, useState } from "react";
import { getOptimizedImageUrl, getResponsiveImageSrcSet, type ImageTransformOptions } from "@/lib/image";

type OptimizedImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet"> &
  ImageTransformOptions & {
    src?: string | null;
    widths?: number[];
    transformWidth?: number;
    transformHeight?: number;
  };

const OptimizedImage = ({
  src,
  alt,
  widths,
  transformWidth,
  transformHeight,
  quality = 55,
  resize = "cover",
  loading = "lazy",
  decoding = "async",
  sizes,
  onError,
  ...props
}: OptimizedImageProps) => {
  const [fallbackToOriginal, setFallbackToOriginal] = useState(false);

  const optimizedSrc = useMemo(() => {
    if (fallbackToOriginal) return src || "";

    return getOptimizedImageUrl(src, {
      width: transformWidth ?? widths?.[0],
      height: transformHeight,
      quality,
      resize,
    });
  }, [fallbackToOriginal, quality, resize, src, transformHeight, transformWidth, widths]);

  const srcSet = useMemo(() => {
    if (fallbackToOriginal) return undefined;

    return getResponsiveImageSrcSet(src, widths, {
      height: transformHeight,
      quality,
      resize,
    });
  }, [fallbackToOriginal, quality, resize, src, transformHeight, widths]);

  if (!src) return null;

  return (
    <img
      {...props}
      src={optimizedSrc || src}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      alt={alt}
      loading={loading}
      decoding={decoding}
      onError={(event) => {
        if (!fallbackToOriginal && optimizedSrc && optimizedSrc !== src) {
          setFallbackToOriginal(true);
          return;
        }

        onError?.(event);
      }}
    />
  );
};

export default OptimizedImage;