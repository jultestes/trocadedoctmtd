-- ============================================================================
-- APLICAR MANUALMENTE NO SQL EDITOR DO SUPABASE: bdipjvkpasiuekqtaiev
-- ----------------------------------------------------------------------------
-- Este projeto NÃO está usando Lovable Cloud. As migrations no diretório
-- supabase/migrations/ apontariam para outro projeto. Por isso esta SQL
-- está fora daquele diretório — copie e cole no SQL Editor do projeto
-- antigo (bdipjvkpasiuekqtaiev) e execute uma vez.
-- ============================================================================
-- O que faz:
--   1. Cria public.get_sales_by_phone(text)  -> busca pedidos por telefone
--      normalizado (apenas dígitos), ordenados do mais recente para o
--      mais antigo. SECURITY DEFINER para anon poder consultar sem
--      expor SELECT direto na tabela sales.
--   2. Recria public.get_sale_items_by_nsu(text) trazendo, além dos
--      campos básicos, a image_url do produto vinculado (LEFT JOIN
--      em products).
-- ============================================================================

-- 1. Busca de pedidos por telefone
CREATE OR REPLACE FUNCTION public.get_sales_by_phone(_phone text)
RETURNS SETOF public.sales
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.sales
  WHERE regexp_replace(coalesce(customer_phone, ''), '\D', '', 'g')
        = regexp_replace(coalesce(_phone, ''), '\D', '', 'g')
    AND length(regexp_replace(coalesce(_phone, ''), '\D', '', 'g')) >= 8
  ORDER BY created_at DESC
  LIMIT 50;
$$;

GRANT EXECUTE ON FUNCTION public.get_sales_by_phone(text) TO anon, authenticated;

-- 2. Itens da venda pelo NSU, com imagem do produto
DROP FUNCTION IF EXISTS public.get_sale_items_by_nsu(text);

CREATE OR REPLACE FUNCTION public.get_sale_items_by_nsu(_nsu text)
RETURNS TABLE (
  id uuid,
  product_id uuid,
  product_name text,
  product_sku text,
  unit_price numeric,
  product_image_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    si.id,
    si.product_id,
    si.product_name,
    si.product_sku,
    si.unit_price,
    p.image_url AS product_image_url
  FROM public.sale_items si
  JOIN public.sales s ON s.id = si.sale_id
  LEFT JOIN public.products p ON p.id = si.product_id
  WHERE s.order_nsu = _nsu;
$$;

GRANT EXECUTE ON FUNCTION public.get_sale_items_by_nsu(text) TO anon, authenticated;
