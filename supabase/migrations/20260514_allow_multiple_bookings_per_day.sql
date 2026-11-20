-- Allow multiple bookings on the same day for the same resource (different time slots)
-- Conflict detection is now handled at the application level by time overlap
ALTER TABLE resource_bookings
  DROP CONSTRAINT IF EXISTS resource_bookings_resource_id_booking_date_key;
