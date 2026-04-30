CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.trigger_send_order_email_on_sale_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net
AS $$
BEGIN
  -- Idempotency guard: only enqueue the e-mail while the sale has not been marked as sent.
  IF NEW.email_sent_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := 'https://bdipjvkpasiuekqtaiev.supabase.co/functions/v1/send-order-email-v2',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkaXBqdmtwYXNpdWVrcXRhaWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MTc4OTgsImV4cCI6MjA4OTA5Mzg5OH0.KKVzskEJh2TDjzrdlS4ggZDHu5BpI75GRWeykgUTwfY',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkaXBqdmtwYXNpdWVrcXRhaWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MTc4OTgsImV4cCI6MjA4OTA5Mzg5OH0.KKVzskEJh2TDjzrdlS4ggZDHu5BpI75GRWeykgUTwfY'
      ),
      body := jsonb_build_object('sale_id', NEW.id::text),
      timeout_milliseconds := 5000
    );
  EXCEPTION WHEN OTHERS THEN
    -- Never block order creation if the async webhook enqueue fails.
    RAISE WARNING 'Failed to enqueue send-order-email-v2 for sale %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_send_order_email_after_sale_insert ON public.sales;

CREATE TRIGGER trg_send_order_email_after_sale_insert
AFTER INSERT ON public.sales
FOR EACH ROW
EXECUTE FUNCTION public.trigger_send_order_email_on_sale_insert();
