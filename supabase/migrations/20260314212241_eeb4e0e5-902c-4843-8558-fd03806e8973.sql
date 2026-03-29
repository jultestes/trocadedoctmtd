INSERT INTO public.user_roles (user_id, role)
VALUES ('5d07003e-95cc-4002-a3ba-8d007e0e797c', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;