-- Re-route the AFTER INSERT trigger on public.sales to call the already-deployed
-- Edge Function `send-sale-notification`, which now also sends the customer's
-- order confirmation email (idempotent via sales.email_sent_at).

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

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
    url := 'https://bdipjvkpasiuekqtaiev.supabase.co/functions/v1/send-sale-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkaXBqdmtwYXNpdWVrcXRhaWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MTc4OTgsImV4cCI6MjA4OTA5Mzg5OH0.KKVzskEJh2TDjzrdlS4ggZDHu5BpI75GRWeykgUTwfY',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkaXBqdmtwYXNpdWVrcXRhaWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MTc4OTgsImV4cCI6MjA4OTA5Mzg5OH0.KKVzskEJh2TDjzrdlS4ggZDHu5BpI75GRWeykgUTwfY'
    ),
    body := jsonb_build_object(
      'sale_id', NEW.id::text,
      'total_paid', COALESCE(NEW.total_paid, NEW.total_original, 0)
    ),
    timeout_milliseconds := 5000
  ) INTO _request_id;

  RAISE LOG 'send-sale-notification chamada sale_id=% request_id=%', NEW.id, _request_id;

  INSERT INTO public.order_email_trigger_logs (sale_id, order_nsu, step, message, details)
  VALUES (
    NEW.id,
    NEW.order_nsu,
    'edge function chamada',
    'send-sale-notification enfileirada via pg_net',
    jsonb_build_object('request_id', _request_id, 'function', 'send-sale-notification')
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'erro no trigger send-sale-notification sale_id=%: %', NEW.id, SQLERRM;
  INSERT INTO public.order_email_trigger_logs (sale_id, order_nsu, step, message, details)
  VALUES (NEW.id, NEW.order_nsu, 'erro no trigger', SQLERRM, jsonb_build_object('sqlstate', SQLSTATE, 'function', 'send-sale-notification'));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_send_order_email_after_sale_insert ON public.sales;

CREATE TRIGGER trg_send_order_email_after_sale_insert
AFTER INSERT ON public.sales
FOR EACH ROW
EXECUTE FUNCTION public.trigger_send_order_email_on_sale_insert();
