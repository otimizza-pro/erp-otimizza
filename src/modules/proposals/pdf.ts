import { jsPDF } from "jspdf";
import { ProposalRecord, ProposalVersionRecord } from "./types";

function formatCurrency(val: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(val || 0);
}

function formatDateBr(isoStr?: string | null): string {
  if (!isoStr) return "-";
  const datePart = isoStr.slice(0, 10);
  const parts = datePart.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return datePart;
}

function getPeriodicityLabel(p: string): string {
  switch (p) {
    case "MONTHLY":
      return "Mensal";
    case "YEARLY":
      return "Anual";
    case "ONE_TIME":
      return "Avulso / Setup";
    default:
      return p;
  }
}

export async function generateProposalPdf(
  proposal: ProposalRecord,
  version?: ProposalVersionRecord
): Promise<Buffer> {
  const currentVersion = version || proposal.currentVersion;
  if (!currentVersion) {
    throw new Error("Nenhuma versão de proposta disponível para geração do documento PDF.");
  }

  // Criar documento A4 em milímetros
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // 1. Cabeçalho Corporativo
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(margin, y, contentWidth, 22, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("OTIMIZZA ERP", margin + 6, y + 9);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("PROPOSTA COMERCIAL & ESCOPO DE SERVIÇOS", margin + 6, y + 16);

  // Código e Versão no canto direito do cabeçalho
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  const codeText = `${proposal.proposalCode} (v${currentVersion.versionNumber})`;
  doc.text(codeText, pageWidth - margin - 6, y + 10, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Emissão: ${formatDateBr(currentVersion.createdAt)}`, pageWidth - margin - 6, y + 16, {
    align: "right",
  });

  y += 28;

  // 2. Destinatário e Validade
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(margin, y, contentWidth, 26, 2, 2, "FD");

  const rec = currentVersion?.recipientSnapshot || {
    name: proposal.recipientName || "Cliente / Prospect",
    document: proposal.recipientDocument,
    email: undefined,
    phone: undefined,
  };
  doc.setTextColor(30, 41, 59); // slate-800
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("DESTINATÁRIO", margin + 5, y + 6);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(rec.name || "Cliente / Prospect", margin + 5, y + 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const docText = rec.document ? `CPF/CNPJ: ${rec.document}` : "";
  const contactText = [rec.email, rec.phone].filter(Boolean).join("  |  ");
  doc.text(docText, margin + 5, y + 17);
  doc.text(contactText, margin + 5, y + 22);

  // Validade e Prazo
  doc.setFont("helvetica", "bold");
  doc.text("CONDIÇÕES DE VALIDADE", margin + contentWidth - 5, y + 6, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.text(`Válida até: ${formatDateBr(proposal.validUntil)}`, margin + contentWidth - 5, y + 12, {
    align: "right",
  });
  if (currentVersion.commercialTermsSnapshot.startLeadTimeDays) {
    doc.text(
      `Início estimado: ${currentVersion.commercialTermsSnapshot.startLeadTimeDays} dias úteis`,
      margin + contentWidth - 5,
      y + 17,
      { align: "right" }
    );
  }

  y += 32;

  // 3. Título e Escopo
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(proposal.title, margin, y);
  y += 6;

  if (currentVersion.commercialTermsSnapshot.scopeDescription) {
    doc.setTextColor(71, 85, 105); // slate-600
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    const splitScope = doc.splitTextToSize(
      currentVersion.commercialTermsSnapshot.scopeDescription,
      contentWidth
    );
    doc.text(splitScope, margin, y);
    y += splitScope.length * 4.5 + 4;
  } else {
    y += 2;
  }

  // 4. Tabela de Itens e Serviços
  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(margin, y, contentWidth, 7, "F");

  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);

  const colX = {
    item: margin + 3,
    period: margin + 85,
    qty: margin + 115,
    unit: margin + 130,
    disc: margin + 150,
    total: margin + contentWidth - 3,
  };

  doc.text("ITEM / SERVIÇO CONTRATADO", colX.item, y + 4.8);
  doc.text("PERIODICIDADE", colX.period, y + 4.8);
  doc.text("QTD", colX.qty, y + 4.8);
  doc.text("VALOR UNIT.", colX.unit, y + 4.8);
  doc.text("DESC.", colX.disc, y + 4.8);
  doc.text("TOTAL LÍQUIDO", colX.total, y + 4.8, { align: "right" });

  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  const items = currentVersion.items || [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    // Se passar do limite da página, cria nova página
    if (y > pageHeight - 45) {
      doc.addPage();
      y = margin;
    }

    if (i % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y - 1, contentWidth, 7.5, "F");
    }

    doc.setTextColor(15, 23, 42);
    const itemName = it.descriptionSnapshot || (it.comboName ? `${it.serviceName || "Componente"} (${it.comboName})` : it.serviceName) || "Serviço";
    const truncatedName = itemName.length > 45 ? `${itemName.slice(0, 42)}...` : itemName;

    doc.text(truncatedName, colX.item, y + 4);
    doc.text(getPeriodicityLabel(it.periodicity), colX.period, y + 4);
    doc.text(String(it.quantity), colX.qty, y + 4);
    doc.text(formatCurrency(it.negotiatedUnitPrice), colX.unit, y + 4);
    doc.text(it.discountAmount > 0 ? formatCurrency(it.discountAmount) : "-", colX.disc, y + 4);
    doc.text(formatCurrency(it.totalAmount), colX.total, y + 4, { align: "right" });

    y += 7.5;
  }

  y += 6;

  // 5. Bloco de Totais Segregados por Periodicidade
  if (y > pageHeight - 65) {
    doc.addPage();
    y = margin;
  }

  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin + 75, y, contentWidth - 75, 34, 2, 2, "FD");

  let totalY = y + 7;
  doc.setFontSize(8.5);

  if (currentVersion.totalOneTimeEffective > 0) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text("Total Implantação / Setup (Avulso):", margin + 80, totalY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(formatCurrency(currentVersion.totalOneTimeEffective), margin + contentWidth - 6, totalY, {
      align: "right",
    });
    totalY += 6;
  }

  if (currentVersion.totalMonthlyEffective > 0) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text("Total Recorrência Mensal:", margin + 80, totalY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(5, 150, 105); // emerald-600
    doc.text(
      `${formatCurrency(currentVersion.totalMonthlyEffective)} / mês`,
      margin + contentWidth - 6,
      totalY,
      { align: "right" }
    );
    totalY += 6;
  }

  if (currentVersion.totalYearlyEffective > 0) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text("Total Recorrência Anual:", margin + 80, totalY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(
      `${formatCurrency(currentVersion.totalYearlyEffective)} / ano`,
      margin + contentWidth - 6,
      totalY,
      { align: "right" }
    );
    totalY += 6;
  }

  if (currentVersion.discountTotal > 0) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(225, 29, 72); // rose-600
    doc.text(
      `Desconto Total Aplicado: - ${formatCurrency(currentVersion.discountTotal)}`,
      margin + contentWidth - 6,
      totalY,
      { align: "right" }
    );
  }

  y += 40;

  // 6. Condições Comerciais & Pagamento
  if (y > pageHeight - 55) {
    doc.addPage();
    y = margin;
  }

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text("CONDIÇÕES COMERCIAIS & FORMA DE PAGAMENTO", margin, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);

  const paymentTerms =
    currentVersion.commercialTermsSnapshot.paymentTerms ||
    "Vencimento padrão conforme contratação formal. Pagamento via boleto bancário ou PIX.";
  const splitTerms = doc.splitTextToSize(paymentTerms, contentWidth);
  doc.text(splitTerms, margin, y);
  y += splitTerms.length * 4.5 + 4;

  if (currentVersion.commercialTermsSnapshot.clientNotes) {
    const notes = `Observações: ${currentVersion.commercialTermsSnapshot.clientNotes}`;
    const splitNotes = doc.splitTextToSize(notes, contentWidth);
    doc.text(splitNotes, margin, y);
    y += splitNotes.length * 4.5 + 4;
  }

  // 7. Campo de Assinatura / Aceite Formal
  if (y > pageHeight - 40) {
    doc.addPage();
    y = margin + 10;
  } else {
    y += 8;
  }

  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y, margin + 80, y);
  doc.line(margin + 95, y, margin + contentWidth, y);

  doc.setFontSize(7.5);
  doc.text("Otimizza Propostas & Soluções", margin, y + 4);
  doc.text("De Acordo / Aceite do Cliente", margin + 95, y + 4);

  // 8. Rodapé em todas as páginas
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(
      `Otimizza ERP • Proposta Comercial Confidencial • Documento Gerado em ${new Date().toLocaleDateString("pt-BR")}`,
      margin,
      pageHeight - 8
    );
    doc.text(`Página ${p} de ${totalPages}`, pageWidth - margin, pageHeight - 8, {
      align: "right",
    });
  }

  // Retornar Buffer Node.js
  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}
