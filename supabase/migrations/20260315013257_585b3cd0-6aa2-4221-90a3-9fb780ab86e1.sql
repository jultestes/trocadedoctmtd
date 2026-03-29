UPDATE products 
SET image_url = REPLACE(image_url, 'pub-dde29e3b42217a65a922b5f57546c38e.r2.dev', 'pub-92c883eaa5b54549aa2d3ed96b066938.r2.dev')
WHERE image_url LIKE '%pub-dde29e3b42217a65a922b5f57546c38e.r2.dev%';