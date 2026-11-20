-- Corrige apartments sem condominio_id que têm residents vinculados
-- Infere o condominio_id a partir dos usuários vinculados via usuario_condominio
UPDATE public.condo_apartments ca
SET condominio_id = uc.condominio_id
FROM public.condo_apartment_residents car
JOIN public.usuario_condominio uc ON uc.user_id = car.user_id AND uc.active = true
WHERE ca.id = car.apartment_id
  AND ca.condominio_id IS NULL;
