-- ============================================================================
-- APLICAR MANUALMENTE NO SQL EDITOR DO SUPABASE: bdipjvkpasiuekqtaiev
-- ----------------------------------------------------------------------------
-- Adiciona a coluna push_sent_at usada para idempotência da notificação push
-- na Edge Function `send-sale-notification`.
--
-- Como funciona:
--   - A função tenta fazer um UPDATE atômico setando push_sent_at = now()
--     com a condição WHERE push_sent_at IS NULL.
--   - Apenas UMA chamada concorrente consegue reivindicar; as demais
--     pulam o envio (return early com skipped=already_sent).
--   - Se nenhum push for entregue (sent=0, failed>0), o claim é liberado
--     automaticamente para permitir retry.
-- ============================================================================

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS push_sent_at TIMESTAMPTZ;

-- (Opcional) índice parcial para acelerar a busca de pendentes.
CREATE INDEX IF NOT EXISTS idx_sales_push_sent_at_null
  ON public.sales (id)
  WHERE push_sent_at IS NULL;
