-- ============================================================
-- Activar suscriptor de prueba en NutriPlant PRO
-- ============================================================
-- Ejecuta este script en Supabase → SQL Editor para que los datos
-- de suscripción aparezcan en el panel admin.
--
-- Reemplaza el ID si es otro usuario:
-- ============================================================

-- Activar suscripción para jesuschuzzavila (ID de tu captura)
UPDATE public.profiles 
SET 
  subscription_status = 'active',
  subscription_amount = 49.00,
  updated_at = now()
WHERE id = 'a38ac421-910f-4e5d-b0c5-191dc3d26307';

-- Para verificar el resultado:
-- SELECT id, email, name, subscription_status, subscription_amount FROM public.profiles WHERE id = 'a38ac421-910f-4e5d-b0c5-191dc3d26307';
