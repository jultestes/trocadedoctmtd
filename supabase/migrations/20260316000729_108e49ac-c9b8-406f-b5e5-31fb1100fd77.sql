
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'pix',
  ADD COLUMN IF NOT EXISTS change_for numeric;
