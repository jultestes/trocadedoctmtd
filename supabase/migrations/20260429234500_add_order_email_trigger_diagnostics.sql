CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.order_email_trigger_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  sale_id uuid,
  order_nsu text,
  step text NOT NULL,
  message text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.order_email_trigger_logs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.get_order_email_trigger_diagnostics(
  _sale_id uuid DEFAULT NULL,
  _limit integer DEFAULT 50
)
RETURNS TABLE (
  created_at timestamptz,
  sale_id uuid,
  order_nsu text,
  step text,
  message text,
  details jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT l.created_at, l.sale_id, l.order_nsu, l.step, l.message, l.details
  FROM public.order_email_trigger_logs l
  WHERE _sale_id IS NULL OR l.sale_id = _sale_id
  ORDER BY l.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(_limit, 50), 1), 100);
$$;

GRANT EXECUTE ON FUNCTION public.get_order_email_trigger_diagnostics(uuid, integer) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.debug_order_email_automation()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _triggers jsonb;
BEGIN
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'trigger_name', t.tgname,
        'enabled', t.tgenabled,
        'function', t.tgfoid::regprocedure::text
      )
      ORDER BY t.tgname
    ),
    '[]'::jsonb
  )
  INTO _triggers
  FROM pg_trigger t
  WHERE t.tgrelid = 'public.sales'::regclass
    AND NOT t.tgisinternal;

  RETURN jsonb_build_object(
    'pg_net_enabled', EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net'),
    'pg_net_schema', (SELECT n.nspname FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace WHERE e.extname = 'pg_net'),
    'net_http_post_available', EXISTS (
      SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'net' AND p.proname = 'http_post'
    ),
    'trigger_function_exists', to_regprocedure('public.trigger_send_order_email_on_sale_insert()') IS NOT NULL,
    'sales_triggers', _triggers
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.debug_order_email_automation() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.trigger_send_order_email_on_sale_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net
AS $$
DECLARE
  _request_id bigint;
BEGIN
  RAISE LOG 'trigger chamado sale_id=% order_nsu=%', NEW.id, NEW.order_nsu;

  INSERT INTO public.order_email_trigger_logs (sale_id, order_nsu, step, message, details)
  VALUES (
    NEW.id,
    NEW.order_nsu,
    'trigger chamado',
    'trigger chamado',
    jsonb_build_object('customer_email_present', NULLIF(NEW.customer_email, '') IS NOT NULL)
  );

  IF NEW.email_sent_at IS NOT NULL THEN
    INSERT INTO public.order_email_trigger_logs (sale_id, order_nsu, step, message, details)
    VALUES (NEW.id, NEW.order_nsu, 'envio ignorado', 'email_sent_at já preenchido', jsonb_build_object('email_sent_at', NEW.email_sent_at));
    RETURN NEW;
  END IF;

  SELECT net.http_post(
    url := 'https://bdipjvkpasiuekqtaiev.supabase.co/functions/v1/send-order-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkaXBqdmtwYXNpdWVrcXRhaWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MTc4OTgsImV4cCI6MjA4OTA5Mzg5OH0.KKVzskEJh2TDjzrdlS4ggZDHu5BpI75GRWeykgUTwfY',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkaXBqdmtwYXNpdWVrcXRhaWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MTc4OTgsImV4cCI6MjA4OTA5Mzg5OH0.KKVzskEJh2TDjzrdlS4ggZDHu5BpI75GRWeykgUTwfY'
    ),
    body := jsonb_build_object('sale_id', NEW.id::text),
    timeout_milliseconds := 5000
  ) INTO _request_id;

  RAISE LOG 'send-order-email chamada sale_id=% request_id=%', NEW.id, _request_id;

  INSERT INTO public.order_email_trigger_logs (sale_id, order_nsu, step, message, details)
  VALUES (
    NEW.id,
    NEW.order_nsu,
    'edge function chamada',
    'send-order-email enfileirada via pg_net',
    jsonb_build_object('request_id', _request_id)
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'erro no trigger send-order-email sale_id=%: %', NEW.id, SQLERRM;
  INSERT INTO public.order_email_trigger_logs (sale_id, order_nsu, step, message, details)
  VALUES (NEW.id, NEW.order_nsu, 'erro no trigger', SQLERRM, jsonb_build_object('sqlstate', SQLSTATE));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_send_order_email_after_sale_insert ON public.sales;

CREATE TRIGGER trg_send_order_email_after_sale_insert
AFTER INSERT ON public.sales
FOR EACH ROW
EXECUTE FUNCTION public.trigger_send_order_email_on_sale_insert();
