-- =====================================================================
-- Corrige a função do trigger de push de vendas.
--
-- ⚠️  ATENÇÃO: rodar no SQL Editor do projeto Supabase EXTERNO onde
--    a tabela public.sales realmente existe (este Lovable Cloud está vazio).
--
-- Antes de executar, substitua:
--   - v_url   → URL do seu projeto (https://<PROJECT_REF>.supabase.co)
--   - v_anon  → ANON KEY do projeto externo
-- =====================================================================

-- Extensão necessária para chamadas HTTP a partir do Postgres
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Recria a função do trigger
CREATE OR REPLACE FUNCTION public.trigger_send_sale_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  -- 🔧 SUBSTITUA pelos valores do seu projeto Supabase externo:
  v_url  text := 'https://SEU_PROJECT_REF.supabase.co/functions/v1/send-sale-notification';
  v_anon text := 'SUA_ANON_KEY_AQUI';
  v_total numeric;
BEGIN
  -- Proteção extra: só dispara em INSERT
  IF TG_OP <> 'INSERT' THEN
    RETURN NEW;
  END IF;

  -- Idempotência: se já enviou push, não envia de novo
  IF NEW.push_sent_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Calcula valor seguro (nunca R$ 0,00 quando houver dado)
  v_total := COALESCE(
    NULLIF(NEW.total_paid, 0),
    NULLIF(NEW.total_original, 0),
    0
  );

  -- Chamada assíncrona para a Edge Function send-sale-notification
  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_anon,
      'apikey', v_anon
    ),
    body := jsonb_build_object(
      'sale_id', NEW.id,
      'total_paid', v_total,
      'trigger_reason', 'insert'
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Nunca quebra o INSERT da venda por causa do push
  RAISE WARNING '[trigger_send_sale_notification] erro: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Garante que existe APENAS o trigger correto, em AFTER INSERT
DROP TRIGGER IF EXISTS trg_send_sale_notification_on_sales ON public.sales;

CREATE TRIGGER trg_send_sale_notification_on_sales
AFTER INSERT ON public.sales
FOR EACH ROW
EXECUTE FUNCTION public.trigger_send_sale_notification();

-- (Opcional) Verificar que só existe esse trigger:
-- SELECT tgname FROM pg_trigger
-- WHERE tgrelid = 'public.sales'::regclass AND NOT tgisinternal;
