-- ============================================================================
-- APLICAR MANUALMENTE NO SQL EDITOR DO SUPABASE: bdipjvkpasiuekqtaiev
-- ----------------------------------------------------------------------------
-- Adiciona a coluna push_sent_at e centraliza o disparo da notificação push
-- no trigger/Edge Function `send-sale-notification`.
--
-- Como funciona:
--   - O frontend NÃO deve chamar send-sale-notification.
--   - Este trigger chama a Edge Function no INSERT (para e-mail; push só se paid)
--     e quando status muda para 'paid' (para push).
--   - A Edge Function verifica push_sent_at antes de enviar e preenche o campo
--     somente depois de pelo menos um push ser enviado com sucesso.
-- ============================================================================

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS push_sent_at TIMESTAMPTZ;

-- (Opcional) índice parcial para acelerar a busca de pendentes.
CREATE INDEX IF NOT EXISTS idx_sales_push_sent_at_null
  ON public.sales (id)
  WHERE push_sent_at IS NULL;

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.order_email_trigger_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid,
  order_nsu text,
  step text NOT NULL,
  message text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.trigger_send_sale_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net
AS $$
DECLARE
  _request_id bigint;
  _should_call boolean := false;
  _reason text := '';
BEGIN
  IF TG_OP = 'INSERT' THEN
    _should_call := true;
    _reason := 'insert';
  ELSIF TG_OP = 'UPDATE'
    AND NEW.status = 'paid'
    AND OLD.status IS DISTINCT FROM NEW.status
    AND NEW.push_sent_at IS NULL THEN
    _should_call := true;
    _reason := 'status_paid';
  END IF;

  IF NOT _should_call THEN
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
      'total_paid', COALESCE(NEW.total_paid, NEW.total_original, 0),
      'trigger_reason', _reason
    ),
    timeout_milliseconds := 5000
  ) INTO _request_id;

  INSERT INTO public.order_email_trigger_logs (sale_id, order_nsu, step, message, details)
  VALUES (
    NEW.id,
    NEW.order_nsu,
    'send-sale-notification chamada',
    'Edge Function enfileirada via pg_net',
    jsonb_build_object('request_id', _request_id, 'reason', _reason, 'status', NEW.status)
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.order_email_trigger_logs (sale_id, order_nsu, step, message, details)
  VALUES (NEW.id, NEW.order_nsu, 'erro no trigger', SQLERRM, jsonb_build_object('sqlstate', SQLSTATE));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_send_order_email_after_sale_insert ON public.sales;
DROP TRIGGER IF EXISTS trg_send_sale_notification_on_sales ON public.sales;

CREATE TRIGGER trg_send_sale_notification_on_sales
AFTER INSERT OR UPDATE OF status ON public.sales
FOR EACH ROW
EXECUTE FUNCTION public.trigger_send_sale_notification();
