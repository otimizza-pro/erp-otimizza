-- 055_client_audiences_digital_behavior.sql
-- Adiciona suporte explícito ao 4º pilar de público-alvo:
-- Comportamento e Interesses no Digital (Meta Ads e Palavras-chave Google Ads).
-- Semeia/atualiza os 3 públicos estratégicos completos do Studio TRG (Reabilitação, Postural e Atletas).

ALTER TABLE client_audiences
ADD COLUMN IF NOT EXISTS digital_behavior TEXT;

-- Sincronizar os 3 públicos do Studio TRG (a195189e-85f4-4e0b-9121-03aaa88c4b1c)
DO $$
DECLARE
  v_client_id UUID := 'a195189e-85f4-4e0b-9121-03aaa88c4b1c';
BEGIN
  IF EXISTS (SELECT 1 FROM clients WHERE id = v_client_id) THEN
  -- 1. Público Reabilitação (Foco em Recuperação e Alívio)
  INSERT INTO client_audiences (
    client_id,
    name,
    description,
    demographics,
    pain_points,
    desires,
    objections,
    digital_behavior,
    is_default,
    created_at,
    updated_at
  ) VALUES (
    v_client_id,
    'Reabilitação',
    'Foco em Recuperação e Alívio: Pessoas com dores no corpo crônicas, hérnia de disco ou em recuperação pós-operatória que buscam tratamento seguro.',
    '35 a 65+ anos, homens e mulheres, raio de 3 a 5 km ao redor do Studio TRG (buscam fácil deslocamento), classe A/B.',
    ARRAY[
      'Dor física latente: hérnia de disco, dores articulares (coluna, joelho, ombro) e pós-operatório',
      'Impacto na rotina: limitação de movimento e dificuldade para cumprir tarefas simples do dia a dia',
      'Medo e insegurança: receio de se movimentar, piorar a lesão ou travar a coluna'
    ],
    ARRAY[
      'Objetivo primário: viver sem dor e recuperar a mobilidade funcional',
      'Transformação emocional: segurança, independência e tranquilidade para realizar atividades cotidianas'
    ],
    ARRAY[
      'Já me frustrei com tratamentos anteriores sem resultado',
      'Medo de sentir mais dor ao fazer exercícios',
      'Acho caro ou não tenho tempo'
    ],
    'Interesses Meta Ads: Fisioterapia, Ortopedia, Saúde e Bem-Estar, Planos de Saúde. Palavras-chave Google Ads / GMN: fisioterapia perto de mim, tratamento para hérnia de disco, alívio de dor na coluna.',
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT DO NOTHING;

  -- Atualizar Reabilitação se já existir
  UPDATE client_audiences
  SET
    description = 'Foco em Recuperação e Alívio: Pessoas com dores no corpo crônicas, hérnia de disco ou em recuperação pós-operatória que buscam tratamento seguro.',
    demographics = '35 a 65+ anos, homens e mulheres, raio de 3 a 5 km ao redor do Studio TRG (buscam fácil deslocamento), classe A/B.',
    pain_points = ARRAY[
      'Dor física latente: hérnia de disco, dores articulares (coluna, joelho, ombro) e pós-operatório',
      'Impacto na rotina: limitação de movimento e dificuldade para cumprir tarefas simples do dia a dia',
      'Medo e insegurança: receio de se movimentar, piorar a lesão ou travar a coluna'
    ],
    desires = ARRAY[
      'Objetivo primário: viver sem dor e recuperar a mobilidade funcional',
      'Transformação emocional: segurança, independência e tranquilidade para realizar atividades cotidianas'
    ],
    objections = ARRAY[
      'Já me frustrei com tratamentos anteriores sem resultado',
      'Medo de sentir mais dor ao fazer exercícios',
      'Acho caro ou não tenho tempo'
    ],
    digital_behavior = 'Interesses Meta Ads: Fisioterapia, Ortopedia, Saúde e Bem-Estar, Planos de Saúde. Palavras-chave Google Ads / GMN: fisioterapia perto de mim, tratamento para hérnia de disco, alívio de dor na coluna.',
    is_default = true,
    updated_at = NOW()
  WHERE client_id = v_client_id AND name ILIKE '%reabilita%';

  -- 2. Público Postural (Foco em Prevenção e Qualidade de Vida)
  INSERT INTO client_audiences (
    client_id,
    name,
    description,
    demographics,
    pain_points,
    desires,
    objections,
    digital_behavior,
    is_default,
    created_at,
    updated_at
  ) VALUES (
    v_client_id,
    'Postural',
    'Foco em Prevenção e Qualidade de Vida: Profissionais de escritório, home office ou com rotina estressante buscando alívio de tensões e postura.',
    '28 a 50 anos, maioria mulheres e profissionais de escritório / home office, raio de 4 km do Studio TRG, classe A/B.',
    ARRAY[
      'Dor lombar e cervical por passar horas sentado em frente à tela',
      'Rigidez muscular, estresse acumulado e cansaço constante ao final do dia',
      'Sedentarismo e falta de tempo para treinos longos e monótonos'
    ],
    ARRAY[
      'Objetivo primário: melhorar a postura, aliviar tensões e ganhar flexibilidade',
      'Transformação emocional: mais disposição, bem-estar corporal, leveza e autoestima sem esforço lesivo'
    ],
    ARRAY[
      'Falta de tempo na rotina corrida de trabalho',
      'Achar que pilates é apenas alongamento leve sem resultado visual'
    ],
    'Interesses Meta Ads: Pilates, Ergonomia, Yoga, Bem-estar corporativo, Autocuidado. Palavras-chave Google Ads / GMN: studio de pilates perto de mim, dor nas costas trabalho, correção postural.',
    false,
    NOW(),
    NOW()
  )
  ON CONFLICT DO NOTHING;

  -- 3. Público Atletas (Foco em Performance e Prevenção de Lesões)
  INSERT INTO client_audiences (
    client_id,
    name,
    description,
    demographics,
    pain_points,
    desires,
    objections,
    digital_behavior,
    is_default,
    created_at,
    updated_at
  ) VALUES (
    v_client_id,
    'Atletas',
    'Foco em Performance e Prevenção de Lesões: Praticantes de corrida, beach tennis, ciclismo, crossfit ou musculação buscando rendimento seguro.',
    '20 a 45 anos, homens e mulheres praticantes de corrida, crossfit, beach tennis, ciclismo ou musculação, raio de 5 a 7 km.',
    ARRAY[
      'Sobrecarga muscular e lesões recorrentes (canelite, tendinite, fascite plantar)',
      'Estagnação de performance e falta de mobilidade articular para evoluir',
      'Tempo de recuperação (recovery) lento entre treinos intensos'
    ],
    ARRAY[
      'Objetivo primário: aumentar rendimento, ganhar estabilidade e prevenir lesões',
      'Transformação emocional: confiança para superar marcas pessoais e competir sem medo de se machucar'
    ],
    ARRAY[
      'Achar que vai perder tempo de treino da modalidade principal',
      'Custo de acompanhamento especializado'
    ],
    'Interesses Meta Ads: Corrida de rua, Strava, CrossFit, Beach Tennis, Nutrição esportiva, Marcas (Garmin, Asics, Nike). Palavras-chave Google Ads / GMN: fortalecimento para corredores, mobilidade esportiva, fisioterapia esportiva.',
    false,
    NOW(),
    NOW()
  )
  ON CONFLICT DO NOTHING;
  END IF;

END $$;
