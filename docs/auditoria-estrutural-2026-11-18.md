# Auditoria estrutural do ERP Otimizza

Data: 18/11/2026. Alterações locais, sem publicação ou exclusão de dados operacionais nesta auditoria.

## Conclusão

Havia falhas reais de segurança, persistência e comunicação de resultados. Foram corrigidas as causas identificadas abaixo. O sistema ainda não pode ser declarado integralmente validado: o banco real, o build e as integrações externas não puderam ser homologados neste ambiente. Há também dívida de tipagem e decisões de produto descritas ao final.

## Escopo e evidências

- Inspeção do código das APIs, proteção de sessão, serviços SQL, migrações, scripts, integrações de IA, briefing, exclusões e recorrência.
- Inventário estático de rotas e comparação de nomes de tabelas com as migrations e o modelo físico versionado.
- Revisão dos fluxos de exclusão de cliente, lead, serviço, contrato, conta financeira e documentos.
- Execução de TypeScript, testes unitários, ESLint e tentativa de build.
- Esta foi uma auditoria de código. Não houve revisão visual de todas as páginas, teste de invasão ou validação de todos os dados em produção.

## Correções executadas nesta auditoria

| Área | Problema encontrado | Correção |
|---|---|---|
| APIs privadas | 83 arquivos dependiam da proteção central, sem verificação de sessão no próprio handler | Verificação explícita nos handlers privados desses arquivos |
| Autenticação | Ausência das variáveis do Supabase deixava a requisição prosseguir | Resposta 503, sem executar a rota |
| Sessão expirada | APIs eram redirecionadas para HTML de login | APIs retornam 401 em JSON; páginas continuam usando redirecionamento |
| Proxy | Exclusão genérica de qualquer URL terminada em extensão de imagem | Exceções limitadas aos caminhos de arquivos estáticos conhecidos; APIs sempre protegidas |
| Next.js | Convenção `middleware.ts` depreciada | Migração para `src/proxy.ts`, conforme a documentação instalada |
| Diagnóstico | Endpoint expunha detalhes operacionais publicamente e respondia 200 com banco indisponível | Autenticação e status 503 quando o banco falha |
| Testes | Seleção do banco dependia exclusivamente de `NODE_ENV` | Reconhecimento explícito do Vitest e ambiente de teste definido na configuração |
| Migrações em testes | Executor de migrações não comparava a URL de teste com a operacional | Aplicada a mesma proteção de isolamento usada pelo pool de testes |
| CLI de migrações | Erro de conexão podia terminar com código de sucesso | Falhas são propagadas para o encerramento com erro |
| Conexão PostgreSQL | Remoção de `sslmode` por regex podia corromper outros parâmetros da URL | Uso do parser de URL para remover somente esse parâmetro |
| Transações | PostgreSQL pode responder ROLLBACK a um COMMIT de transação já abortada | Resultado do COMMIT verificado; falha não é tratada como sucesso |
| Transações | Falha no rollback podia esconder o erro original | Preservação do erro original |
| Exclusões | Erros SQL eram descartados em exclusões de cliente, lead e atualização de contrato | Removidos os catches vazios nesses serviços |
| Tabelas incorretas | Referências a `contract_billing_plans`, `service_presentations`, `bank_statements`, `crm_opportunity_stages_history` e `contract_project_recurrence_settings` | Removidas referências inexistentes ou substituídas por estruturas realmente versionadas |
| Clientes | Limpeza duplicava as regras financeiras da exclusão de contrato e removia dependências em ordem inconsistente | Reutilização de `deleteContract` dentro da transação do cliente |
| Histórico financeiro | Exclusão de cliente podia remover dados operacionais antes de verificar baixas | Verificação inicial; recebimentos e estornos impedem a exclusão completa |
| Leads convertidos | Purga podia destruir a rastreabilidade de negócios consolidados | Bloqueio da purga de leads convertidos ou ligados a negócios consolidados; arquivamento continua disponível |
| Documentos compartilhados | Purga podia apagar documento ligado a mais de um registro | Bloqueio com mensagem para revisar os vínculos |
| Storage | Arquivos externos eram apagados antes do commit e os erros eram ignorados | Fila persistente, remoção após commit, tentativas registradas e rotina de reprocessamento |
| Serviços e contas | Exclusão e auditoria não eram atômicas | Transação e bloqueio do registro durante a operação |
| Exclusão em lote | Falha de serviço era identificada como arquivamento | Resultado `failed`, contador de falhas, mensagem de erro e seleção dos itens que falharam |
| Cron da Vercel | Configuração chamava endpoints que só aceitavam POST | GET protegido por `CRON_SECRET`, preservando POST autenticado |
| Recorrência | Competência inválida era aceita e falhas parciais de projetos retornavam sucesso | Validação AAAA-MM e falha explícita no resultado parcial |
| Projetos recorrentes | Dia 31 podia gerar data inválida em mês menor; havia estimativa arbitrária de 20 horas | Dia limitado ao mês real, vigência respeitada na seleção e uso da estimativa do template ou zero |
| Contratos | Minuta arquivada podia ser aprovada e gerar financeiro | Restauração exigida antes da aprovação |
| Ex-clientes | Rascunho rejeitado era confundido com cancelamento de cliente | Exclusão desse caso conhecido do filtro de ex-clientes |
| IA de conteúdo | Payload tipado apenas em TypeScript, sem validação de entrada em execução | Schema de formatos, campos, quantidades e limites de tamanho |
| Chaves de IA | Chave alternativa persistia em localStorage com alegação de armazenamento seguro | Remoção dessa persistência; chave alternativa somente em memória da página |
| Briefing e cofre | Erro no cofre era ignorado e a resposta confirmava que a senha estava salva | Falha explícita, credenciais obrigatórias, gravação de senha e marcador em transação |
| Briefing | Dono fictício do cofre era usado como fallback | Falha explícita se não existe responsável configurado |
| Briefing | Campos arbitrários, finalização incompleta e edição de sessão concluída | Whitelist de campos e ações; quatro respostas exigidas; sessão concluída preservada |
| Briefing | Sugestões fixas eram apresentadas como análise personalizada; progresso era inflado | Exemplos identificados como genéricos e progresso baseado nas respostas registradas |
| Textos | Referências indevidas a Valdemar e promessa de carregar todos os 20 manuais | Referência à equipe e descrição limitada ao contexto realmente disponível |
| Estúdio | Ref alterada durante renderização e funções acessadas antes da declaração | Atualização da ref em efeito e declarações de função apropriadas |
| Scripts | Script da migração 021 ignorava o histórico versionado | Atalho encaminha ao migrador oficial |
| Importação antiga | Script lia só `.env.local`, sobrescrevia conteúdo e prometia 20 manuais completos | Leitura consistente do ambiente, ativação explícita da importação e mensagem sem promessa fixa |
| Lint | Artefatos de builds alternativos eram analisados como código-fonte | Ignorados diretórios `.next-*`; CommonJS permitido apenas nos scripts `.cjs` |

## Migração nova e operação

`032_storage_cleanup_queue.sql` cria a fila de remoção de arquivos externos, com RLS e acesso revogado para `anon` e `authenticated`. Não foi aplicada neste ambiente. A migração 031, criada na etapa anterior, também precisa ter seu status conferido.

A exclusão SQL grava a intenção de limpeza na mesma transação. Só depois do commit ocorre a tentativa no Storage. Falhas mantêm o item na fila. A rotina diária `/api/documents/cleanup` usa `CRON_SECRET`; POST administrativo permite reprocessamento manual. A fila não remove arquivos ainda referenciados por versões de documentos. A confirmação da exclusão do cadastro não significa que o espaço no Storage já foi liberado.

Não foram alterados checksums ou reaplicadas migrations históricas marcadas como MODIFICADO.

## Validação e limites

| Verificação | Resultado |
|---|---|
| TypeScript | Aprovado |
| Testes unitários | 271 aprovados em 40 arquivos |
| Testes novos | Sessão, isolamento do banco, transações, callbacks após commit, limpeza externa, cron, status de migrações, briefing e purga de cliente |
| ESLint de fonte, testes, scripts e configuração | Pendências registradas abaixo; não aprovado |
| Build com webpack | Bloqueado por EPERM ao criar `.next-structural-audit/types/app/api` |
| Testes de integração com banco | Não homologados; tentativas encontraram EACCES. A execução ampla foi interrompida e a seleção do banco foi corrigida |
| OpenRouter e operações reais do Supabase | Não homologados por chamadas reais nesta auditoria |
| Publicação | Não realizada |

Os testes com mocks comprovam regras e respostas em cenários controlados. Não substituem uma transação real no Supabase, a verificação de RLS ou uma chamada faturada ao OpenRouter.

## Pendências estruturais e itens que exigem contexto

1. **Atualização do Next.js:** o projeto permanece em 16.4.3. As releases oficiais registram correções de segurança em 16.4.5 e correções posteriores em 16.4.6. A instalação de 16.4.6 falhou por timeout do registro npm; a alternativa offline também não concluiu. Manifesto e lockfile não foram promovidos para uma versão não instalada. Atualizar e repetir as validações antes de publicar.
2. **Autorização administrativa:** `requireAdminUser` verifica uma sessão válida, mas não distingue papéis administrativos. Isso corresponde à operação atual com um único administrador. Antes de adicionar usuários ou abrir cadastro, implementar autorização por papel e escopo no servidor. Não inventei papéis nem bloqueei o administrador atual por uma regra inexistente.
3. **TLS do banco:** o pool ainda usa `rejectUnauthorized:false`. O tráfego é cifrado, mas a identidade do certificado não é validada. Exige verificar a cadeia de certificados/CA do Supabase antes de endurecer a configuração e testar a conexão real.
4. **Briefing público:** o token funciona como credencial de acesso. Não foi identificada política de expiração ou revogação por sessão. Definir validade, reabertura e troca do link, especialmente porque o fluxo aceita credenciais. As sugestões desse briefing ainda são exemplos fixos, agora identificados como tal; não são chamadas de IA.
5. **Dois Kanbans:** existem telas operacionais em `/crm/opportunities` e `/crm/pipelines/[id]`. Ambas têm sentido, mas implementações separadas podem divergir. Consolidar o quadro em componente compartilhado preservando filtros, movimentos e fechamento, com testes de interface.
6. **Landing page em dois lugares:** o Estúdio tem formato de texto para landing page e WEB tem criação específica de landing page. Podem coexistir se o primeiro for copy e o segundo o projeto completo. Falta tornar essa distinção mais clara na navegação.
7. **Planejamento editorial duplicado:** convivem a geração antiga de linhas e o novo fluxo de pilares com temas. Consolidar a experiência após validar os registros existentes, sem apagar linhas históricas.
8. **Modelo de ex-cliente:** o sistema deduz esse estado de contratos cancelados e ausência de contratos ativos. A exclusão de rascunhos rejeitados foi corrigida, mas contratos encerrados, pausas e cancelamento de apenas um serviço ainda exigem uma definição de negócio para o status do cliente.
9. **Empresa interna:** a Otimizza usa um identificador fixo protegido. Tem função legítima para produzir o conteúdo da agência; não é um cliente comercial comum. Uma futura arquitetura multiempresa deve substituí-lo por vínculo explícito de organização, sem quebrar os registros atuais.
10. **Templates de projetos:** ainda há fallback para o template `TMPL-TRAFEGO` no fluxo recorrente manual. Não é adequado a todo tipo de contrato. Remover esse automatismo exige definir como contratos sem template devem ser tratados.
11. **Tipagem e manutenção:** permanecem `any`, renderização dentro de try/catch e componentes muito grandes no CRM, contratos, estratégia e execução de tarefas. Não foram mascarados com uma desativação geral do lint. A lista técnica está abaixo.
12. **Dados de teste:** os exemplos de empresa, proposta e contrato exibidos nas capturas antigas não foram excluídos durante esta auditoria. Não foi possível confirmar seu estado atual no banco. Removê-los exige conferir vínculos e histórico financeiro reais.

## Próximos comandos no PowerShell

Executar na pasta do projeto. Parar se qualquer etapa falhar.

```powershell
Set-Location -LiteralPath 'E:\Sistemas e Solucoes\SistemaERP'
npm.cmd install next@16.4.6 eslint-config-next@16.4.6 --save-exact
if ($LASTEXITCODE -ne 0) { throw 'Falha ao atualizar as dependências.' }
npm.cmd run db:migrate
if ($LASTEXITCODE -ne 0) { throw 'Falha nas migrações.' }
npm.cmd run typecheck
if ($LASTEXITCODE -ne 0) { throw 'Falha no TypeScript.' }
npm.cmd exec vitest run tests/unit
if ($LASTEXITCODE -ne 0) { throw 'Falha nos testes unitários.' }
npm.cmd run build -- --webpack
if ($LASTEXITCODE -ne 0) { throw 'Falha no build.' }
```

Não rodar testes de integração sobre a base operacional. Usar banco isolado e migrations próprias do ambiente de testes. Publicação continua pendente de resolver a verificação de lint e homologar banco, recorrência, Storage e interfaces.

Referências: [releases oficiais do Next.js](https://github.com/vercel/next.js/releases), [cron GET na Vercel](https://vercel.com/kb/guide/ship-a-express-app-on-vercel).

## Pendências de lint encontradas

Total: 23 erros e 1 aviso(s).

| Arquivo | Linha | Regra |
|---|---:|---|
| `src/app/api/crm/leads/route.ts` | 15 | `@typescript-eslint/no-explicit-any` |
| `src/app/api/projects/tasks/[id]/briefing/route.ts` | 57 | `prefer-const` |
| `src/app/api/projects/tasks/[id]/briefing/route.ts` | 167 | `prefer-const` |
| `src/app/api/strategy/unified/route.ts` | 14 | `@typescript-eslint/no-explicit-any` |
| `src/app/contracts/[id]/page.tsx` | 47 | `@typescript-eslint/no-explicit-any` |
| `src/app/contracts/[id]/page.tsx` | 883 | `@typescript-eslint/no-explicit-any` |
| `src/app/contracts/[id]/page.tsx` | 1624 | `@typescript-eslint/no-explicit-any` |
| `src/app/crm/leads/[id]/page.tsx` | 62 | `@typescript-eslint/no-explicit-any` |
| `src/app/crm/leads/[id]/page.tsx` | 145 | `@typescript-eslint/no-explicit-any` |
| `src/app/crm/leads/[id]/page.tsx` | 447 | `@typescript-eslint/no-explicit-any` |
| `src/app/crm/leads/[id]/page.tsx` | 2447 | `@typescript-eslint/no-explicit-any` |
| `src/app/crm/leads/[id]/page.tsx` | 2528 | `@typescript-eslint/no-explicit-any` |
| `src/app/informacoes-otimizza/page.tsx` | 19 | `react-hooks/error-boundaries` |
| `src/app/informacoes-otimizza/page.tsx` | 20 | `react-hooks/error-boundaries` |
| `src/app/informacoes-otimizza/page.tsx` | 21 | `react-hooks/error-boundaries` |
| `src/components/projects/task-execution-modal.tsx` | 66 | `@typescript-eslint/no-explicit-any` |
| `src/components/projects/task-execution-modal.tsx` | 67 | `@typescript-eslint/no-explicit-any` |
| `src/modules/strategy/pdf.ts` | 132 | `@typescript-eslint/no-explicit-any` |
| `src/modules/strategy/seed.ts` | 443 | `@typescript-eslint/no-explicit-any` |
| `src/modules/strategy/service.ts` | 30 | `@typescript-eslint/no-explicit-any` |
| `src/modules/strategy/service.ts` | 77 | `@typescript-eslint/no-explicit-any` |
| `src/modules/strategy/service.ts` | 249 | `@typescript-eslint/no-explicit-any` |
| `src/modules/strategy/service.ts` | 495 | `@typescript-eslint/no-explicit-any` |

Observação adicional: `SESSION_SECRET` aparece somente na definição do ambiente e não é consumido pela autenticação atual, que usa Supabase. Mantido por compatibilidade; não deve ser tratado como uma proteção adicional de sessão.

## Atualização em 19/11/2026

O usuário apresentou execução bem-sucedida da migração 031, atualização para Next.js 16.4.6, TypeScript, 271 testes unitários e build de produção com webpack. Esses resultados substituem os bloqueios anteriores de atualização e build para essa versão do código.

A execução posterior de `db:migrate` e `db:status` falhou por timeout antes de consultar o histórico. A migração 032 continua sem confirmação. A conexão de migração usa `DIRECT_URL` no pooler de sessão, porta 5432; a aplicação usa `DATABASE_URL`, porta 6543. Não foram alterados os destinos nem as credenciais.

O limite de conexão dos comandos de migração/status foi aumentado de 5 para 30 segundos, mantendo 5 segundos para as requisições normais da aplicação. Nove testes direcionados passaram, incluindo a regressão desse limite. Esse ajuste permite uma conexão mais lenta; não comprova nem resolve sozinho indisponibilidade, restrição de rede ou limite de conexões do servidor.

O npm também relatou 12 vulnerabilidades (8 moderadas, 2 altas, 2 críticas). É necessário obter o relatório detalhado para identificar os pacotes e corrigir sem aplicar atualizações incompatíveis indiscriminadamente. Não foi executado `npm audit fix --force`.

### Confirmação posterior e dependências

O usuário confirmou a migração 032 como APLICADO (OK) e o status de todas as migrations de 001 a 032. Não há migrações pendentes nessa execução. Permanecem os avisos de alterações históricas já registrados.

O relatório detalhado do npm identificou Vitest/mocker/tinypool nas dependências de desenvolvimento, minimatch na cadeia do ESLint e Zod/SheetJS nas dependências da aplicação. O código usa SheetJS somente para gerar o XLSX de relatórios, sem leitura de arquivos XLSX recebidos.

Foram preparados ajustes de compatibilidade para Zod 4: chaves explícitas em records, uso de `issues` nos erros e mensagem de enum sem `errorMap`. TypeScript e 272 testes passaram com as dependências atualmente instaladas. Isso não valida ainda Zod 4 ou Vitest 5, nem elimina os avisos de segurança sem instalar as versões corrigidas.

Alvos de atualização controlada: Zod 4.6.7, Vitest 5.1.1 e SheetJS 0.20.3 pelo tarball oficial. A distribuição npm antiga do SheetJS não oferece a correção. Repetir testes, build e npm audit após a instalação; não usar `audit fix --force`.

Referências: [Zod GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5), [Tinypool GHSA-85c8-ppgw-ccpr](https://github.com/advisories/GHSA-85c8-ppgw-ccpr), [instalação oficial SheetJS](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/).
