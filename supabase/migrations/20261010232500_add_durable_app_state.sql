-- Durable application state for the existing server-side store model.
-- The server writes this table with SUPABASE_SERVICE_ROLE_KEY only.
CREATE TABLE IF NOT EXISTS public.tdh_app_state (
  key text PRIMARY KEY CHECK (key = 'store'),
  state jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tdh_app_state ENABLE ROW LEVEL SECURITY;

-- No client role receives direct access. Server operations use the service role.
REVOKE ALL ON TABLE public.tdh_app_state FROM anon, authenticated;
