-- Migração 002: Fase 1 - Clientes, Catálogo de Serviços e Combos
-- Também aplica RLS e alinhamento de segurança da Fase 0

-- 1. Ativação de RLS nas tabelas existentes da Fase 0
ALTER TABLE IF EXISTS _migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS financial_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS financial_categories ENABLE ROW LEVEL SECURITY;

-- 2. Tabela de Clientes (Pessoa Física e Jurídica)
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(2) NOT NULL CHECK (type IN ('PF', 'PJ')),
    -- PF: Nome Completo / PJ: Razão Social
    name VARCHAR(200) NOT NULL,
    -- PJ: Nome Fantasia
    trade_name VARCHAR(200),
    -- CPF (11 dígitos) ou CNPJ (14 dígitos), normalizado sem pontuação
    document VARCHAR(14),
    email VARCHAR(255),
    phone VARCHAR(20),
    whatsapp VARCHAR(20),
    -- Endereço Completo
    postal_code VARCHAR(10),
    street VARCHAR(255),
    number VARCHAR(30),
    complement VARCHAR(100),
    neighborhood VARCHAR(100),
    city VARCHAR(100),
    state VARCHAR(2),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    archived_at TIMESTAMPTZ
);

-- Unicidade para CPF/CNPJ de clientes ativos (permite nulos e permite reuso se arquivado)
CREATE UNIQUE INDEX IF NOT EXISTS uq_clients_active_document 
ON clients(document) 
WHERE status = 'ACTIVE' AND document IS NOT NULL AND document <> '';

CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients(created_at);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- 3. Tabela de Contatos de Clientes (Múltiplos contatos por cliente)
CREATE TABLE IF NOT EXISTS client_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    role VARCHAR(100), -- Função / Cargo
    email VARCHAR(255),
    phone VARCHAR(20),
    whatsapp VARCHAR(20),
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_client_contacts_client_id ON client_contacts(client_id);
ALTER TABLE client_contacts ENABLE ROW LEVEL SECURITY;

-- 4. Tabela de Categorias de Serviços (com suporte a hierarquia)
CREATE TABLE IF NOT EXISTS service_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES service_categories(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    archived_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_service_categories_parent ON service_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_service_categories_status ON service_categories(status);
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;

-- 5. Tabela de Serviços do Catálogo
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES service_categories(id) ON DELETE RESTRICT,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    -- Preço padrão e Custo padrão de referência em NUMERIC(14,2)
    default_price NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (default_price >= 0),
    default_cost NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (default_cost >= 0),
    -- Unidade de cobrança (ex: HORA, MES, UNIDADE, PROJETO)
    billing_unit VARCHAR(30) NOT NULL DEFAULT 'MES' CHECK (billing_unit IN ('HORA', 'MES', 'UNIDADE', 'PROJETO', 'ANUAL')),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    archived_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_services_category_id ON services(category_id);
CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);
CREATE INDEX IF NOT EXISTS idx_services_name ON services(name);
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- 6. Tabela de Combos (Agrupamentos comerciais de serviços)
CREATE TABLE IF NOT EXISTS combos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    description TEXT,
    -- Preço total calculado pela soma dos componentes
    total_price NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (total_price >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    archived_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_combos_status ON combos(status);
ALTER TABLE combos ENABLE ROW LEVEL SECURITY;

-- 7. Tabela de Componentes de Combos (Itens de Serviços no Combo)
CREATE TABLE IF NOT EXISTS combo_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    combo_id UUID NOT NULL REFERENCES combos(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
    -- Preço específico atribuído a este componente dentro do combo (permite desconto/negociação)
    component_price NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (component_price >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_combo_items_combo_id ON combo_items(combo_id);
CREATE INDEX IF NOT EXISTS idx_combo_items_service_id ON combo_items(service_id);
ALTER TABLE combo_items ENABLE ROW LEVEL SECURITY;
