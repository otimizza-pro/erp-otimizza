-- Additive migration; historical contracts and receipts remain unchanged.
ALTER TABLE contract_versions DROP CONSTRAINT IF EXISTS contract_versions_billing_period_check;
ALTER TABLE contract_versions ADD CONSTRAINT contract_versions_billing_period_check CHECK (billing_period IN ('ONE_TIME','MONTHLY','YEARLY','MIXED'));
ALTER TABLE proposal_contract_conversions DROP CONSTRAINT IF EXISTS proposal_contract_conversions_periodicity_check;
ALTER TABLE proposal_contract_conversions ADD CONSTRAINT proposal_contract_conversions_periodicity_check CHECK (periodicity IN ('ONE_TIME','MONTHLY','YEARLY','MIXED'));
ALTER TABLE contract_items ADD COLUMN periodicity VARCHAR(20) CHECK (periodicity IN ('ONE_TIME','MONTHLY','YEARLY'));
UPDATE contract_items ci SET periodicity = cv.billing_period FROM contract_versions cv WHERE cv.id = ci.contract_version_id;
ALTER TABLE contract_items ALTER COLUMN periodicity SET NOT NULL;
ALTER TABLE contract_items ALTER COLUMN periodicity SET DEFAULT 'MONTHLY';
ALTER TABLE contracts ADD COLUMN billing_configured_at TIMESTAMPTZ;
ALTER TABLE contracts ADD COLUMN group_same_period BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE contract_item_schedules (
  contract_item_id UUID PRIMARY KEY REFERENCES contract_items(id) ON DELETE RESTRICT,
  first_due_date DATE NOT NULL,
  installments SMALLINT NOT NULL CHECK (installments BETWEEN 1 AND 3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE receivable_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receivable_id UUID NOT NULL REFERENCES receivables(id) ON DELETE RESTRICT,
  contract_item_id UUID NOT NULL REFERENCES contract_items(id) ON DELETE RESTRICT,
  installment_number SMALLINT NOT NULL DEFAULT 1,
  period_key VARCHAR(10) NOT NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  UNIQUE (contract_item_id, period_key, installment_number)
);
CREATE INDEX idx_receivable_items_title ON receivable_items(receivable_id);
ALTER TABLE services ADD COLUMN onboarding_template_id UUID REFERENCES project_templates(id) ON DELETE RESTRICT;
CREATE INDEX idx_services_onboarding_template ON services(onboarding_template_id);
CREATE TABLE client_document_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (client_id, name)
);
CREATE TABLE client_document_placements (
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE RESTRICT,
  folder_id UUID NOT NULL REFERENCES client_document_folders(id) ON DELETE RESTRICT,
  PRIMARY KEY (client_id, document_id)
);
CREATE INDEX idx_document_placements_document ON client_document_placements(document_id);
CREATE INDEX idx_document_placements_folder ON client_document_placements(folder_id);
ALTER TABLE contract_item_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE receivable_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_document_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_document_placements ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE sid UUID; tid UUID; stid UUID; BEGIN
 SELECT id INTO sid FROM services WHERE name='Domínio' AND archived_at IS NULL ORDER BY created_at LIMIT 1;
 IF sid IS NULL THEN INSERT INTO services(name,default_price,billing_unit) VALUES('Domínio',60,'ANUAL') RETURNING id INTO sid;
 ELSE UPDATE services SET default_price=60,billing_unit='ANUAL',updated_at=NOW() WHERE id=sid; END IF;
 INSERT INTO project_templates(code,name,description,estimated_days,estimated_hours) VALUES('ONB-DOMINIO','Onboarding — Domínio','Etapas e tarefas iniciais do serviço',30,20) ON CONFLICT(code) DO NOTHING;
 SELECT id INTO tid FROM project_templates WHERE code='ONB-DOMINIO';
 UPDATE services SET onboarding_template_id=tid WHERE id=sid;
 IF NOT EXISTS(SELECT 1 FROM project_template_stages WHERE template_id=tid) THEN
INSERT INTO project_template_stages(template_id,name,order_index) VALUES(tid,'Registro',1) RETURNING id INTO stid;
INSERT INTO project_template_tasks(template_id,stage_id,title,relative_due_days,estimated_hours,order_index) VALUES(tid,stid,'Consultar disponibilidade do domínio',2,1,1);
INSERT INTO project_template_tasks(template_id,stage_id,title,relative_due_days,estimated_hours,order_index) VALUES(tid,stid,'Validar titularidade e dados do cliente',4,1,2);
INSERT INTO project_template_tasks(template_id,stage_id,title,relative_due_days,estimated_hours,order_index) VALUES(tid,stid,'Comprar e registrar domínio',6,1,3);
INSERT INTO project_template_stages(template_id,name,order_index) VALUES(tid,'Configuração',2) RETURNING id INTO stid;
INSERT INTO project_template_tasks(template_id,stage_id,title,relative_due_days,estimated_hours,order_index) VALUES(tid,stid,'Adicionar domínio ao Cloudflare',8,1,4);
INSERT INTO project_template_tasks(template_id,stage_id,title,relative_due_days,estimated_hours,order_index) VALUES(tid,stid,'Apontar DNS para a hospedagem',10,1,5);
INSERT INTO project_template_tasks(template_id,stage_id,title,relative_due_days,estimated_hours,order_index) VALUES(tid,stid,'Configurar e-mail no Purelymail',12,1,6);
INSERT INTO project_template_tasks(template_id,stage_id,title,relative_due_days,estimated_hours,order_index) VALUES(tid,stid,'Configurar MX, SPF, DKIM e DMARC',14,1,7);
INSERT INTO project_template_tasks(template_id,stage_id,title,relative_due_days,estimated_hours,order_index) VALUES(tid,stid,'Testar DNS, site e envio/recebimento de e-mail',16,1,8);
INSERT INTO project_template_stages(template_id,name,order_index) VALUES(tid,'Entrega',3) RETURNING id INTO stid;
INSERT INTO project_template_tasks(template_id,stage_id,title,relative_due_days,estimated_hours,order_index) VALUES(tid,stid,'Documentar acessos e renovação anual',18,1,9);
INSERT INTO project_template_tasks(template_id,stage_id,title,relative_due_days,estimated_hours,order_index) VALUES(tid,stid,'Validar entrega com o cliente',20,1,10);
END IF; END $$;

DO $$ DECLARE sid UUID; tid UUID; stid UUID; BEGIN
 SELECT id INTO sid FROM services WHERE name='Hospedagem de Site' AND archived_at IS NULL ORDER BY created_at LIMIT 1;
 IF sid IS NULL THEN INSERT INTO services(name,default_price,billing_unit) VALUES('Hospedagem de Site',275,'ANUAL') RETURNING id INTO sid;
 ELSE UPDATE services SET default_price=275,billing_unit='ANUAL',updated_at=NOW() WHERE id=sid; END IF;
 INSERT INTO project_templates(code,name,description,estimated_days,estimated_hours) VALUES('ONB-HOSPEDAGEM','Onboarding — Hospedagem de Site','Etapas e tarefas iniciais do serviço',30,20) ON CONFLICT(code) DO NOTHING;
 SELECT id INTO tid FROM project_templates WHERE code='ONB-HOSPEDAGEM';
 UPDATE services SET onboarding_template_id=tid WHERE id=sid;
 IF NOT EXISTS(SELECT 1 FROM project_template_stages WHERE template_id=tid) THEN
INSERT INTO project_template_stages(template_id,name,order_index) VALUES(tid,'Preparação',1) RETURNING id INTO stid;
INSERT INTO project_template_tasks(template_id,stage_id,title,relative_due_days,estimated_hours,order_index) VALUES(tid,stid,'Coletar acessos e requisitos',2,1,1);
INSERT INTO project_template_tasks(template_id,stage_id,title,relative_due_days,estimated_hours,order_index) VALUES(tid,stid,'Provisionar hospedagem',4,1,2);
INSERT INTO project_template_stages(template_id,name,order_index) VALUES(tid,'Configuração',2) RETURNING id INTO stid;
INSERT INTO project_template_tasks(template_id,stage_id,title,relative_due_days,estimated_hours,order_index) VALUES(tid,stid,'Vincular domínio e configurar DNS',6,1,3);
INSERT INTO project_template_tasks(template_id,stage_id,title,relative_due_days,estimated_hours,order_index) VALUES(tid,stid,'Configurar SSL, backups e segurança',8,1,4);
INSERT INTO project_template_tasks(template_id,stage_id,title,relative_due_days,estimated_hours,order_index) VALUES(tid,stid,'Publicar ou migrar arquivos e banco',10,1,5);
INSERT INTO project_template_stages(template_id,name,order_index) VALUES(tid,'Entrega',3) RETURNING id INTO stid;
INSERT INTO project_template_tasks(template_id,stage_id,title,relative_due_days,estimated_hours,order_index) VALUES(tid,stid,'Testar disponibilidade e desempenho',12,1,6);
INSERT INTO project_template_tasks(template_id,stage_id,title,relative_due_days,estimated_hours,order_index) VALUES(tid,stid,'Documentar acessos e renovação anual',14,1,7);
END IF; END $$;

DO $$ DECLARE sid UUID; tid UUID; stid UUID; BEGIN
 SELECT id INTO sid FROM services WHERE name='Criação de WebSite' AND archived_at IS NULL ORDER BY created_at LIMIT 1;
 IF sid IS NULL THEN INSERT INTO services(name,default_price,billing_unit) VALUES('Criação de WebSite',650,'PROJETO') RETURNING id INTO sid;
 ELSE UPDATE services SET default_price=650,billing_unit='PROJETO',updated_at=NOW() WHERE id=sid; END IF;
 INSERT INTO project_templates(code,name,description,estimated_days,estimated_hours) VALUES('ONB-WEBSITE','Onboarding — Criação de WebSite','Etapas e tarefas iniciais do serviço',30,20) ON CONFLICT(code) DO NOTHING;
 SELECT id INTO tid FROM project_templates WHERE code='ONB-WEBSITE';
 UPDATE services SET onboarding_template_id=tid WHERE id=sid;
 IF NOT EXISTS(SELECT 1 FROM project_template_stages WHERE template_id=tid) THEN
INSERT INTO project_template_stages(template_id,name,order_index) VALUES(tid,'Briefing',1) RETURNING id INTO stid;
INSERT INTO project_template_tasks(template_id,stage_id,title,relative_due_days,estimated_hours,order_index) VALUES(tid,stid,'Coletar briefing e referências',2,1,1);
INSERT INTO project_template_tasks(template_id,stage_id,title,relative_due_days,estimated_hours,order_index) VALUES(tid,stid,'Solicitar textos, logo e imagens',4,1,2);
INSERT INTO project_template_tasks(template_id,stage_id,title,relative_due_days,estimated_hours,order_index) VALUES(tid,stid,'Definir sitemap e escopo',6,1,3);
INSERT INTO project_template_stages(template_id,name,order_index) VALUES(tid,'Produção',2) RETURNING id INTO stid;
INSERT INTO project_template_tasks(template_id,stage_id,title,relative_due_days,estimated_hours,order_index) VALUES(tid,stid,'Criar layout e obter aprovação',8,1,4);
INSERT INTO project_template_tasks(template_id,stage_id,title,relative_due_days,estimated_hours,order_index) VALUES(tid,stid,'Desenvolver páginas responsivas',10,1,5);
INSERT INTO project_template_tasks(template_id,stage_id,title,relative_due_days,estimated_hours,order_index) VALUES(tid,stid,'Configurar formulários, SEO e analytics',12,1,6);
INSERT INTO project_template_stages(template_id,name,order_index) VALUES(tid,'Entrega',3) RETURNING id INTO stid;
INSERT INTO project_template_tasks(template_id,stage_id,title,relative_due_days,estimated_hours,order_index) VALUES(tid,stid,'Testar dispositivos, links e formulários',14,1,7);
INSERT INTO project_template_tasks(template_id,stage_id,title,relative_due_days,estimated_hours,order_index) VALUES(tid,stid,'Homologar site com o cliente',16,1,8);
INSERT INTO project_template_tasks(template_id,stage_id,title,relative_due_days,estimated_hours,order_index) VALUES(tid,stid,'Publicar site e orientar manutenção',18,1,9);
END IF; END $$;

DO $$ DECLARE sid UUID; tid UUID; stid UUID; BEGIN
 SELECT id INTO sid FROM services WHERE name='T.P. Google Ads' AND archived_at IS NULL ORDER BY created_at LIMIT 1;
 IF sid IS NULL THEN INSERT INTO services(name,default_price,billing_unit) VALUES('T.P. Google Ads',1000,'MES') RETURNING id INTO sid;
 ELSE UPDATE services SET default_price=1000,billing_unit='MES',updated_at=NOW() WHERE id=sid; END IF;
 INSERT INTO project_templates(code,name,description,estimated_days,estimated_hours) VALUES('ONB-GOOGLE','Onboarding — T.P. Google Ads','Etapas e tarefas iniciais do serviço',30,20) ON CONFLICT(code) DO NOTHING;
 SELECT id INTO tid FROM project_templates WHERE code='ONB-GOOGLE';
 UPDATE services SET onboarding_template_id=tid WHERE id=sid;
 IF NOT EXISTS(SELECT 1 FROM project_template_stages WHERE template_id=tid) THEN
INSERT INTO project_template_stages(template_id,name,order_index) VALUES(tid,'Onboarding',1) RETURNING id INTO stid;
INSERT INTO project_template_tasks(template_id,stage_id,title,relative_due_days,estimated_hours,order_index) VALUES(tid,stid,'Coletar briefing, metas e orçamento de mídia',2,1,1);
INSERT INTO project_template_tasks(template_id,stage_id,title,relative_due_days,estimated_hours,order_index) VALUES(tid,stid,'Solicitar acessos ao Google Ads, GA4 e Tag Manager',4,1,2);
INSERT INTO project_template_tasks(template_id,stage_id,title,relative_due_days,estimated_hours,order_index) VALUES(tid,stid,'Auditar conta e configurar conversões',6,1,3);
INSERT INTO project_template_stages(template_id,name,order_index) VALUES(tid,'Campanhas',2) RETURNING id INTO stid;
INSERT INTO project_template_tasks(template_id,stage_id,title,relative_due_days,estimated_hours,order_index) VALUES(tid,stid,'Pesquisar palavras-chave e negativas',8,1,4);
INSERT INTO project_template_tasks(template_id,stage_id,title,relative_due_days,estimated_hours,order_index) VALUES(tid,stid,'Definir campanhas, segmentação e anúncios',10,1,5);
INSERT INTO project_template_tasks(template_id,stage_id,title,relative_due_days,estimated_hours,order_index) VALUES(tid,stid,'Aprovar plano e publicar campanhas',12,1,6);
INSERT INTO project_template_stages(template_id,name,order_index) VALUES(tid,'Gestão mensal',3) RETURNING id INTO stid;
INSERT INTO project_template_tasks(template_id,stage_id,title,relative_due_days,estimated_hours,order_index) VALUES(tid,stid,'Monitorar orçamento e conversões',14,1,7);
INSERT INTO project_template_tasks(template_id,stage_id,title,relative_due_days,estimated_hours,order_index) VALUES(tid,stid,'Otimizar termos, anúncios e lances',16,1,8);
INSERT INTO project_template_tasks(template_id,stage_id,title,relative_due_days,estimated_hours,order_index) VALUES(tid,stid,'Apresentar relatório e próximos testes',18,1,9);
END IF; END $$;

DO $$ DECLARE sid UUID; tid UUID; stid UUID; BEGIN
 SELECT id INTO sid FROM services WHERE name='T.P. Meta Ads' AND archived_at IS NULL ORDER BY created_at LIMIT 1;
 IF sid IS NULL THEN INSERT INTO services(name,default_price,billing_unit) VALUES('T.P. Meta Ads',1000,'MES') RETURNING id INTO sid;
 ELSE UPDATE services SET default_price=1000,billing_unit='MES',updated_at=NOW() WHERE id=sid; END IF;
 INSERT INTO project_templates(code,name,description,estimated_days,estimated_hours) VALUES('ONB-META','Onboarding — T.P. Meta Ads','Etapas e tarefas iniciais do serviço',30,20) ON CONFLICT(code) DO NOTHING;
 SELECT id INTO tid FROM project_templates WHERE code='ONB-META';
 UPDATE services SET onboarding_template_id=tid WHERE id=sid;
 IF NOT EXISTS(SELECT 1 FROM project_template_stages WHERE template_id=tid) THEN
INSERT INTO project_template_stages(template_id,name,order_index) VALUES(tid,'Onboarding',1) RETURNING id INTO stid;
INSERT INTO project_template_tasks(template_id,stage_id,title,relative_due_days,estimated_hours,order_index) VALUES(tid,stid,'Coletar briefing, público e orçamento de mídia',2,1,1);
INSERT INTO project_template_tasks(template_id,stage_id,title,relative_due_days,estimated_hours,order_index) VALUES(tid,stid,'Solicitar acessos ao Business Manager',4,1,2);
INSERT INTO project_template_tasks(template_id,stage_id,title,relative_due_days,estimated_hours,order_index) VALUES(tid,stid,'Validar pixel, eventos e API de conversões',6,1,3);
INSERT INTO project_template_stages(template_id,name,order_index) VALUES(tid,'Campanhas',2) RETURNING id INTO stid;
INSERT INTO project_template_tasks(template_id,stage_id,title,relative_due_days,estimated_hours,order_index) VALUES(tid,stid,'Definir públicos e campanhas',8,1,4);
INSERT INTO project_template_tasks(template_id,stage_id,title,relative_due_days,estimated_hours,order_index) VALUES(tid,stid,'Produzir e aprovar criativos e textos',10,1,5);
INSERT INTO project_template_tasks(template_id,stage_id,title,relative_due_days,estimated_hours,order_index) VALUES(tid,stid,'Publicar campanhas e testar rastreamento',12,1,6);
INSERT INTO project_template_stages(template_id,name,order_index) VALUES(tid,'Gestão mensal',3) RETURNING id INTO stid;
INSERT INTO project_template_tasks(template_id,stage_id,title,relative_due_days,estimated_hours,order_index) VALUES(tid,stid,'Monitorar resultados e orçamento',14,1,7);
INSERT INTO project_template_tasks(template_id,stage_id,title,relative_due_days,estimated_hours,order_index) VALUES(tid,stid,'Otimizar públicos e criativos',16,1,8);
INSERT INTO project_template_tasks(template_id,stage_id,title,relative_due_days,estimated_hours,order_index) VALUES(tid,stid,'Apresentar relatório e próximos testes',18,1,9);
END IF; END $$;

DO $$ DECLARE sid UUID; tid UUID; stid UUID; BEGIN
 SELECT id INTO sid FROM services WHERE name='Social Media' AND archived_at IS NULL ORDER BY created_at LIMIT 1;
 IF sid IS NULL THEN INSERT INTO services(name,default_price,billing_unit) VALUES('Social Media',1500,'MES') RETURNING id INTO sid;
 ELSE UPDATE services SET default_price=1500,billing_unit='MES',updated_at=NOW() WHERE id=sid; END IF;
 INSERT INTO project_templates(code,name,description,estimated_days,estimated_hours) VALUES('ONB-SOCIAL','Onboarding — Social Media','Etapas e tarefas iniciais do serviço',30,20) ON CONFLICT(code) DO NOTHING;
 SELECT id INTO tid FROM project_templates WHERE code='ONB-SOCIAL';
 UPDATE services SET onboarding_template_id=tid WHERE id=sid;
 IF NOT EXISTS(SELECT 1 FROM project_template_stages WHERE template_id=tid) THEN
INSERT INTO project_template_stages(template_id,name,order_index) VALUES(tid,'Onboarding',1) RETURNING id INTO stid;
INSERT INTO project_template_tasks(template_id,stage_id,title,relative_due_days,estimated_hours,order_index) VALUES(tid,stid,'Coletar briefing e identidade visual',2,1,1);
INSERT INTO project_template_tasks(template_id,stage_id,title,relative_due_days,estimated_hours,order_index) VALUES(tid,stid,'Solicitar acessos às redes sociais',4,1,2);
INSERT INTO project_template_tasks(template_id,stage_id,title,relative_due_days,estimated_hours,order_index) VALUES(tid,stid,'Auditar perfis e analisar concorrentes',6,1,3);
INSERT INTO project_template_stages(template_id,name,order_index) VALUES(tid,'Planejamento e produção',2) RETURNING id INTO stid;
INSERT INTO project_template_tasks(template_id,stage_id,title,relative_due_days,estimated_hours,order_index) VALUES(tid,stid,'Definir estratégia e pilares de conteúdo',8,1,4);
INSERT INTO project_template_tasks(template_id,stage_id,title,relative_due_days,estimated_hours,order_index) VALUES(tid,stid,'Criar calendário editorial',10,1,5);
INSERT INTO project_template_tasks(template_id,stage_id,title,relative_due_days,estimated_hours,order_index) VALUES(tid,stid,'Produzir peças, legendas e vídeos',12,1,6);
INSERT INTO project_template_tasks(template_id,stage_id,title,relative_due_days,estimated_hours,order_index) VALUES(tid,stid,'Obter aprovação do cliente',14,1,7);
INSERT INTO project_template_stages(template_id,name,order_index) VALUES(tid,'Publicação e análise',3) RETURNING id INTO stid;
INSERT INTO project_template_tasks(template_id,stage_id,title,relative_due_days,estimated_hours,order_index) VALUES(tid,stid,'Agendar publicações',16,1,8);
INSERT INTO project_template_tasks(template_id,stage_id,title,relative_due_days,estimated_hours,order_index) VALUES(tid,stid,'Acompanhar interações e encaminhar demandas',18,1,9);
INSERT INTO project_template_tasks(template_id,stage_id,title,relative_due_days,estimated_hours,order_index) VALUES(tid,stid,'Apresentar relatório mensal e revisar estratégia',20,1,10);
END IF; END $$;
DO $$ DECLARE cid UUID; BEGIN IF NOT EXISTS(SELECT 1 FROM combos WHERE name='Domínio + Hospedagem de Site' AND archived_at IS NULL) THEN INSERT INTO combos(name,total_price,description) VALUES('Domínio + Hospedagem de Site',335,'Serviços discriminados com cobrança por periodicidade') RETURNING id INTO cid;
INSERT INTO combo_items(combo_id,service_id,component_price) SELECT cid,id,60 FROM services WHERE name='Domínio' AND archived_at IS NULL ORDER BY created_at LIMIT 1;
INSERT INTO combo_items(combo_id,service_id,component_price) SELECT cid,id,275 FROM services WHERE name='Hospedagem de Site' AND archived_at IS NULL ORDER BY created_at LIMIT 1;
END IF; END $$;
DO $$ DECLARE cid UUID; BEGIN IF NOT EXISTS(SELECT 1 FROM combos WHERE name='Domínio + Hospedagem de Site + Criação de WebSite' AND archived_at IS NULL) THEN INSERT INTO combos(name,total_price,description) VALUES('Domínio + Hospedagem de Site + Criação de WebSite',985,'Serviços discriminados com cobrança por periodicidade') RETURNING id INTO cid;
INSERT INTO combo_items(combo_id,service_id,component_price) SELECT cid,id,60 FROM services WHERE name='Domínio' AND archived_at IS NULL ORDER BY created_at LIMIT 1;
INSERT INTO combo_items(combo_id,service_id,component_price) SELECT cid,id,275 FROM services WHERE name='Hospedagem de Site' AND archived_at IS NULL ORDER BY created_at LIMIT 1;
INSERT INTO combo_items(combo_id,service_id,component_price) SELECT cid,id,650 FROM services WHERE name='Criação de WebSite' AND archived_at IS NULL ORDER BY created_at LIMIT 1;
END IF; END $$;
DO $$ DECLARE cid UUID; BEGIN IF NOT EXISTS(SELECT 1 FROM combos WHERE name='T.P. Google Ads + T.P. Meta Ads' AND archived_at IS NULL) THEN INSERT INTO combos(name,total_price,description) VALUES('T.P. Google Ads + T.P. Meta Ads',2000,'Serviços discriminados com cobrança por periodicidade') RETURNING id INTO cid;
INSERT INTO combo_items(combo_id,service_id,component_price) SELECT cid,id,1000 FROM services WHERE name='T.P. Google Ads' AND archived_at IS NULL ORDER BY created_at LIMIT 1;
INSERT INTO combo_items(combo_id,service_id,component_price) SELECT cid,id,1000 FROM services WHERE name='T.P. Meta Ads' AND archived_at IS NULL ORDER BY created_at LIMIT 1;
END IF; END $$;
DO $$ DECLARE cid UUID; BEGIN IF NOT EXISTS(SELECT 1 FROM combos WHERE name='T.P. Google Ads + T.P. Meta Ads + Social Media' AND archived_at IS NULL) THEN INSERT INTO combos(name,total_price,description) VALUES('T.P. Google Ads + T.P. Meta Ads + Social Media',3500,'Serviços discriminados com cobrança por periodicidade') RETURNING id INTO cid;
INSERT INTO combo_items(combo_id,service_id,component_price) SELECT cid,id,1000 FROM services WHERE name='T.P. Google Ads' AND archived_at IS NULL ORDER BY created_at LIMIT 1;
INSERT INTO combo_items(combo_id,service_id,component_price) SELECT cid,id,1000 FROM services WHERE name='T.P. Meta Ads' AND archived_at IS NULL ORDER BY created_at LIMIT 1;
INSERT INTO combo_items(combo_id,service_id,component_price) SELECT cid,id,1500 FROM services WHERE name='Social Media' AND archived_at IS NULL ORDER BY created_at LIMIT 1;
END IF; END $$;
