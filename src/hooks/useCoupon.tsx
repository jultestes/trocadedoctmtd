import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { COUPON_PARAM, COUPON_STORAGE_KEY, slugifyUtm } from "@/lib/coupon";

export type AppliedCoupon = {
  id: string;
  name: string;
  description: string | null;
  utm_code: string | null;
  min_quantity: number;
  bundle_price: number;
  active: boolean;
  display_title?: string | null;
  display_order?: number | null;
  show_in_cart?: boolean | null;
};

type CouponContextType = {
  coupon: AppliedCoupon | null;
  loading: boolean;
  applyByCode: (code: string) => Promise<{ ok: boolean; message: string }>;
  applyCoupon: (c: AppliedCoupon) => void;
  remove: () => void;
};

const CouponContext = createContext<CouponContextType | null>(null);

export const CouponProvider = ({ children }: { children: ReactNode }) => {
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchByCode = useCallback(async (code: string): Promise<AppliedCoupon | null> => {
    const slug = slugifyUtm(code);
    if (!slug) return null;
    const { data } = await (supabase as any)
      .from("coupons")
      .select("*")
      .eq("active", true)
      .ilike("utm_code", slug)
      .maybeSingle();
    return (data as AppliedCoupon) || null;
  }, []);

  const applyByCode = useCallback(async (code: string) => {
    setLoading(true);
    try {
      const found = await fetchByCode(code);
      if (!found) {
        return { ok: false, message: "Cupom não encontrado ou inativo" };
      }
      setCoupon(found);
      try { localStorage.setItem(COUPON_STORAGE_KEY, found.utm_code || code); } catch {}
      return { ok: true, message: `Cupom "${found.name}" aplicado!` };
    } finally {
      setLoading(false);
    }
  }, [fetchByCode]);

  const remove = useCallback(() => {
    setCoupon(null);
    try { localStorage.removeItem(COUPON_STORAGE_KEY); } catch {}
  }, []);

  // On mount: detect from URL ?cupom=... or restore from storage
  useEffect(() => {
    const url = new URL(window.location.href);
    const fromUrl = url.searchParams.get(COUPON_PARAM);
    let candidate: string | null = fromUrl;
    if (fromUrl) {
      // Clean URL so the ?cupom param doesn't stay around
      url.searchParams.delete(COUPON_PARAM);
      const newSearch = url.searchParams.toString();
      const newUrl = `${url.pathname}${newSearch ? `?${newSearch}` : ""}${url.hash}`;
      window.history.replaceState({}, "", newUrl);
    } else {
      try { candidate = localStorage.getItem(COUPON_STORAGE_KEY); } catch {}
    }
    if (candidate) {
      applyByCode(candidate).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <CouponContext.Provider value={{ coupon, loading, applyByCode, remove }}>
      {children}
    </CouponContext.Provider>
  );
};

export const useCoupon = () => {
  const ctx = useContext(CouponContext);
  if (!ctx) throw new Error("useCoupon must be used within CouponProvider");
  return ctx;
};
