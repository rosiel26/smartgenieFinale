create table public.contact_messages (
  id uuid not null default gen_random_uuid (),
  user_id uuid null,
  name text not null,
  email text not null,
  message text not null,
  created_at timestamp with time zone null default now(),
  constraint contact_messages_pkey primary key (id),
  constraint contact_messages_user_id_fkey foreign KEY (user_id) references auth.users (id)
) TABLESPACE pg_default;