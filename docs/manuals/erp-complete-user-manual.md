# MANUAL OPERACIONAL E DO USUÁRIO - OTIMIZZA ERP

**Versão:** 1.0.0  
**Data:** 31 de Outubro de 2026  
**Público-alvo:** Administrador e Gestores da Otimizza

---

## 1. NAVEGAÇÃO E VISÃO GERAL

O Otimizza ERP foi construído sob padrões corporativos limpos, rápidos e responsivos. O menu lateral esquerdo organiza todas as funcionalidades em grupos semânticos:

- **VISÃO GERAL:** Dashboard Executivo com indicadores de faturamento, novos contratos e métricas vitais.
- **COMERCIAL:** CRM, Leads, Oportunidades, Funis/Kanban, Atividades Comerciais, Clientes e Propostas Comerciais.
- **CATÁLOGO:** Categorias, Serviços do catálogo e Combos comerciais.
- **FINANCEIRO:** Assinaturas/Contratos, Contas a Receber, Contas a Pagar, Fornecedores, Contas Financeiras, Fluxo de Caixa, Centros de Custo e DRE Gerencial.
- **DADOS & BI:** Indicadores analíticos e Relatórios de rentabilidade.
- **PROJETOS:** Projetos em execução e Modelos (Templates) operacionais.
- **DOCUMENTOS:** Repositório central de arquivos com histórico imutável.
- **CONFIGURAÇÕES:** Preferências do sistema e segurança.

---

## 2. MANUAL DO CRM & PIPELINE DE VENDAS

### 2.1. Cadastro e Gestão de Leads
1. Acesse **Comercial > Leads** e clique em **Novo Lead**.
2. Preencha Nome, Razão Social, Tipo (Pessoa Física ou Jurídica), E-mail, Telefone e Origem (Google, Indicação, Outbound, etc.).
3. O Lead permanecerá no CRM isolado da base de clientes até sua qualificação e conversão formal.

### 2.2. Funis e Oportunidades (Deals)
1. Acesse **Comercial > Oportunidades** ou **Funis** para visualizar o pipeline em Kanban.
2. Cada card exibe o código amigável (`OPP-00001`), valor mensal e probabilidade de fechamento.
3. Arraste os cards entre as etapas do funil para atualizar a probabilidade e registrar o histórico auditado.
4. Feche a oportunidade clicando em **Ganhar**, **Perder** (motivo obrigatório) ou **Cancelar**.

### 2.3. Conversão de Lead em Cliente
1. Na ficha do Lead, selecione a opção **Converter em Cliente**.
2. O sistema realiza uma transação atômica que:
   - Cria o registro oficial na tabela de `clients`.
   - Vincula todas as oportunidades ativas do lead ao novo cliente.
   - Marca o status do lead como `CONVERTED`.
   - Impede conversões duplicadas.

---

## 3. MANUAL DE PROPOSTAS COMERCIAIS

### 3.1. Criação e Cotação
1. Acesse **Comercial > Propostas Comerciais** e clique em **Nova Proposta**.
2. Vincule a proposta a um **Lead** ou **Cliente** cadastrado.
3. Adicione os itens de serviço e combos, especificando a periodicidade (Mensal, Avulso ou Anual) e os preços negociados.
4. O sistema gera automaticamente a **Versão 1** com subtotais e totais congelados.

### 3.2. Versionamento Imutável
- Quando houver negociação de valores ou escopo, clique em **Nova Versão**.
- A versão anterior torna-se imutável (`SUPERSEDED`), garantindo rastreabilidade histórica.

### 3.3. Geração de PDF e Envio
- Clique em **Gerar PDF** na versão desejada para baixar o documento formal emitido com layout profissional.
- O PDF é automaticamente indexado e protegido no Repositório de Documentos (Fase 9).
- Registre o envio marcando o canal (E-mail, WhatsApp) para mover a proposta para o status `SENT`.

### 3.4. Aprovação Manual e Conversão em Contrato
1. Após a assinatura do cliente, acione **Aprovar Proposta**, selecionando a versão homologada.
2. Clique em **Converter em Contrato**:
   - O sistema gera o contrato ativo na base financeira com itens e valores mensais.
   - Caso o botão de conversão seja pressionado repetidamente, a chave de idempotência assegura que **nenhum contrato duplicado seja criado**.

---

## 4. MANUAL DE GESTÃO DOCUMENTAL (FASE 9)

### 4.1. Repositório Centralizado
1. Acesse **Documentos > Repositório**.
2. Filtre arquivos por Categoria (Proposta, Contrato, Cadastral, Comprovante, Relatório, Briefing), Tags, Data de emissão ou Entidade vinculada.
3. Cada documento possui código único (`DOC-00001`), identificação física UUID e hash de integridade **SHA-256**.

### 4.2. Upload e Nova Versão
- O envio aceita documentos em formatos seguros (PDF, DOCX, XLSX, PNG, JPG).
- Para atualizar um documento existente, acione **Adicionar Nova Versão**. A versão antiga permanece armazenada e auditável para download histórico.

### 4.3. Vínculos Polimórficos
- Documentos podem ser vinculados a Clientes, Fornecedores, Contratos, Propostas, Contas a Pagar/Receber e Projetos.
- Desvincular um documento remove apenas o relacionamento, sem apagar o arquivo físico caso haja outras referências ou requisitos de retenção.

---

## 5. MANUAL DE DRE GERENCIAL & CENTROS DE CUSTO (FASE 10)

### 5.1. Regimes de Apuração
Acesse **Financeiro > DRE Gerencial** e alterne entre as duas visões econômicas:
- **Regime de Competência (Accrual):** Apura receitas contratuais no mês de prestação do serviço e custos/despesas apropriados no período econômico do fato gerador, independentemente da data de pagamento.
- **Regime de Caixa (Cash):** Apura estritamente o dinheiro recebido e os pagamentos liquidados nas contas financeiras dentro do mês.

### 5.2. Estrutura Hierárquica da DRE
1. **Receita Bruta Reconhecida** (Vendas e contratos do período).
2. **(-) Deduções e Impostos** (Descontos e tributos incidentes).
3. **(=) Receita Líquida**.
4. **(-) Custos Diretos dos Serviços** (Freelancers, ferramentas operacionais dedicadas).
5. **(=) Margem de Contribuição** (e percentual sobre a receita líquida).
6. **(-) Despesas Operacionais** (Administrativas, Comerciais, Tecnologia e Outras).
7. **(=) Resultado Operacional Gerencial**.
8. **(+/-) Receitas e Despesas Não Operacionais**.
9. **(=) Resultado Líquido Gerencial**.

### 5.3. Centros de Custo e Rateio de Despesas
1. Acesse **Financeiro > Centros de Custo** para criar e ativar unidades como *Administrativo*, *Comercial*, *Operações* e *Tecnologia*.
2. Ao registrar uma Conta a Pagar, clique em **Ratear Centro de Custo**:
   - Defina as porcentagens para cada centro (ex: 70% Operações, 30% Administrativo).
   - O sistema valida rigorosamente a soma exata de 100% e calcula os centavos exatos, impedindo rateios inconsistentes ou superiores ao total da despesa.

---

## 6. MANUAL DE GESTÃO DE PROJETOS (FASE 11)

### 6.1. Tipos de Projeto
- **Projeto Avulso:** Criado para entregas pontuais de clientes (ex: criação de site institucional, consultoria).
- **Projeto Recorrente:** Criado automaticamente por competência mensal para contratos de prestação continuada (ex: gestão de tráfego, social media).
- **Projeto Independente:** Projetos internos da Otimizza sem cliente atrelado.

### 6.2. Modelos de Projeto (Templates)
Acesse **Projetos > Modelos** para criar ou consultar templates padrão (ex: *Gestão Mensal de Tráfego Pago*, *Implantação de Website*). Os modelos predefinem etapas, tarefas sequenciais, checklists e horas estimadas.

### 6.3. Automação de Recorrência por Contrato
1. Na ficha do Contrato (**Financeiro > Assinaturas > Ficha do Contrato**), abra a aba **Projetos & Recorrência**.
2. Ative a geração recorrente, selecione o modelo desejado (ex: *TMPL-TRAFEGO*) e o dia de início mensal.
3. O sistema gera automaticamente o projeto de cada mês clonando todas as etapas e tarefas do template.
4. **Garantia de Idempotência:** A chave composta `(contract_id, competency)` impede a duplicação acidental do mesmo projeto em reprocessamentos.

### 6.4. Apontamento de Horas e Rentabilidade
- Dentro do workspace do Projeto, acesse a aba **Apontamento de Horas**.
- Registre a data, horas trabalhadas, descrição e taxa horária referencial.
- O sistema calcula o custo interno do projeto para análise de rentabilidade, **sem criar duplicidades em contas a pagar ou lançamentos contábeis indevidos**.

---

## 7. MANUAL FINANCEIRO TRADICIONAL

### 7.1. Contas a Receber
- Emissão de títulos manuais ou gerados automaticamente por contratos recorrentes.
- Liquidação total ou parcial com crédito automático na Conta Bancária e emissão do respectivo lançamento de `INFLOW` no extrato.

### 7.2. Contas a Pagar
- Registro de despesas com vencimento, categoria, fornecedor e competência.
- Pagamento com baixa automática e débito de `OUTFLOW` na conta selecionada.

### 7.3. Extrato e Conciliação
- Acesse **Financeiro > Fluxo de Caixa** e **Contas Financeiras**.
- Todas as movimentações geram números sequenciais auditáveis (`EXT-000001`), saldo acumulado após a operação e histórico de estorno seguro.
