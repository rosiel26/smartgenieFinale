CREATE TABLE IF NOT EXISTS public.feedback_submissions (
    id serial NOT NULL,
    user_id uuid NOT NULL,
    dish_id uuid NOT NULL,
    feedback_text text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT feedback_submissions_pkey PRIMARY KEY (id),
    CONSTRAINT feedback_submissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE
) TABLESPACE pg_default;
