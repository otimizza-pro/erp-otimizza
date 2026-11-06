import { jsPDF } from "jspdf";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { StrategyDocumentRecord } from "./types";

export interface StrategyPdfExportOptions {
  document: StrategyDocumentRecord;
  includeCover?: boolean;
  includeTableOfContents?: boolean;
  selectedBlockIds?: string[];
  customTitle?: string;
  customSubtitle?: string;
  notes?: string;
}

export async function generateStrategyPdf(options: StrategyPdfExportOptions): Promise<Buffer> {
  const {
    document: docData,
    includeCover = true,
    selectedBlockIds,
    customTitle,
    customSubtitle,
  } = options;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  let logoBytes: Uint8Array | null = null;
  try {
    logoBytes = new Uint8Array(await readFile(path.join(process.cwd(), "public/brand/principal-cor.png")));
  } catch {
    // Logo opcional
  }

  // 1. CAPA PERSONALIZADA
  if (includeCover) {
    doc.setFillColor(6, 78, 59); // Verde Otimizza #064E3B
    doc.rect(0, 0, pageWidth, pageHeight, "F");

    if (logoBytes) {
      doc.addImage(logoBytes, "PNG", margin, 40, 50, 18);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    const titleLines = doc.splitTextToSize(customTitle || docData.title, contentWidth);
    doc.text(titleLines, margin, 120);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(13);
    doc.setTextColor(209, 250, 229);
    doc.text(customSubtitle || `Planejamento Estratégico & Gestão Otimizza`, margin, 120 + titleLines.length * 9 + 4);

    doc.setFontSize(10);
    doc.setTextColor(167, 243, 208);
    doc.text(`Data de Exportação: ${new Date().toLocaleDateString("pt-BR")}`, margin, 260);
    doc.text(`Versão: ${docData.currentVersion}.0 | Status: ${docData.status}`, margin, 266);

    doc.addPage();
  }

  // 2. CONTEÚDO SELECIONADO
  let currentY = 30;

  const drawHeader = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(5, 150, 105);
    doc.text("OTIMIZZA | GESTÃO ESTRATÉGICA E MARKETING", margin, 15);
    doc.setDrawColor(229, 231, 235);
    doc.line(margin, 18, pageWidth - margin, 18);
  };

  drawHeader();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  const docTitleLines = doc.splitTextToSize(docData.title, contentWidth);
  doc.text(docTitleLines, margin, currentY);
  currentY += docTitleLines.length * 7 + 4;

  if (docData.description) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    const descLines = doc.splitTextToSize(docData.description, contentWidth);
    doc.text(descLines, margin, currentY);
    currentY += descLines.length * 5 + 6;
  }

  for (const section of docData.sections || []) {
    const blocksToRender = section.blocks.filter((b) =>
      !selectedBlockIds || selectedBlockIds.includes(b.id)
    );

    if (blocksToRender.length === 0) continue;

    if (currentY > pageHeight - 40) {
      doc.addPage();
      drawHeader();
      currentY = 30;
    }

    // Barra da Seção
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, currentY, contentWidth, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(6, 78, 59);
    doc.text(section.title, margin + 3, currentY + 5.5);
    currentY += 12;

    for (const block of blocksToRender) {
      if (currentY > pageHeight - 35) {
        doc.addPage();
        drawHeader();
        currentY = 30;
      }

      // Título do Bloco e Classificação
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`${block.title} [${block.classification}]`, margin, currentY);
      currentY += 5;

      const content = block.content as any;

      if (block.blockType === "TABLE" && content?.columns && content?.rows) {
        const cols: string[] = content.columns;
        const colWidth = contentWidth / cols.length;

        // Cabeçalho da Tabela
        doc.setFillColor(5, 150, 105);
        doc.rect(margin, currentY, contentWidth, 6, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        cols.forEach((col, idx) => {
          doc.text(String(col), margin + idx * colWidth + 2, currentY + 4.2);
        });
        currentY += 7;

        // Linhas da Tabela
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(51, 65, 85);

        for (const row of content.rows as string[][]) {
          if (currentY > pageHeight - 25) {
            doc.addPage();
            drawHeader();
            currentY = 30;
          }
          row.forEach((cell, idx) => {
            const cellLines = doc.splitTextToSize(String(cell), colWidth - 4);
            doc.text(cellLines[0] || "", margin + idx * colWidth + 2, currentY + 3.5);
          });
          doc.setDrawColor(241, 245, 249);
          doc.line(margin, currentY + 5, pageWidth - margin, currentY + 5);
          currentY += 6;
        }
        currentY += 4;
      } else if (block.blockType === "LIST" && Array.isArray(content?.items)) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(51, 65, 85);
        for (const item of content.items) {
          if (currentY > pageHeight - 25) {
            doc.addPage();
            drawHeader();
            currentY = 30;
          }
          const itemLines = doc.splitTextToSize(`• ${item}`, contentWidth - 4);
          doc.text(itemLines, margin + 2, currentY);
          currentY += itemLines.length * 4.5;
        }
        currentY += 3;
      } else if (block.blockType === "CHECKLIST" && Array.isArray(content?.items)) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(51, 65, 85);
        for (const item of content.items) {
          if (currentY > pageHeight - 25) {
            doc.addPage();
            drawHeader();
            currentY = 30;
          }
          const check = item.done ? "[X]" : "[ ]";
          const checkLines = doc.splitTextToSize(`${check} ${item.task}`, contentWidth - 4);
          doc.text(checkLines, margin + 2, currentY);
          currentY += checkLines.length * 4.5;
        }
        currentY += 3;
      } else if (content?.text) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(51, 65, 85);
        const textLines = doc.splitTextToSize(String(content.text), contentWidth);
        for (const line of textLines) {
          if (currentY > pageHeight - 25) {
            doc.addPage();
            drawHeader();
            currentY = 30;
          }
          doc.text(line, margin, currentY);
          currentY += 4.5;
        }
        currentY += 3;
      } else if (content?.rangeMin !== undefined && content?.rangeMax !== undefined) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(51, 65, 85);
        doc.text(
          `Faixa: R$ ${content.rangeMin} a R$ ${content.rangeMax} (${content.observations || ""})`,
          margin,
          currentY
        );
        currentY += 6;
      }
    }
    currentY += 5;
  }

  return Buffer.from(doc.output("arraybuffer"));
}
