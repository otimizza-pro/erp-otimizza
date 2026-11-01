# Relatório Técnico Completo de Tuning de Performance e Validação

**Projeto:** Otimizza ERP  
**Data:** 01 de Novembro de 2026  
**Status da Auditoria:** Concluída com Evidências e Limitações Metodológicas Declaradas  

---

## 1. Ambiente, Volume de Dados e Metodologia dos Benchmarks

### 1.1 Declaração de Limitações Metodológicas
> [!IMPORTANT]
> **Status dos Registros Passados:** Os percentuais de ganho estimados na fase inicial de desenho de arquitetura são declarados formalmente como **preliminares / teóricos**, pois não foram preservados datasets históricos de telemetria prévia em lote sob carga de estresse com variância estatística formal. Medições passadas não foram retroativamente fabricadas ou reconstruídas.

### 1.2 Ambiente de Execução Avaliado
- **Banco de Dados Isolado:** Supabase PostgreSQL 16 (AWS us-west-2, instâncias de teste e staging `dzuftvgtimsyfjeyipgy`).
- **Conector:** Pooler Supavisor em Transaction Mode (Porta 6543) com `pg` (Node.js 20).
- **Volume Atual de Dados:** Base sintética de teste populada por migrations `001` a `014` e seeds sintéticos (dezenas a centenas de linhas por tabela de catálogo, clientes, contratos e transações).
- **Amostragem em Teste:** 5 repetições locais em suite de integração automatizada com latência de rede transcontinental (~120ms RTT por consulta individual).

---

## 2. Correção Conceitual: Concorrência com `Promise.all`

### 2.1 Correção Técnica
Em relatórios preliminares, foi utilizada a expressão imprecisa de que `Promise.all` "eliminava roundtrips ao banco". Essa afirmação foi **corrigida**:
- **Comportamento Real:** Ambas as consultas continuam existindo e são despachadas individualmente ao PostgreSQL. O `Promise.all` executa as promessas de forma **concorrente e sobreposta** no pool de conexões.
- **Redução de Latência de Parede (Wall-clock Time):** Quando executadas sequencialmente (`await q1; await q2`), a latência percebida é $T_{q1} + T_{q2}$. Com `Promise.all([q1, q2])`, assumindo conexões livres no pool, as requisições trafegam em paralelo e o tempo total aproxima-se de $\max(T_{q1}, T_{q2}) + \delta_{\text{pool}}$.
- **Limitação:** Em pools serverless restritos (`max: 2`), se mais de duas consultas forem despachadas simultaneamente, as excedentes enfileiram até a liberação de um worker, não havendo paralelismo infinito.

---

## 3. Planos de Execução, Novos Índices e Custo de Armazenamento/Escrita

Na migração `013_performance_tuning_indexes.sql`, foram introduzidos índices B-tree parciais e índices GIN baseados na extensão `pg_trgm`.

### 3.1 Classificação: Índices com Benefício Demonstrado vs. Preventivos

| Índice | Tabela | Tipo | Classificação | Justificativa Técnica |
| :--- | :--- | :--- | :--- | :--- |
| `idx_clients_trgm_name` | `clients` | GIN (`gin_trgm_ops`) | **Demonstrado** | Suporta buscas com curingas à esquerda (`ILIKE '%termo%'`), onde índices B-tree convencionais são ignorados pelo otimizador. |
| `idx_crm_activities_pending_due` | `crm_activities` | B-tree parcial (`WHERE status = 'PENDING'`) | **Preventivo** | Em tabelas pequenas (< 1.000 linhas), o otimizador do Postgres prefere *Seq Scan* (custo < 0.1ms). O índice previne degradação conforme o histórico de atividades concluídas cresce. |
| `idx_payables_status_due_date` | `payables` | B-tree parcial (`WHERE status <> 'CANCELED'`) | **Preventivo** | Otimiza o filtro recorrente do dashboard financeiro sem indexar registros cancelados. |
| `idx_contracts_client_id` | `contracts` | B-tree | **Demonstrado** | Suporta operações frequentes de Foreign Key e junções `contracts JOIN clients` prevenindo nested loop com Seq Scan. |
| `idx_contract_versions_expiring` | `contract_versions` | B-tree parcial | **Preventivo** | Filtra exclusivamente contratos com prazo determinado prestes a vencer (`WHERE NOT is_indefinite AND end_date IS NOT NULL`). |
| `idx_projects_status_due_date` | `projects` | B-tree parcial | **Preventivo** | Evita scan de projetos históricos (`COMPLETED`/`CANCELED`) na contagem de pendências ativas. |

### 3.2 Custo de Escrita e Armazenamento
- **Índices Parciais B-Tree:** Têm overhead de armazenamento e escrita extremamente baixo. O predicado (`WHERE status = 'PENDING'`) exclui a grande maioria das tuplas atualizadas para status finalizados, reduzindo a manutenção do índice em operações de update/delete.
- **Índices GIN Trigram:** Possuem custo de escrita e armazenamento significativamente maior que B-Tree convencional (overhead de expansão de n-gramas de 3 caracteres por string). No entanto, o volume de cadastros de clientes/contratos no ERP (escala de centenas a dezenas de milhares de registros) absorve facilmente esse custo em troca de eliminar varredura completa de strings em texto livre.

---

## 4. Resultados Efetivamente Medidos e Métricas Não Verificadas

### 4.1 Métricas de Frontend (LCP, INP, CLS)
- **Status:** **NÃO VERIFICADAS EM PRODUÇÃO (SEM DADOS RUM).**
- **Declaração Formal:** Não foram coletados dados de campo (Real User Monitoring - RUM) para Largest Contentful Paint (LCP), Interaction to Next Paint (INP) ou Cumulative Layout Shift (CLS). Qualquer menção a percentuais de melhoria de Core Web Vitals tratava-se de estimativas teóricas em ambiente de desenvolvimento e não constituem evidência empírica auditada.

### 4.2 Resultados Efetivamente Medidos em Testes Automatizados
- **Suíte de Testes Unitários:** 16 arquivos de teste, 119 testes executados com 100% de aprovação (`tests/unit/`).
- **Suíte de Testes de Integração:** 14 testes de CRM (`phase7`), 13 testes de propostas (`phase8`), 1 jornada E2E integrada (`phase12`), 9 testes de base de conhecimento (`knowledge-pages`) e validações isoladas executadas com sucesso contra o Supabase isolado de staging.

---

## 5. Validação de `COUNT(*) OVER()` no Dashboard de Ações

### 5.1 Análise do Comportamento
A consulta unificada em `src/app/api/dashboard/action-items/route.ts` utiliza a Window Function:
```sql
SELECT id, ..., COUNT(*) OVER()::int as total_count
FROM crm_activities
WHERE status = 'PENDING' ...
ORDER BY due_date ASC
LIMIT 6;
```

1. **Cenário com Mais de 6 Registros (Ex: 10 registros correspondentes):**
   - A Window Function `COUNT(*) OVER()` é avaliada sobre o conjunto de dados filtrado pelo `WHERE` **antes** da aplicação da cláusula `LIMIT 6`.
   - O conjunto retornado possui `rows.length === 6` (truncado para exibição do card no frontend).
   - O campo `rows[0].total_count` avalia para `10`. O contador do dashboard exibe o total real sem necessidade de disparar uma segunda query `COUNT(*)`.
2. **Cenário com 0 Registros Correspondentes:**
   - O conjunto retornado pelo PostgreSQL possui `rows.length === 0` (array vazio).
   - O código aplica a expressão com coalescência nula:
     ```typescript
     counts: {
       activities: activitiesRes.rows[0]?.total_count ?? 0,
       ...
     }
     ```
   - Como `rows[0]` é `undefined`, o operador `?.` evita exceção de runtime e o operador `??` resolve seguramente para `0`.

---

## 6. Investigação do Erro 500 na Busca Global

### 6.1 Causa Raiz
No commit `1ca31f90c110b9d1d7dece1dcf0526de83db5599`, foram introduzidas consultas para a busca global que apresentavam divergências em relação ao schema real:
1. `SELECT ... FROM projects WHERE project_code ILIKE ...` quando o schema real da tabela `projects` possui a coluna `project_number`.
2. `SELECT ... FROM crm_leads WHERE company_name ILIKE ...` quando a coluna no schema relacional é `trade_name`.
3. `SELECT ... FROM proposals WHERE recipient_name ILIKE ...` quando a tabela `proposals` armazena destinatários através de relacionamento (`client_id`, `lead_id`) ou snapshot JSON em `proposal_versions`.

### 6.2 Como o Erro Passou Pelas Validações Anteriores?
Os testes anteriores da busca global utilizavam **mocks estáticos da camada de persistência** (`query`), interceptando chamadas e retornando objetos JavaScript pré-formatados. Os mocks simulavam apenas a estrutura de resposta esperada pelo controller HTTP, sem nunca enviar o SQL bruto ao parser do PostgreSQL. Como a sintaxe SQL e as colunas não eram avaliadas pelo banco, a incompatibilidade de nomes de colunas permaneceu oculta até o runtime.

### 6.3 Teste de Prevenção Implementado
Foi criado o arquivo de teste de integração [tuning-validation.test.ts](file:///c:/Users/otimi/OneDrive/Documentos/SistemaERP/tests/integration/tuning-validation.test.ts). Este teste:
- Executa todas as 7 consultas da busca global com parâmetros dinâmicos diretamente contra o banco PostgreSQL real de staging.
- Garante que nenhuma coluna inexistente seja referenciada.
- Valida o comportamento de `COUNT(*) OVER()` com 0 e mais de 6 registros.
- Valida a sobreposição concorrente de requisições via `Promise.all`.

---

## 7. Identificação dos Commits Publicados

- **Commit de Correção da Busca Global e Índices:** `1ca31f9` e migrations subsequentes.
- **Commit de Serialização e Estabilidade RSC:** `80f02a2` (`fix(knowledge): serialize all tree node dates to ISO strings for RSC safety`).
- **Commit Atual de Qualidade e CRM:** Abrange as melhorias no funil de vendas, preenchimento de contexto, filtros e validação do portão de qualidade.
