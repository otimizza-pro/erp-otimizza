-- ==============================================================================
-- OTIMIZZA ERP - MODELO FÍSICO DE DADOS (POSTGRESQL 16 / SUPABASE)
-- Extraído do Schema Atual com Fidelidade Relacional de 100%
-- Data de Geração: 2026-11-01T13:27:46.124Z
-- Tabelas: 54 | Chaves Estrangeiras: 104 | Índices: 245
-- NOTA: Arquivo apenas para documentação, estudo e visualização de modelagem.
-- ==============================================================================

-- Extensões Necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";


-- ==============================================================================
-- 1. MÓDULO COMERCIAL & CRM
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.crm_pipelines (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  name CHARACTER VARYING NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false NOT NULL,
  status CHARACTER VARYING DEFAULT 'ACTIVE'::character varying NOT NULL,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT pk_crm_pipelines PRIMARY KEY (id)
);

-- Índices de crm_pipelines
CREATE INDEX idx_crm_pipelines_is_default ON public.crm_pipelines USING btree (is_default);
CREATE INDEX idx_crm_pipelines_status ON public.crm_pipelines USING btree (status);

CREATE TABLE IF NOT EXISTS public.crm_pipeline_stages (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  pipeline_id UUID NOT NULL,
  name CHARACTER VARYING NOT NULL,
  color CHARACTER VARYING DEFAULT '#6366f1'::character varying NOT NULL,
  display_order INTEGER DEFAULT 0 NOT NULL,
  win_probability INTEGER DEFAULT 50 NOT NULL,
  stage_type CHARACTER VARYING DEFAULT 'NORMAL'::character varying NOT NULL,
  status CHARACTER VARYING DEFAULT 'ACTIVE'::character varying NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT pk_crm_pipeline_stages PRIMARY KEY (id),
  CONSTRAINT fk_crm_pipeline_stages_pipeline_id FOREIGN KEY (pipeline_id) REFERENCES public.crm_pipelines (id)
);

-- Índices de crm_pipeline_stages
CREATE INDEX idx_crm_pipeline_stages_order ON public.crm_pipeline_stages USING btree (pipeline_id, display_order);
CREATE INDEX idx_crm_pipeline_stages_pipeline ON public.crm_pipeline_stages USING btree (pipeline_id);
CREATE INDEX idx_crm_pipeline_stages_type ON public.crm_pipeline_stages USING btree (stage_type);

CREATE TABLE IF NOT EXISTS public.crm_leads (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  lead_code CHARACTER VARYING DEFAULT ('LEAD-'::text || lpad((nextval('crm_lead_number_seq'::regclass))::text, 5, '0'::text)) NOT NULL,
  person_type CHARACTER VARYING NOT NULL,
  name CHARACTER VARYING NOT NULL,
  trade_name CHARACTER VARYING,
  document CHARACTER VARYING,
  email CHARACTER VARYING,
  phone CHARACTER VARYING,
  whatsapp CHARACTER VARYING,
  primary_contact CHARACTER VARYING,
  segment CHARACTER VARYING,
  city CHARACTER VARYING,
  state CHARACTER VARYING,
  source CHARACTER VARYING DEFAULT 'OUTROS'::character varying NOT NULL,
  notes TEXT,
  status CHARACTER VARYING DEFAULT 'NEW'::character varying NOT NULL,
  converted_client_id UUID,
  converted_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT pk_crm_leads PRIMARY KEY (id),
  CONSTRAINT fk_crm_leads_converted_client_id FOREIGN KEY (converted_client_id) REFERENCES public.clients (id)
);

-- Índices de crm_leads
CREATE UNIQUE INDEX crm_leads_lead_code_key ON public.crm_leads USING btree (lead_code);
CREATE INDEX idx_crm_leads_converted_client ON public.crm_leads USING btree (converted_client_id);
CREATE INDEX idx_crm_leads_email ON public.crm_leads USING btree (email);
CREATE INDEX idx_crm_leads_name ON public.crm_leads USING btree (name);
CREATE INDEX idx_crm_leads_phone ON public.crm_leads USING btree (phone);
CREATE INDEX idx_crm_leads_source ON public.crm_leads USING btree (source);
CREATE INDEX idx_crm_leads_status ON public.crm_leads USING btree (status);
CREATE INDEX idx_crm_leads_status_created ON public.crm_leads USING btree (status, created_at DESC);
CREATE UNIQUE INDEX uq_crm_leads_document ON public.crm_leads USING btree (document) WHERE ((document IS NOT NULL) AND ((document)::text <> ''::text) AND ((status)::text <> 'ARCHIVED'::text));

CREATE TABLE IF NOT EXISTS public.crm_opportunities (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  opportunity_code CHARACTER VARYING DEFAULT ('OPP-'::text || lpad((nextval('crm_opportunity_number_seq'::regclass))::text, 5, '0'::text)) NOT NULL,
  title CHARACTER VARYING NOT NULL,
  lead_id UUID,
  client_id UUID,
  pipeline_id UUID NOT NULL,
  stage_id UUID NOT NULL,
  amount NUMERIC DEFAULT 0.00 NOT NULL,
  billing_period CHARACTER VARYING DEFAULT 'MONTHLY'::character varying NOT NULL,
  probability INTEGER DEFAULT 50 NOT NULL,
  normalized_monthly_value NUMERIC DEFAULT 0.00 NOT NULL,
  source CHARACTER VARYING,
  expected_close_date DATE,
  closed_at TIMESTAMPTZ,
  status CHARACTER VARYING DEFAULT 'OPEN'::character varying NOT NULL,
  lost_reason TEXT,
  notes TEXT,
  proposal_id UUID,
  contract_id UUID,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT pk_crm_opportunities PRIMARY KEY (id),
  CONSTRAINT fk_crm_opportunities_client_id FOREIGN KEY (client_id) REFERENCES public.clients (id),
  CONSTRAINT fk_crm_opportunities_contract_id FOREIGN KEY (contract_id) REFERENCES public.contracts (id),
  CONSTRAINT fk_crm_opportunities_lead_id FOREIGN KEY (lead_id) REFERENCES public.crm_leads (id),
  CONSTRAINT fk_crm_opportunities_pipeline_id FOREIGN KEY (pipeline_id) REFERENCES public.crm_pipelines (id),
  CONSTRAINT fk_crm_opportunities_proposal_id FOREIGN KEY (proposal_id) REFERENCES public.proposals (id),
  CONSTRAINT fk_crm_opportunities_stage_id FOREIGN KEY (stage_id) REFERENCES public.crm_pipeline_stages (id)
);

-- Índices de crm_opportunities
CREATE UNIQUE INDEX crm_opportunities_opportunity_code_key ON public.crm_opportunities USING btree (opportunity_code);
CREATE INDEX idx_crm_opp_client_id ON public.crm_opportunities USING btree (client_id);
CREATE INDEX idx_crm_opp_close_date ON public.crm_opportunities USING btree (expected_close_date);
CREATE INDEX idx_crm_opp_lead_id ON public.crm_opportunities USING btree (lead_id);
CREATE INDEX idx_crm_opp_pipeline_id ON public.crm_opportunities USING btree (pipeline_id);
CREATE INDEX idx_crm_opp_stage_id ON public.crm_opportunities USING btree (stage_id);
CREATE INDEX idx_crm_opp_status ON public.crm_opportunities USING btree (status);

CREATE TABLE IF NOT EXISTS public.crm_opportunity_history (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  opportunity_id UUID NOT NULL,
  from_pipeline_id UUID,
  to_pipeline_id UUID,
  from_stage_id UUID,
  to_stage_id UUID,
  from_status CHARACTER VARYING,
  to_status CHARACTER VARYING,
  from_amount NUMERIC,
  to_amount NUMERIC,
  notes TEXT,
  created_by CHARACTER VARYING DEFAULT 'ADMIN'::character varying,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT pk_crm_opportunity_history PRIMARY KEY (id),
  CONSTRAINT fk_crm_opportunity_history_from_pipeline_id FOREIGN KEY (from_pipeline_id) REFERENCES public.crm_pipelines (id),
  CONSTRAINT fk_crm_opportunity_history_from_stage_id FOREIGN KEY (from_stage_id) REFERENCES public.crm_pipeline_stages (id),
  CONSTRAINT fk_crm_opportunity_history_opportunity_id FOREIGN KEY (opportunity_id) REFERENCES public.crm_opportunities (id),
  CONSTRAINT fk_crm_opportunity_history_to_pipeline_id FOREIGN KEY (to_pipeline_id) REFERENCES public.crm_pipelines (id),
  CONSTRAINT fk_crm_opportunity_history_to_stage_id FOREIGN KEY (to_stage_id) REFERENCES public.crm_pipeline_stages (id)
);

-- Índices de crm_opportunity_history
CREATE INDEX idx_crm_opp_hist_created_at ON public.crm_opportunity_history USING btree (created_at);
CREATE INDEX idx_crm_opp_hist_opp_id ON public.crm_opportunity_history USING btree (opportunity_id);

CREATE TABLE IF NOT EXISTS public.crm_activities (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  activity_type CHARACTER VARYING NOT NULL,
  title CHARACTER VARYING NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status CHARACTER VARYING DEFAULT 'PENDING'::character varying NOT NULL,
  lead_id UUID,
  client_id UUID,
  opportunity_id UUID,
  created_by CHARACTER VARYING DEFAULT 'ADMIN'::character varying,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT pk_crm_activities PRIMARY KEY (id),
  CONSTRAINT fk_crm_activities_client_id FOREIGN KEY (client_id) REFERENCES public.clients (id),
  CONSTRAINT fk_crm_activities_lead_id FOREIGN KEY (lead_id) REFERENCES public.crm_leads (id),
  CONSTRAINT fk_crm_activities_opportunity_id FOREIGN KEY (opportunity_id) REFERENCES public.crm_opportunities (id)
);

-- Índices de crm_activities
CREATE INDEX idx_crm_act_client_id ON public.crm_activities USING btree (client_id);
CREATE INDEX idx_crm_act_due_date ON public.crm_activities USING btree (due_date);
CREATE INDEX idx_crm_act_lead_id ON public.crm_activities USING btree (lead_id);
CREATE INDEX idx_crm_act_opp_id ON public.crm_activities USING btree (opportunity_id);
CREATE INDEX idx_crm_act_status ON public.crm_activities USING btree (status);
CREATE INDEX idx_crm_activities_pending_due ON public.crm_activities USING btree (status, due_date) WHERE ((status)::text = 'PENDING'::text);

CREATE TABLE IF NOT EXISTS public.combos (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  name CHARACTER VARYING NOT NULL,
  description TEXT,
  total_price NUMERIC DEFAULT 0.00 NOT NULL,
  status CHARACTER VARYING DEFAULT 'ACTIVE'::character varying NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  archived_at TIMESTAMPTZ,
  CONSTRAINT pk_combos PRIMARY KEY (id)
);

-- Índices de combos
CREATE INDEX idx_combos_status ON public.combos USING btree (status);

CREATE TABLE IF NOT EXISTS public.combo_items (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  combo_id UUID NOT NULL,
  service_id UUID NOT NULL,
  component_price NUMERIC DEFAULT 0.00 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT pk_combo_items PRIMARY KEY (id),
  CONSTRAINT fk_combo_items_combo_id FOREIGN KEY (combo_id) REFERENCES public.combos (id),
  CONSTRAINT fk_combo_items_service_id FOREIGN KEY (service_id) REFERENCES public.services (id)
);

-- Índices de combo_items
CREATE INDEX idx_combo_items_combo_id ON public.combo_items USING btree (combo_id);
CREATE INDEX idx_combo_items_service_id ON public.combo_items USING btree (service_id);

CREATE TABLE IF NOT EXISTS public.service_categories (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  name CHARACTER VARYING NOT NULL,
  description TEXT,
  parent_id UUID,
  status CHARACTER VARYING DEFAULT 'ACTIVE'::character varying NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  archived_at TIMESTAMPTZ,
  CONSTRAINT pk_service_categories PRIMARY KEY (id),
  CONSTRAINT fk_service_categories_parent_id FOREIGN KEY (parent_id) REFERENCES public.service_categories (id)
);

-- Índices de service_categories
CREATE INDEX idx_service_categories_parent ON public.service_categories USING btree (parent_id);
CREATE INDEX idx_service_categories_status ON public.service_categories USING btree (status);

CREATE TABLE IF NOT EXISTS public.services (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  category_id UUID,
  name CHARACTER VARYING NOT NULL,
  description TEXT,
  default_price NUMERIC DEFAULT 0.00 NOT NULL,
  default_cost NUMERIC DEFAULT 0.00 NOT NULL,
  billing_unit CHARACTER VARYING DEFAULT 'MES'::character varying NOT NULL,
  status CHARACTER VARYING DEFAULT 'ACTIVE'::character varying NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  archived_at TIMESTAMPTZ,
  default_supplier_id UUID,
  default_cost_periodicity CHARACTER VARYING DEFAULT 'MONTHLY'::character varying NOT NULL,
  CONSTRAINT pk_services PRIMARY KEY (id),
  CONSTRAINT fk_services_category_id FOREIGN KEY (category_id) REFERENCES public.service_categories (id),
  CONSTRAINT fk_services_default_supplier_id FOREIGN KEY (default_supplier_id) REFERENCES public.suppliers (id)
);

-- Índices de services
CREATE INDEX idx_services_category_id ON public.services USING btree (category_id);
CREATE INDEX idx_services_default_supplier_id ON public.services USING btree (default_supplier_id);
CREATE INDEX idx_services_name ON public.services USING btree (name);
CREATE INDEX idx_services_status ON public.services USING btree (status);

CREATE TABLE IF NOT EXISTS public.proposals (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  proposal_code CHARACTER VARYING DEFAULT ('PROP-'::text || lpad((nextval('proposal_number_seq'::regclass))::text, 5, '0'::text)) NOT NULL,
  title CHARACTER VARYING NOT NULL,
  lead_id UUID,
  client_id UUID,
  opportunity_id UUID,
  status CHARACTER VARYING DEFAULT 'DRAFT'::character varying NOT NULL,
  current_version_number INTEGER DEFAULT 1 NOT NULL,
  approved_version_number INTEGER,
  approved_at TIMESTAMPTZ,
  approval_notes TEXT,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  canceled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  valid_until DATE NOT NULL,
  contract_id UUID,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  archived_at TIMESTAMPTZ,
  CONSTRAINT pk_proposals PRIMARY KEY (id),
  CONSTRAINT fk_proposals_client_id FOREIGN KEY (client_id) REFERENCES public.clients (id),
  CONSTRAINT fk_proposals_contract_id FOREIGN KEY (contract_id) REFERENCES public.contracts (id),
  CONSTRAINT fk_proposals_lead_id FOREIGN KEY (lead_id) REFERENCES public.crm_leads (id),
  CONSTRAINT fk_proposals_opportunity_id FOREIGN KEY (opportunity_id) REFERENCES public.crm_opportunities (id)
);

-- Índices de proposals
CREATE INDEX idx_proposals_client_id ON public.proposals USING btree (client_id);
CREATE INDEX idx_proposals_created_at ON public.proposals USING btree (created_at);
CREATE INDEX idx_proposals_lead_id ON public.proposals USING btree (lead_id);
CREATE INDEX idx_proposals_opportunity_id ON public.proposals USING btree (opportunity_id);
CREATE INDEX idx_proposals_status ON public.proposals USING btree (status);
CREATE INDEX idx_proposals_trgm_code ON public.proposals USING gin (proposal_code gin_trgm_ops);
CREATE INDEX idx_proposals_valid_until ON public.proposals USING btree (valid_until);
CREATE UNIQUE INDEX proposals_proposal_code_key ON public.proposals USING btree (proposal_code);

CREATE TABLE IF NOT EXISTS public.proposal_versions (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  proposal_id UUID NOT NULL,
  version_number INTEGER NOT NULL,
  version_status CHARACTER VARYING DEFAULT 'DRAFT'::character varying NOT NULL,
  recipient_snapshot JSONB DEFAULT '{}'::jsonb NOT NULL,
  commercial_terms_snapshot JSONB DEFAULT '{}'::jsonb NOT NULL,
  subtotal_one_time NUMERIC DEFAULT 0.00 NOT NULL,
  subtotal_monthly NUMERIC DEFAULT 0.00 NOT NULL,
  subtotal_yearly NUMERIC DEFAULT 0.00 NOT NULL,
  discount_total NUMERIC DEFAULT 0.00 NOT NULL,
  total_one_time_effective NUMERIC DEFAULT 0.00 NOT NULL,
  total_monthly_effective NUMERIC DEFAULT 0.00 NOT NULL,
  total_yearly_effective NUMERIC DEFAULT 0.00 NOT NULL,
  estimated_one_time_cost NUMERIC DEFAULT 0.00 NOT NULL,
  estimated_monthly_cost NUMERIC DEFAULT 0.00 NOT NULL,
  estimated_yearly_cost NUMERIC DEFAULT 0.00 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  approved_at TIMESTAMPTZ,
  CONSTRAINT pk_proposal_versions PRIMARY KEY (id),
  CONSTRAINT fk_proposal_versions_proposal_id FOREIGN KEY (proposal_id) REFERENCES public.proposals (id)
);

-- Índices de proposal_versions
CREATE INDEX idx_proposal_versions_proposal_id ON public.proposal_versions USING btree (proposal_id);
CREATE INDEX idx_proposal_versions_status ON public.proposal_versions USING btree (version_status);
CREATE UNIQUE INDEX uq_proposal_version_number ON public.proposal_versions USING btree (proposal_id, version_number);

CREATE TABLE IF NOT EXISTS public.proposal_items (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  proposal_version_id UUID NOT NULL,
  source_type CHARACTER VARYING NOT NULL,
  service_id UUID NOT NULL,
  service_name CHARACTER VARYING NOT NULL,
  combo_id UUID,
  combo_name CHARACTER VARYING,
  description_snapshot TEXT,
  periodicity CHARACTER VARYING NOT NULL,
  quantity NUMERIC DEFAULT 1.00 NOT NULL,
  reference_unit_price NUMERIC DEFAULT 0.00 NOT NULL,
  negotiated_unit_price NUMERIC DEFAULT 0.00 NOT NULL,
  discount_amount NUMERIC DEFAULT 0.00 NOT NULL,
  total_amount NUMERIC DEFAULT 0.00 NOT NULL,
  unit_cost NUMERIC DEFAULT 0.00 NOT NULL,
  total_cost NUMERIC DEFAULT 0.00 NOT NULL,
  supplier_id UUID,
  supplier_name_snapshot CHARACTER VARYING,
  cost_periodicity CHARACTER VARYING DEFAULT 'MONTHLY'::character varying NOT NULL,
  display_order INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT pk_proposal_items PRIMARY KEY (id),
  CONSTRAINT fk_proposal_items_combo_id FOREIGN KEY (combo_id) REFERENCES public.combos (id),
  CONSTRAINT fk_proposal_items_proposal_version_id FOREIGN KEY (proposal_version_id) REFERENCES public.proposal_versions (id),
  CONSTRAINT fk_proposal_items_service_id FOREIGN KEY (service_id) REFERENCES public.services (id),
  CONSTRAINT fk_proposal_items_supplier_id FOREIGN KEY (supplier_id) REFERENCES public.suppliers (id)
);

-- Índices de proposal_items
CREATE INDEX idx_proposal_items_combo_id ON public.proposal_items USING btree (combo_id);
CREATE INDEX idx_proposal_items_service_id ON public.proposal_items USING btree (service_id);
CREATE INDEX idx_proposal_items_version_id ON public.proposal_items USING btree (proposal_version_id);

CREATE TABLE IF NOT EXISTS public.proposal_events (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  proposal_id UUID NOT NULL,
  proposal_version_id UUID,
  event_type CHARACTER VARYING NOT NULL,
  previous_state CHARACTER VARYING,
  new_state CHARACTER VARYING,
  details JSONB DEFAULT '{}'::jsonb,
  actor_id UUID,
  actor_name CHARACTER VARYING,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT pk_proposal_events PRIMARY KEY (id),
  CONSTRAINT fk_proposal_events_actor_id FOREIGN KEY (actor_id) REFERENCES public.users (id),
  CONSTRAINT fk_proposal_events_proposal_id FOREIGN KEY (proposal_id) REFERENCES public.proposals (id),
  CONSTRAINT fk_proposal_events_proposal_version_id FOREIGN KEY (proposal_version_id) REFERENCES public.proposal_versions (id)
);

-- Índices de proposal_events
CREATE INDEX idx_proposal_events_created_at ON public.proposal_events USING btree (created_at);
CREATE INDEX idx_proposal_events_proposal_id ON public.proposal_events USING btree (proposal_id);

CREATE TABLE IF NOT EXISTS public.proposal_contract_conversions (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  proposal_id UUID NOT NULL,
  proposal_version_id UUID NOT NULL,
  contract_id UUID NOT NULL,
  converted_client_id UUID NOT NULL,
  periodicity CHARACTER VARYING NOT NULL,
  idempotency_key CHARACTER VARYING NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT pk_proposal_contract_conversions PRIMARY KEY (id),
  CONSTRAINT fk_proposal_contract_conversions_contract_id FOREIGN KEY (contract_id) REFERENCES public.contracts (id),
  CONSTRAINT fk_proposal_contract_conversions_converted_client_id FOREIGN KEY (converted_client_id) REFERENCES public.clients (id),
  CONSTRAINT fk_proposal_contract_conversions_proposal_id FOREIGN KEY (proposal_id) REFERENCES public.proposals (id),
  CONSTRAINT fk_proposal_contract_conversions_proposal_version_id FOREIGN KEY (proposal_version_id) REFERENCES public.proposal_versions (id)
);

-- Índices de proposal_contract_conversions
CREATE INDEX idx_prop_conv_contract_id ON public.proposal_contract_conversions USING btree (contract_id);
CREATE INDEX idx_prop_conv_proposal_id ON public.proposal_contract_conversions USING btree (proposal_id);
CREATE UNIQUE INDEX proposal_contract_conversions_idempotency_key_key ON public.proposal_contract_conversions USING btree (idempotency_key);


-- ==============================================================================
-- 2. MÓDULO DE CLIENTES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.clients (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  type CHARACTER VARYING NOT NULL,
  name CHARACTER VARYING NOT NULL,
  trade_name CHARACTER VARYING,
  document CHARACTER VARYING,
  email CHARACTER VARYING,
  phone CHARACTER VARYING,
  whatsapp CHARACTER VARYING,
  postal_code CHARACTER VARYING,
  street CHARACTER VARYING,
  number CHARACTER VARYING,
  complement CHARACTER VARYING,
  neighborhood CHARACTER VARYING,
  city CHARACTER VARYING,
  state CHARACTER VARYING,
  status CHARACTER VARYING DEFAULT 'ACTIVE'::character varying NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  archived_at TIMESTAMPTZ,
  CONSTRAINT pk_clients PRIMARY KEY (id)
);

-- Índices de clients
CREATE INDEX idx_clients_created_at ON public.clients USING btree (created_at);
CREATE INDEX idx_clients_name ON public.clients USING btree (name);
CREATE INDEX idx_clients_status ON public.clients USING btree (status);
CREATE INDEX idx_clients_trgm_doc ON public.clients USING gin (document gin_trgm_ops);
CREATE INDEX idx_clients_trgm_name ON public.clients USING gin (name gin_trgm_ops);
CREATE UNIQUE INDEX uq_clients_active_document ON public.clients USING btree (document) WHERE (((status)::text = 'ACTIVE'::text) AND (document IS NOT NULL) AND ((document)::text <> ''::text));

CREATE TABLE IF NOT EXISTS public.client_contacts (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  client_id UUID NOT NULL,
  name CHARACTER VARYING NOT NULL,
  role CHARACTER VARYING,
  email CHARACTER VARYING,
  phone CHARACTER VARYING,
  whatsapp CHARACTER VARYING,
  is_primary BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT pk_client_contacts PRIMARY KEY (id),
  CONSTRAINT fk_client_contacts_client_id FOREIGN KEY (client_id) REFERENCES public.clients (id)
);

-- Índices de client_contacts
CREATE INDEX idx_client_contacts_client_id ON public.client_contacts USING btree (client_id);


-- ==============================================================================
-- 3. MÓDULO DE CONTRATOS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.contracts (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  client_id UUID NOT NULL,
  contract_number CHARACTER VARYING NOT NULL,
  status CHARACTER VARYING DEFAULT 'ACTIVE'::character varying NOT NULL,
  cancellation_reason TEXT,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  proposal_id UUID,
  proposal_code CHARACTER VARYING,
  CONSTRAINT pk_contracts PRIMARY KEY (id),
  CONSTRAINT fk_contracts_client_id FOREIGN KEY (client_id) REFERENCES public.clients (id),
  CONSTRAINT fk_contracts_proposal_id FOREIGN KEY (proposal_id) REFERENCES public.proposals (id)
);

-- Índices de contracts
CREATE UNIQUE INDEX contracts_contract_number_key ON public.contracts USING btree (contract_number);
CREATE INDEX idx_contracts_client_id ON public.contracts USING btree (client_id);
CREATE INDEX idx_contracts_created_at ON public.contracts USING btree (created_at);
CREATE INDEX idx_contracts_status ON public.contracts USING btree (status);
CREATE INDEX idx_contracts_trgm_num ON public.contracts USING gin (contract_number gin_trgm_ops);

CREATE TABLE IF NOT EXISTS public.contract_versions (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  contract_id UUID NOT NULL,
  version_number INTEGER NOT NULL,
  title CHARACTER VARYING NOT NULL,
  description TEXT,
  billing_period CHARACTER VARYING NOT NULL,
  due_day SMALLINT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  is_indefinite BOOLEAN DEFAULT false NOT NULL,
  effective_date DATE NOT NULL,
  total_amount NUMERIC DEFAULT 0.00 NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT pk_contract_versions PRIMARY KEY (id),
  CONSTRAINT fk_contract_versions_contract_id FOREIGN KEY (contract_id) REFERENCES public.contracts (id)
);

-- Índices de contract_versions
CREATE INDEX idx_contract_versions_billing_period ON public.contract_versions USING btree (billing_period, effective_date);
CREATE INDEX idx_contract_versions_contract_effective ON public.contract_versions USING btree (contract_id, effective_date DESC);
CREATE INDEX idx_contract_versions_contract_id ON public.contract_versions USING btree (contract_id);
CREATE INDEX idx_contract_versions_effective_date ON public.contract_versions USING btree (effective_date);
CREATE INDEX idx_contract_versions_expiring ON public.contract_versions USING btree (contract_id, end_date) WHERE ((NOT is_indefinite) AND (end_date IS NOT NULL));
CREATE UNIQUE INDEX uq_contract_version_number ON public.contract_versions USING btree (contract_id, version_number);

CREATE TABLE IF NOT EXISTS public.contract_items (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  contract_version_id UUID NOT NULL,
  service_id UUID NOT NULL,
  service_name CHARACTER VARYING NOT NULL,
  combo_id UUID,
  combo_name CHARACTER VARYING,
  quantity NUMERIC DEFAULT 1.00 NOT NULL,
  unit_price NUMERIC DEFAULT 0.00 NOT NULL,
  unit_cost NUMERIC DEFAULT 0.00 NOT NULL,
  total_price NUMERIC DEFAULT 0.00 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  supplier_id UUID,
  supplier_name_snapshot CHARACTER VARYING,
  cost_periodicity CHARACTER VARYING DEFAULT 'MONTHLY'::character varying NOT NULL,
  is_legacy_cost BOOLEAN DEFAULT false NOT NULL,
  CONSTRAINT pk_contract_items PRIMARY KEY (id),
  CONSTRAINT fk_contract_items_combo_id FOREIGN KEY (combo_id) REFERENCES public.combos (id),
  CONSTRAINT fk_contract_items_contract_version_id FOREIGN KEY (contract_version_id) REFERENCES public.contract_versions (id),
  CONSTRAINT fk_contract_items_service_id FOREIGN KEY (service_id) REFERENCES public.services (id),
  CONSTRAINT fk_contract_items_supplier_id FOREIGN KEY (supplier_id) REFERENCES public.suppliers (id)
);

-- Índices de contract_items
CREATE INDEX idx_contract_items_service_id ON public.contract_items USING btree (service_id);
CREATE INDEX idx_contract_items_supplier_id ON public.contract_items USING btree (supplier_id);
CREATE INDEX idx_contract_items_version_id ON public.contract_items USING btree (contract_version_id);

CREATE TABLE IF NOT EXISTS public.contract_project_recurring_settings (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  contract_id UUID NOT NULL,
  is_enabled BOOLEAN DEFAULT false NOT NULL,
  template_id UUID NOT NULL,
  periodicity CHARACTER VARYING DEFAULT 'MONTHLY'::character varying NOT NULL,
  start_day SMALLINT DEFAULT 1 NOT NULL,
  duration_days INTEGER DEFAULT 30 NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  is_suspended BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT pk_contract_project_recurring_settings PRIMARY KEY (id),
  CONSTRAINT fk_contract_project_recurring_settings_contract_id FOREIGN KEY (contract_id) REFERENCES public.contracts (id),
  CONSTRAINT fk_contract_project_recurring_settings_template_id FOREIGN KEY (template_id) REFERENCES public.project_templates (id)
);

-- Índices de contract_project_recurring_settings
CREATE UNIQUE INDEX contract_project_recurring_settings_contract_id_key ON public.contract_project_recurring_settings USING btree (contract_id);
CREATE INDEX idx_cprs_contract ON public.contract_project_recurring_settings USING btree (contract_id);
CREATE INDEX idx_cprs_enabled ON public.contract_project_recurring_settings USING btree (is_enabled, is_suspended);


-- ==============================================================================
-- 4. MÓDULO FINANCEIRO
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.financial_accounts (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  name CHARACTER VARYING NOT NULL,
  bank_name CHARACTER VARYING,
  account_type CHARACTER VARYING DEFAULT 'CHECKING'::character varying NOT NULL,
  initial_balance NUMERIC DEFAULT 0.00 NOT NULL,
  current_balance NUMERIC DEFAULT 0.00 NOT NULL,
  status CHARACTER VARYING DEFAULT 'ACTIVE'::character varying NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT pk_financial_accounts PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.cost_centers (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  code CHARACTER VARYING NOT NULL,
  name CHARACTER VARYING NOT NULL,
  description TEXT,
  status CHARACTER VARYING DEFAULT 'ACTIVE'::character varying NOT NULL,
  is_system_default BOOLEAN DEFAULT false NOT NULL,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT pk_cost_centers PRIMARY KEY (id)
);

-- Índices de cost_centers
CREATE UNIQUE INDEX cost_centers_code_key ON public.cost_centers USING btree (code);
CREATE INDEX idx_cost_centers_code ON public.cost_centers USING btree (code);
CREATE INDEX idx_cost_centers_status ON public.cost_centers USING btree (status);

CREATE TABLE IF NOT EXISTS public.managerial_accounts (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  code CHARACTER VARYING NOT NULL,
  name CHARACTER VARYING NOT NULL,
  classification_group CHARACTER VARYING NOT NULL,
  subgroup CHARACTER VARYING NOT NULL,
  display_order INTEGER DEFAULT 0 NOT NULL,
  status CHARACTER VARYING DEFAULT 'ACTIVE'::character varying NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT pk_managerial_accounts PRIMARY KEY (id)
);

-- Índices de managerial_accounts
CREATE INDEX idx_managerial_acc_group ON public.managerial_accounts USING btree (classification_group);
CREATE INDEX idx_managerial_acc_order ON public.managerial_accounts USING btree (display_order);
CREATE UNIQUE INDEX managerial_accounts_code_key ON public.managerial_accounts USING btree (code);

CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  supplier_code CHARACTER VARYING DEFAULT ('FORN-'::text || lpad((nextval('supplier_number_seq'::regclass))::text, 5, '0'::text)) NOT NULL,
  person_type CHARACTER VARYING NOT NULL,
  name CHARACTER VARYING NOT NULL,
  trade_name CHARACTER VARYING,
  document CHARACTER VARYING,
  email CHARACTER VARYING,
  phone CHARACTER VARYING,
  whatsapp CHARACTER VARYING,
  category CHARACTER VARYING,
  postal_code CHARACTER VARYING,
  street CHARACTER VARYING,
  number CHARACTER VARYING,
  complement CHARACTER VARYING,
  neighborhood CHARACTER VARYING,
  city CHARACTER VARYING,
  state CHARACTER VARYING,
  notes TEXT,
  status CHARACTER VARYING DEFAULT 'ACTIVE'::character varying NOT NULL,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT pk_suppliers PRIMARY KEY (id)
);

-- Índices de suppliers
CREATE INDEX idx_suppliers_category ON public.suppliers USING btree (category);
CREATE INDEX idx_suppliers_name ON public.suppliers USING btree (name);
CREATE INDEX idx_suppliers_status ON public.suppliers USING btree (status);
CREATE UNIQUE INDEX suppliers_supplier_code_key ON public.suppliers USING btree (supplier_code);
CREATE UNIQUE INDEX uq_suppliers_document ON public.suppliers USING btree (document) WHERE ((document IS NOT NULL) AND ((document)::text <> ''::text) AND ((status)::text <> 'ARCHIVED'::text));

CREATE TABLE IF NOT EXISTS public.payable_templates (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  supplier_name CHARACTER VARYING NOT NULL,
  category_id UUID,
  description CHARACTER VARYING NOT NULL,
  billing_period CHARACTER VARYING NOT NULL,
  due_day SMALLINT NOT NULL,
  amount NUMERIC NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  is_indefinite BOOLEAN DEFAULT true NOT NULL,
  status CHARACTER VARYING DEFAULT 'ACTIVE'::character varying NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT pk_payable_templates PRIMARY KEY (id),
  CONSTRAINT fk_payable_templates_category_id FOREIGN KEY (category_id) REFERENCES public.financial_categories (id)
);

-- Índices de payable_templates
CREATE INDEX idx_payable_templates_status ON public.payable_templates USING btree (status);

CREATE TABLE IF NOT EXISTS public.payables (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  payable_template_id UUID,
  supplier_name CHARACTER VARYING NOT NULL,
  category_id UUID,
  contract_id UUID,
  service_id UUID,
  payable_number CHARACTER VARYING NOT NULL,
  description CHARACTER VARYING NOT NULL,
  competency CHARACTER VARYING NOT NULL,
  due_date DATE NOT NULL,
  original_amount NUMERIC NOT NULL,
  paid_amount NUMERIC DEFAULT 0.00 NOT NULL,
  balance_amount NUMERIC NOT NULL,
  status CHARACTER VARYING DEFAULT 'PENDING'::character varying NOT NULL,
  idempotency_key CHARACTER VARYING,
  cancellation_reason TEXT,
  canceled_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  supplier_id UUID,
  supplier_name_snapshot CHARACTER VARYING,
  allocated_amount NUMERIC DEFAULT 0.00 NOT NULL,
  unallocated_amount NUMERIC DEFAULT 0.00 NOT NULL,
  cost_center_id UUID,
  managerial_account_id UUID,
  CONSTRAINT pk_payables PRIMARY KEY (id),
  CONSTRAINT fk_payables_category_id FOREIGN KEY (category_id) REFERENCES public.financial_categories (id),
  CONSTRAINT fk_payables_contract_id FOREIGN KEY (contract_id) REFERENCES public.contracts (id),
  CONSTRAINT fk_payables_cost_center_id FOREIGN KEY (cost_center_id) REFERENCES public.cost_centers (id),
  CONSTRAINT fk_payables_managerial_account_id FOREIGN KEY (managerial_account_id) REFERENCES public.managerial_accounts (id),
  CONSTRAINT fk_payables_payable_template_id FOREIGN KEY (payable_template_id) REFERENCES public.payable_templates (id),
  CONSTRAINT fk_payables_service_id FOREIGN KEY (service_id) REFERENCES public.services (id),
  CONSTRAINT fk_payables_supplier_id FOREIGN KEY (supplier_id) REFERENCES public.suppliers (id)
);

-- Índices de payables
CREATE INDEX idx_payables_category_id ON public.payables USING btree (category_id);
CREATE INDEX idx_payables_competency ON public.payables USING btree (competency);
CREATE INDEX idx_payables_cost_center ON public.payables USING btree (cost_center_id);
CREATE INDEX idx_payables_due_date ON public.payables USING btree (due_date);
CREATE INDEX idx_payables_managerial_acc ON public.payables USING btree (managerial_account_id);
CREATE INDEX idx_payables_status ON public.payables USING btree (status);
CREATE INDEX idx_payables_status_due_date ON public.payables USING btree (status, due_date) WHERE ((status)::text <> 'CANCELED'::text);
CREATE INDEX idx_payables_supplier ON public.payables USING btree (supplier_name);
CREATE INDEX idx_payables_supplier_id ON public.payables USING btree (supplier_id);
CREATE INDEX idx_payables_trgm_num ON public.payables USING gin (payable_number gin_trgm_ops);
CREATE UNIQUE INDEX payables_payable_number_key ON public.payables USING btree (payable_number);
CREATE UNIQUE INDEX uq_payables_idempotency_key ON public.payables USING btree (idempotency_key) WHERE ((idempotency_key IS NOT NULL) AND ((status)::text <> 'CANCELED'::text));

CREATE TABLE IF NOT EXISTS public.payable_allocations (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  payable_id UUID NOT NULL,
  contract_id UUID,
  contract_item_id UUID,
  service_id UUID,
  allocated_amount NUMERIC NOT NULL,
  coverage_start_date DATE NOT NULL,
  coverage_end_date DATE NOT NULL,
  cost_periodicity CHARACTER VARYING DEFAULT 'MONTHLY'::character varying NOT NULL,
  status CHARACTER VARYING DEFAULT 'ACTIVE'::character varying NOT NULL,
  cancellation_reason TEXT,
  canceled_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT pk_payable_allocations PRIMARY KEY (id),
  CONSTRAINT fk_payable_allocations_contract_id FOREIGN KEY (contract_id) REFERENCES public.contracts (id),
  CONSTRAINT fk_payable_allocations_contract_item_id FOREIGN KEY (contract_item_id) REFERENCES public.contract_items (id),
  CONSTRAINT fk_payable_allocations_payable_id FOREIGN KEY (payable_id) REFERENCES public.payables (id),
  CONSTRAINT fk_payable_allocations_service_id FOREIGN KEY (service_id) REFERENCES public.services (id)
);

-- Índices de payable_allocations
CREATE INDEX idx_allocations_contract_id ON public.payable_allocations USING btree (contract_id);
CREATE INDEX idx_allocations_payable_id ON public.payable_allocations USING btree (payable_id);
CREATE INDEX idx_allocations_service_id ON public.payable_allocations USING btree (service_id);
CREATE INDEX idx_allocations_status ON public.payable_allocations USING btree (status);

CREATE TABLE IF NOT EXISTS public.receivables (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  client_id UUID NOT NULL,
  contract_id UUID,
  contract_version_id UUID,
  receivable_number CHARACTER VARYING NOT NULL,
  description CHARACTER VARYING NOT NULL,
  competency CHARACTER VARYING NOT NULL,
  due_date DATE NOT NULL,
  original_amount NUMERIC NOT NULL,
  paid_amount NUMERIC DEFAULT 0.00 NOT NULL,
  balance_amount NUMERIC NOT NULL,
  status CHARACTER VARYING DEFAULT 'PENDING'::character varying NOT NULL,
  idempotency_key CHARACTER VARYING,
  cancellation_reason TEXT,
  canceled_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT pk_receivables PRIMARY KEY (id),
  CONSTRAINT fk_receivables_client_id FOREIGN KEY (client_id) REFERENCES public.clients (id),
  CONSTRAINT fk_receivables_contract_id FOREIGN KEY (contract_id) REFERENCES public.contracts (id),
  CONSTRAINT fk_receivables_contract_version_id FOREIGN KEY (contract_version_id) REFERENCES public.contract_versions (id)
);

-- Índices de receivables
CREATE INDEX idx_receivables_client_id ON public.receivables USING btree (client_id);
CREATE INDEX idx_receivables_competency ON public.receivables USING btree (competency);
CREATE INDEX idx_receivables_contract_id ON public.receivables USING btree (contract_id);
CREATE INDEX idx_receivables_due_date ON public.receivables USING btree (due_date);
CREATE INDEX idx_receivables_status ON public.receivables USING btree (status);
CREATE INDEX idx_receivables_status_due_date ON public.receivables USING btree (status, due_date) WHERE ((status)::text <> 'CANCELED'::text);
CREATE INDEX idx_receivables_trgm_num ON public.receivables USING gin (receivable_number gin_trgm_ops);
CREATE UNIQUE INDEX receivables_receivable_number_key ON public.receivables USING btree (receivable_number);
CREATE UNIQUE INDEX uq_receivables_idempotency_key ON public.receivables USING btree (idempotency_key) WHERE ((idempotency_key IS NOT NULL) AND ((status)::text <> 'CANCELED'::text));

CREATE TABLE IF NOT EXISTS public.financial_cost_center_allocations (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  payable_id UUID NOT NULL,
  cost_center_id UUID NOT NULL,
  percentage NUMERIC NOT NULL,
  amount NUMERIC NOT NULL,
  status CHARACTER VARYING DEFAULT 'ACTIVE'::character varying NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT pk_financial_cost_center_allocations PRIMARY KEY (id),
  CONSTRAINT fk_financial_cost_center_allocations_cost_center_id FOREIGN KEY (cost_center_id) REFERENCES public.cost_centers (id),
  CONSTRAINT fk_financial_cost_center_allocations_payable_id FOREIGN KEY (payable_id) REFERENCES public.payables (id)
);

-- Índices de financial_cost_center_allocations
CREATE INDEX idx_fcca_cost_center ON public.financial_cost_center_allocations USING btree (cost_center_id);
CREATE INDEX idx_fcca_payable ON public.financial_cost_center_allocations USING btree (payable_id);
CREATE INDEX idx_fcca_status ON public.financial_cost_center_allocations USING btree (status);
CREATE UNIQUE INDEX uq_payable_cost_center ON public.financial_cost_center_allocations USING btree (payable_id, cost_center_id);

CREATE TABLE IF NOT EXISTS public.financial_settlements (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  receivable_id UUID,
  payable_id UUID,
  financial_account_id UUID NOT NULL,
  settlement_type CHARACTER VARYING NOT NULL,
  amount NUMERIC NOT NULL,
  settlement_date DATE NOT NULL,
  notes TEXT,
  reversed_settlement_id UUID,
  is_reversed BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT pk_financial_settlements PRIMARY KEY (id),
  CONSTRAINT fk_financial_settlements_financial_account_id FOREIGN KEY (financial_account_id) REFERENCES public.financial_accounts (id),
  CONSTRAINT fk_financial_settlements_payable_id FOREIGN KEY (payable_id) REFERENCES public.payables (id),
  CONSTRAINT fk_financial_settlements_receivable_id FOREIGN KEY (receivable_id) REFERENCES public.receivables (id),
  CONSTRAINT fk_financial_settlements_reversed_settlement_id FOREIGN KEY (reversed_settlement_id) REFERENCES public.financial_settlements (id)
);

-- Índices de financial_settlements
CREATE INDEX idx_financial_settlements_type_date ON public.financial_settlements USING btree (settlement_type, settlement_date) WHERE (is_reversed = false);
CREATE INDEX idx_settlements_account ON public.financial_settlements USING btree (financial_account_id);
CREATE INDEX idx_settlements_date ON public.financial_settlements USING btree (settlement_date);
CREATE INDEX idx_settlements_payable ON public.financial_settlements USING btree (payable_id);
CREATE INDEX idx_settlements_receivable ON public.financial_settlements USING btree (receivable_id);

CREATE TABLE IF NOT EXISTS public.revenue_accruals (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  contract_id UUID,
  receivable_id UUID,
  client_id UUID NOT NULL,
  competency_month CHARACTER VARYING NOT NULL,
  gross_amount NUMERIC NOT NULL,
  deductions_amount NUMERIC DEFAULT 0.00 NOT NULL,
  net_amount NUMERIC NOT NULL,
  status CHARACTER VARYING DEFAULT 'RECOGNIZED'::character varying NOT NULL,
  recognition_rule CHARACTER VARYING DEFAULT 'MONTHLY_CONTRACT'::character varying NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT pk_revenue_accruals PRIMARY KEY (id),
  CONSTRAINT fk_revenue_accruals_client_id FOREIGN KEY (client_id) REFERENCES public.clients (id),
  CONSTRAINT fk_revenue_accruals_contract_id FOREIGN KEY (contract_id) REFERENCES public.contracts (id),
  CONSTRAINT fk_revenue_accruals_receivable_id FOREIGN KEY (receivable_id) REFERENCES public.receivables (id)
);

-- Índices de revenue_accruals
CREATE INDEX idx_rev_accrual_client ON public.revenue_accruals USING btree (client_id);
CREATE INDEX idx_rev_accrual_competency ON public.revenue_accruals USING btree (competency_month);
CREATE INDEX idx_rev_accrual_status ON public.revenue_accruals USING btree (status);
CREATE UNIQUE INDEX uq_revenue_accrual_contract_month ON public.revenue_accruals USING btree (contract_id, competency_month) WHERE ((contract_id IS NOT NULL) AND ((status)::text <> 'CANCELED'::text));
CREATE UNIQUE INDEX uq_revenue_accrual_receivable_month ON public.revenue_accruals USING btree (receivable_id, competency_month) WHERE ((receivable_id IS NOT NULL) AND ((status)::text <> 'CANCELED'::text));

CREATE TABLE IF NOT EXISTS public.cost_accruals (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  allocation_id UUID NOT NULL,
  payable_id UUID NOT NULL,
  contract_id UUID,
  service_id UUID,
  supplier_id UUID,
  competency_month CHARACTER VARYING NOT NULL,
  accrual_amount NUMERIC NOT NULL,
  status CHARACTER VARYING DEFAULT 'ACCRUED'::character varying NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT pk_cost_accruals PRIMARY KEY (id),
  CONSTRAINT fk_cost_accruals_allocation_id FOREIGN KEY (allocation_id) REFERENCES public.payable_allocations (id),
  CONSTRAINT fk_cost_accruals_contract_id FOREIGN KEY (contract_id) REFERENCES public.contracts (id),
  CONSTRAINT fk_cost_accruals_payable_id FOREIGN KEY (payable_id) REFERENCES public.payables (id),
  CONSTRAINT fk_cost_accruals_service_id FOREIGN KEY (service_id) REFERENCES public.services (id),
  CONSTRAINT fk_cost_accruals_supplier_id FOREIGN KEY (supplier_id) REFERENCES public.suppliers (id)
);

-- Índices de cost_accruals
CREATE INDEX idx_cost_accruals_allocation ON public.cost_accruals USING btree (allocation_id);
CREATE INDEX idx_cost_accruals_competency ON public.cost_accruals USING btree (competency_month);
CREATE INDEX idx_cost_accruals_contract ON public.cost_accruals USING btree (contract_id);
CREATE INDEX idx_cost_accruals_service ON public.cost_accruals USING btree (service_id);
CREATE INDEX idx_cost_accruals_status ON public.cost_accruals USING btree (status);
CREATE INDEX idx_cost_accruals_supplier ON public.cost_accruals USING btree (supplier_id);
CREATE UNIQUE INDEX uq_accrual_alloc_competency ON public.cost_accruals USING btree (allocation_id, competency_month);

CREATE TABLE IF NOT EXISTS public.financial_statements (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  account_id UUID NOT NULL,
  statement_number CHARACTER VARYING NOT NULL,
  movement_type CHARACTER VARYING NOT NULL,
  amount NUMERIC NOT NULL,
  balance_after NUMERIC NOT NULL,
  movement_date DATE NOT NULL,
  description CHARACTER VARYING NOT NULL,
  settlement_id UUID,
  transfer_pair_id UUID,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT pk_financial_statements PRIMARY KEY (id),
  CONSTRAINT fk_financial_statements_account_id FOREIGN KEY (account_id) REFERENCES public.financial_accounts (id),
  CONSTRAINT fk_financial_statements_settlement_id FOREIGN KEY (settlement_id) REFERENCES public.financial_settlements (id)
);

-- Índices de financial_statements
CREATE UNIQUE INDEX financial_statements_statement_number_key ON public.financial_statements USING btree (statement_number);
CREATE INDEX idx_statements_account ON public.financial_statements USING btree (account_id);
CREATE INDEX idx_statements_date ON public.financial_statements USING btree (movement_date);
CREATE INDEX idx_statements_transfer ON public.financial_statements USING btree (transfer_pair_id);

CREATE TABLE IF NOT EXISTS public.financial_categories (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  name CHARACTER VARYING NOT NULL,
  type CHARACTER VARYING NOT NULL,
  parent_id UUID,
  status CHARACTER VARYING DEFAULT 'ACTIVE'::character varying NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  managerial_account_id UUID,
  default_cost_center_id UUID,
  CONSTRAINT pk_financial_categories PRIMARY KEY (id),
  CONSTRAINT fk_financial_categories_default_cost_center_id FOREIGN KEY (default_cost_center_id) REFERENCES public.cost_centers (id),
  CONSTRAINT fk_financial_categories_managerial_account_id FOREIGN KEY (managerial_account_id) REFERENCES public.managerial_accounts (id),
  CONSTRAINT fk_financial_categories_parent_id FOREIGN KEY (parent_id) REFERENCES public.financial_categories (id)
);

-- Índices de financial_categories
CREATE INDEX idx_fin_cat_cost_center ON public.financial_categories USING btree (default_cost_center_id);
CREATE INDEX idx_fin_cat_managerial ON public.financial_categories USING btree (managerial_account_id);
CREATE INDEX idx_financial_cat_parent ON public.financial_categories USING btree (parent_id);


-- ==============================================================================
-- 5. MÓDULO DE GESTÃO DE PROJETOS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.project_templates (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  code CHARACTER VARYING NOT NULL,
  name CHARACTER VARYING NOT NULL,
  description TEXT,
  estimated_days INTEGER DEFAULT 30 NOT NULL,
  estimated_hours NUMERIC DEFAULT 0.00 NOT NULL,
  status CHARACTER VARYING DEFAULT 'ACTIVE'::character varying NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT pk_project_templates PRIMARY KEY (id)
);

-- Índices de project_templates
CREATE INDEX idx_project_templates_status ON public.project_templates USING btree (status);
CREATE UNIQUE INDEX project_templates_code_key ON public.project_templates USING btree (code);

CREATE TABLE IF NOT EXISTS public.project_template_stages (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  template_id UUID NOT NULL,
  name CHARACTER VARYING NOT NULL,
  order_index INTEGER DEFAULT 1 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT pk_project_template_stages PRIMARY KEY (id),
  CONSTRAINT fk_project_template_stages_template_id FOREIGN KEY (template_id) REFERENCES public.project_templates (id)
);

-- Índices de project_template_stages
CREATE INDEX idx_template_stages_template ON public.project_template_stages USING btree (template_id);

CREATE TABLE IF NOT EXISTS public.project_template_tasks (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  template_id UUID NOT NULL,
  stage_id UUID,
  title CHARACTER VARYING NOT NULL,
  description TEXT,
  relative_due_days INTEGER DEFAULT 7 NOT NULL,
  estimated_hours NUMERIC DEFAULT 1.00 NOT NULL,
  order_index INTEGER DEFAULT 1 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT pk_project_template_tasks PRIMARY KEY (id),
  CONSTRAINT fk_project_template_tasks_stage_id FOREIGN KEY (stage_id) REFERENCES public.project_template_stages (id),
  CONSTRAINT fk_project_template_tasks_template_id FOREIGN KEY (template_id) REFERENCES public.project_templates (id)
);

-- Índices de project_template_tasks
CREATE INDEX idx_template_tasks_template ON public.project_template_tasks USING btree (template_id);

CREATE TABLE IF NOT EXISTS public.projects (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  project_number CHARACTER VARYING DEFAULT ('PRJ-'::text || lpad((nextval('project_number_seq'::regclass))::text, 5, '0'::text)) NOT NULL,
  name CHARACTER VARYING NOT NULL,
  description TEXT,
  project_type CHARACTER VARYING DEFAULT 'STANDALONE'::character varying NOT NULL,
  client_id UUID,
  contract_id UUID,
  contract_version_id UUID,
  template_id UUID,
  competency CHARACTER VARYING,
  status CHARACTER VARYING DEFAULT 'PLANNED'::character varying NOT NULL,
  priority CHARACTER VARYING DEFAULT 'MEDIUM'::character varying NOT NULL,
  start_date DATE NOT NULL,
  due_date DATE NOT NULL,
  completed_at TIMESTAMPTZ,
  estimated_budget NUMERIC DEFAULT 0.00 NOT NULL,
  estimated_hours NUMERIC DEFAULT 0.00 NOT NULL,
  actual_hours NUMERIC DEFAULT 0.00 NOT NULL,
  estimated_cost NUMERIC DEFAULT 0.00 NOT NULL,
  actual_cost NUMERIC DEFAULT 0.00 NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  archived_at TIMESTAMPTZ,
  CONSTRAINT pk_projects PRIMARY KEY (id),
  CONSTRAINT fk_projects_client_id FOREIGN KEY (client_id) REFERENCES public.clients (id),
  CONSTRAINT fk_projects_contract_id FOREIGN KEY (contract_id) REFERENCES public.contracts (id),
  CONSTRAINT fk_projects_contract_version_id FOREIGN KEY (contract_version_id) REFERENCES public.contract_versions (id),
  CONSTRAINT fk_projects_template_id FOREIGN KEY (template_id) REFERENCES public.project_templates (id)
);

-- Índices de projects
CREATE INDEX idx_projects_client_id ON public.projects USING btree (client_id);
CREATE INDEX idx_projects_competency ON public.projects USING btree (competency);
CREATE INDEX idx_projects_contract_id ON public.projects USING btree (contract_id);
CREATE INDEX idx_projects_due_date ON public.projects USING btree (due_date);
CREATE INDEX idx_projects_priority ON public.projects USING btree (priority);
CREATE INDEX idx_projects_status ON public.projects USING btree (status);
CREATE INDEX idx_projects_status_due_date ON public.projects USING btree (status, due_date) WHERE ((status)::text <> ALL ((ARRAY['COMPLETED'::character varying, 'CANCELED'::character varying])::text[]));
CREATE INDEX idx_projects_trgm_num ON public.projects USING gin (project_number gin_trgm_ops);
CREATE UNIQUE INDEX projects_project_number_key ON public.projects USING btree (project_number);
CREATE UNIQUE INDEX uq_projects_contract_competency ON public.projects USING btree (contract_id, competency) WHERE ((contract_id IS NOT NULL) AND (competency IS NOT NULL) AND ((status)::text <> 'CANCELED'::text));

CREATE TABLE IF NOT EXISTS public.project_stages (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  project_id UUID NOT NULL,
  name CHARACTER VARYING NOT NULL,
  order_index INTEGER DEFAULT 1 NOT NULL,
  status CHARACTER VARYING DEFAULT 'ACTIVE'::character varying NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT pk_project_stages PRIMARY KEY (id),
  CONSTRAINT fk_project_stages_project_id FOREIGN KEY (project_id) REFERENCES public.projects (id)
);

-- Índices de project_stages
CREATE INDEX idx_project_stages_project ON public.project_stages USING btree (project_id);

CREATE TABLE IF NOT EXISTS public.project_tasks (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  project_id UUID NOT NULL,
  stage_id UUID,
  task_number CHARACTER VARYING DEFAULT ('TSK-'::text || lpad((nextval('task_number_seq'::regclass))::text, 5, '0'::text)) NOT NULL,
  title CHARACTER VARYING NOT NULL,
  description TEXT,
  status CHARACTER VARYING DEFAULT 'TODO'::character varying NOT NULL,
  priority CHARACTER VARYING DEFAULT 'MEDIUM'::character varying NOT NULL,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  estimated_hours NUMERIC DEFAULT 0.00 NOT NULL,
  actual_hours NUMERIC DEFAULT 0.00 NOT NULL,
  order_index INTEGER DEFAULT 1 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT pk_project_tasks PRIMARY KEY (id),
  CONSTRAINT fk_project_tasks_project_id FOREIGN KEY (project_id) REFERENCES public.projects (id),
  CONSTRAINT fk_project_tasks_stage_id FOREIGN KEY (stage_id) REFERENCES public.project_stages (id)
);

-- Índices de project_tasks
CREATE INDEX idx_project_tasks_due_date ON public.project_tasks USING btree (due_date);
CREATE INDEX idx_project_tasks_project ON public.project_tasks USING btree (project_id);
CREATE INDEX idx_project_tasks_stage ON public.project_tasks USING btree (stage_id);
CREATE INDEX idx_project_tasks_status ON public.project_tasks USING btree (status);
CREATE UNIQUE INDEX project_tasks_task_number_key ON public.project_tasks USING btree (task_number);

CREATE TABLE IF NOT EXISTS public.project_checklists (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  task_id UUID NOT NULL,
  title CHARACTER VARYING NOT NULL,
  is_completed BOOLEAN DEFAULT false NOT NULL,
  order_index INTEGER DEFAULT 1 NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT pk_project_checklists PRIMARY KEY (id),
  CONSTRAINT fk_project_checklists_task_id FOREIGN KEY (task_id) REFERENCES public.project_tasks (id)
);

-- Índices de project_checklists
CREATE INDEX idx_project_checklists_task ON public.project_checklists USING btree (task_id);

CREATE TABLE IF NOT EXISTS public.project_time_entries (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  project_id UUID NOT NULL,
  task_id UUID,
  entry_date DATE NOT NULL,
  hours NUMERIC NOT NULL,
  description CHARACTER VARYING NOT NULL,
  hourly_rate NUMERIC DEFAULT 0.00 NOT NULL,
  calculated_cost NUMERIC DEFAULT 0.00 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT pk_project_time_entries PRIMARY KEY (id),
  CONSTRAINT fk_project_time_entries_project_id FOREIGN KEY (project_id) REFERENCES public.projects (id),
  CONSTRAINT fk_project_time_entries_task_id FOREIGN KEY (task_id) REFERENCES public.project_tasks (id)
);

-- Índices de project_time_entries
CREATE INDEX idx_time_entries_date ON public.project_time_entries USING btree (entry_date);
CREATE INDEX idx_time_entries_project ON public.project_time_entries USING btree (project_id);
CREATE INDEX idx_time_entries_task ON public.project_time_entries USING btree (task_id);

CREATE TABLE IF NOT EXISTS public.project_generation_history (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  contract_id UUID NOT NULL,
  project_id UUID,
  competency CHARACTER VARYING NOT NULL,
  status CHARACTER VARYING NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT pk_project_generation_history PRIMARY KEY (id),
  CONSTRAINT fk_project_generation_history_contract_id FOREIGN KEY (contract_id) REFERENCES public.contracts (id),
  CONSTRAINT fk_project_generation_history_project_id FOREIGN KEY (project_id) REFERENCES public.projects (id)
);

-- Índices de project_generation_history
CREATE INDEX idx_pgh_competency ON public.project_generation_history USING btree (competency);
CREATE INDEX idx_pgh_contract ON public.project_generation_history USING btree (contract_id);
CREATE UNIQUE INDEX uq_proj_gen_contract_competency ON public.project_generation_history USING btree (contract_id, competency);


-- ==============================================================================
-- 6. MÓDULO DE GESTÃO DE DOCUMENTOS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.document_categories (
  id CHARACTER VARYING NOT NULL,
  name CHARACTER VARYING NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT pk_document_categories PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.documents (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  document_code CHARACTER VARYING NOT NULL,
  title CHARACTER VARYING NOT NULL,
  description TEXT,
  category_id CHARACTER VARYING NOT NULL,
  current_version_number INTEGER DEFAULT 1 NOT NULL,
  status CHARACTER VARYING DEFAULT 'ACTIVE'::character varying NOT NULL,
  tags ARRAY DEFAULT '{}'::text[] NOT NULL,
  issue_date DATE,
  expiration_date DATE,
  created_by CHARACTER VARYING,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  archived_at TIMESTAMPTZ,
  CONSTRAINT pk_documents PRIMARY KEY (id),
  CONSTRAINT fk_documents_category_id FOREIGN KEY (category_id) REFERENCES public.document_categories (id)
);

-- Índices de documents
CREATE UNIQUE INDEX documents_document_code_key ON public.documents USING btree (document_code);
CREATE INDEX idx_documents_category_id ON public.documents USING btree (category_id);
CREATE INDEX idx_documents_created_at ON public.documents USING btree (created_at);
CREATE INDEX idx_documents_status ON public.documents USING btree (status);
CREATE INDEX idx_documents_tags ON public.documents USING gin (tags);

CREATE TABLE IF NOT EXISTS public.document_versions (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  document_id UUID NOT NULL,
  version_number INTEGER NOT NULL,
  original_filename CHARACTER VARYING NOT NULL,
  storage_provider CHARACTER VARYING DEFAULT 'SUPABASE_STORAGE'::character varying NOT NULL,
  storage_path CHARACTER VARYING NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  mime_type CHARACTER VARYING NOT NULL,
  sha256_hash CHARACTER VARYING NOT NULL,
  reason_for_change TEXT,
  metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_by CHARACTER VARYING,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT pk_document_versions PRIMARY KEY (id),
  CONSTRAINT fk_document_versions_document_id FOREIGN KEY (document_id) REFERENCES public.documents (id)
);

-- Índices de document_versions
CREATE INDEX idx_doc_versions_doc_id ON public.document_versions USING btree (document_id);
CREATE INDEX idx_doc_versions_sha256 ON public.document_versions USING btree (sha256_hash);
CREATE UNIQUE INDEX uq_document_version_number ON public.document_versions USING btree (document_id, version_number);

CREATE TABLE IF NOT EXISTS public.document_links (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  document_id UUID NOT NULL,
  entity_type CHARACTER VARYING NOT NULL,
  entity_id UUID NOT NULL,
  link_type CHARACTER VARYING DEFAULT 'ATTACHMENT'::character varying NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT pk_document_links PRIMARY KEY (id),
  CONSTRAINT fk_document_links_document_id FOREIGN KEY (document_id) REFERENCES public.documents (id)
);

-- Índices de document_links
CREATE INDEX idx_doc_links_document_id ON public.document_links USING btree (document_id);
CREATE INDEX idx_doc_links_entity ON public.document_links USING btree (entity_type, entity_id);
CREATE UNIQUE INDEX uq_document_entity_link ON public.document_links USING btree (document_id, entity_type, entity_id);

CREATE TABLE IF NOT EXISTS public.document_events (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  document_id UUID NOT NULL,
  version_id UUID,
  event_type CHARACTER VARYING NOT NULL,
  details JSONB DEFAULT '{}'::jsonb NOT NULL,
  actor_id UUID,
  actor_name CHARACTER VARYING,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT pk_document_events PRIMARY KEY (id),
  CONSTRAINT fk_document_events_document_id FOREIGN KEY (document_id) REFERENCES public.documents (id),
  CONSTRAINT fk_document_events_version_id FOREIGN KEY (version_id) REFERENCES public.document_versions (id)
);

-- Índices de document_events
CREATE INDEX idx_doc_events_created_at ON public.document_events USING btree (created_at);
CREATE INDEX idx_doc_events_document_id ON public.document_events USING btree (document_id);

CREATE TABLE IF NOT EXISTS public.document_file_payloads (
  version_id UUID NOT NULL,
  payload BYTEA NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT pk_document_file_payloads PRIMARY KEY (version_id),
  CONSTRAINT fk_document_file_payloads_version_id FOREIGN KEY (version_id) REFERENCES public.document_versions (id)
);


-- ==============================================================================
-- 7. SISTEMA, USUÁRIOS & AUDITORIA
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.users (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  name CHARACTER VARYING NOT NULL,
  email CHARACTER VARYING NOT NULL,
  password_hash CHARACTER VARYING NOT NULL,
  role CHARACTER VARYING DEFAULT 'OPERATOR'::character varying NOT NULL,
  status CHARACTER VARYING DEFAULT 'ACTIVE'::character varying NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT pk_users PRIMARY KEY (id)
);

-- Índices de users
CREATE UNIQUE INDEX uq_users_email ON public.users USING btree (email);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id BIGINT NOT NULL,
  user_id UUID,
  entity_name CHARACTER VARYING NOT NULL,
  entity_id CHARACTER VARYING NOT NULL,
  action CHARACTER VARYING NOT NULL,
  old_data JSONB,
  new_data JSONB,
  ip_address CHARACTER VARYING,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT pk_audit_logs PRIMARY KEY (id),
  CONSTRAINT fk_audit_logs_user_id FOREIGN KEY (user_id) REFERENCES public.users (id)
);

-- Índices de audit_logs
CREATE INDEX idx_audit_created ON public.audit_logs USING btree (created_at);
CREATE INDEX idx_audit_entity ON public.audit_logs USING btree (entity_name, entity_id);

CREATE TABLE IF NOT EXISTS public.dashboard_preferences (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  user_id UUID NOT NULL,
  dashboard_key CHARACTER VARYING DEFAULT 'EXECUTIVE_OVERVIEW'::character varying NOT NULL,
  preferences JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT pk_dashboard_preferences PRIMARY KEY (id),
  CONSTRAINT fk_dashboard_preferences_user_id FOREIGN KEY (user_id) REFERENCES public.users (id)
);

-- Índices de dashboard_preferences
CREATE INDEX idx_dashboard_preferences_user ON public.dashboard_preferences USING btree (user_id);
CREATE UNIQUE INDEX uq_dashboard_user_key ON public.dashboard_preferences USING btree (user_id, dashboard_key);

CREATE TABLE IF NOT EXISTS public._migrations (
  id CHARACTER VARYING NOT NULL,
  name CHARACTER VARYING NOT NULL,
  checksum CHARACTER VARYING NOT NULL,
  applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT pk__migrations PRIMARY KEY (id)
);

