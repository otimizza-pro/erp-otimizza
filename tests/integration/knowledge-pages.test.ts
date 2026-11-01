import { describe, it, expect, beforeAll } from "vitest";
import { query } from "@/lib/db/pool";
import {
  ensureInitialStructure,
  listAdminPages,
  createPage,
  getAdminPageById,
  updatePage,
  publishPage,
  unpublishPage,
  archivePage,
  restorePage,
  duplicatePage,
  validateNoCycle,
  getPageVersions,
  restorePageVersion,
  getPublicPageBySlug,
  getPublicTree,
  getConsolidatedDocument,
  getConsolidatedMarkdown,
  searchPublicPages
} from "../../src/modules/knowledge/service";

describe("Módulo Informações da Otimizza (Testes de Integração no Banco de Dados)", () => {
  beforeAll(async () => {
    // Garante que o banco de testes tem as páginas iniciais
    await ensureInitialStructure();
  });

  it("semeia a estrutura inicial de 9 páginas como rascunhos (DRAFT)", async () => {
    const pages = await listAdminPages({ status: "ALL" });
    expect(pages.length).toBeGreaterThanOrEqual(9);

    const slugs = pages.map(p => p.slug);
    expect(slugs).toContain("essencia-da-marca");
    expect(slugs).toContain("posicionamento-e-diferenciais");
    expect(slugs).toContain("publico-e-perfis-de-clientes");
    expect(slugs).toContain("servicos-e-ofertas");
    expect(slugs).toContain("tom-de-voz-e-comunicacao");
    expect(slugs).toContain("identidade-visual");
    expect(slugs).toContain("estrategia-de-conteudo");
    expect(slugs).toContain("objetivos-e-prioridades");
    expect(slugs).toContain("decisoes-e-aprendizados");

    // Devem ser criadas inicialmente como rascunho (DRAFT)
    const essencia = pages.find(p => p.slug === "essencia-da-marca")!;
    expect(essencia.status).toBe("DRAFT");
    expect(essencia.published_content_html).toBeNull();
  });

  it("cria nova página com metadados e slug único", async () => {
    const unique = Date.now().toString().slice(-6);
    const newPage = await createPage({
      title: `Diretriz de Segurança ${unique}`,
      summary: "Princípios de segurança da informação e privacidade",
      info_type: "DIRECTIVE",
      tags: ["segurança", "lgpd", "dados"],
      draft_content_html: "<h1>Segurança</h1><p>Diretrizes de proteção e isolamento de dados.</p>"
    });

    expect(newPage).toBeDefined();
    expect(newPage.id).toBeDefined();
    expect(newPage.slug).toContain("diretriz-de-seguranca");
    expect(newPage.status).toBe("DRAFT");
    expect(newPage.info_type).toBe("DIRECTIVE");
    expect(newPage.tags).toContain("segurança");

    // Histórico de versões deve registrar v1
    const { versions } = await getPageVersions(newPage.id);
    expect(versions.length).toBe(1);
    expect(versions[0].version_number).toBe(1);
  });

  it("cria subpágina e previne ciclos na hierarquia", async () => {
    const unique = Date.now().toString().slice(-6);
    const parentPage = await createPage({
      title: `Pai Hierárquico ${unique}`,
      info_type: "DIRECTIVE"
    });

    const childPage = await createPage({
      title: `Filho Hierárquico ${unique}`,
      parent_id: parentPage.id,
      info_type: "HYPOTHESIS"
    });

    expect(childPage.parent_id).toBe(parentPage.id);

    // Tentativa 1: definir o pai como ele mesmo deve falhar
    await expect(validateNoCycle(parentPage.id, parentPage.id)).rejects.toThrow(
      "Uma página não pode ser pai de si mesma"
    );

    // Tentativa 2: definir o pai do pai como o filho (criando ciclo) deve falhar
    await expect(validateNoCycle(parentPage.id, childPage.id)).rejects.toThrow(
      /ciclo hierárquico/i
    );
  });

  it("salvar rascunho NÃO altera a versão pública externa", async () => {
    const unique = Date.now().toString().slice(-6);
    const page = await createPage({
      title: `Página com Publicação ${unique}`,
      draft_content_html: "<h1>Conteúdo Versão 1</h1><p>Texto inicial.</p>"
    });

    // Publica a página
    const published = await publishPage(page.id);
    expect(published.status).toBe("PUBLISHED");
    expect(published.published_content_html).toContain("Conteúdo Versão 1");

    // Edita o rascunho sem publicar
    const updatedDraft = await updatePage(page.id, {
      draft_content_html: "<h1>Conteúdo Versão 2 (RASCUNHO)</h1><p>Texto modificado.</p>"
    });

    expect(updatedDraft.has_unpublished_changes).toBe(true);
    expect(updatedDraft.draft_content_html).toContain("Conteúdo Versão 2 (RASCUNHO)");

    // Consulta externa pública deve continuar entregando a Versão 1 publicada!
    const { page: publicPage } = await getPublicPageBySlug(page.slug);
    expect(publicPage).toBeDefined();
    expect(publicPage?.content_html).toContain("Conteúdo Versão 1");
    expect(publicPage?.content_html).not.toContain("Versão 2 (RASCUNHO)");
  });

  it("despublicar uma página pai remove ela e suas subpáginas da leitura externa", async () => {
    const unique = Date.now().toString().slice(-6);

    const parent = await createPage({
      title: `Pai Para Despublicar ${unique}`,
      draft_content_html: "<p>Conteúdo do pai</p>"
    });
    await publishPage(parent.id);

    const child = await createPage({
      title: `Filho Para Despublicar ${unique}`,
      parent_id: parent.id,
      draft_content_html: "<p>Conteúdo do filho</p>"
    });
    await publishPage(child.id);

    // Ambos estão públicos inicialmente
    const checkParent1 = await getPublicPageBySlug(parent.slug);
    const checkChild1 = await getPublicPageBySlug(child.slug);
    expect(checkParent1.page).not.toBeNull();
    expect(checkChild1.page).not.toBeNull();

    // Despublica o pai
    await unpublishPage(parent.id);

    // Ambos agora devem sumir da leitura externa!
    const checkParent2 = await getPublicPageBySlug(parent.slug);
    const checkChild2 = await getPublicPageBySlug(child.slug);
    expect(checkParent2.page).toBeNull();
    expect(checkChild2.page).toBeNull();
  });

  it("restaura versão histórica anterior como rascunho atual", async () => {
    const unique = Date.now().toString().slice(-6);
    const page = await createPage({
      title: `Página Versionada ${unique}`,
      draft_content_html: "<p>Versão Original v1</p>"
    });

    // Faz atualização para criar v2
    await updatePage(page.id, {
      draft_content_html: "<p>Versão Modificada v2</p>"
    });

    const { versions } = await getPageVersions(page.id);
    expect(versions.length).toBeGreaterThanOrEqual(2);

    // Restaura a v1
    const restored = await restorePageVersion(page.id, 1);
    expect(restored.draft_content_html).toContain("Versão Original v1");
  });

  it("gera redirecionamento transparente quando o slug é alterado", async () => {
    const unique = Date.now().toString().slice(-6);
    const page = await createPage({
      title: `Título Inicial ${unique}`,
      slug: `slug-antigo-${unique}`,
      draft_content_html: "<p>Texto da página</p>"
    });
    await publishPage(page.id);

    // Altera o slug para um novo
    await updatePage(page.id, {
      slug: `slug-novo-${unique}`
    });

    // Consulta pelo slug antigo deve retornar redirectSlug!
    const res = await getPublicPageBySlug(`slug-antigo-${unique}`);
    expect(res.page).toBeNull();
    expect(res.redirectSlug).toBe(`slug-novo-${unique}`);
  });

  it("gera documento consolidado e Markdown para IA externa sem dependência de JavaScript", async () => {
    const unique = Date.now().toString().slice(-6);
    const page = await createPage({
      title: `Regra de Negócio Consolidada ${unique}`,
      summary: "Resumo para a IA externa",
      info_type: "DIRECTIVE",
      tags: ["ia", "contexto", "diretriz"],
      draft_content_html: `
        <h1>Arquitetura Financeira</h1>
        <p>Valores monetários são processados em centavos inteiros.</p>
        <table>
          <tr><th>Regra</th><th>Valor</th></tr>
          <tr><td>Centavos</td><td>safeCents</td></tr>
        </table>
      `
    });
    await publishPage(page.id);

    // Documento consolidado
    const doc = await getConsolidatedDocument();
    expect(doc.pages_count).toBeGreaterThan(0);
    expect(doc.generated_at).toBeDefined();

    const targetPage = doc.all_published_pages.find(p => p.id === page.id);
    expect(targetPage).toBeDefined();
    expect(targetPage?.title).toContain(unique);
    expect(targetPage?.content_html).toContain("Arquitetura Financeira");

    // Markdown consolidado
    const md = await getConsolidatedMarkdown();
    expect(md).toContain("# Manual Vivo da Estratégia e Identidade — Otimizza ERP");
    expect(md).toContain("## Índice Geral da Documentação");
    expect(md).toContain(`Regra de Negócio Consolidada ${unique}`);
    expect(md).toContain("DIRETRIZ APROVADA");
    expect(md).toContain("| Regra | Valor |");
  });

  it("executa busca rápida somente no conteúdo publicado", async () => {
    const unique = Date.now().toString().slice(-6);
    const page = await createPage({
      title: `TermoExclusivo${unique}`,
      summary: "Busca pública de estratégia",
      draft_content_html: `<p>Conteúdo com a palavra chave PalavraChave${unique} publicado.</p>`
    });
    await publishPage(page.id);

    const results = await searchPublicPages(`TermoExclusivo${unique}`);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].slug).toBe(page.slug);
  });
});
