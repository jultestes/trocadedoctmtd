-- Update default status and ensure we can use richer status values
-- No enum needed, we use text. Just update existing pending sales if needed.
-- The status column already exists as text, so we just need to ensure RLS allows updates from admin.

-- Policy for admin to update sale status
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update sales' AND tablename = 'sales'
  ) THEN
    CREATE POLICY "Admins can update sales"
      ON public.sales
      FOR UPDATE
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- Policy for public to read their own sale by order_nsu
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can read sale by nsu' AND tablename = 'sales'
  ) THEN
    CREATE POLICY "Anyone can read sale by nsu"
      ON public.sales
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END $$;