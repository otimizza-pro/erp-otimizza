# Brainstorm de Conteúdo & Laboratório de Headlines

Rotas: `/prompt-creator/headlines` e `/prompt-creator/brainstorm` (com BI em `/prompt-creator/headlines/bi`).

## Fluxo Estratégico de Criação

O fluxo foi concebido na ordem natural do planejamento editorial de alto nível:

```
[Pilares & Assuntos da Linha Editorial] 
        ↓
[Brainstorm de Ideias de Conteúdo] 
        ↓
[Laboratório de Headlines (Times A e B de IAs)] 
        ↓
[Estúdio Criativo (Carrossel, Reels, Post ou Legenda)]
```

---

## 1. Brainstorm de Conteúdo (Ideação Estratégica)

1. **Seleção de Empresa:** O contexto da empresa selecionada no cabeçalho carrega automaticamente os **Pilares Estratégicos** (`client_editorial_pillars`) e os **Assuntos / Linhas Editoriais** (`client_editorial_lines`).
2. **Filtro por Pilar e Assunto:** O usuário pode clicar em um pilar específico (ex: *Educativo*, *Autoridade*, *Conexão*, *Vendas*) para explorar seus temas e focar o brainstorming.
3. **Brainstorm com IA:**
   - Permite direcionamento estratégico livre (ex: quebrar objeções de preço, dúvidas de clientes, campanha do mês, bastidores).
   - A IA consulta o DNA da marca, públicos, dores, desejos e os últimos conteúdos publicados para **evitar repetições**.
   - Sugere 5 ideias concretas de conteúdo com:
     - Título / Tema concreto
     - Pilar e Assunto associado
     - Formato recomendado (Carrossel, Reels, Post estático, Stories)
     - Ângulo / Abordagem (Passo a passo, Erro comum, Estudo de caso, etc.)
     - Público e Dor/Desejo
     - Justificativa estratégica
   - As sugestões podem ser salvas individualmente ou em lote no mural.
4. **Adição Manual de Ideia:** O usuário pode cadastrar ideias e temas próprios no mural a qualquer momento.
5. **Mural de Ideias (Backlog):** Lista visual de ideias com filtros por pilar e formato.
6. **🎯 Ação "Criar Headlines":**
   - Ao clicar no botão **"Criar Headlines"** em qualquer card do mural, o sistema converte a ideia em peça de conteúdo (`content_calendar_items`) e inicializa o workspace (`headline_workspaces`) com o briefing 100% preenchido.
   - O usuário é levado diretamente para o Laboratório de Headlines para essa ideia específica.

---

## 2. Laboratório de Headlines

1. **Briefing Integrado:** A ideia escolhida já preenche a *Big Idea*, formato, público, dores, objetivos e parâmetros criativos.
2. **Times A e B de Modelos:**
   - Cada posição gera opções tanto pelo prompt quanto adaptadas ao estilo histórico do cliente.
   - Avaliação com 👍 / 👎 e motivo opcional para alimentar a biblioteca de estilo.
3. **Headline Vencedora:** O usuário seleciona a melhor headline (ou escreve uma autoral).
4. **Handoff para o Estúdio Criativo:** Com a headline definida, um clique em **"Avançar para criar conteúdo no Estúdio Criativo"** carrega a pauta com headline, subheadline e briefing no Estúdio Criativo para a redação completa de carrossel, roteiro de reels ou legenda.

---

## Persistência e Tabelas
- `client_editorial_pillars` & `client_editorial_lines`: Pilares e assuntos estratégicos.
- `content_brainstorm_ideas` (migração 044): Mural de ideias pré-headline com status, pilar, assunto e vínculo com a peça.
- `headline_workspaces`, `headline_rounds`, `headline_runs`, `headline_candidates`: Histórico do laboratório e avaliações.
- `content_calendar_items`: Pautas integradas ao calendário e ao estúdio criativo.
