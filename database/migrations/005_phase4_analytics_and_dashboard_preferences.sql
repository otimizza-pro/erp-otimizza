-- Migration: 005_phase4_analytics_and_dashboard_preferences.sql
-- Fase 4: Preferências de Layout de Dashboard e Índices Analíticos

-- 1. Tabela para salvar preferências de widgets e layout do administrador
CREATE TABLE IF NOT EXISTS dashboard_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dashboard_key VARCHAR(50) NOT NULL DEFAULT 'EXECUTIVE_OVERVIEW',
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_dashboard_user_key UNIQUE (user_id, dashboard_key)
);

CREATE INDEX IF NOT EXISTS idx_dashboard_preferences_user ON dashboard_preferences(user_id);

-- 2. Índices de Otimização Analítica (BI) para Agregações e Períodos
CREATE INDEX IF NOT EXISTS idx_financial_settlements_type_date 
  ON financial_settlements(settlement_type, settlement_date) 
  WHERE is_reversed = FALSE;

CREATE INDEX IF NOT EXISTS idx_receivables_status_due_date 
  ON receivables(status, due_date) 
  WHERE status <> 'CANCELED';

CREATE INDEX IF NOT EXISTS idx_payables_status_due_date 
  ON payables(status, due_date) 
  WHERE status <> 'CANCELED';

CREATE INDEX IF NOT EXISTS idx_contract_versions_billing_period 
  ON contract_versions(billing_period, effective_date);

CREATE INDEX IF NOT EXISTS idx_contract_versions_contract_effective 
  ON contract_versions(contract_id, effective_date DESC);

-- RLS
ALTER TABLE dashboard_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dashboard_preferences_admin_all ON dashboard_preferences;
CREATE POLICY dashboard_preferences_admin_all ON dashboard_preferences
  FOR ALL
  USING (auth.jwt() ->> 'email' = 'otimizzapro@gmail.com')
  WITH CHECK (auth.jwt() ->> 'email' = 'otimizzapro@gmail.com');
