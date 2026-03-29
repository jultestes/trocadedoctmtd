
-- 1. Create a secure function to look up a sale by NSU (returns only one row)
CREATE OR REPLACE FUNCTION public.get_sale_by_nsu(_nsu text)
RETURNS SETOF sales
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.sales WHERE order_nsu = _nsu LIMIT 1;
$$;

-- 2. Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can read sale by nsu" ON public.sales;

-- 3. Create a restrictive replacement (anon/authenticated can't SELECT directly)
-- Admins still have full access via the existing ALL policy
