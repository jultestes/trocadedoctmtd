-- ============================================================================
-- APLICAR MANUALMENTE NO SQL EDITOR DO SUPABASE: bdipjvkpasiuekqtaiev
-- ----------------------------------------------------------------------------
-- Habilita Supabase Realtime para a tabela `sales` para que o painel admin
-- receba INSERTs em tempo real e dispare som + toast a cada nova venda
-- (independente do status).
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'sales'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;
  END IF;
END $$;

-- Garante que o payload do Realtime traga a linha completa (necessário para
-- ler id, status, total_original, total_paid, order_nsu no admin).
ALTER TABLE public.sales REPLICA IDENTITY FULL;
