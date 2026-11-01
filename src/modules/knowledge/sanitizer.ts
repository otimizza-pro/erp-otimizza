import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitiza o HTML gerado pelo editor para evitar execução de scripts (XSS),
 * preservando formatações ricas, tabelas, blocos de código e imagens.
 */
export function sanitizeKnowledgeHtml(dirtyHtml: string): string {
  if (!dirtyHtml || typeof dirtyHtml !== "string") {
    return "";
  }

  try {
    return DOMPurify.sanitize(dirtyHtml, {
      ALLOWED_TAGS: [
        "h1", "h2", "h3", "h4", "h5", "h6",
        "p", "br", "hr",
        "strong", "b", "em", "i", "u", "s", "strike", "mark", "sub", "sup",
        "ul", "ol", "li",
        "blockquote", "pre", "code",
        "table", "thead", "tbody", "tfoot", "tr", "th", "td",
        "a", "img",
        "div", "span",
        "input" // Para checklists (type="checkbox", disabled)
      ],
      ALLOWED_ATTR: [
        "href", "target", "rel",
        "src", "alt", "title", "width", "height", "loading",
        "class", "id",
        "type", "checked", "disabled", // Para checklists
        "colspan", "rowspan", "scope" // Para tabelas
      ],
      ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
      FORBID_TAGS: ["script", "iframe", "object", "embed", "form", "style"],
      FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "style"]
    });
  } catch {
    return dirtyHtml
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "")
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, "")
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")
      .replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"');
  }
}

/**
 * Converte HTML rico estruturado para Markdown semântico determinístico
 * para ser consumido por ferramentas de IA e IAs externas em /contexto.md.
 */
export function htmlToMarkdown(html: string): string {
  if (!html || typeof html !== "string") return "";

  let md = html;

  // Normaliza quebras de linha
  md = md.replace(/\r\n/g, "\n");

  // Divisores
  md = md.replace(/<hr\s*\/?>/gi, "\n\n---\n\n");

  // Títulos
  md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "\n\n# $1\n\n");
  md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n\n## $1\n\n");
  md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "\n\n### $1\n\n");
  md = md.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, "\n\n#### $1\n\n");

  // Negrito e Itálico
  md = md.replace(/<(?:strong|b)>([\s\S]*?)<\/(?:strong|b)>/gi, "**$1**");
  md = md.replace(/<(?:em|i)>([\s\S]*?)<\/(?:em|i)>/gi, "*$1*");
  md = md.replace(/<(?:s|strike)>([\s\S]*?)<\/(?:s|strike)>/gi, "~~$1~~");

  // Blocos de código pre formatados
  md = md.replace(/<pre><code(?:\s+class="language-([^"]+)")?>([\s\S]*?)<\/code><\/pre>/gi, "\n\n```$1\n$2\n```\n\n");
  md = md.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, "`$1`");

  // Citações / Blockquotes
  md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (match, content) => {
    const cleaned = content.trim().replace(/<p[^>]*>/gi, "").replace(/<\/p>/gi, "\n");
    const lines = cleaned.split("\n").filter((l: string) => l.trim().length > 0);
    return "\n\n" + lines.map((l: string) => `> ${l.trim()}`).join("\n") + "\n\n";
  });

  // Imagens
  md = md.replace(/<img[^>]*src="([^"]+)"[^>]*alt="([^"]*)"[^>]*title="([^"]*)"[^>]*\/?>/gi, "\n\n![$2]($1 \"$3\")\n\n");
  md = md.replace(/<img[^>]*src="([^"]+)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, "\n\n![$2]($1)\n\n");
  md = md.replace(/<img[^>]*src="([^"]+)"[^>]*\/?>/gi, "\n\n![]($1)\n\n");

  // Links
  md = md.replace(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)");

  // Checklists
  md = md.replace(/<li[^>]*data-checked="true"[^>]*>([\s\S]*?)<\/li>/gi, "- [x] $1\n");
  md = md.replace(/<li[^>]*data-checked="false"[^>]*>([\s\S]*?)<\/li>/gi, "- [ ] $1\n");
  md = md.replace(/<li[^>]*><input[^>]*checked[^>]*>\s*([\s\S]*?)<\/li>/gi, "- [x] $1\n");
  md = md.replace(/<li[^>]*><input[^>]*>\s*([\s\S]*?)<\/li>/gi, "- [ ] $1\n");

  // Listas não ordenadas e ordenadas
  md = md.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "- $1\n");
  md = md.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, "\n\n$1\n\n");
  md = md.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, "\n\n$1\n\n");

  // Parágrafos
  md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "\n\n$1\n\n");
  md = md.replace(/<br\s*\/?>/gi, "  \n");

  // Tabelas
  md = md.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (match, tableBody) => {
    // Processamento de linhas de tabela
    const rows: string[][] = [];
    const trMatches = tableBody.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
    for (const tr of trMatches) {
      const cells: string[] = [];
      const cellMatches = tr[1].matchAll(/<(?:th|td)[^>]*>([\s\S]*?)<\/(?:th|td)>/gi);
      for (const cell of cellMatches) {
        cells.push(cell[1].replace(/<[^>]+>/g, "").trim());
      }
      if (cells.length > 0) {
        rows.push(cells);
      }
    }

    if (rows.length === 0) return "";

    const colCount = Math.max(...rows.map(r => r.length));
    let tableMd = "\n\n";

    // Cabeçalho
    const headerRow = rows[0];
    tableMd += "| " + headerRow.map(c => c || " ").join(" | ") + " |\n";
    tableMd += "| " + Array(colCount).fill("---").join(" | ") + " |\n";

    // Linhas de dados
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      while (row.length < colCount) row.push("");
      tableMd += "| " + row.map(c => c || " ").join(" | ") + " |\n";
    }

    return tableMd + "\n\n";
  });

  // Remove tags remanescentes
  md = md.replace(/<[^>]+>/g, "");

  // Decodifica entidades HTML básicas
  md = md
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");

  // Normaliza espaços em branco e quebras excessivas
  md = md.replace(/\n{3,}/g, "\n\n").trim();

  return md;
}
