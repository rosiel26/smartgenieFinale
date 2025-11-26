CREATE TABLE IF NOT EXISTS public.workouts (
  id bigint generated always as identity not null,
  user_id uuid null,
  workout_type_id bigint null,
  duration numeric not null,
  calories_burned numeric null,
  fat_burned numeric null,
  carbs_burned numeric null,
  created_at timestamp with time zone null default now(),
  constraint workouts_pkey primary key (id),
  constraint workouts_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE,
  constraint workouts_workout_type_id_fkey foreign KEY (workout_type_id) references workout_types (id) on delete set null
) TABLESPACE pg_default;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_calculate_workout_burn'
    ) THEN
        CREATE TRIGGER trg_calculate_workout_burn
        BEFORE INSERT ON workouts
        FOR EACH ROW
        EXECUTE FUNCTION calculate_workout_burn();
    END IF;
END;
$$;
