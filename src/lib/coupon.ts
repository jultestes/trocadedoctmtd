// Helpers for coupon UTM/slug handling
export const slugifyUtm = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const COUPON_PARAM = "cupom";
export const COUPON_STORAGE_KEY = "tmtd_applied_coupon";
