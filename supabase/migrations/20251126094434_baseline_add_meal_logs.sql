-- Safe migration for creating meal_logs table
DO $$
BEGIN
IF NOT EXISTS (
SELECT 1
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'meal_logs'
) THEN
CREATE TABLE public.meal_logs (
id uuid NOT NULL DEFAULT gen_random_uuid(),
user_id uuid NOT NULL,
meal_date date DEFAULT CURRENT_DATE,
calories numeric,
protein numeric,
fat numeric,
carbs numeric,
created_at timestamp WITHOUT TIME ZONE DEFAULT now(),
meal_type text,
dish_name text,
serving_label text,
dish_id integer,
eaten_at timestamp WITHOUT TIME ZONE,
logged_at timestamp WITHOUT TIME ZONE,
dish_uuid uuid,
dishinfo_id uuid,
CONSTRAINT meal_logs_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;
END IF;
END
$$;
