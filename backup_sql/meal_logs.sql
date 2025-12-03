create table public.meal_logs (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  meal_date date null default CURRENT_DATE,
  calories numeric null,
  protein numeric null,
  fat numeric null,
  carbs numeric null,
  created_at timestamp without time zone null default now(),
  meal_type text null,
  dish_name text null,
  serving_label text null,
  dish_id integer null,
  eaten_at timestamp without time zone null,
  logged_at timestamp without time zone null,
  dish_uuid uuid null,
  dishinfo_id uuid null,
  constraint meal_logs_pkey primary key (id)
) TABLESPACE pg_default;