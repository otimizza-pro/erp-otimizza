-- 065_notifications_engine_and_hardening.sql
-- Hardening da tabela system_notifications, campos de deduplicação/severidade/categoria
-- e tabela erp_settings para persistência real das configurações da agência.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN;
  END IF;
END $$;

-- 1. Evoluir e blindar system_notifications
ALTER TABLE public.system_notifications
  ADD COLUMN IF NOT EXISTS dedup_key VARCHAR(255),
  ADD COLUMN IF NOT EXISTS severity VARCHAR(20) NOT NULL DEFAULT 'info',
  ADD COLUMN IF NOT EXISTS category VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
  ADD COLUMN IF NOT EXISTS entity_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS entity_id UUID,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedup_key
  ON public.system_notifications(dedup_key)
  WHERE dedup_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_category_created
  ON public.system_notifications(category, created_at DESC);

ALTER TABLE public.system_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_system_notifications" ON public.system_notifications;
REVOKE ALL PRIVILEGES ON TABLE public.system_notifications FROM anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.system_notifications TO postgres, service_role;

-- 2. Tabela persistente de configurações do ERP
CREATE TABLE IF NOT EXISTS public.erp_settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.erp_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.erp_settings FROM anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.erp_settings TO postgres, service_role;
