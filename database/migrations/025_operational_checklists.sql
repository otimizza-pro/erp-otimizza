-- Configuração e rotina por cliente. Não contém métricas de mídia simuladas.
CREATE TABLE IF NOT EXISTS operational_checklists (
 scope_key TEXT NOT NULL,
 client_id UUID REFERENCES clients(id),
 area TEXT NOT NULL,
 tasks JSONB NOT NULL DEFAULT '{}',
 updated_by UUID NOT NULL,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 PRIMARY KEY (scope_key, area),
 CHECK (scope_key = COALESCE(client_id::text, 'otimizza'))
);
ALTER TABLE operational_checklists ENABLE ROW LEVEL SECURITY;
-- Acesso do ERP realizado pelo servidor após requireAdminUser; sem políticas públicas.
