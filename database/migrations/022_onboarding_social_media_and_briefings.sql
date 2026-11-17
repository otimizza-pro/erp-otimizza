-- ==============================================================================
-- Migração 022: Onboarding Social Media e Sessões Interativas de Briefing com IA
-- ==============================================================================

-- 1. Tabela de Identidade do Cliente (caso ainda não criada)
CREATE TABLE IF NOT EXISTS public.client_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL UNIQUE REFERENCES public.clients(id) ON DELETE CASCADE,
  value_proposition TEXT,
  market_niche TEXT,
  archetype VARCHAR(100),
  tone_of_voice TEXT[] NOT NULL DEFAULT '{}',
  brand_context TEXT,
  target_audiences TEXT[] NOT NULL DEFAULT '{}',
  pain_points TEXT[] NOT NULL DEFAULT '{}',
  differentials TEXT[] NOT NULL DEFAULT '{}',
  forbidden_words TEXT[] NOT NULL DEFAULT '{}',
  mandatory_terms TEXT[] NOT NULL DEFAULT '{}',
  default_ctas TEXT[] NOT NULL DEFAULT '{}',
  instagram_handle VARCHAR(255),
  website_url VARCHAR(2048),
  whatsapp_cta VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_identities_client ON public.client_identities(client_id);

-- 2. Tabela de Sessões Públicas de Briefing Interativo com IA
CREATE TABLE IF NOT EXISTS public.client_briefing_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token VARCHAR(64) UNIQUE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.project_tasks(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  company_name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255) NOT NULL,
  website_url VARCHAR(2048),
  maps_url VARCHAR(2048),
  instagram_url VARCHAR(255),
  initial_notes TEXT,
  conversation_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  extracted_identity JSONB NOT NULL DEFAULT '{}'::jsonb,
  competitor_notes TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  progress_percent INTEGER NOT NULL DEFAULT 0,
  credentials_saved BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_briefing_sessions_token ON public.client_briefing_sessions(token);
CREATE INDEX IF NOT EXISTS idx_briefing_sessions_project ON public.client_briefing_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_briefing_sessions_task ON public.client_briefing_sessions(task_id);
CREATE INDEX IF NOT EXISTS idx_briefing_sessions_client ON public.client_briefing_sessions(client_id);
