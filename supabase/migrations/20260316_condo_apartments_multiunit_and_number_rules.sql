drop index if exists condo_apartments_unique_resident_id;

create unique index if not exists condo_apartments_unique_tower_number
  on condo_apartments (lower(tower), lower(number));
