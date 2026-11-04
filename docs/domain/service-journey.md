# Jornada comercial por serviço

## Catálogo inicial

| Serviço | Preço de referência | Cobrança |
| --- | ---: | --- |
| Domínio | R$ 60 | Anual |
| Hospedagem de Site | R$ 275 | Anual |
| Criação de WebSite | R$ 650 | Avulso, até 3 parcelas |
| T.P. Google Ads | R$ 1.000 | Mensal |
| T.P. Meta Ads | R$ 1.000 | Mensal |
| Social Media | R$ 1.500 | Mensal |

Combos: domínio + hospedagem; domínio + hospedagem + website; Google Ads + Meta Ads; Google Ads + Meta Ads + Social Media. A migração não exclui outros serviços nem combos existentes.

## Fluxo

1. A proposta recebe serviços individuais ou os componentes do combo. O total negociado é distribuído proporcionalmente em centavos entre os itens selecionados; os totais mensal, anual e avulso continuam visíveis. Um total com periodicidades diferentes representa a soma dos valores iniciais, não uma mensalidade única.
2. Aprovar a proposta cria uma única minuta com os valores finais e periodicidades congelados. Aprovação e conversão pela API ocorrem na mesma transação. Novas tentativas retornam o contrato existente, mesmo com outra chave de requisição.
3. Na minuta, definir o primeiro vencimento de cada serviço e, para avulsos, de uma a três parcelas. Confirmar aprova o contrato e gera os títulos iniciais e todas as parcelas do avulso, sem movimentar caixa.
4. A opção de agrupamento reúne apenas serviços com periodicidade e vencimento iguais. `receivable_items` mantém o valor de cada serviço, mesmo em uma fatura agrupada. Chaves únicas e bloqueio do contrato impedem duplicação.
5. A rotina existente de recorrência gera os próximos meses/anos a partir das datas individuais. Dias 29–31 são ajustados ao fim do mês sem perder o dia original. A configuração não agenda um novo job: usa o acionamento de recorrência já existente no ERP.
6. Após gerar o financeiro, a tela de projeto vem preenchida com cliente e contrato. A opção inicial combina os modelos de onboarding de todos os serviços contratados; também é possível escolher outro modelo.
7. Projetos podem ser vistos em lista, Gantt, calendário de entregas ou Kanban. Filtros incluem cliente, contrato, status e prioridade. O Kanban é uma visualização; a edição continua no projeto.
8. Documentos do cliente têm pastas próprias e pastas automáticas de propostas enviadas, contratos e recibos. Recibos em PDF são gerados a partir de recebimentos efetivos, inclusive indicação de estorno. Não substituem nota fiscal.
9. O histórico reúne eventos comerciais, contratos, cobranças, recebimentos, documentos e projetos, com filtro de categoria. O registro de cada alteração de tarefa/projeto passa a existir após a migração 017; estados anteriores não registrados não são reconstruídos.

## Compatibilidade e implantação

- Aplicar 016 e 017 antes de disponibilizar este código. Contratos antigos continuam com o motor anterior; nenhum título histórico é recalculado.
- Valores do catálogo com o mesmo nome são atualizados, sem alterar snapshots de propostas e contratos existentes.
- Os novos contratos com plano financeiro configurado bloqueiam a revisão genérica de versão, que não migra calendários individuais. Novas contratações podem ser criadas por proposta. O bloqueio impede cobranças incorretas ou duplicadas; migração de calendário em aditivos requer um fluxo específico futuro.
- Os recibos e pastas automáticas são visualizações dos registros vinculados. Arquivos enviados pelo usuário permanecem no armazenamento documental existente.
- Rollback: retornar ao código anterior somente antes de criar contratos mistos/planos individuais. Após haver dados, manter as tabelas e corrigir com migração aditiva; não remover registros financeiros.
