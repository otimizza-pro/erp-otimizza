# Navegação e acompanhamento operacional

## Diagnóstico e decisões
- Separar navegação por responsabilidades, com os 12 grupos solicitados.
- Retirar atalhos duplicados de criação quando a listagem já oferece o botão correspondente.
- Reutilizar oportunidades, propostas, contratos, projetos, catálogo e templates existentes.
- Ex-cliente não equivale a cadastro arquivado. A listagem é derivada de contrato cancelado, sem nenhum contrato ativo; novos contratos ativos retiram o cliente dessa lista automaticamente.
- O cancelamento continua no contrato existente, com motivo e histórico. A ficha do cliente oferece o acesso Gerenciar / cancelar.
- Configurado e Em execução são estados distintos: a infraestrutura pode estar pronta sem a rotina estar rodando.

## Implementação
- Menu reorganizado; propostas junto de contratos, funis/etapas e catálogo em Configurações.
- Combos e categorias acessíveis dentro de Serviços. Rentabilidade permanece acessível dentro de Indicadores financeiros.
- Projetos respeitam o cliente selecionado, inclusive no formulário de criação.
- Social Media, Tráfego pago e WEB: novas rotas de acompanhamento operacional com tarefas por área e cliente, status e observações.
- Funis: checklist contextual para Aquisição, Nutrição, Conversão e Pós-venda.
- Dados dos checklists persistidos via API autenticada, validação de área e tarefa, consultas parametrizadas, vínculo referencial ao cliente e RLS sem política pública.
- Indicadores de Entrega usam projetos existentes, distinguindo concluídos, pendentes e atrasados. Não são contagem de peças ou tarefas.
- Performance sinaliza integrações futuras, sem resultados simulados.
- Corrigidos bloqueadores de tipos anteriores: formulário de lead, mapeamento de status, importações e método duplicado.

## Limites
- As novas áreas são acompanhamento manual de configuração e execução. Não implementam publicação social, calendário editorial com itens agendáveis, compra de domínio, painel de hospedagem, criação de sites ou gestão de anúncios por API.
- Não foram reescritos os cálculos do endpoint de métricas dos funis. Persistem os problemas da auditoria anterior sobre classificação histórica, períodos, contexto da empresa e retenção por contratos.
- A migração 025 precisa ser aplicada antes da gravação de checklists. Não foi aplicada nesta sessão: conexão Supabase indisponível por DNS no ambiente.
- Não houve validação visual em desktop/tablet/celular nem homologação do cancelamento contra banco real.

## Verificações
- npm run typecheck: aprovado.
- ESLint dos componentes, API, páginas e testes novos: aprovado.
- operations-checklists.test.ts: 5 testes aprovados (sessão, escopo de cliente, tarefas inválidas, escopo Otimizza e indisponibilidade do banco).
- Build padrão: falha interna do Turbopack ao iniciar processo de CSS.
- Build Webpack: bloqueado por EPERM ao criar diretórios, tanto em .next quanto em uma pasta isolada build/navigation-review. Build não aprovado.
- Verificados os 46 destinos do menu: todas as rotas existem (áreas operacionais atendidas pela rota dinâmica).
- Sem commit ou push.
