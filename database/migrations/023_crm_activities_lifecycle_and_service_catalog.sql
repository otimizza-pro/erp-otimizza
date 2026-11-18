-- ==============================================================================
-- Migração 023: Ciclo de Atividades CRM (No-Show, Adiado), Catálogo & Notificações
-- ==============================================================================

-- 1. Ciclo de Atividades Comerciais & No-Show
ALTER TABLE crm_activities DROP CONSTRAINT IF EXISTS crm_activities_status_check;
ALTER TABLE crm_activities ADD CONSTRAINT crm_activities_status_check 
  CHECK (status IN ('PENDING', 'COMPLETED', 'CANCELED', 'NO_SHOW', 'RESCHEDULED'));

ALTER TABLE crm_activities ADD COLUMN IF NOT EXISTS outcome_reason TEXT;
ALTER TABLE crm_activities ADD COLUMN IF NOT EXISTS reschedule_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE crm_activities ADD COLUMN IF NOT EXISTS reschedule_history JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE crm_activities ADD COLUMN IF NOT EXISTS previous_due_date TIMESTAMPTZ;

-- 2. Links de Continuidade Operacional em Serviços (Delivery Template)
ALTER TABLE services ADD COLUMN IF NOT EXISTS delivery_template_id UUID REFERENCES project_templates(id) ON DELETE SET NULL;
ALTER TABLE services ADD COLUMN IF NOT EXISTS custom_domain_pricing BOOLEAN NOT NULL DEFAULT false;

-- 3. Detalhes de Domínio e Fornecedores em Itens de Contrato e Proposta
ALTER TABLE contract_items ADD COLUMN IF NOT EXISTS domain_name TEXT;
ALTER TABLE contract_items ADD COLUMN IF NOT EXISTS domain_extension VARCHAR(20);
ALTER TABLE contract_items ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE proposal_items ADD COLUMN IF NOT EXISTS domain_name TEXT;
ALTER TABLE proposal_items ADD COLUMN IF NOT EXISTS domain_extension VARCHAR(20);
ALTER TABLE proposal_items ADD COLUMN IF NOT EXISTS notes TEXT;

-- 4. Central de Notificações Clicáveis
CREATE TABLE IF NOT EXISTS system_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  link_url VARCHAR(500) NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_read ON system_notifications(read, created_at DESC);
ALTER TABLE system_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_system_notifications" ON system_notifications;
CREATE POLICY "allow_all_system_notifications" ON system_notifications FOR ALL USING (true) WITH CHECK (true);

-- 5. Atualização / Inserção dos Serviços Exatos da Otimizza
-- 5.1 Domínio
DO $$ DECLARE sid UUID; tid UUID; BEGIN
  SELECT id INTO sid FROM services WHERE name = 'Domínio' AND archived_at IS NULL ORDER BY created_at LIMIT 1;
  IF sid IS NULL THEN
    INSERT INTO services(name, default_price, billing_unit, custom_domain_pricing, description)
    VALUES('Domínio', 60, 'ANUAL', true, 'Registro e renovação anual de domínio nacional (.com.br) ou internacional (+R$ 50 para .com).')
    RETURNING id INTO sid;
  ELSE
    UPDATE services 
    SET default_price = 60, billing_unit = 'ANUAL', custom_domain_pricing = true,
        description = 'Registro e renovação anual de domínio nacional (.com.br) ou internacional (+R$ 50 para .com).',
        updated_at = NOW()
    WHERE id = sid;
  END IF;
END $$;

-- 5.2 Hospedagem
DO $$ DECLARE sid UUID; BEGIN
  SELECT id INTO sid FROM services WHERE name IN ('Hospedagem', 'Hospedagem de Site') AND archived_at IS NULL ORDER BY created_at LIMIT 1;
  IF sid IS NULL THEN
    INSERT INTO services(name, default_price, billing_unit, description)
    VALUES('Hospedagem', 275, 'ANUAL', 'Hospedagem de alta performance anual, certificado SSL incluso e backups automáticos.')
    RETURNING id INTO sid;
  ELSE
    UPDATE services 
    SET name = 'Hospedagem', default_price = 275, billing_unit = 'ANUAL',
        description = 'Hospedagem de alta performance anual, certificado SSL incluso e backups automáticos.',
        updated_at = NOW()
    WHERE id = sid;
  END IF;
END $$;

-- 5.3 Criação de Landing Page (R$ 500,00 uma vez)
DO $$ DECLARE sid UUID; tid_onb UUID; tid_del UUID; stid UUID; BEGIN
  -- Template de Onboarding
  INSERT INTO project_templates(code, name, description, estimated_days, estimated_hours)
  VALUES('ONB-LANDING', 'Onboarding — Criação de Landing Page', 'Briefing e coleta de ativos para LP', 15, 10)
  ON CONFLICT(code) DO NOTHING;
  SELECT id INTO tid_onb FROM project_templates WHERE code = 'ONB-LANDING';

  IF NOT EXISTS(SELECT 1 FROM project_template_stages WHERE template_id = tid_onb) THEN
    INSERT INTO project_template_stages(template_id, name, order_index) VALUES(tid_onb, '1. Briefing & Ativos', 1) RETURNING id INTO stid;
    INSERT INTO project_template_tasks(template_id, stage_id, title, relative_due_days, estimated_hours, order_index) VALUES
      (tid_onb, stid, 'Coletar briefing de conversão e proposta de valor', 2, 2, 1),
      (tid_onb, stid, 'Solicitar logo em vetor, fotos e depoimentos', 4, 1, 2),
      (tid_onb, stid, 'Definir headline e gatilhos de conversão', 5, 2, 3);
  END IF;

  -- Template de Entrega Contínua / Execução
  INSERT INTO project_templates(code, name, description, estimated_days, estimated_hours)
  VALUES('DEL-LANDING', 'Execução & Lançamento — Landing Page', 'Design, copy, desenvolvimento e publicação', 20, 25)
  ON CONFLICT(code) DO NOTHING;
  SELECT id INTO tid_del FROM project_templates WHERE code = 'DEL-LANDING';

  IF NOT EXISTS(SELECT 1 FROM project_template_stages WHERE template_id = tid_del) THEN
    INSERT INTO project_template_stages(template_id, name, order_index) VALUES(tid_del, '1. Design & Copy', 1) RETURNING id INTO stid;
    INSERT INTO project_template_tasks(template_id, stage_id, title, relative_due_days, estimated_hours, order_index) VALUES
      (tid_del, stid, 'Estruturar wireframe e redação publicitária (copywriting)', 5, 6, 1),
      (tid_del, stid, 'Criar design de alta fidelidade para aprovação', 8, 8, 2);

    INSERT INTO project_template_stages(template_id, name, order_index) VALUES(tid_del, '2. Desenvolvimento & Publicação', 2) RETURNING id INTO stid;
    INSERT INTO project_template_tasks(template_id, stage_id, title, relative_due_days, estimated_hours, order_index) VALUES
      (tid_del, stid, 'Desenvolver LP responsiva ultra rápida (Mobile First)', 12, 10, 3),
      (tid_del, stid, 'Configurar tags de rastreamento (Pixel, GA4, GTM) e formulário', 14, 3, 4),
      (tid_del, stid, 'Publicar em produção e testar conversão', 15, 2, 5);
  END IF;

  SELECT id INTO sid FROM services WHERE name = 'Criação de Landing Page' AND archived_at IS NULL ORDER BY created_at LIMIT 1;
  IF sid IS NULL THEN
    INSERT INTO services(name, default_price, billing_unit, onboarding_template_id, delivery_template_id, description)
    VALUES('Criação de Landing Page', 500, 'PROJETO', tid_onb, tid_del, 'Landing Page profissional orientada à conversão e tráfego direto.')
    RETURNING id INTO sid;
  ELSE
    UPDATE services 
    SET default_price = 500, billing_unit = 'PROJETO', onboarding_template_id = tid_onb, delivery_template_id = tid_del,
        description = 'Landing Page profissional orientada à conversão e tráfego direto.',
        updated_at = NOW()
    WHERE id = sid;
  END IF;
END $$;

-- 5.4 Criação de WebSite Institucional (R$ 1.000,00 uma vez)
DO $$ DECLARE sid UUID; tid_onb UUID; tid_del UUID; stid UUID; BEGIN
  SELECT id INTO tid_onb FROM project_templates WHERE code = 'ONB-WEBSITE';
  
  INSERT INTO project_templates(code, name, description, estimated_days, estimated_hours)
  VALUES('DEL-WEBSITE', 'Execução & Publicação — WebSite Institucional', 'Desenvolvimento de site completo', 30, 40)
  ON CONFLICT(code) DO NOTHING;
  SELECT id INTO tid_del FROM project_templates WHERE code = 'DEL-WEBSITE';

  IF NOT EXISTS(SELECT 1 FROM project_template_stages WHERE template_id = tid_del) THEN
    INSERT INTO project_template_stages(template_id, name, order_index) VALUES(tid_del, '1. Arquitetura & Conteúdo', 1) RETURNING id INTO stid;
    INSERT INTO project_template_tasks(template_id, stage_id, title, relative_due_days, estimated_hours, order_index) VALUES
      (tid_del, stid, 'Definir mapa do site (Sitemap) e páginas institucionais', 5, 4, 1),
      (tid_del, stid, 'Redigir textos institucionais e selecionar imagens', 10, 8, 2);

    INSERT INTO project_template_stages(template_id, name, order_index) VALUES(tid_del, '2. Desenvolvimento & Entrega', 2) RETURNING id INTO stid;
    INSERT INTO project_template_tasks(template_id, stage_id, title, relative_due_days, estimated_hours, order_index) VALUES
      (tid_del, stid, 'Construir páginas institucionais completas', 20, 20, 3),
      (tid_del, stid, 'Configurar SEO On-Page, SSL, Blog e Formulários', 25, 6, 4),
      (tid_del, stid, 'Homologação e treinamento de uso do cliente', 28, 2, 5);
  END IF;

  SELECT id INTO sid FROM services WHERE name IN ('Criação de WebSite', 'Criação de WebSite Institucional') AND archived_at IS NULL ORDER BY created_at LIMIT 1;
  IF sid IS NULL THEN
    INSERT INTO services(name, default_price, billing_unit, onboarding_template_id, delivery_template_id, description)
    VALUES('Criação de WebSite Institucional', 1000, 'PROJETO', tid_onb, tid_del, 'WebSite institucional corporativo, responsivo, seguro e com SEO otimizado.')
    RETURNING id INTO sid;
  ELSE
    UPDATE services 
    SET name = 'Criação de WebSite Institucional', default_price = 1000, billing_unit = 'PROJETO',
        onboarding_template_id = tid_onb, delivery_template_id = tid_del,
        description = 'WebSite institucional corporativo, responsivo, seguro e com SEO otimizado.',
        updated_at = NOW()
    WHERE id = sid;
  END IF;
END $$;

-- 5.5 Tráfego Pago Google Ads (R$ 1.000,00 Mensal)
DO $$ DECLARE sid UUID; tid_onb UUID; tid_del UUID; stid UUID; BEGIN
  SELECT id INTO tid_onb FROM project_templates WHERE code = 'ONB-GOOGLE';

  INSERT INTO project_templates(code, name, description, estimated_days, estimated_hours)
  VALUES('DEL-GOOGLE', 'Operação Contínua — Google Ads', 'Gestão e otimização contínua de campanhas', 30, 20)
  ON CONFLICT(code) DO NOTHING;
  SELECT id INTO tid_del FROM project_templates WHERE code = 'DEL-GOOGLE';

  IF NOT EXISTS(SELECT 1 FROM project_template_stages WHERE template_id = tid_del) THEN
    INSERT INTO project_template_stages(template_id, name, order_index) VALUES(tid_del, 'Gestão Mensal', 1) RETURNING id INTO stid;
    INSERT INTO project_template_tasks(template_id, stage_id, title, relative_due_days, estimated_hours, order_index) VALUES
      (tid_del, stid, 'Análise semanal de termos de pesquisa e negativação', 7, 2, 1),
      (tid_del, stid, 'Ajuste de lances, orçamentos e ROAS/CPA alvo', 15, 3, 2),
      (tid_del, stid, 'Criação de novos testes A/B de anúncios e extensões', 22, 3, 3),
      (tid_del, stid, 'Fechamento de relatório de performance e reunião de alinhamento', 30, 2, 4);
  END IF;

  SELECT id INTO sid FROM services WHERE name IN ('T.P. Google Ads', 'Tráfego Pago Google Ads') AND archived_at IS NULL ORDER BY created_at LIMIT 1;
  IF sid IS NULL THEN
    INSERT INTO services(name, default_price, billing_unit, onboarding_template_id, delivery_template_id, description)
    VALUES('Tráfego Pago Google Ads', 1000, 'MES', tid_onb, tid_del, 'Gestão estratégica de tráfego pago no ecossistema Google (Pesquisa, Display, YouTube).')
    RETURNING id INTO sid;
  ELSE
    UPDATE services 
    SET name = 'Tráfego Pago Google Ads', default_price = 1000, billing_unit = 'MES',
        onboarding_template_id = tid_onb, delivery_template_id = tid_del,
        description = 'Gestão estratégica de tráfego pago no ecossistema Google (Pesquisa, Display, YouTube).',
        updated_at = NOW()
    WHERE id = sid;
  END IF;
END $$;

-- 5.6 Tráfego Pago Meta Ads (R$ 1.000,00 Mensal)
DO $$ DECLARE sid UUID; tid_onb UUID; tid_del UUID; stid UUID; BEGIN
  SELECT id INTO tid_onb FROM project_templates WHERE code = 'ONB-META';

  INSERT INTO project_templates(code, name, description, estimated_days, estimated_hours)
  VALUES('DEL-META', 'Operação Contínua — Meta Ads', 'Gestão contínua de campanhas Instagram e Facebook', 30, 20)
  ON CONFLICT(code) DO NOTHING;
  SELECT id INTO tid_del FROM project_templates WHERE code = 'DEL-META';

  IF NOT EXISTS(SELECT 1 FROM project_template_stages WHERE template_id = tid_del) THEN
    INSERT INTO project_template_stages(template_id, name, order_index) VALUES(tid_del, 'Gestão Mensal', 1) RETURNING id INTO stid;
    INSERT INTO project_template_tasks(template_id, stage_id, title, relative_due_days, estimated_hours, order_index) VALUES
      (tid_del, stid, 'Monitoramento diário de métricas (CPM, CTR, CPA)', 7, 2, 1),
      (tid_del, stid, 'Renovação de criativos e testes de novos ângulos', 15, 4, 2),
      (tid_del, stid, 'Escala de conjuntos vencedores e otimização de públicos', 22, 3, 3),
      (tid_del, stid, 'Envio de relatório mensal e projeção para próximo ciclo', 30, 2, 4);
  END IF;

  SELECT id INTO sid FROM services WHERE name IN ('T.P. Meta Ads', 'Tráfego Pago Meta Ads') AND archived_at IS NULL ORDER BY created_at LIMIT 1;
  IF sid IS NULL THEN
    INSERT INTO services(name, default_price, billing_unit, onboarding_template_id, delivery_template_id, description)
    VALUES('Tráfego Pago Meta Ads', 1000, 'MES', tid_onb, tid_del, 'Gestão estratégica de tráfego pago no Instagram e Facebook (Feed, Stories, Reels).')
    RETURNING id INTO sid;
  ELSE
    UPDATE services 
    SET name = 'Tráfego Pago Meta Ads', default_price = 1000, billing_unit = 'MES',
        onboarding_template_id = tid_onb, delivery_template_id = tid_del,
        description = 'Gestão estratégica de tráfego pago no Instagram e Facebook (Feed, Stories, Reels).',
        updated_at = NOW()
    WHERE id = sid;
  END IF;
END $$;

-- 5.7 Social Media com Gravação (R$ 1.000,00 Mensal)
DO $$ DECLARE sid UUID; tid_onb UUID; tid_del UUID; stid UUID; BEGIN
  SELECT id INTO tid_onb FROM project_templates WHERE code = 'ONB-SOCIAL';

  INSERT INTO project_templates(code, name, description, estimated_days, estimated_hours)
  VALUES('DEL-SOCIAL-GRAV', 'Operação Editorial — Social Media C/ Gravação', 'Produção editorial com captação presencial/gravação', 30, 30)
  ON CONFLICT(code) DO NOTHING;
  SELECT id INTO tid_del FROM project_templates WHERE code = 'DEL-SOCIAL-GRAV';

  IF NOT EXISTS(SELECT 1 FROM project_template_stages WHERE template_id = tid_del) THEN
    INSERT INTO project_template_stages(template_id, name, order_index) VALUES(tid_del, 'Ciclo Mensal', 1) RETURNING id INTO stid;
    INSERT INTO project_template_tasks(template_id, stage_id, title, relative_due_days, estimated_hours, order_index) VALUES
      (tid_del, stid, 'Planejamento de pautas e roteiros para gravação', 5, 4, 1),
      (tid_del, stid, 'Sessão de captação / gravação de vídeos', 12, 6, 2),
      (tid_del, stid, 'Edição de reels, carrosséis e posts estáticos', 20, 12, 3),
      (tid_del, stid, 'Aprovação do cliente e agendamento das publicações', 25, 4, 4),
      (tid_del, stid, 'Relatório mensal de alcance, engajamento e seguidores', 30, 2, 5);
  END IF;

  SELECT id INTO sid FROM services WHERE name = 'Social Media com Gravação' AND archived_at IS NULL ORDER BY created_at LIMIT 1;
  IF sid IS NULL THEN
    INSERT INTO services(name, default_price, billing_unit, onboarding_template_id, delivery_template_id, description)
    VALUES('Social Media com Gravação', 1000, 'MES', tid_onb, tid_del, 'Gestão completa de redes sociais incluindo roteiro, captação presencial de vídeos e design.')
    RETURNING id INTO sid;
  ELSE
    UPDATE services 
    SET default_price = 1000, billing_unit = 'MES', onboarding_template_id = tid_onb, delivery_template_id = tid_del,
        description = 'Gestão completa de redes sociais incluindo roteiro, captação presencial de vídeos e design.',
        updated_at = NOW()
    WHERE id = sid;
  END IF;
END $$;

-- 5.8 Social Media sem Gravação (R$ 700,00 Mensal)
DO $$ DECLARE sid UUID; tid_onb UUID; tid_del UUID; stid UUID; BEGIN
  SELECT id INTO tid_onb FROM project_templates WHERE code = 'ONB-SOCIAL';

  INSERT INTO project_templates(code, name, description, estimated_days, estimated_hours)
  VALUES('DEL-SOCIAL-SEMGRAV', 'Operação Editorial — Social Media S/ Gravação', 'Planejamento e design com conteúdo do cliente', 30, 20)
  ON CONFLICT(code) DO NOTHING;
  SELECT id INTO tid_del FROM project_templates WHERE code = 'DEL-SOCIAL-SEMGRAV';

  IF NOT EXISTS(SELECT 1 FROM project_template_stages WHERE template_id = tid_del) THEN
    INSERT INTO project_template_stages(template_id, name, order_index) VALUES(tid_del, 'Ciclo Mensal', 1) RETURNING id INTO stid;
    INSERT INTO project_template_tasks(template_id, stage_id, title, relative_due_days, estimated_hours, order_index) VALUES
      (tid_del, stid, 'Definição de calendário e pautas do mês', 5, 3, 1),
      (tid_del, stid, 'Criação de artes, carrosséis e redação das legendas', 18, 10, 2),
      (tid_del, stid, 'Aprovação com o cliente e agendamento', 25, 3, 3),
      (tid_del, stid, 'Métricas e análise de crescimento', 30, 2, 4);
  END IF;

  SELECT id INTO sid FROM services WHERE name = 'Social Media sem Gravação' AND archived_at IS NULL ORDER BY created_at LIMIT 1;
  IF sid IS NULL THEN
    INSERT INTO services(name, default_price, billing_unit, onboarding_template_id, delivery_template_id, description)
    VALUES('Social Media sem Gravação', 700, 'MES', tid_onb, tid_del, 'Gestão de redes sociais com foco em design, calendário editorial e copywriting (ativos enviados pelo cliente).')
    RETURNING id INTO sid;
  ELSE
    UPDATE services 
    SET default_price = 700, billing_unit = 'MES', onboarding_template_id = tid_onb, delivery_template_id = tid_del,
        description = 'Gestão de redes sociais com foco em design, calendário editorial e copywriting (ativos enviados pelo cliente).',
        updated_at = NOW()
    WHERE id = sid;
  END IF;
END $$;

-- 6. Combos Estruturados com Preços Promocionais
-- 6.1 Domínio + Hospedagem (R$ 310,00 anual)
DO $$ DECLARE cid UUID; sid_dom UUID; sid_hosp UUID; BEGIN
  SELECT id INTO sid_dom FROM services WHERE name = 'Domínio' AND archived_at IS NULL LIMIT 1;
  SELECT id INTO sid_hosp FROM services WHERE name = 'Hospedagem' AND archived_at IS NULL LIMIT 1;
  
  SELECT id INTO cid FROM combos WHERE name = 'Domínio + Hospedagem' AND archived_at IS NULL LIMIT 1;
  IF cid IS NULL THEN
    INSERT INTO combos(name, total_price, description)
    VALUES('Domínio + Hospedagem', 310, 'Combo integrado de infraestrutura web anual (+R$ 60 por domínio adicional, +R$ 50 se for .com).')
    RETURNING id INTO cid;
  ELSE
    UPDATE combos SET total_price = 310, description = 'Combo integrado de infraestrutura web anual (+R$ 60 por domínio adicional, +R$ 50 se for .com).' WHERE id = cid;
    DELETE FROM combo_items WHERE combo_id = cid;
  END IF;
  
  IF sid_dom IS NOT NULL THEN INSERT INTO combo_items(combo_id, service_id, component_price) VALUES(cid, sid_dom, 60); END IF;
  IF sid_hosp IS NOT NULL THEN INSERT INTO combo_items(combo_id, service_id, component_price) VALUES(cid, sid_hosp, 250); END IF;
END $$;

-- 6.2 Social Media S/ Gravação + Tráfego Meta Ads (R$ 1.000,00 / mês)
DO $$ DECLARE cid UUID; sid_sm UUID; sid_meta UUID; BEGIN
  SELECT id INTO sid_sm FROM services WHERE name = 'Social Media sem Gravação' AND archived_at IS NULL LIMIT 1;
  SELECT id INTO sid_meta FROM services WHERE name = 'Tráfego Pago Meta Ads' AND archived_at IS NULL LIMIT 1;

  SELECT id INTO cid FROM combos WHERE name = 'Social Media S/ Gravação + Tráfego Meta Ads' AND archived_at IS NULL LIMIT 1;
  IF cid IS NULL THEN
    INSERT INTO combos(name, total_price, description)
    VALUES('Social Media S/ Gravação + Tráfego Meta Ads', 1000, 'Presença em redes sociais aliada a tráfego no Instagram/Facebook.')
    RETURNING id INTO cid;
  ELSE
    UPDATE combos SET total_price = 1000 WHERE id = cid;
    DELETE FROM combo_items WHERE combo_id = cid;
  END IF;

  IF sid_sm IS NOT NULL THEN INSERT INTO combo_items(combo_id, service_id, component_price) VALUES(cid, sid_sm, 500); END IF;
  IF sid_meta IS NOT NULL THEN INSERT INTO combo_items(combo_id, service_id, component_price) VALUES(cid, sid_meta, 500); END IF;
END $$;

-- 6.3 Social Media S/ Gravação + Tráfego Google Ads (R$ 1.000,00 / mês)
DO $$ DECLARE cid UUID; sid_sm UUID; sid_goog UUID; BEGIN
  SELECT id INTO sid_sm FROM services WHERE name = 'Social Media sem Gravação' AND archived_at IS NULL LIMIT 1;
  SELECT id INTO sid_goog FROM services WHERE name = 'Tráfego Pago Google Ads' AND archived_at IS NULL LIMIT 1;

  SELECT id INTO cid FROM combos WHERE name = 'Social Media S/ Gravação + Tráfego Google Ads' AND archived_at IS NULL LIMIT 1;
  IF cid IS NULL THEN
    INSERT INTO combos(name, total_price, description)
    VALUES('Social Media S/ Gravação + Tráfego Google Ads', 1000, 'Redes sociais aliadas a captação de intenção de compra no Google.')
    RETURNING id INTO cid;
  ELSE
    UPDATE combos SET total_price = 1000 WHERE id = cid;
    DELETE FROM combo_items WHERE combo_id = cid;
  END IF;

  IF sid_sm IS NOT NULL THEN INSERT INTO combo_items(combo_id, service_id, component_price) VALUES(cid, sid_sm, 500); END IF;
  IF sid_goog IS NOT NULL THEN INSERT INTO combo_items(combo_id, service_id, component_price) VALUES(cid, sid_goog, 500); END IF;
END $$;

-- 6.4 Social Media S/ Gravação + Tráfego Completo (Meta + Google) (R$ 1.700,00 / mês)
DO $$ DECLARE cid UUID; sid_sm UUID; sid_meta UUID; sid_goog UUID; BEGIN
  SELECT id INTO sid_sm FROM services WHERE name = 'Social Media sem Gravação' AND archived_at IS NULL LIMIT 1;
  SELECT id INTO sid_meta FROM services WHERE name = 'Tráfego Pago Meta Ads' AND archived_at IS NULL LIMIT 1;
  SELECT id INTO sid_goog FROM services WHERE name = 'Tráfego Pago Google Ads' AND archived_at IS NULL LIMIT 1;

  SELECT id INTO cid FROM combos WHERE name = 'Social Media S/ Gravação + Tráfego Completo (Meta + Google)' AND archived_at IS NULL LIMIT 1;
  IF cid IS NULL THEN
    INSERT INTO combos(name, total_price, description)
    VALUES('Social Media S/ Gravação + Tráfego Completo (Meta + Google)', 1700, 'Crescimento completo: redes sociais + Meta Ads + Google Ads.')
    RETURNING id INTO cid;
  ELSE
    UPDATE combos SET total_price = 1700 WHERE id = cid;
    DELETE FROM combo_items WHERE combo_id = cid;
  END IF;

  IF sid_sm IS NOT NULL THEN INSERT INTO combo_items(combo_id, service_id, component_price) VALUES(cid, sid_sm, 500); END IF;
  IF sid_meta IS NOT NULL THEN INSERT INTO combo_items(combo_id, service_id, component_price) VALUES(cid, sid_meta, 600); END IF;
  IF sid_goog IS NOT NULL THEN INSERT INTO combo_items(combo_id, service_id, component_price) VALUES(cid, sid_goog, 600); END IF;
END $$;

-- 6.5 Social Media C/ Gravação + Tráfego Meta Ads (R$ 1.500,00 / mês)
DO $$ DECLARE cid UUID; sid_sm UUID; sid_meta UUID; BEGIN
  SELECT id INTO sid_sm FROM services WHERE name = 'Social Media com Gravação' AND archived_at IS NULL LIMIT 1;
  SELECT id INTO sid_meta FROM services WHERE name = 'Tráfego Pago Meta Ads' AND archived_at IS NULL LIMIT 1;

  SELECT id INTO cid FROM combos WHERE name = 'Social Media C/ Gravação + Tráfego Meta Ads' AND archived_at IS NULL LIMIT 1;
  IF cid IS NULL THEN
    INSERT INTO combos(name, total_price, description)
    VALUES('Social Media C/ Gravação + Tráfego Meta Ads', 1500, 'Gravação presencial de vídeos de alta conversão impulsionados no Instagram.')
    RETURNING id INTO cid;
  ELSE
    UPDATE combos SET total_price = 1500 WHERE id = cid;
    DELETE FROM combo_items WHERE combo_id = cid;
  END IF;

  IF sid_sm IS NOT NULL THEN INSERT INTO combo_items(combo_id, service_id, component_price) VALUES(cid, sid_sm, 800); END IF;
  IF sid_meta IS NOT NULL THEN INSERT INTO combo_items(combo_id, service_id, component_price) VALUES(cid, sid_meta, 700); END IF;
END $$;

-- 6.6 Social Media C/ Gravação + Tráfego Google Ads (R$ 1.500,00 / mês)
DO $$ DECLARE cid UUID; sid_sm UUID; sid_goog UUID; BEGIN
  SELECT id INTO sid_sm FROM services WHERE name = 'Social Media com Gravação' AND archived_at IS NULL LIMIT 1;
  SELECT id INTO sid_goog FROM services WHERE name = 'Tráfego Pago Google Ads' AND archived_at IS NULL LIMIT 1;

  SELECT id INTO cid FROM combos WHERE name = 'Social Media C/ Gravação + Tráfego Google Ads' AND archived_at IS NULL LIMIT 1;
  IF cid IS NULL THEN
    INSERT INTO combos(name, total_price, description)
    VALUES('Social Media C/ Gravação + Tráfego Google Ads', 1500, 'Gravação de conteúdos e captação de clientes no Google.')
    RETURNING id INTO cid;
  ELSE
    UPDATE combos SET total_price = 1500 WHERE id = cid;
    DELETE FROM combo_items WHERE combo_id = cid;
  END IF;

  IF sid_sm IS NOT NULL THEN INSERT INTO combo_items(combo_id, service_id, component_price) VALUES(cid, sid_sm, 800); END IF;
  IF sid_goog IS NOT NULL THEN INSERT INTO combo_items(combo_id, service_id, component_price) VALUES(cid, sid_goog, 700); END IF;
END $$;

-- 6.7 Social Media C/ Gravação + Tráfego Completo (Meta + Google) (R$ 2.200,00 / mês)
DO $$ DECLARE cid UUID; sid_sm UUID; sid_meta UUID; sid_goog UUID; BEGIN
  SELECT id INTO sid_sm FROM services WHERE name = 'Social Media com Gravação' AND archived_at IS NULL LIMIT 1;
  SELECT id INTO sid_meta FROM services WHERE name = 'Tráfego Pago Meta Ads' AND archived_at IS NULL LIMIT 1;
  SELECT id INTO sid_goog FROM services WHERE name = 'Tráfego Pago Google Ads' AND archived_at IS NULL LIMIT 1;

  SELECT id INTO cid FROM combos WHERE name = 'Social Media C/ Gravação + Tráfego Completo (Meta + Google)' AND archived_at IS NULL LIMIT 1;
  IF cid IS NULL THEN
    INSERT INTO combos(name, total_price, description)
    VALUES('Social Media C/ Gravação + Tráfego Completo (Meta + Google)', 2200, 'O pacote de aceleração máxima da Otimizza: gravação de vídeos + Meta Ads + Google Ads.')
    RETURNING id INTO cid;
  ELSE
    UPDATE combos SET total_price = 2200 WHERE id = cid;
    DELETE FROM combo_items WHERE combo_id = cid;
  END IF;

  IF sid_sm IS NOT NULL THEN INSERT INTO combo_items(combo_id, service_id, component_price) VALUES(cid, sid_sm, 800); END IF;
  IF sid_meta IS NOT NULL THEN INSERT INTO combo_items(combo_id, service_id, component_price) VALUES(cid, sid_meta, 700); END IF;
  IF sid_goog IS NOT NULL THEN INSERT INTO combo_items(combo_id, service_id, component_price) VALUES(cid, sid_goog, 700); END IF;
END $$;
