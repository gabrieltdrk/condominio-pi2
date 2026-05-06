-- Add new contact fields and remove amenity columns from condominios

ALTER TABLE condominios
  ADD COLUMN IF NOT EXISTS manager_email            text,
  ADD COLUMN IF NOT EXISTS management_contact_name  text,
  ADD COLUMN IF NOT EXISTS management_contact_phone text,
  ADD COLUMN IF NOT EXISTS management_contact_email text;

-- Remove amenity columns (will be managed elsewhere)
ALTER TABLE condominios
  DROP COLUMN IF EXISTS has_pool,
  DROP COLUMN IF EXISTS pool_count,
  DROP COLUMN IF EXISTS has_gym,
  DROP COLUMN IF EXISTS gym_count,
  DROP COLUMN IF EXISTS has_party_room,
  DROP COLUMN IF EXISTS party_room_count,
  DROP COLUMN IF EXISTS has_bbq,
  DROP COLUMN IF EXISTS bbq_count;
