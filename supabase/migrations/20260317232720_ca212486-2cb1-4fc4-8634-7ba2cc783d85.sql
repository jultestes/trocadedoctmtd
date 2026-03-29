-- Update all RLS policies to use has_role with single parameter

-- categories
DROP POLICY IF EXISTS "Admins can delete categories" ON public.categories;
CREATE POLICY "Admins can delete categories" ON public.categories FOR DELETE TO authenticated USING (has_role('admin'::app_role));

DROP POLICY IF EXISTS "Admins can insert categories" ON public.categories;
CREATE POLICY "Admins can insert categories" ON public.categories FOR INSERT TO authenticated WITH CHECK (has_role('admin'::app_role));

DROP POLICY IF EXISTS "Admins can update categories" ON public.categories;
CREATE POLICY "Admins can update categories" ON public.categories FOR UPDATE TO authenticated USING (has_role('admin'::app_role));

-- coupons
DROP POLICY IF EXISTS "Admins can delete coupons" ON public.coupons;
CREATE POLICY "Admins can delete coupons" ON public.coupons FOR DELETE TO authenticated USING (has_role('admin'::app_role));

DROP POLICY IF EXISTS "Admins can insert coupons" ON public.coupons;
CREATE POLICY "Admins can insert coupons" ON public.coupons FOR INSERT TO authenticated WITH CHECK (has_role('admin'::app_role));

DROP POLICY IF EXISTS "Admins can update coupons" ON public.coupons;
CREATE POLICY "Admins can update coupons" ON public.coupons FOR UPDATE TO authenticated USING (has_role('admin'::app_role));

DROP POLICY IF EXISTS "Admins can view all coupons" ON public.coupons;
CREATE POLICY "Admins can view all coupons" ON public.coupons FOR SELECT TO authenticated USING (has_role('admin'::app_role));

-- product_categories
DROP POLICY IF EXISTS "Admins can delete product_categories" ON public.product_categories;
CREATE POLICY "Admins can delete product_categories" ON public.product_categories FOR DELETE TO authenticated USING (has_role('admin'::app_role));

DROP POLICY IF EXISTS "Admins can insert product_categories" ON public.product_categories;
CREATE POLICY "Admins can insert product_categories" ON public.product_categories FOR INSERT TO authenticated WITH CHECK (has_role('admin'::app_role));

-- products
DROP POLICY IF EXISTS "Admins can delete products" ON public.products;
CREATE POLICY "Admins can delete products" ON public.products FOR DELETE TO authenticated USING (has_role('admin'::app_role));

DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
CREATE POLICY "Admins can insert products" ON public.products FOR INSERT TO authenticated WITH CHECK (has_role('admin'::app_role));

DROP POLICY IF EXISTS "Admins can update products" ON public.products;
CREATE POLICY "Admins can update products" ON public.products FOR UPDATE TO authenticated USING (has_role('admin'::app_role));

DROP POLICY IF EXISTS "Admins can view all products" ON public.products;
CREATE POLICY "Admins can view all products" ON public.products FOR SELECT TO authenticated USING (has_role('admin'::app_role));

-- sale_items
DROP POLICY IF EXISTS "Admins can do everything with sale_items" ON public.sale_items;
CREATE POLICY "Admins can do everything with sale_items" ON public.sale_items FOR ALL TO authenticated USING (has_role('admin'::app_role)) WITH CHECK (has_role('admin'::app_role));

-- sales
DROP POLICY IF EXISTS "Admins can do everything with sales" ON public.sales;
CREATE POLICY "Admins can do everything with sales" ON public.sales FOR ALL TO authenticated USING (has_role('admin'::app_role)) WITH CHECK (has_role('admin'::app_role));

-- shipping_neighborhoods
DROP POLICY IF EXISTS "Admins can do everything with shipping_neighborhoods" ON public.shipping_neighborhoods;
CREATE POLICY "Admins can do everything with shipping_neighborhoods" ON public.shipping_neighborhoods FOR ALL TO authenticated USING (has_role('admin'::app_role)) WITH CHECK (has_role('admin'::app_role));

-- site_settings
DROP POLICY IF EXISTS "Admins can insert site_settings" ON public.site_settings;
CREATE POLICY "Admins can insert site_settings" ON public.site_settings FOR INSERT TO authenticated WITH CHECK (has_role('admin'::app_role));

DROP POLICY IF EXISTS "Admins can update site_settings" ON public.site_settings;
CREATE POLICY "Admins can update site_settings" ON public.site_settings FOR UPDATE TO authenticated USING (has_role('admin'::app_role));