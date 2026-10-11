-- First-party authentication tables. Passwords are stored only as scrypt hashes.
CREATE TABLE IF NOT EXISTS public.tdh_auth_users (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE,
  display_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('customer', 'admin', 'owner')),
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tdh_auth_sessions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.tdh_auth_users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tdh_auth_sessions_token_hash_idx ON public.tdh_auth_sessions(token_hash);
CREATE INDEX IF NOT EXISTS tdh_auth_sessions_user_id_idx ON public.tdh_auth_sessions(user_id);

ALTER TABLE public.tdh_auth_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tdh_auth_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.tdh_auth_users, public.tdh_auth_sessions FROM anon, authenticated;
