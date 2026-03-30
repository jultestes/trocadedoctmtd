export type ImageTransformOptions = {
  width?: number;
  height?: number;
  quality?: number;
  resize?: "cover" | "contain" | "fill";
};

const SUPABASE_OBJECT_SEGMENT = "/storage/v1/object/public/";
const SUPABASE_RENDER_SEGMENT = "/storage/v1/render/image/public/";

export function isTransformableImage(src?: string | null) {
  if (!src || src.startsWith("data:") || src.startsWith("blob:")) return false;

  try {
    const url = new URL(src);
    return url.pathname.includes(SUPABASE_OBJECT_SEGMENT);
  } catch {
    return false;
  }
}

export function getOptimizedImageUrl(src?: string | null, options: ImageTransformOptions = {}) {
  if (!src || !isTransformableImage(src)) return src || "";

  const { width, height, quality = 55, resize = "cover" } = options;
  const url = new URL(src);

  url.pathname = url.pathname.replace(SUPABASE_OBJECT_SEGMENT, SUPABASE_RENDER_SEGMENT);

  if (width) url.searchParams.set("width", String(Math.round(width)));
  if (height) url.searchParams.set("height", String(Math.round(height)));
  if (width || height) url.searchParams.set("resize", resize);
  url.searchParams.set("quality", String(quality));

  return url.toString();
}

export function getResponsiveImageSrcSet(
  src?: string | null,
  widths: number[] = [],
  options: Omit<ImageTransformOptions, "width"> = {},
) {
  if (!src || !isTransformableImage(src) || widths.length === 0) return undefined;

  const uniqueWidths = [...new Set(widths)].sort((a, b) => a - b);

  return uniqueWidths
    .map((width) => `${getOptimizedImageUrl(src, { ...options, width })} ${width}w`)
    .join(", ");
}