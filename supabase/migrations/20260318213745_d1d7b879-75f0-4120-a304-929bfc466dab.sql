
-- Migrate product sizes: replace baby-p/m/g with just p/m/g
UPDATE products SET sizes = array(
  SELECT 
    CASE 
      WHEN elem = 'menina-baby-p' THEN 'menina-p'
      WHEN elem = 'menina-baby-m' THEN 'menina-m'
      WHEN elem = 'menina-baby-g' THEN 'menina-g'
      WHEN elem = 'meninos-baby-p' THEN 'menino-p'
      WHEN elem = 'meninos-baby-m' THEN 'menino-m'
      WHEN elem = 'meninos-baby-g' THEN 'menino-g'
      WHEN elem = 'menina-baby-rn' THEN 'menina-rn'
      WHEN elem = 'meninos-baby-rn' THEN 'menino-rn'
      ELSE elem
    END
  FROM unnest(sizes) AS elem
)
WHERE sizes::text LIKE '%baby%';

-- Update category ages: replace baby-p/m/g with p/m/g
UPDATE categories SET ages = array(
  SELECT 
    CASE 
      WHEN elem = 'baby-p' THEN 'p'
      WHEN elem = 'baby-m' THEN 'm'
      WHEN elem = 'baby-g' THEN 'g'
      WHEN elem = 'baby-rn' THEN 'rn'
      ELSE elem
    END
  FROM unnest(ages) AS elem
)
WHERE ages::text LIKE '%baby%';

-- Delete duplicate Baby P/M/G subcategories (keep only the original "Baby" ones)
DELETE FROM categories WHERE slug IN ('baby-p-meninas', 'baby-m-meninas', 'baby-g-meninas', 'baby-p-meninos', 'baby-m-meninos', 'baby-g-meninos');

-- Add P, M, G to available_ages site_settings
UPDATE site_settings SET value = (
  SELECT jsonb_agg(elem)
  FROM (
    SELECT '{"value":"p","label":"P"}'::jsonb AS elem
    UNION ALL SELECT '{"value":"m","label":"M"}'::jsonb
    UNION ALL SELECT '{"value":"g","label":"G"}'::jsonb
    UNION ALL
    SELECT elem FROM jsonb_array_elements(value) AS elem
    WHERE elem->>'value' NOT IN ('baby-p', 'baby-m', 'baby-g', 'baby-rn')
  ) sub
)
WHERE key = 'available_ages';
