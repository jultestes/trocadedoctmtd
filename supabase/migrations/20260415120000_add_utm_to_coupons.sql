ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS utm_code text;
UPDATE public.coupons SET utm_code = lower(regexp_replace(translate(name, 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'), '[^a-zA-Z0-9]+', '-', 'g')) WHERE utm_code IS NULL OR utm_code = '';
UPDATE public.coupons SET utm_code = trim(both '-' from utm_code) WHERE utm_code IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS coupons_utm_code_unique_idx ON public.coupons (lower(utm_code)) WHERE utm_code IS NOT NULL AND utm_code <> '';
