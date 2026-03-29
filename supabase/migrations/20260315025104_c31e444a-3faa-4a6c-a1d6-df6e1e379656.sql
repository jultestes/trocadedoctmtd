
-- Add SKU column
ALTER TABLE public.products ADD COLUMN sku text UNIQUE;

-- Function to generate a random 6-digit SKU
CREATE OR REPLACE FUNCTION public.generate_sku()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  new_sku text;
  sku_exists boolean;
BEGIN
  IF NEW.sku IS NULL OR NEW.sku = '' THEN
    LOOP
      new_sku := lpad(floor(random() * 1000000)::text, 6, '0');
      SELECT EXISTS(SELECT 1 FROM public.products WHERE sku = new_sku) INTO sku_exists;
      EXIT WHEN NOT sku_exists;
    END LOOP;
    NEW.sku := new_sku;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to auto-generate SKU on insert
CREATE TRIGGER trg_generate_sku
  BEFORE INSERT ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_sku();

-- Backfill existing products with SKUs
DO $$
DECLARE
  rec RECORD;
  new_sku text;
  sku_exists boolean;
BEGIN
  FOR rec IN SELECT id FROM public.products WHERE sku IS NULL LOOP
    LOOP
      new_sku := lpad(floor(random() * 1000000)::text, 6, '0');
      SELECT EXISTS(SELECT 1 FROM public.products WHERE sku = new_sku) INTO sku_exists;
      EXIT WHEN NOT sku_exists;
    END LOOP;
    UPDATE public.products SET sku = new_sku WHERE id = rec.id;
  END LOOP;
END;
$$;
