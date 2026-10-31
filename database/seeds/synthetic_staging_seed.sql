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
INSERT INTO public.financial_categories (id, name, type, description)
VALUES 
  ('33333333-3333-4333-8333-333333333331', 'Receita de Assinaturas', 'INCOME', 'Mensalidades e planos recorrentes'),
  ('33333333-3333-4333-8333-333333333332', 'Serviços Avulsos', 'INCOME', 'Consultorias e setup inicial'),
  ('33333333-3333-4333-8333-333333333333', 'Infraestrutura Cloud', 'EXPENSE', 'Servidores, banco de dados e APIs'),
  ('33333333-3333-4333-8333-333333333334', 'Pessoal e Pró-labore', 'EXPENSE', 'Folha de pagamento e sócios')
ON CONFLICT (id) DO NOTHING;

-- 3. Categorias de Serviços
INSERT INTO public.service_categories (id, name, description)
VALUES
  ('44444444-4444-4444-8444-444444444441', 'Marketing Digital', 'Serviços de tráfego pago, SEO e inbound'),
  ('44444444-4444-4444-8444-444444444442', 'Tecnologia & ERP', 'Sistemas de gestão e integrações')
ON CONFLICT (id) DO NOTHING;

-- 4. Serviços de Teste
INSERT INTO public.services (id, category_id, name, description, default_price, default_cost, is_active)
VALUES
  ('55555555-5555-4555-8555-555555555551', '44444444-4444-4444-8444-444444444441', 'Plano Growth Recorrente', 'Gestão mensal de crescimento', 3500.00, 800.00, true),
  ('55555555-5555-4555-8555-555555555552', '44444444-4444-4444-8444-444444444442', 'Licença ERP Otimizza Pro', 'Assinatura mensal de software', 1200.00, 150.00, true)
ON CONFLICT (id) DO NOTHING;

-- 5. Clientes Sintéticos
INSERT INTO public.clients (id, name, trade_name, document, person_type, email, phone, status)
VALUES
  ('66666666-6666-4666-8666-666666666661', 'Empresa Alfa Testes Homologação LTDA', 'Alfa Tech Testes', '11.222.333/0001-81', 'PJ', 'contato@alfateste.homolog.local', '(11) 98888-0001', 'ACTIVE'),
  ('66666666-6666-4666-8666-666666666662', 'Beta Soluções Digitais Sintéticas SA', 'Beta Digital', '22.333.444/0001-92', 'PJ', 'financeiro@betateste.homolog.local', '(11) 98888-0002', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- 6. Fornecedores Sintéticos
INSERT INTO public.suppliers (id, name, trade_name, document, person_type, email, phone, category, status)
VALUES
  ('77777777-7777-4777-8777-777777777771', 'Provedor Cloud Sintético LTDA', 'Cloud Provider Test', '33.444.555/0001-03', 'PJ', 'suporte@cloudteste.homolog.local', '(11) 98888-0003', 'INFRASTRUCTURE', 'ACTIVE'),
  ('77777777-7777-4777-8777-777777777772', 'Agência Parceira Homologação ME', 'Parceiro MKT', '44.555.666/0001-14', 'PJ', 'parceiro@agenciateste.homolog.local', '(11) 98888-0004', 'MARKETING', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- 7. Pipeline Comercial (CRM)
INSERT INTO public.crm_pipelines (id, name, description, is_default, color)
VALUES
  ('88888888-8888-4888-8888-888888888881', 'Funil Comercial Homologação', 'Pipeline de vendas sintético para homologação', true, '#059669')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.crm_pipeline_stages (id, pipeline_id, name, stage_order, probability, color)
VALUES
  ('99999999-9999-4999-8999-999999999991', '88888888-8888-4888-8888-888888888881', 'Prospecção', 1, 10, '#3b82f6'),
  ('99999999-9999-4999-8999-999999999992', '88888888-8888-4888-8888-888888888881', 'Qualificação', 2, 30, '#8b5cf6'),
  ('99999999-9999-4999-8999-999999999993', '88888888-8888-4888-8888-888888888881', 'Proposta', 3, 60, '#f59e0b'),
  ('99999999-9999-4999-8999-999999999994', '88888888-8888-4888-8888-888888888881', 'Negociação', 4, 80, '#ec4899'),
  ('99999999-9999-4999-8999-999999999995', '88888888-8888-4888-8888-888888888881', 'Fechado Ganho', 5, 100, '#10b981'),
  ('99999999-9999-4999-8999-999999999996', '88888888-8888-4888-8888-888888888881', 'Perdido', 6, 0, '#ef4444')
ON CONFLICT (id) DO NOTHING;
