
CREATE TABLE public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings (needed for maintenance check)
CREATE POLICY "Anyone can view site_settings" ON public.site_settings
  FOR SELECT TO public USING (true);

-- Only admins can modify
CREATE POLICY "Admins can update site_settings" ON public.site_settings
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert site_settings" ON public.site_settings
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed the maintenance setting
INSERT INTO public.site_settings (key, value)
VALUES ('maintenance', '{"enabled": false, "title": "Site em Manutenção", "subtitle": "Voltamos em breve!"}'::jsonb);
