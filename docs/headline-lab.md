# Laboratório de Headlines

Rotas: `/prompt-creator/headlines` e `/prompt-creator/headlines/bi`.

## Uso

1. Selecione a empresa no cabeçalho. Crie uma peça ou abra uma existente por `?contentId=UUID`.
2. Gere sugestões de pauta ou preencha o briefing. Públicos, temas e DNA vêm do contexto da empresa. Os dados específicos da peça ficam na pauta, sem alterar o DNA institucional.
3. Revise o prompt completo e gere o Time A. Cada posição recebe duas solicitações: quatro opções pelo prompt e quatro com exemplos do seu estilo. São 32 opções por time quando todas as solicitações retornam respostas válidas.
4. Avalie, escolha ou crie sua própria headline. O Time B e as novas tentativas são opcionais e acrescentam resultados ao histórico.
5. Abra o Estúdio para continuar na mesma pauta. Headline, subheadline e briefing acompanham a peça. Trocar a escolha preserva o conteúdo existente e sinaliza revisão necessária.

## Configuração

Os oito slots usam `OPENROUTER_HEADLINE_TEAM_A_1_MODEL` até `OPENROUTER_HEADLINE_TEAM_A_4_MODEL` e `OPENROUTER_HEADLINE_TEAM_B_1_MODEL` até `OPENROUTER_HEADLINE_TEAM_B_4_MODEL`. Os IDs solicitados constam em `.env.example`; valores locais ficam em `.env.local` e no arquivo de transferência `.envias`. Next.js não carrega `.envias` automaticamente. Em hospedagem, configure as variáveis do projeto e publique novamente para trocá-las.

O botão de catálogo compara os IDs com o catálogo atual do OpenRouter. Um ID ausente, restrição de acesso ou indisponibilidade dentro do teto de preço aparece como erro da posição. Não há troca silenciosa de modelo. O teto de preço já existente no conector continua aplicado. Falhas podem ser repetidas isoladamente, com nova tentativa auditável.

## Estilo e avaliações

- 👍 inclui o exemplo positivo; 👎 registra rejeição e motivo opcional. Remover avaliação volta a neutro.
- Neutro significa não avaliado, não uma rejeição usada para aprendizado.
- Preferências são isoladas por administrador, empresa e formato. A modalidade pelo prompt não recebe a biblioteca de estilo.
- Cada nova rodada e cada novo lote capturam exemplos e orientação atuais. Repetir uma execução com erro usa seu contexto original.
- Criação humana entra positiva e pode registrar inspirações. Sua seleção não conta como vitória de modelo.
- A adaptação usa exemplos no contexto. Não há treinamento dos pesos dos modelos.

## BI

Preferência editorial, erros/latência/custos e resultados reais são separados. Custos sem informação do provedor são desconhecidos, não zero. Custos do provedor ficam em USD; investimento manual em BRL. Avaliações automáticas de qualidade não predizem performance real.

O Time B costuma receber as rodadas mais difíceis e sua comparação com A tem viés de seleção. A avaliação cega oculta os nomes dos modelos nos cards. As métricas de campanha exigem período, fonte e dados reais; intervalos sobrepostos da mesma peça são recusados para evitar soma duplicada. Experimentos registram hipótese, variável, controles, métrica e conclusão. Não há importação automática de plataformas de anúncios.

## Persistência e validação

Migração `043_headline_teams.sql`: histórico de rodadas, execuções, candidatos, eventos, perfis, métricas e experimentos. Novas tabelas têm RLS e acesso direto revogado para `anon` e `authenticated`; a API exige administrador e verifica propriedade das peças. A pauta existente em `content_calendar_items` é reutilizada. Briefings editáveis e snapshots de geração têm funções distintas; snapshots preservam o contexto histórico.

Testes: `tests/unit/headline-lab.test.ts`, `tests/unit/headline-handoff.test.ts` e `tests/integration/headline-lab.test.ts`. O teste de integração usa transação com rollback e deve rodar apenas em banco de testes autorizado pela proteção do pool.
