CREATE OR REPLACE FUNCTION public.create_sale_with_items(
  _order_nsu text,
  _delivery_type text DEFAULT 'delivery',
  _customer_name text DEFAULT NULL,
  _customer_email text DEFAULT NULL,
  _customer_phone text DEFAULT NULL,
  _total_original numeric DEFAULT 0,
  _discount numeric DEFAULT 0,
  _total_paid numeric DEFAULT 0,
  _shipping_price numeric DEFAULT 0,
  _payment_method text DEFAULT 'pix',
  _change_for numeric DEFAULT NULL,
  _status text DEFAULT 'pending',
  _address_cep text DEFAULT NULL,
  _address_street text DEFAULT NULL,
  _address_neighborhood text DEFAULT NULL,
  _address_number text DEFAULT NULL,
  _address_complement text DEFAULT NULL,
  _address_city text DEFAULT NULL,
  _address_uf text DEFAULT NULL,
  _items jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _sale_id uuid;
  _item jsonb;
  _product_id uuid;
  _current_stock integer;
BEGIN
  -- Validate required fields
  IF _order_nsu IS NULL OR _order_nsu = '' THEN
    RAISE EXCEPTION 'order_nsu is required';
  END IF;

  IF _total_paid < 0 THEN
    RAISE EXCEPTION 'total_paid must be non-negative';
  END IF;

  IF jsonb_array_length(_items) = 0 THEN
    RAISE EXCEPTION 'At least one item is required';
  END IF;

  IF jsonb_array_length(_items) > 100 THEN
    RAISE EXCEPTION 'Maximum 100 items allowed';
  END IF;

  -- Insert the sale
  INSERT INTO public.sales (
    order_nsu, delivery_type, customer_name, customer_email, customer_phone,
    total_original, discount, total_paid, shipping_price, payment_method,
    change_for, status, address_cep, address_street, address_neighborhood,
    address_number, address_complement, address_city, address_uf
  ) VALUES (
    _order_nsu, _delivery_type, _customer_name, _customer_email, _customer_phone,
    _total_original, _discount, _total_paid, _shipping_price, _payment_method,
    _change_for, _status, _address_cep, _address_street, _address_neighborhood,
    _address_number, _address_complement, _address_city, _address_uf
  ) RETURNING id INTO _sale_id;

  -- Insert all items and decrement stock
  FOR _item IN SELECT * FROM jsonb_array_elements(_items)
  LOOP
    INSERT INTO public.sale_items (sale_id, product_id, product_name, product_sku, unit_price)
    VALUES (
      _sale_id,
      CASE WHEN _item->>'product_id' IS NOT NULL AND _item->>'product_id' != '' 
           THEN (_item->>'product_id')::uuid ELSE NULL END,
      COALESCE(_item->>'product_name', 'Unknown'),
      _item->>'product_sku',
      COALESCE((_item->>'unit_price')::numeric, 0)
    );

    -- Decrement stock for the product
    IF _item->>'product_id' IS NOT NULL AND _item->>'product_id' != '' THEN
      _product_id := (_item->>'product_id')::uuid;
      
      SELECT stock INTO _current_stock FROM public.products WHERE id = _product_id FOR UPDATE;
      
      IF _current_stock IS NOT NULL AND _current_stock > 0 THEN
        UPDATE public.products SET stock = stock - 1 WHERE id = _product_id;
      END IF;

      -- If stock reaches 0, deactivate the product
      IF _current_stock IS NOT NULL AND _current_stock <= 1 THEN
        UPDATE public.products SET active = false WHERE id = _product_id;
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('sale_id', _sale_id, 'order_nsu', _order_nsu);
END;
$$;