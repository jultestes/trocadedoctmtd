import type { CartItem } from "@/hooks/useCart";
import type { AppliedCoupon } from "@/hooks/useCoupon";

export type CouponCalculation = {
  /** Sum of items at original prices (no coupon) */
  originalTotal: number;
  /** Final total after applying the bundle discount */
  finalTotal: number;
  /** Difference originalTotal - finalTotal (>= 0) */
  discount: number;
  /** Whether the coupon actually produced a discount */
  applied: boolean;
  /** How many full bundles were applied */
  bundlesApplied: number;
};

/**
 * Calculates the bundle-style coupon discount.
 *
 * Rule: every group of `min_quantity` units (taken from the most expensive
 * units first to maximize customer benefit) is charged at `bundle_price`
 * instead of the sum of their original unit prices. Remaining units (less
 * than `min_quantity`) keep their original price.
 */
export function calculateCouponDiscount(
  items: CartItem[],
  coupon: AppliedCoupon | null,
): CouponCalculation {
  const originalTotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  if (!coupon || !coupon.active || coupon.min_quantity <= 0) {
    return { originalTotal, finalTotal: originalTotal, discount: 0, applied: false, bundlesApplied: 0 };
  }

  // Expand each unit so bundles can mix sizes/products
  const units: number[] = [];
  for (const it of items) {
    for (let i = 0; i < it.quantity; i++) units.push(it.price);
  }
  // Sort desc so the most expensive units form the bundles
  units.sort((a, b) => b - a);

  const min = coupon.min_quantity;
  const bundlePrice = Number(coupon.bundle_price) || 0;
  const bundlesApplied = Math.floor(units.length / min);

  if (bundlesApplied === 0) {
    return { originalTotal, finalTotal: originalTotal, discount: 0, applied: false, bundlesApplied: 0 };
  }

  const bundledUnits = units.slice(0, bundlesApplied * min);
  const remainderUnits = units.slice(bundlesApplied * min);

  const bundledOriginal = bundledUnits.reduce((s, p) => s + p, 0);
  const bundledNew = bundlesApplied * bundlePrice;
  const remainderTotal = remainderUnits.reduce((s, p) => s + p, 0);

  const finalTotal = bundledNew + remainderTotal;
  const discount = Math.max(0, originalTotal - finalTotal);

  return {
    originalTotal,
    finalTotal,
    discount,
    applied: discount > 0,
    bundlesApplied,
  };
}
