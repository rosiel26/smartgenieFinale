create table public.feedback_submissions (
  id serial not null,
  user_id uuid not null,
  dish_id uuid not null,
  feedback_text text not null,
  created_at timestamp with time zone null default now(),
  constraint feedback_submissions_pkey primary key (id),
  constraint feedback_submissions_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_feedback_dish on public.feedback_submissions using btree (dish_id) TABLESPACE pg_default;