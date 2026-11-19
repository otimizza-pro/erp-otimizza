export interface CreationField {
  key: string;
  label: string;
  required?: boolean;
  multiline?: boolean;
  placeholder?: string;
}
interface CreationArea {
  title: string;
  description: string;
  group: "ads" | "web";
  outputs: string[];
  fields: CreationField[];
  instruction: string;
}
export const creationAreas: Record<string, CreationArea> = {
  "meta-ads": {
    title: "Anúncios Meta Ads", group: "ads",
    description: "Crie campanhas, conjuntos, textos de anúncios e direções para os criativos.",
    outputs: ["Estrutura da campanha", "Textos de anúncios", "Briefing de criativos e roteiros", "Plano de testes"],
    fields: [
      {key:"offer",label:"Oferta ou serviço anunciado",required:true,multiline:true},
      {key:"objective",label:"Objetivo e conversão desejada",required:true,placeholder:"WhatsApp, leads, vendas, reconhecimento..."},
      {key:"region",label:"Região atendida",required:true},
      {key:"budget",label:"Orçamento disponível",placeholder:"Ex.: R$ 30 por dia; ou ainda não definido"},
      {key:"destination",label:"Destino e link confirmado"},
      {key:"assets",label:"Materiais e provas disponíveis",multiline:true},
    ],
    instruction: "Organize campanha > conjuntos > anúncios por objetivo, público, oferta e região. Entregue textos principais, títulos, CTAs, direção de criativos, roteiros, hipóteses de testes e mensuração. Distribua apenas o orçamento informado. Não invente interesses disponíveis, públicos estimados, métricas ou projeções de resultado. Não proponha segmentação por atributos pessoais sensíveis. Não afirme que uma campanha foi criada ou publicada no Meta.",
  },
  "google-ads": {
    title:"Anúncios Google Ads",group:"ads",
    description:"Monte campanhas de pesquisa, grupos, palavras-chave e variações de anúncios.",
    outputs:["Estrutura da campanha de pesquisa","Palavras-chave e negativas","Textos e recursos de anúncios","Plano de conversões e testes"],
    fields:[{key:"offer",label:"Produto ou serviço anunciado",required:true,multiline:true},{key:"objective",label:"Conversão desejada",required:true},{key:"region",label:"Cidades e área de atendimento",required:true},{key:"destination",label:"Página de destino"},{key:"budget",label:"Orçamento disponível"},{key:"exclusions",label:"O que a empresa não atende",multiline:true}],
    instruction:"Estruture campanhas e grupos por intenção de busca; proponha palavras-chave, correspondências, negativas, textos de anúncios responsivos e recursos complementares. Relacione anúncio e página de destino. Não invente volume de busca, CPC, concorrência ou recursos disponíveis. Sugestões de palavras-chave não são pesquisa realizada em ferramenta externa. Entregue conteúdo para revisão no editor, sem afirmar publicação ou configuração real.",
  },
  "landing-pages": {
    title:"Landing Pages",group:"web",
    description:"Crie copy, estrutura e uma página HTML para revisar antes de implementar.",
    outputs:["Estrutura e copy completa","Página HTML para revisar","Variações de headline e CTA","Briefing de layout e conversão"],
    fields:[{key:"offer",label:"Oferta principal",required:true,multiline:true},{key:"objective",label:"Ação desejada",required:true},{key:"destination",label:"Link confirmado do CTA"},{key:"proof",label:"Provas, diferenciais e condições comprovados",multiline:true},{key:"visual",label:"Paleta, fontes e referências visuais",multiline:true}],
    instruction:"Crie hero, proposta de valor, benefícios, oferta, como funciona, diferenciais comprovados, objeções, FAQ e CTA. Para HTML, gere documento completo responsivo com CSS incorporado, hierarquia visual profissional e navegação por âncoras. Não invente depoimentos, garantias, preços, contatos ou imagens. Links faltantes devem ser explicitados como pendências. Sem scripts, bibliotecas, trackers ou recursos externos. Formulários sem integração não podem simular envio ou sucesso. Não afirme que a página foi publicada.",
  },
  websites: {
    title:"Sites Institucionais",group:"web",
    description:"Desenvolva a arquitetura, os textos e um protótipo visual para o site da empresa.",
    outputs:["Mapa do site e conteúdo por página","Protótipo HTML institucional","Textos institucionais e serviços","Briefing de desenvolvimento"],
    fields:[{key:"services",label:"Serviços e áreas do site",required:true,multiline:true},{key:"objective",label:"Objetivo do site",required:true},{key:"pages",label:"Páginas desejadas"},{key:"visual",label:"Identidade visual e referências",multiline:true},{key:"contacts",label:"Contatos e links públicos confirmados",multiline:true}],
    instruction:"Defina arquitetura, navegação e objetivo de cada página; escreva textos institucionais e de serviços específicos à marca. Para protótipo HTML entregue arquivo único responsivo, seções completas e âncoras funcionais; explique que não é projeto multiarquivo publicado. Sem scripts, trackers, recursos externos, provas ou dados inventados. Mostre pendências de implementação e integração sem substituir a entrega por um gerenciador de tarefas.",
  },
  "google-business": {
    title:"Google Meu Negócio",group:"web",
    description:"Prepare a descrição, os serviços, produtos, posts e respostas do Perfil da Empresa.",
    outputs:["Configuração e textos do perfil","Descrição da empresa","Produtos e serviços","Posts e respostas a avaliações"],
    fields:[{key:"services",label:"Produtos e serviços",required:true,multiline:true},{key:"businessType",label:"Forma de atendimento",required:true,placeholder:"Local presencial, área de serviço ou ambos"},{key:"region",label:"Endereço público ou área atendida",multiline:true},{key:"schedule",label:"Horários confirmados"},{key:"review",label:"Avaliação ou publicação a trabalhar",multiline:true}],
    instruction:"Crie textos prontos para copiar: descrição, serviços, produtos com dados reais, posts e respostas a avaliações fornecidas. Categorias são sugestões que precisam ser verificadas no catálogo oficial. Não invente endereço, horários, preços, avaliações ou propriedade verificada. Não use palavras-chave artificiais no nome nem prometa posicionamento. Não afirme alteração real no perfil externo.",
  },
  search: {
    title:"SEO, AEO, GEO, SXO",group:"web",
    description:"Crie estratégias, conteúdos, metadados e especificações para buscas e conversão.",
    outputs:["Estratégia de SEO, AEO, GEO e SXO","Títulos e descrições SEO","FAQ e conteúdos para busca","Especificações de dados estruturados"],
    fields:[{key:"site",label:"Site ou páginas trabalhadas",required:true},{key:"topics",label:"Serviços, temas e buscas prioritárias",required:true,multiline:true},{key:"region",label:"Região e idioma"},{key:"evidence",label:"Conteúdo, HTML ou relatórios disponíveis",multiline:true},{key:"priority",label:"Prioridade da solicitação"}],
    instruction:"Diferencie SEO, AEO, GEO e SXO. Entregue intenção de busca, estrutura, títulos, descrições, headings, FAQ, pautas e especificações de marcação baseadas em fatos. Uma URL fornecida não significa que foi acessada: sem HTML ou relatórios, apresente proposta e hipóteses, nunca uma auditoria executada. Não invente erros, métricas, posições, backlinks, Core Web Vitals ou resultados de indexação. Não prometa posições ou menção em IA. Marcação deve refletir conteúdo visível e fatos reais.",
  },
  domains: {
    title:"Domínios",group:"web",
    description:"Explore nomes e prepare orientações de DNS com os dados do provedor.",
    outputs:["Sugestões de nomes de domínio","Plano de DNS","Revisão de registros fornecidos"],
    fields:[{key:"brand",label:"Marca ou domínio atual",required:true},{key:"purpose",label:"Uso pretendido",required:true},{key:"extensions",label:"Extensões preferidas"},{key:"records",label:"Registros públicos e destinos fornecidos pelo provedor",multiline:true}],
    instruction:"Sugira nomes coerentes com marca e uso. Não declare disponibilidade, registro ou direitos de marca sem consulta. Em DNS, utilize exclusivamente destinos fornecidos: nunca invente IP, MX, CNAME, DKIM ou tokens. Explique opções e pendências sem afirmar alterações executadas. Não peça senhas ou credenciais.",
  },
  hosting: {
    title:"Hospedagem",group:"web",
    description:"Prepare a arquitetura e as instruções de publicação adequadas ao site.",
    outputs:["Arquitetura e configuração","Publicação, SSL e cache","Backup e recuperação","Análise de erro fornecido"],
    fields:[{key:"stack",label:"Tecnologia do site",required:true},{key:"provider",label:"Provedor ou servidor disponível",required:true},{key:"domain",label:"Domínio"},{key:"requirements",label:"Necessidades e limites",multiline:true},{key:"evidence",label:"Configuração ou erro atual",multiline:true}],
    instruction:"Crie arquitetura e orientações compatíveis com a tecnologia e o provedor informados. Exemplos técnicos precisam de dados suficientes e versão identificada. Explique variáveis sem valores secretos, SSL, cache e recuperação. Não invente capacidade, preços ou destinos DNS; não proponha comandos destrutivos nem afirme acesso ou execução no servidor. Destaque documentação do provedor a validar quando necessário.",
  },
  "web-settings": {
    title:"Outras Configurações",group:"web",
    description:"Crie planos de mensuração e especificações de Analytics, tags e performance.",
    outputs:["Plano de mensuração","Eventos e tags","Configuração orientada","Análise de dados fornecidos"],
    fields:[{key:"platform",label:"Ferramenta ou assunto",required:true,placeholder:"GA4, GTM, eventos, performance, formulários..."},{key:"site",label:"Site e tecnologia",required:true},{key:"objective",label:"O que medir ou configurar",required:true,multiline:true},{key:"evidence",label:"Dados, código ou erro disponível",multiline:true},{key:"consent",label:"Consentimento e privacidade",multiline:true}],
    instruction:"Entregue objetivos, eventos, parâmetros, gatilhos, nomenclatura e validação. Evite dados pessoais em URLs e eventos; considere consentimento informado. Não invente IDs GA4/GTM, contas conectadas ou performance medida. Não declare tags configuradas ou ativas. Com dados insuficientes indique precisamente o que falta.",
  },
};
export function isCreationArea(area: string) { return Object.hasOwn(creationAreas, area); }
