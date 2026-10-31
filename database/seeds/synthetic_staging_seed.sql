-- ==============================================================================
-- OTIMIZZA ERP | SEED SINTÉTICO PARA HOMOLOGAÇÃO E TESTES
-- ==============================================================================
-- Regra Estrita: DADOS 100% SINTÉTICOS. ZERO DADOS REAIS DE PRODUÇÃO.
-- ==============================================================================

-- 1. Contas Financeiras de Teste
INSERT INTO public.financial_accounts (id, name, bank_name, account_type, initial_balance, current_balance, status)
VALUES 
  ('11111111-1111-4111-8111-111111111111', 'Caixa Geral Homologação', 'Caixa Interno', 'CASH', 50000.00, 50000.00, 'ACTIVE'),
  ('22222222-2222-4222-8222-222222222222', 'Banco Itaú Homologação', 'Banco Itaú S.A.', 'CHECKING', 120000.00, 120000.00, 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- 2. Categorias Financeiras
INSERT INTO public.financial_categories (id, name, type, status)
VALUES 
  ('33333333-3333-4333-8333-333333333331', 'Receita de Assinaturas', 'INCOME', 'ACTIVE'),
  ('33333333-3333-4333-8333-333333333332', 'Serviços Avulsos', 'INCOME', 'ACTIVE'),
  ('33333333-3333-4333-8333-333333333333', 'Infraestrutura Cloud', 'EXPENSE', 'ACTIVE'),
  ('33333333-3333-4333-8333-333333333334', 'Pessoal e Pró-labore', 'EXPENSE', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- 3. Categorias de Serviços
INSERT INTO public.service_categories (id, name, description, status)
VALUES
  ('44444444-4444-4444-8444-444444444441', 'Marketing Digital', 'Serviços de tráfego pago, SEO e inbound', 'ACTIVE'),
  ('44444444-4444-4444-8444-444444444442', 'Tecnologia & ERP', 'Sistemas de gestão e integrações', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- 4. Serviços de Teste
INSERT INTO public.services (id, category_id, name, description, default_price, default_cost, billing_unit, status)
VALUES
  ('55555555-5555-4555-8555-555555555551', '44444444-4444-4444-8444-444444444441', 'Plano Growth Recorrente', 'Gestão mensal de crescimento', 3500.00, 800.00, 'MES', 'ACTIVE'),
  ('55555555-5555-4555-8555-555555555552', '44444444-4444-4444-8444-444444444442', 'Licença ERP Otimizza Pro', 'Assinatura mensal de software', 1200.00, 150.00, 'MES', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- 5. Clientes Sintéticos
INSERT INTO public.clients (id, type, name, trade_name, document, email, phone, status)
VALUES
  ('66666666-6666-4666-8666-666666666661', 'PJ', 'Empresa Alfa Testes Homologação LTDA', 'Alfa Tech Testes', '11222333000181', 'contato@alfateste.homolog.local', '(11) 98888-0001', 'ACTIVE'),
  ('66666666-6666-4666-8666-666666666662', 'PJ', 'Beta Soluções Digitais Sintéticas SA', 'Beta Digital', '22333444000192', 'financeiro@betateste.homolog.local', '(11) 98888-0002', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- 6. Fornecedores Sintéticos
INSERT INTO public.suppliers (id, person_type, name, trade_name, document, email, phone, category, status)
VALUES
  ('77777777-7777-4777-8777-777777777771', 'PJ', 'Provedor Cloud Sintético LTDA', 'Cloud Provider Test', '33444555000103', 'suporte@cloudteste.homolog.local', '(11) 98888-0003', 'INFRASTRUCTURE', 'ACTIVE'),
  ('77777777-7777-4777-8777-777777777772', 'PJ', 'Agência Parceira Homologação ME', 'Parceiro MKT', '44555666000114', 'parceiro@agenciateste.homolog.local', '(11) 98888-0004', 'MARKETING', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- 7. Pipeline Comercial (CRM)
INSERT INTO public.crm_pipelines (id, name, description, is_default, status)
VALUES
  ('88888888-8888-4888-8888-888888888881', 'Funil Comercial Homologação', 'Pipeline de vendas sintético para homologação', true, 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.crm_pipeline_stages (id, pipeline_id, name, display_order, win_probability, color, stage_type, status)
VALUES
  ('99999999-9999-4999-8999-999999999991', '88888888-8888-4888-8888-888888888881', 'Prospecção', 1, 10, '#3b82f6', 'NORMAL', 'ACTIVE'),
  ('99999999-9999-4999-8999-999999999992', '88888888-8888-4888-8888-888888888881', 'Qualificação', 2, 30, '#8b5cf6', 'NORMAL', 'ACTIVE'),
  ('99999999-9999-4999-8999-999999999993', '88888888-8888-4888-8888-888888888881', 'Proposta', 3, 60, '#f59e0b', 'NORMAL', 'ACTIVE'),
  ('99999999-9999-4999-8999-999999999994', '88888888-8888-4888-8888-888888888881', 'Negociação', 4, 80, '#ec4899', 'NORMAL', 'ACTIVE'),
  ('99999999-9999-4999-8999-999999999995', '88888888-8888-4888-8888-888888888881', 'Fechado Ganho', 5, 100, '#10b981', 'WON', 'ACTIVE'),
  ('99999999-9999-4999-8999-999999999996', '88888888-8888-4888-8888-888888888881', 'Perdido', 6, 0, '#ef4444', 'LOST', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;
