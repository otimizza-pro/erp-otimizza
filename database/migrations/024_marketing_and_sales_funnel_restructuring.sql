-- Migração 024: Reestruturação dos Funis de Marketing e Vendas
-- Adiciona separação entre Tipo de Aquisição (Inbound/Outbound), Origem do Lead, Canal de Contato
-- Adiciona suporte a ciclo de qualificação completo, nutrição e histórico de status.

-- 1. Atualizar constraint de status em crm_leads para suportar novo fluxo
ALTER TABLE crm_leads DROP CONSTRAINT IF EXISTS crm_leads_status_check;
ALTER TABLE crm_leads ADD CONSTRAINT crm_leads_status_check 
  CHECK (status IN (
    'NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'UNQUALIFIED', 'ARCHIVED',
    'NOVO', 'QUALIFICANDO', 'NUTRICAO', 'OPORTUNIDADE', 'DESQUALIFICADO'
  ));

-- 2. Adicionar campos de aquisição, primeiro contato e atribuição
ALTER TABLE crm_leads 
  ADD COLUMN IF NOT EXISTS acquisition_type VARCHAR(20) DEFAULT 'INBOUND' CHECK (acquisition_type IN ('INBOUND', 'OUTBOUND', 'NAO_INFORMADO')),
  ADD COLUMN IF NOT EXISTS lead_source VARCHAR(100),
  ADD COLUMN IF NOT EXISTS first_contact_channel VARCHAR(50) DEFAULT 'WHATSAPP',
  ADD COLUMN IF NOT EXISTS utm_source VARCHAR(100),
  ADD COLUMN IF NOT EXISTS utm_medium VARCHAR(100),
  ADD COLUMN IF NOT EXISTS utm_campaign VARCHAR(150),
  ADD COLUMN IF NOT EXISTS utm_term VARCHAR(150),
  ADD COLUMN IF NOT EXISTS utm_content VARCHAR(150);

-- Preencher lead_source a partir de source se estiver vazio
UPDATE crm_leads 
SET lead_source = source 
WHERE lead_source IS NULL AND source IS NOT NULL;

-- 3. Adicionar campos para qualificação, nutrição e desqualificação
ALTER TABLE crm_leads
  ADD COLUMN IF NOT EXISTS service_of_interest VARCHAR(150),
  ADD COLUMN IF NOT EXISTS need_summary TEXT,
  ADD COLUMN IF NOT EXISTS urgency_timeline VARCHAR(100),
  ADD COLUMN IF NOT EXISTS estimated_budget NUMERIC(14, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS nurture_reason VARCHAR(255),
  ADD COLUMN IF NOT EXISTS nurture_next_action_date DATE,
  ADD COLUMN IF NOT EXISTS disqualification_reason VARCHAR(255),
  ADD COLUMN IF NOT EXISTS qualification_notes TEXT,
  ADD COLUMN IF NOT EXISTS qualified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS nurtured_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS disqualified_at TIMESTAMPTZ;

-- 4. Criar tabela de histórico de transição de status de leads para BI e auditoria
CREATE TABLE IF NOT EXISTS crm_lead_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  from_status VARCHAR(30),
  to_status VARCHAR(30) NOT NULL,
  reason VARCHAR(255),
  notes TEXT,
  changed_by VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_crm_leads_acq_type ON crm_leads(acquisition_type);
CREATE INDEX IF NOT EXISTS idx_crm_leads_lead_source ON crm_leads(lead_source);
CREATE INDEX IF NOT EXISTS idx_crm_leads_contact_channel ON crm_leads(first_contact_channel);
CREATE INDEX IF NOT EXISTS idx_crm_lead_history_lead ON crm_lead_status_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_lead_history_to_status ON crm_lead_status_history(to_status);

-- 5. Habilitar RLS na nova tabela
ALTER TABLE crm_lead_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_crm_lead_status_history" ON crm_lead_status_history FOR ALL USING (true) WITH CHECK (true);
