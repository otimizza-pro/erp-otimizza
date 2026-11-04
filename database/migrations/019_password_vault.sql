CREATE TABLE public.password_vault_entries (
  id UUID PRIMARY KEY,
  owner_id UUID NOT NULL,
  title VARCHAR(160) NOT NULL,
  username VARCHAR(320) NOT NULL DEFAULT '',
  website VARCHAR(2048) NOT NULL DEFAULT '',
  encrypted_password TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX password_vault_owner_idx ON public.password_vault_entries(owner_id);
ALTER TABLE public.password_vault_entries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.password_vault_entries FROM anon, authenticated;
-- Backend queries must always filter by owner_id.
