-- Table: contact_messages
CREATE TABLE IF NOT EXISTS public.contact_messages (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NULL,
    name text NOT NULL,
    email text NOT NULL,
    message text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT contact_messages_pkey PRIMARY KEY (id),
    CONSTRAINT contact_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id)
) TABLESPACE pg_default;
