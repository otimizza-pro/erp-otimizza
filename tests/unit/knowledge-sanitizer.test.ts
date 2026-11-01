import { describe, it, expect } from "vitest";
import { sanitizeKnowledgeHtml, htmlToMarkdown } from "../../src/modules/knowledge/sanitizer";
import { generateSlug } from "../../src/modules/knowledge/service";

describe("Knowledge Base: Sanitizer & Markdown Converter (Unit Tests)", () => {
  it("remove scripts e atributos maliciosos mantendo formatação rica segura", () => {
    const dirty = `
      <h1>Título Seguro</h1>
      <script>alert('xss')</script>
      <p onclick="stealCookies()">Parágrafo com texto <strong onmouseover="hack()">em negrito</strong>.</p>
      <img src="https://otimizza.com.br/logo.png" onerror="alert('hack')" alt="Logo" />
      <a href="javascript:alert('malicioso')">Link Perigoso</a>
      <a href="https://otimizza.com.br">Link Seguro</a>
    `;

    const clean = sanitizeKnowledgeHtml(dirty);

    expect(clean).not.toContain("<script>");
    expect(clean).not.toContain("alert(");
    expect(clean).not.toContain("onclick");
    expect(clean).not.toContain("onmouseover");
    expect(clean).not.toContain("onerror");
    expect(clean).not.toContain("javascript:");
    expect(clean).toContain("<h1>Título Seguro</h1>");
    expect(clean).toContain("<strong>em negrito</strong>");
    expect(clean).toContain('href="https://otimizza.com.br"');
    expect(clean).toContain('alt="Logo"');
  });

  it("converte HTML com títulos, parágrafos, listas e ênfases em Markdown determinístico", () => {
    const html = `
      <h1>Posicionamento de Mercado</h1>
      <p>A Otimizza é especialista em <strong>gestão financeira</strong> e <em>eficiência operacional</em>.</p>
      <h2>Pilares Estratégicos</h2>
      <ul>
        <li>Previsibilidade de Caixa</li>
        <li>Idempotência nos Lançamentos</li>
      </ul>
      <blockquote>Qualidade inegociável nos dados financeiros.</blockquote>
    `;

    const md = htmlToMarkdown(html);

    expect(md).toContain("# Posicionamento de Mercado");
    expect(md).toContain("**gestão financeira**");
    expect(md).toContain("*eficiência operacional*");
    expect(md).toContain("## Pilares Estratégicos");
    expect(md).toContain("- Previsibilidade de Caixa");
    expect(md).toContain("- Idempotência nos Lançamentos");
    expect(md).toContain("> Qualidade inegociável nos dados financeiros.");
  });

  it("converte tabelas HTML em tabelas Markdown com alinhamento e divisores", () => {
    const tableHtml = `
      <table>
        <thead>
          <tr>
            <th>Segmento</th>
            <th>Faturamento Médio</th>
            <th>Maturidade</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Serviços B2B</td>
            <td>R$ 100k - R$ 500k</td>
            <td>Intermediária</td>
          </tr>
          <tr>
            <td>Agências e Tecnologia</td>
            <td>R$ 50k - R$ 200k</td>
            <td>Digital</td>
          </tr>
        </tbody>
      </table>
    `;

    const md = htmlToMarkdown(tableHtml);

    expect(md).toContain("| Segmento | Faturamento Médio | Maturidade |");
    expect(md).toContain("| --- | --- | --- |");
    expect(md).toContain("| Serviços B2B | R$ 100k - R$ 500k | Intermediária |");
    expect(md).toContain("| Agências e Tecnologia | R$ 50k - R$ 200k | Digital |");
  });

  it("converte imagens com alt e legenda para sintaxe Markdown", () => {
    const imgHtml = `<p><img src="/api/knowledge/files/abc-123" alt="Organograma" title="Estrutura 2026" /></p>`;
    const md = htmlToMarkdown(imgHtml);

    expect(md).toContain('![Organograma](/api/knowledge/files/abc-123 "Estrutura 2026")');
  });

  it("converte checklists / task items para sintaxe de markdown - [x] e - [ ]", () => {
    const listHtml = `
      <ul>
        <li data-checked="true">Definir proposta de valor</li>
        <li data-checked="false">Mapear matriz de objeções</li>
      </ul>
    `;
    const md = htmlToMarkdown(listHtml);

    expect(md).toContain("- [x] Definir proposta de valor");
    expect(md).toContain("- [ ] Mapear matriz de objeções");
  });

  it("gera slugs sanitizados sem caracteres especiais nem acentos", () => {
    expect(generateSlug("Essência da Marca & Visão")).toBe("essencia-da-marca-visao");
    expect(generateSlug("Público-Alvo: PME / B2B (2026)")).toBe("publico-alvo-pme-b2b-2026");
    expect(generateSlug("---Atenção: Teste de Acentosção---")).toBe("atencao-teste-de-acentoscao");
  });
});
