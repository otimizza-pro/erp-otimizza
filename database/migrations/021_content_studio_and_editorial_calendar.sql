-- ==============================================================================
-- Migração 021: Estúdio de Criação de Conteúdo, Linhas Editoriais e Calendário
-- ==============================================================================

-- 1. Públicos-Alvo Salvos por Cliente
CREATE TABLE IF NOT EXISTS public.client_audiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  demographics TEXT,
  pain_points TEXT[] NOT NULL DEFAULT '{}',
  desires TEXT[] NOT NULL DEFAULT '{}',
  objections TEXT[] NOT NULL DEFAULT '{}',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_audiences_client ON public.client_audiences(client_id);

-- 2. Linhas Editoriais e Pilares por Cliente
CREATE TABLE IF NOT EXISTS public.client_editorial_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  pillar_name VARCHAR(255) NOT NULL,
  theme VARCHAR(255) NOT NULL,
  objective TEXT,
  target_audience_id UUID REFERENCES public.client_audiences(id) ON DELETE SET NULL,
  preferred_formats TEXT[] NOT NULL DEFAULT '{"Reels", "Carrossel", "Post estático"}',
  frequency_per_month INTEGER DEFAULT 4,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_editorial_lines_client ON public.client_editorial_lines(client_id);

-- 3. Predefinições de DNA e Voz por Cliente
CREATE TABLE IF NOT EXISTS public.client_brand_voice_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL UNIQUE REFERENCES public.clients(id) ON DELETE CASCADE,
  brand_context TEXT,
  default_tones TEXT[] NOT NULL DEFAULT '{"Direto e didático"}',
  default_ctas TEXT[] NOT NULL DEFAULT '{"Iniciar uma conversa qualificada no WhatsApp"}',
  custom_guidelines TEXT,
  forbidden_words TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Calendário Editorial de Conteúdo e Histórico de Geração
CREATE TABLE IF NOT EXISTS public.content_calendar_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  editorial_line_id UUID REFERENCES public.client_editorial_lines(id) ON DELETE SET NULL,
  scheduled_date DATE,
  scheduled_time TIME,
  format VARCHAR(50) NOT NULL DEFAULT 'Post estático', -- 'Headlines', 'Legendas', 'Reels', 'Carrossel', 'Post estático', 'Landing page'
  status VARCHAR(30) NOT NULL DEFAULT 'PLANNED', -- 'PLANNED', 'IN_CREATION', 'APPROVED', 'SCHEDULED', 'PUBLISHED'
  title VARCHAR(255) NOT NULL,
  central_idea TEXT NOT NULL,
  target_audience_name VARCHAR(255),
  tone_of_voice VARCHAR(150),
  call_to_action TEXT,
  prompt_used TEXT,
  headlines_generated JSONB DEFAULT '[]'::jsonb,
  selected_headline TEXT,
  captions_generated JSONB DEFAULT '[]'::jsonb,
  selected_caption TEXT,
  reels_options JSONB DEFAULT '[]'::jsonb, -- Armazena até 2 opções completas de roteiro
  selected_reels TEXT,
  carousel_options JSONB DEFAULT '[]'::jsonb, -- Armazena até 2 opções completas de carrossel
  selected_carousel TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_calendar_client ON public.content_calendar_items(client_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_content_calendar_status ON public.content_calendar_items(status);

