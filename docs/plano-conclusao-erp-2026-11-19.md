# Conclusão dos pedidos do chat

Escopo: comportamento e cadastros solicitados neste chat, integrados ao ERP existente. Não inclui geração de imagens, que foi descartada pelo usuário, nem publicação automática de campanhas ou sites externos.

## Regras para decidir a implementação

1. A empresa do cabeçalho determina o contexto. Otimizza tem cadastro interno próprio, preservado no topo.
2. Identidade e DNA, públicos, pilares e temas são cadastros permanentes. A peça escolhe um emissor, uma apresentação, um público, um tema, funil, jornada, dor ou não se aplica, objetivo, tom e CTA.
3. Pilares agrupam vários temas; temas originam várias pautas. Uma pauta pode produzir diferentes formatos de conteúdo.
4. Toda geração usa informações reais da empresa e o briefing escolhido. Sugestões não viram fatos confirmados automaticamente.
5. Adicionar, editar, arquivar, restaurar e excluir são ações distintas. Quando um vínculo contábil impede exclusão, a interface deve explicar o motivo. Não transformar exclusão em arquivamento silenciosamente.
6. Arquivar um cadastro não pode apagar documentos, valores já recebidos ou histórico. Gerar com IA não significa publicar nas plataformas.
7. Falha de rede, resposta vazia, ausência de contexto e falha de gravação não podem aparecer como sucesso.
8. Indicadores, exportações e relatórios derivados não são cadastros independentes: suas alterações pertencem aos registros de origem.

## Plano e critérios de aceite

| Bloco | Pedidos consolidados | Execução e aceite |
|---|---|---|
| Infraestrutura | Migrações, build, Vercel e variáveis | Conferir migrações aplicadas e checksums sem alterar histórico. Identificar a causa do erro publicado. Executar tipos, testes e build; registrar bloqueios reais. Manter segredos fora do Git. |
| Navegação | Menus lentos, itens desaparecem, funis comerciais no menu | Layout privado persistente; dados dos funis reaproveitados; seleção por URL correta; não criar um novo AppShell a cada página. |
| Configurações | Menu interno com todas as seções | Navegação consistente entre dados da empresa, integrações, preferências e cadastros relacionados. |
| Clientes | Otimizza fixa, comunicação com múltiplos perfis | Cadastro interno protegido; perfil salvo sem apagar demais dados do DNA; emissor, porta-voz e destinatário separados. |
| Contexto da IA | DNA no Estúdio, briefing do cliente, evitar textos genéricos | Unificar fontes, mostrar dados usados, preservar proveniência do briefing. Não herdar dados da Otimizza em trabalhos de clientes. |
| Públicos | CRUD e IA, eliminar seleção duplicada | Fonte canônica com descrição, características, dores, desejos e objeções; escolher um público por peça; arquivados fora das novas seleções. |
| Editorial | CRUD de pilares e temas; campos adicionais | Gerenciar manualmente e revisar sugestões da IA; customizações entram no contexto da geração; exclusão e arquivamento têm efeitos explícitos. |
| Estúdio | Ideia central com IA, dependência do briefing, funil e jornada, mais ganchos | Validar escolhas no servidor e no cliente. Ideia central e resultado respeitam o mesmo briefing. Ganchos de prova não podem inventar estudos, estatísticas ou resultados. |
| Calendário | Grade mensal limpa, botão geral e por dia, IA e ajustes | Formulário em janela, edição, exclusão, arquivo e restauração. Planejamento da IA separado da grade, sem sobrescrever publicações existentes. |
| Sazonalidade | Datas brasileiras, comerciais, sazonais e referência indicada | Importar o calendário de referência sem executar scripts externos, complementar datas comerciais móveis, filtrar categorias, permitir datas próprias e deixar clara a abrangência nacional/local. |
| Tráfego e Web | Criar campanhas Meta/Google, LPs, sites, GMB e SEO | Materiais contextualizados, revisáveis, persistidos por empresa e área. Tratar HTML somente nos fluxos que precisam dele. Diferenciar protótipo de página publicada. |
| CRUD dos módulos | Ações consistentes e seleção/exclusão em massa | Inventariar cadastros, completar ações ausentes reaproveitando serviços existentes e vínculos. Resultados de lote devem informar falhas parciais. |
| Propostas e contratos | Exclusão travada, rascunhos/rejeitados, arquivar/excluir | Transação íntegra, erro original preservado, limites contábeis explícitos, documento aprovado/versionado não pode ser reescrito casualmente. |
| Layout | Revisão das páginas e padrão do sistema | Controles, espaçamento, hierarquia e estados de carregamento/erro consistentes; desktop e largura reduzida; não esconder erro atrás de lista vazia. |

## Ordem de execução

1. Diagnosticar produção e compatibilidade de runtime. Depois validar contexto e geração de IA.
2. Fechar consistência de cadastros, arquivos e gravações, incluindo os efeitos entre telas.
3. Completar sazonalidade, calendário e gestão de materiais.
4. Revisar ações faltantes dos demais cadastros e layout das páginas relacionadas.
5. Validar migrações, consultas, testes, tipos, rotas e interface. Atualizar este documento com evidências finais.

## Divergências e riscos identificados

- O erro de JSON publicado ocorre antes da geração. Os logs da Vercel mostram `ERR_REQUIRE_ESM` ao importar `isomorphic-dompurify` e suas dependências. Apenas trocar a mensagem ou aumentar timeout não resolve essa causa. Corrigir compatibilidade e carregamento do módulo.
- Um cadastro de público no DNA e outro no Estúdio gera divergência. Consolidar leitura e escrita, com migração dos dados legados, sem apagar o que já foi informado.
- Valores padrão em atualizações parciais podem apagar escolhas existentes. Atualizações devem respeitar somente campos enviados.
- Sucesso da gravação seguido de falha no recarregamento não é falha de gravação. Não incentivar duplicação da operação.
- Uma base sazonal de poucas datas não atende à cobertura pedida. Uma fonte externa também pode falhar ou ter dados incorretos; exibir origem, indisponibilidade e complementos, sem prometer todos os feriados municipais do país.
- CRUD indiscriminado em títulos pagos, auditorias e versões imutáveis destruiria integridade. Manter ações de domínio, com motivo visível quando não aplicáveis.
- Refazer seletores em várias telas cria estado divergente. A configuração deve ser única e reutilizada.
- Testes unitários não comprovam o deploy nem substituem inspeção visual. Registrar separadamente validação de código, banco, interface e produção.

## Evidências iniciais

- 296 testes unitários e TypeScript aprovados na etapa anterior.
- Migração 033 encontrada no banco pela API de administração do Supabase nesta revisão; checksum em conferência.
- Falha de produção reproduzida ao abrir Meta Ads; causa localizada nos logs de execução da Vercel.
- Build local encontra `EPERM` ao criar diretórios de saída, inclusive em uma pasta isolada; não declarar build aprovado até obter conclusão real.

O resultado de cada etapa será registrado aqui ao final da execução.

## Resultado da revisão em 19/11/2026

Implementado: configuração central de públicos, pilares e temas; atualização parcial do DNA sem apagar campos omitidos; calendário mensal com cadastro por dia, planejamento por IA e datas sazonais com cadastro próprio; ações de edição, arquivamento, restauração e exclusão nos módulos revisados; edição de combos e modelos de projetos; correções dos parâmetros SQL nos filtros do CRM; estilos base consistentes para formulários e controles.

A falha de importação na presença digital foi tratada com carregamento tardio do sanitizador HTML e declaração de Node 24 no projeto. O teste real de geração usou o contexto salvo da empresa e OpenRouter com openai/gpt-6.2-sol, sem publicar ou salvar o material gerado.

Banco: migração 034 validada em transação e aplicada; esquema conferido. TypeScript aprovado. A validação final da suíte está registrada em scratch/verified-unit.log.

Pendências de validação: build bloqueado por EPERM na criação de diretórios de saída; navegação local de revisão visual terminou em timeout. As alterações ainda precisam de publicação e teste das telas no novo deploy. Não considerar todas as páginas visualmente homologadas nem o deploy aprovado com base apenas nos testes unitários.
Verificação final: suíte completa com 306 testes aprovados em 50 arquivos.
