ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS email_sent_at timestamptz;
