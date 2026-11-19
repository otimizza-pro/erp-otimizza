# Guia de Deploy e Infraestrutura: Localhost, Supabase, Vercel e CI/CD

Este documento orienta a execução local, a configuração do banco de dados PostgreSQL no **Supabase**, o deploy em produção na plataforma **Vercel**, as pipelines de CI/CD e as diretrizes de execução em ambientes automatizados (como Codex e agentes de IA).

---

## 1. Identificação e Infraestrutura Oficial de Produção

- **Domínio Oficial de Produção:** [https://erp.otimizza.com.br](https://erp.otimizza.com.br)
  - Configuração DNS: CNAME apontando para `8dd05605eaf41dd8.vercel-dns-017.com` (Vercel Anycast IP).
  - Domínio alternativo Vercel: `https://erp-otimizza.vercel.app`
- **Projeto na Vercel:**
  - `projectId`: `prj_zARYDaTyAQ8tJUMnuhRbQdYDP0Ip`
  - `orgId`: `team_3zyJ8SXWjkFFiE9lYa2P9ZIc`
- **Repositório Git & Branch de Produção:**
  - Repositório: `https://github.com/otimizza-pro/erp-otimizza.git`
  - Branch de Produção: `main`

---

## 2. Consulta de Deployments e Logs via Vercel CLI (Sem Expor Credenciais)

Para agentes e desenvolvedores consultarem o status e logs de publicação na Vercel de forma autenticada sem commitar segredos no Git:

1. Obtenha um Personal Access Token no painel da Vercel: [https://vercel.com/account/tokens](https://vercel.com/account/tokens).
2. Configure a variável no seu terminal ou no arquivo `.env.local` (nunca no `.env` versionado):
   ```bash
   export VERCEL_TOKEN="seu_token_aqui"
   # No Windows CMD:
   set VERCEL_TOKEN=seu_token_aqui
   ```
3. Consulte deployments e logs:
   ```bash
   # Listar os últimos deployments do projeto
   npx vercel ls --token %VERCEL_TOKEN%

   # Inspecionar detalhes e commit de um deployment
   npx vercel inspect <deployment-url> --token %VERCEL_TOKEN%

   # Ver logs em tempo real
   npx vercel logs <deployment-url> --token %VERCEL_TOKEN%
   ```

---

## 3. Bancos de Dados Supabase: Produção vs. Testes

O ERP utiliza o PostgreSQL gerenciado no Supabase com isolamento rigoroso fail-closed (`assertSafeTestDatabase` e `assertSafeEnvironmentDatabase` em `src/lib/db/pool.ts`).

### 3.1 Banco de Produção (`DATABASE_URL` e `DIRECT_URL`)
- **Projeto:** `ffbdrcfokhoyouiiajzq` (Região: AWS `us-west-2`)
- **`DATABASE_URL`:** Porta `6543` (Supavisor Transaction Pooler). Utilizado pela aplicação em runtime para prevenir exaustão de conexões serverless.
- **`DIRECT_URL`:** Porta `5432` (Conexão direta de sessão). Usado exclusivamente para migrações DDL que exigem locks de schema.

### 3.2 Banco de Testes Isolado (`DATABASE_URL_TEST`)
- **Projeto:** `suigwrmnrvmlsrhquyyp` (Região: AWS `us-east-1`, Banco: `sistema_erp_test`)
- **Regra Inegociável:** Testes automatizados NUNCA podem rodar na base de produção. A função `assertSafeTestDatabase()` bloqueia imediatamente a execução se `DATABASE_URL_TEST` apontar para o projeto `ffbdrcfokhoyouiiajzq`.
- **Como aplicar migrações no banco de testes:**
  ```bash
  # Windows CMD:
  set NODE_ENV=test&& npm run db:migrate

  # Linux / macOS:
  NODE_ENV=test npm run db:migrate
  ```
- **Como rodar testes de integração contra a base de testes:**
  ```bash
  npx vitest run tests/integration/converted-lead-identity.test.ts
  ```

---

## 4. Gestão de Migrações e Auditoria de Checksums

As migrações SQL são controladas transacionalmente pelo arquivo `src/lib/db/migrate.ts` e registradas na tabela `_migrations`.

```bash
# Verificar status das migrações
npm run db:status

# Auditoria técnica de checksums e integridade estrutural
npm run db:audit

# Aplicar migrações pendentes em produção
npm run db:migrate
```

> [!NOTE]
> **Divergências de Checksum em Migrações Antigas (005, 008 a 014, 018):**
> A verificação `db:audit` comprovou que:
> - As migrações 009, 010, 011 e 013 diferem apenas por normalização de quebra de linha (`LF` vs `CRLF` no checkout Windows).
> - As migrações 005, 008 e 014 receberam stubs de compatibilidade para Docker CI (`CREATE SCHEMA IF NOT EXISTS auth;`, roles `anon/authenticated` e extensão `pg_trgm`), elementos que já existem nativamente no Supabase gerenciado.
> - Não há divergência funcional de schema: todas as tabelas, colunas, views, índices e triggers das 35 migrações estão presentes e íntegros.

---

## 5. Build Padronizado e Compatibilidade de Sandboxes

Para garantir que a compilação do Next.js funcione tanto no servidor de produção quanto em ambientes com sandboxes restritas (como Codex CLI e containers com IPC restrito):

- **Padronização Webpack:** O script `build` em `package.json` está configurado como `next build --webpack`.
  - **Motivo técnico:** O Turbopack no Next.js 16 cria subprocessos de compilação via IPC (named pipes/sockets nativos do Rust para Node). Em ambientes de sandbox com políticas de isolamento de processos, a criação desses pipes é interceptada (`TurbopackInternalError: node process exited before we could connect to it`).
  - O Webpack compila os mesmos 110 endpoints e páginas de forma estável, sem falhas de subprocesso e com desempenho equivalente (~37s).

```bash
# Compilação local e de produção
npm run build
```

---

## 6. Integração Contínua (GitHub Actions)

O workflow em `.github/workflows/ci.yml` está configurado para validar a integridade de ponta a ponta:
- **Gatilhos:**
  - `push` nas branches `main` e `develop`.
  - `pull_request` para `main` e `develop`.
- **Etapas automáticas no CI:**
  1. Validação estrita de tipos TypeScript (`npm run typecheck`).
  2. Análise estática de código (`npm run lint`).
  3. PostgreSQL isolado em container Docker.
  4. Execução de todas as migrações (`npm run db:migrate`).
  5. Semeadura de dados de teste (`npm run db:seed`).
  6. Execução de testes unitários e de integração (`npm test`).
  7. Compilação Next.js de produção (`npm run build`).

---

## 7. Diagnóstico do Ambiente Codex e Ferramentas Locais

### 7.1 Restrições de Rede da Sandbox do Codex
- **Sintoma no Codex:** `getaddrinfo ENOTFOUND aws-1-us-west-2.pooler.supabase.com` e `erp.otimizza.com.br não resolvido`.
- **Causa:** O aplicativo do Codex executa comandos em uma sandbox com isolamento de rede por padrão.
- **Ação necessária:** Para que o Codex acesse o banco ou APIs externas diretamente, é necessário configurar o aplicativo/CLI do Codex com permissão de saída de rede (`--allow-network` ou habilitar "Network Access" nas preferências da sandbox do aplicativo).

### 7.2 Ferramentas Locais (Ripgrep e Python)
- **`rg` (ripgrep):** Instalado e configurado no PATH (`C:\Users\otimi\AppData\Local\Microsoft\WindowsApps\rg.exe` e via WinGet `BurntSushi.ripgrep.MSVC`).
- **Python:** O projeto Sistema ERP é 100% TypeScript/Node.js (Next.js 16 + Vitest + PostgreSQL). O executável Python não é necessário para nenhum fluxo do ciclo de build, teste ou migração do repositório.
