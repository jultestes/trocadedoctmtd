
-- Cash register openings (one per day)
CREATE TABLE public.cash_registers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opened_at timestamp with time zone NOT NULL DEFAULT now(),
  initial_amount numeric NOT NULL DEFAULT 0,
  register_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT unique_register_date UNIQUE (register_date)
);

ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything with cash_registers"
  ON public.cash_registers FOR ALL TO authenticated
  USING (has_role('admin'::app_role))
  WITH CHECK (has_role('admin'::app_role));

-- Cash withdrawals (sangrias)
CREATE TABLE public.cash_withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cash_register_id uuid NOT NULL REFERENCES public.cash_registers(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  description text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.cash_withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything with cash_withdrawals"
  ON public.cash_withdrawals FOR ALL TO authenticated
  USING (has_role('admin'::app_role))
  WITH CHECK (has_role('admin'::app_role));
