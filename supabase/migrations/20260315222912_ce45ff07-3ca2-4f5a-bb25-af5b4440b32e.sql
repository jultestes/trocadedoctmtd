
CREATE TABLE public.shipping_neighborhoods (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.shipping_neighborhoods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything with shipping_neighborhoods"
  ON public.shipping_neighborhoods
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view shipping_neighborhoods"
  ON public.shipping_neighborhoods
  FOR SELECT
  TO public
  USING (true);
