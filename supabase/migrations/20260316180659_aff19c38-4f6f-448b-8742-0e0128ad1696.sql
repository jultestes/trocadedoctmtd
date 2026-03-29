-- Insert global ages into site_settings based on existing product data + standard kids clothing ages
INSERT INTO public.site_settings (key, value)
VALUES (
  'available_ages',
  '[
    {"value": "baby-rn", "label": "RN"},
    {"value": "baby-p", "label": "Baby P"},
    {"value": "baby-m", "label": "Baby M"},
    {"value": "baby-g", "label": "Baby G"},
    {"value": "idade1", "label": "1 ano"},
    {"value": "idade2", "label": "2 anos"},
    {"value": "idade3", "label": "3 anos"},
    {"value": "idade4", "label": "4 anos"},
    {"value": "idade6", "label": "6 anos"},
    {"value": "idade8", "label": "8 anos"},
    {"value": "idade10", "label": "10 anos"},
    {"value": "idade12", "label": "12 anos"},
    {"value": "idade14", "label": "14 anos"},
    {"value": "idade16", "label": "16 anos"}
  ]'::jsonb
)
ON CONFLICT DO NOTHING;