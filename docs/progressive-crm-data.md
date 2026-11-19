# Cadastro progressivo e propostas

## Fontes dos dados

| Informação | Fonte de gravação e leitura |
| --- | --- |
| Nome e contatos do lead convertido | Cliente vinculado, com sincronização bidirecional pela migração 035 |
| Necessidade e problema do lead | `crm_leads.need_summary`; diagnóstico da proposta lê e atualiza esse mesmo campo enquanto o lead não foi convertido |
| Descrição do negócio | `client_identities.brand_context`, compartilhado pelo DNA inicial e pelo DNA completo |
| Cliente ideal prioritário, objetivo comercial, escopo solicitado, objetivo da comunicação e porta-voz | `client_identities.commercial_profile`, sem exigir oportunidade |
| Perfis detalhados de público | `client_audiences`; briefing e chamadas antigas enriquecem esse catálogo, sem escrever uma segunda lista no DNA |
| Textos de trabalho da próxima proposta | `commercial_profile.proposalTextDraft`; salvamento automático de cenário, foco e indicadores, inclusive resultados da IA |
| Propostas emitidas | Snapshots versionados em `proposal_versions`, preservados ao mudar o cadastro |
| Lembrete automático de nutrição | `crm_activities` identificado por `automation_key=LEAD_NURTURE` |
| Tarefa avulsa | `crm_activities.record_kind=TASK`, sem vínculo obrigatório |

O perfil prioritário descreve o cliente ideal do diagnóstico comercial. O catálogo de públicos permite vários segmentos detalhados para campanhas e conteúdo. Não são listas independentes do mesmo campo.

## Conversão e preservação

A identidade pode pertencer a um lead ou a um cliente, nunca aos dois simultaneamente. A conversão transfere a mesma linha. Consultas pelo lead convertido resolvem o cliente vinculado. Se o cliente já tiver identidade, seus dados confirmados prevalecem e os campos ausentes recebem os dados do lead. As propostas existentes conservam seus snapshots comerciais.

Atualizações parciais não apagam campos omitidos. O DNA só altera as propriedades enviadas; os textos de trabalho atualizam apenas sua chave JSON. A descrição já presente no DNA completo não é reenviada pelo painel inicial embutido nessa tela.

## IA e salvamento

Cliente ideal, objetivo comercial e escopo precisam estar preenchidos e salvos para gerar foco e indicadores. A IA recebe os dados do destinatário e deve respeitar os limites do escopo, sem prometer gravação, campanhas ou gestão ausentes. Melhorar a redação do cenário é uma operação separada, que preserva seu significado.

O formulário informa o salvamento automático dos textos e oferece nova tentativa em caso de falha. Eles podem ser consultados no painel de DNA do cadastro e restaurados ao abrir outra vez a criação da proposta. Salvar os textos não emite uma proposta e não modifica uma versão emitida.

## Migrações

- 037: tarefas avulsas e integridade dos vínculos comerciais.
- 038: identidade comercial desde o lead, transferência na conversão.
- 039: correção pontual dos saldos iniciais das duas contas, com auditoria e sem alterar saldo atual ou extrato.
- 040: recuperação de públicos antigos que não estavam no catálogo principal.

Os dados legados de públicos são conservados para histórico. A migração 040 recupera os que ainda não existem no catálogo, sem reativar públicos arquivados.
