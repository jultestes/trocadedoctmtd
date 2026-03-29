
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS delivery_type text NOT NULL DEFAULT 'delivery',
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS customer_email text,
  ADD COLUMN IF NOT EXISTS customer_phone text,
  ADD COLUMN IF NOT EXISTS address_cep text,
  ADD COLUMN IF NOT EXISTS address_street text,
  ADD COLUMN IF NOT EXISTS address_neighborhood text,
  ADD COLUMN IF NOT EXISTS address_number text,
  ADD COLUMN IF NOT EXISTS address_complement text,
  ADD COLUMN IF NOT EXISTS address_city text,
  ADD COLUMN IF NOT EXISTS address_uf text,
  ADD COLUMN IF NOT EXISTS shipping_price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS order_nsu text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';

-- Allow anon to insert sales (for checkout without auth)
CREATE POLICY "Anyone can insert sales" ON public.sales FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can insert sale_items" ON public.sale_items FOR INSERT TO public WITH CHECK (true);
