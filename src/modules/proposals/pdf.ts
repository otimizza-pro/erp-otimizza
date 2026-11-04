import { jsPDF } from "jspdf";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ProposalRecord, ProposalVersionRecord } from "./types";
import { emptyPresentation, serviceIcons } from "@/modules/catalog/presentation";
import { HOW_WE_WORK_STEPS } from "./constants";

const currency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

const date = (value?: string | null) =>
  value ? value.slice(0, 10).split("-").reverse().join("/") : "A combinar";

const period = (value: string) =>
  ({ MONTHLY: "Mensal", YEARLY: "Anual", ONE_TIME: "Avulso / Setup" }[value] || value);

export async function generateProposalPdf(
  proposal: ProposalRecord,
  version?: ProposalVersionRecord
): Promise<Buffer> {
  const current = version || proposal.currentVersion;
  if (!current) {
    throw new Error("Nenhuma versão de proposta disponível para geração do documento PDF.");
  }

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: false });
  doc.setProperties({ title: proposal.title, author: "Otimizza", subject: "Proposta Comercial" });

  const width = 297,
    height = 210,
    margin = 20,
    bottom = 183;

  const logo = new Uint8Array(await readFile(path.join(process.cwd(), "public/brand/principal-negativa.png")));
  const darkLogo = new Uint8Array(await readFile(path.join(process.cwd(), "public/brand/principal-cor.png")));

  let y = 0;
  let sectionNumber = 0;

  const text = (
    content: string,
    x: number,
    at: number,
    size = 11,
    bold = false,
    color = "#343b47"
  ) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(color);
    doc.text(content, x, at);
  };

  const headerLight = (label: string, title: string, continuation = false) => {
    doc.setFillColor("#f3f4ef");
    doc.rect(0, 0, width, height, "F");
    doc.setFillColor("#05372c");
    doc.rect(0, 0, width, 4, "F");
    doc.setDrawColor("#d6dcd5");
    doc.line(margin, 31, 277, 31);
    if (!continuation) sectionNumber = 0;
    doc.addImage(darkLogo, "PNG", width - 69, 14, 49, 12, "brand-light", "FAST");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor("#707987");
    doc.text(doc.splitTextToSize(label.toUpperCase(), 190), margin, 23);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(26);
    const lines: string[] = doc.splitTextToSize(title + (continuation ? " / continuação" : ""), 205);
    doc.setTextColor("#05372c");
    doc.text(lines, margin, 46);
    y = 52 + lines.length * 10;
  };

  const pageLight = (label: string, title: string, continuation = false) => {
    doc.addPage();
    headerLight(label, title, continuation);
  };

  const pageDark = (tag: string, mainTitle: string) => {
    doc.addPage();
    doc.setFillColor("#05372c");
    doc.rect(0, 0, width, height, "F");
    doc.addImage(logo, "PNG", margin, 18, 55, 13.5, "brand-dark", "FAST");
    text(tag.toUpperCase(), margin, 45, 8.5, true, "#10b981");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.setTextColor("#ffffff");
    doc.text(doc.splitTextToSize(mainTitle, 240), margin, 58);
    y = 70;
  };

  const paragraph = (content: string, label: string, title: string, maxWidth = 257) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const lines: string[] = doc.splitTextToSize(content.replace(/\r/g, ""), maxWidth);
    for (const line of lines) {
      if (y + 6 > bottom) pageLight(label, title, true);
      text(line, margin, y, 11);
      y += 6;
    }
    y += 5;
  };

  const section = (heading: string, content: string | undefined | null, label: string, title: string) => {
    if (!content?.trim()) return;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    const lines: string[] = doc.splitTextToSize(content, 177);
    let offset = 0;
    sectionNumber++;
    while (offset < lines.length) {
      if (y + 22 > bottom) pageLight(label, title, true);
      const capacity = Math.max(1, Math.floor((bottom - y - 12) / 5));
      const chunk = lines.slice(offset, offset + capacity);
      const cardHeight = Math.max(22, chunk.length * 5 + 12);
      doc.setFillColor("#ffffff");
      doc.roundedRect(margin, y, 257, cardHeight, 3, 3, "F");
      text(String(sectionNumber).padStart(2, "0"), margin + 6, y + 9, 8, true, "#059669");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor("#1b302a");
      doc.text(doc.splitTextToSize(heading, 49), margin + 6, y + 16);
      chunk.forEach((line, i) => text(line, 91, y + 10 + i * 5, 10.5));
      y += cardHeight + 3;
      offset += chunk.length;
    }
  };

  const rec: Partial<ProposalVersionRecord["recipientSnapshot"]> =
    current.recipientSnapshot || {
      name: proposal.recipientName || "Cliente",
      document: proposal.recipientDocument,
    };
  const clientName = rec.tradeName || rec.name || "Cliente";
  const diagnostics = current.commercialTermsSnapshot.diagnostics || {};
  const serviceDeliverables = current.commercialTermsSnapshot.serviceDeliverables || {};

  // ---------------------------------------------------------------------------
  // SLIDE 01: CAPA
  // ---------------------------------------------------------------------------
  doc.setFillColor("#05372c");
  doc.rect(0, 0, width, height, "F");
  doc.setFillColor("#0a4d3c");
  doc.rect(192, 0, 105, height, "F");
  doc.setFillColor("#10b981");
  doc.roundedRect(205, 107, 20, 61, 2, 2, "F");
  doc.roundedRect(232, 76, 20, 92, 2, 2, "F");
  doc.roundedRect(259, 45, 20, 123, 2, 2, "F");
  text("DATA & GROWTH  /  ESTRATÉGIA  /  RESULTADOS", 185, 184, 7, true, "#87d6b7");
  doc.addImage(logo, "PNG", margin, 20, 83, 20.5, "brand-dark", "FAST");
  text("PROPOSTA COMERCIAL", margin, 70, 11, true, "#10b981");

  doc.setFont("helvetica", "bold");
  const coverTitle: string[] = doc.splitTextToSize(proposal.title, 158);
  const titleSize = coverTitle.length > 3 ? 24 : 32;
  doc.setFontSize(titleSize);
  doc.setTextColor("#ffffff");
  doc.text(coverTitle, margin, 86);

  text("PREPARADA PARA", margin, 153, 9, true, "#a9b4c1");
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor("#ffffff");
  doc.text(doc.splitTextToSize(clientName, 157), margin, 163);
  text(
    proposal.proposalCode + "  /  Versão " + current.versionNumber,
    margin,
    180,
    10,
    false,
    "#a9b4c1"
  );
  text(
    "Emissão: " +
      date(current.createdAt) +
      "   |   Validade: " +
      date(current.commercialTermsSnapshot.validUntil),
    margin,
    188,
    9,
    false,
    "#a9b4c1"
  );

  // ---------------------------------------------------------------------------
  // SLIDE 02: DATA & GROWTH (Institucional / Filosofia)
  // ---------------------------------------------------------------------------
  pageDark("01 / Nossa Essência", "Data & Growth");
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.setTextColor("#d1fae5");
  const dgText = doc.splitTextToSize(
    "A Otimizza conecta análise de dados, planejamento de marketing e gestão de campanhas para ajudar sua empresa a identificar oportunidades e direcionar melhor seus investimentos.",
    115
  );
  doc.text(dgText, margin, 85);

  // Card Verde Destaque
  doc.setFillColor("#10b981");
  doc.roundedRect(150, 72, 127, 95, 6, 6, "F");
  text("Clareza para decidir.", 160, 93, 20, true, "#05372c");
  text("Direção para crescer.", 160, 103, 20, true, "#05372c");
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor("#05372c");
  const dgCardBody = doc.splitTextToSize(
    "Nosso trabalho começa pelo entendimento do negócio e continua com prioridades claras, orientação à equipe e acompanhamento rigoroso dos resultados.",
    107
  );
  doc.text(dgCardBody, 160, 120);

  // ---------------------------------------------------------------------------
  // SLIDE 03: QUEM SOMOS? (Since 2014)
  // ---------------------------------------------------------------------------
  pageLight("02 / Posicionamento", "Quem Somos?");
  doc.setFillColor("#05372c");
  doc.roundedRect(margin, y, 90, 105, 5, 5, "F");
  text("since", margin + 12, y + 25, 12, true, "#87d6b7");
  text("2014.", margin + 12, y + 55, 34, true, "#ffffff");
  text("Criatividade, tecnologia e resultado.", margin + 12, y + 78, 10, false, "#a7f3d0");

  doc.setFillColor("#ffffff");
  doc.roundedRect(120, y, 157, 105, 5, 5, "F");
  doc.setFontSize(13);
  doc.setFont("helvetica", "normal");
  doc.setTextColor("#334155");
  const qsText = doc.splitTextToSize(
    "Desde 2014, ajudamos marcas a crescerem no digital com estratégia e propósito.\n\nAo longo desses anos, ampliamos nossa atuação e hoje entregamos soluções completas em Social Media, Tráfego Pago, Website, Sistemas e Produção de Conteúdo, unindo criatividade, tecnologia e dados em cada projeto.",
    137
  );
  doc.text(qsText, 130, y + 25);

  // ---------------------------------------------------------------------------
  // SLIDE 04: CENÁRIO ATUAL (Diagnóstico)
  // ---------------------------------------------------------------------------
  pageLight("03 / Diagnóstico Estratégico", "Cenário Atual");
  const scenarioContent =
    diagnostics.currentScenario ||
    current.commercialTermsSnapshot.scopeDescription ||
    `A ${clientName} busca estruturar seus canais digitais para acelerar o crescimento de vendas com previsibilidade e autoridade no mercado.`;

  doc.setFillColor("#ffffff");
  doc.roundedRect(margin, y, 257, 95, 5, 5, "F");
  text("DIAGNÓSTICO IDENTIFICADO", margin + 10, y + 16, 9, true, "#059669");
  text("O momento da empresa e os desafios mapeados", margin + 10, y + 27, 16, true, "#0f172a");

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor("#334155");
  const scenarioLines = doc.splitTextToSize(scenarioContent, 237);
  doc.text(scenarioLines, margin + 10, y + 42);

  // ---------------------------------------------------------------------------
  // SLIDE 05: O FOCO DESTA PARCERIA
  // ---------------------------------------------------------------------------
  pageDark("04 / Objetivos e Métricas", "O Foco Desta Parceria");
  const focusContent =
    diagnostics.partnershipFocus ||
    `Construir a presença digital da ${clientName}, organizar as ações de marketing e conduzir campanhas que conectem a empresa a pessoas interessadas nos seus serviços.`;
  const metricsContent =
    diagnostics.trackingMetrics ||
    "A visibilidade da empresa, as interações com os conteúdos e os contatos comerciais gerados pelos canais trabalhados. Os indicadores e metas serão definidos conforme os primeiros dados da operação.";

  // Card 1: Foco
  doc.setFillColor("#10b981");
  doc.roundedRect(margin, y, 123, 90, 5, 5, "F");
  text("O FOCO DESTA PARCERIA", margin + 8, y + 16, 10, true, "#05372c");
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor("#05372c");
  const focusLines = doc.splitTextToSize(focusContent, 107);
  doc.text(focusLines, margin + 8, y + 30);

  // Card 2: Acompanhamento
  doc.setFillColor("#0a4d3c");
  doc.roundedRect(153, y, 124, 90, 5, 5, "F");
  text("O QUE VAMOS ACOMPANHAR", 161, y + 16, 10, true, "#86efac");
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor("#f0fdf4");
  const metricsLines = doc.splitTextToSize(metricsContent, 108);
  doc.text(metricsLines, 161, y + 30);

  // ---------------------------------------------------------------------------
  // SLIDES 06..N: SERVIÇOS APRESENTADOS & ENTREGÁVEIS
  // ---------------------------------------------------------------------------
  for (const [index, item] of current.items.entries()) {
    const p = {
      ...emptyPresentation,
      ...current.commercialTermsSnapshot.servicePresentations?.[item.serviceId],
    };
    const deliverables = serviceDeliverables[item.serviceId] || {
      included: [],
      excluded: [],
    };
    const label = "Serviço " + String(index + 1).padStart(2, "0") + " / " + serviceIcons[p.icon];

    pageLight(label, item.serviceName || item.descriptionSnapshot || "Serviço");

    if (p.headline) {
      paragraph(p.headline, label, item.serviceName, 218);
    }
    if (p.image) {
      const image = doc.getImageProperties(p.image);
      const scale = Math.min(257 / image.width, 67 / image.height);
      if (y + image.height * scale > bottom) pageLight(label, item.serviceName, true);
      doc.addImage(p.image, image.fileType, margin, y, image.width * scale, image.height * scale);
      y += image.height * scale + 12;
    }

    // Seções ricas de apresentação
    section("Sobre o serviço", p.overview || item.descriptionSnapshot, label, item.serviceName);
    section("Objetivos e benefícios", p.objectives, label, item.serviceName);

    // Itens Inclusos e Não Inclusos (Checklist)
    const incList =
      deliverables.included && deliverables.included.length > 0
        ? deliverables.included
        : p.deliverables
        ? p.deliverables.split("\n").filter(Boolean)
        : ["Escopo sob medida conforme alinhamento estratégico."];
    const excList = deliverables.excluded || [];

    if (incList.length > 0 || excList.length > 0) {
      const colWidth = excList.length > 0 ? 126 : 257;
      if (y + 55 > bottom) pageLight(label, item.serviceName, true);

      doc.setFillColor("#ffffff");
      doc.roundedRect(margin, y, colWidth, Math.min(75, Math.max(35, incList.length * 8 + 14)), 4, 4, "F");
      text("[x] ENTREGÁVEIS INCLUSOS NESTE ESCOPO", margin + 6, y + 9, 8.5, true, "#059669");

      let delivY = y + 17;
      for (const d of incList.slice(0, 8)) {
        text("• " + d, margin + 6, delivY, 9);
        delivY += 7;
      }

      if (excList.length > 0) {
        doc.setFillColor("#f8fafc");
        doc.roundedRect(margin + 131, y, 126, Math.min(75, Math.max(35, excList.length * 8 + 14)), 4, 4, "F");
        text("[ ] FORA DO ESCOPO / OPCIONAIS", margin + 137, y + 9, 8.5, true, "#64748b");
        let excY = y + 17;
        for (const e of excList.slice(0, 8)) {
          text("- " + e, margin + 137, excY, 9, false, "#64748b");
          excY += 7;
        }
      }
      y += Math.min(75, Math.max(35, Math.max(incList.length, excList.length) * 8 + 14)) + 6;
    }

    section("Metodologia de execução", p.methodology, label, item.serviceName);

    if (p.setup || p.timeline || p.responsibilities || p.exclusions) {
      pageLight("Implantação / " + item.serviceName, "Do início à execução");
      section("Setup e implantação", p.setup, label, item.serviceName);
      section("Cronograma e prazos", p.timeline, label, item.serviceName);
      section("Responsabilidades do cliente", p.responsibilities, label, item.serviceName);
      section("Fora do escopo", p.exclusions, label, item.serviceName);
    }
  }

  // ---------------------------------------------------------------------------
  // SLIDE: COMO TRABALHAMOS
  // ---------------------------------------------------------------------------
  pageLight("Metodologia", "Como Trabalhamos");
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor("#334155");
  const cDesc = doc.splitTextToSize(
    "Nossa atuação é estruturada em etapas claras, do entendimento do negócio à avaliação contínua dos resultados.\n\nCada etapa orienta a próxima, garantindo que as ações sejam direcionadas, mensuráveis e ajustadas conforme os aprendizados da operação.",
    95
  );
  doc.text(cDesc, margin, y + 12);

  // Cards numerados 01, 02, 03
  HOW_WE_WORK_STEPS.forEach((step, idx) => {
    const cardY = y + idx * 34;
    doc.setFillColor("#10b981");
    doc.roundedRect(125, cardY, 152, 29, 3, 3, "F");
    text(step.step, 131, cardY + 18, 16, true, "#05372c");
    text(step.title, 148, cardY + 10, 11, true, "#05372c");
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor("#05372c");
    const sDesc = doc.splitTextToSize(step.description, 125);
    doc.text(sDesc, 148, cardY + 17);
  });

  // ---------------------------------------------------------------------------
  // SLIDE: INVESTIMENTO
  // ---------------------------------------------------------------------------
  pageDark("Investimento", "Proposta Comercial & Investimento");
  const activeTotals = [
    ["IMPLANTAÇÃO / SETUP AVULSO", current.totalOneTimeEffective],
    ["MENSALIDADE", current.totalMonthlyEffective],
    ["ANUIDADE", current.totalYearlyEffective],
  ].filter((entry) => Number(entry[1]) > 0);

  if (activeTotals.length) {
    const cardWidth = (257 - (activeTotals.length - 1) * 6) / activeTotals.length;
    activeTotals.forEach(([label, amount], i) => {
      const x = margin + i * (cardWidth + 6);
      doc.setFillColor(i === 0 ? "#10b981" : "#0a4d3c");
      doc.roundedRect(x, y, cardWidth, 38, 4, 4, "F");
      text(String(label), x + 8, y + 10, 8.5, true, i === 0 ? "#05372c" : "#86efac");
      text(currency(Number(amount)), x + 8, y + 26, 20, true, i === 0 ? "#05372c" : "#ffffff");
      if (String(label).includes("AVULSO")) {
        text("ou em até 3x sem juros", x + 8, y + 33, 8, false, i === 0 ? "#064e3b" : "#a7f3d0");
      }
    });
    y += 46;
  }

  // Tabela discriminada
  doc.setFillColor("#ffffff");
  doc.roundedRect(margin, y, 257, 10, 2, 2, "F");
  text("SERVIÇO / PERIODICIDADE", 24, y + 6.5, 8, true, "#05372c");
  text("QTD.", 158, y + 6.5, 8, true, "#05372c");
  text("UNITÁRIO", 179, y + 6.5, 8, true, "#05372c");
  text("DESCONTO", 215, y + 6.5, 8, true, "#05372c");
  text("TOTAL", 251, y + 6.5, 8, true, "#05372c");
  y += 15;

  for (const item of current.items) {
    doc.setFontSize(9.5);
    text(item.serviceName || item.descriptionSnapshot || "Serviço", 24, y, 9.5, true, "#ffffff");
    text(String(item.quantity), 158, y, 9, false, "#cbd5e1");
    text(currency(item.negotiatedUnitPrice), 179, y, 9, false, "#cbd5e1");
    text(currency(item.discountAmount), 215, y, 9, false, "#cbd5e1");
    text(currency(item.totalAmount), 251, y, 9, true, "#86efac");
    y += 5.5;
    text(period(item.periodicity), 24, y, 8, false, "#94a3b8");
    y += 9;
  }

  // ---------------------------------------------------------------------------
  // SLIDE: CONDIÇÕES & RESPONSABILIDADES
  // ---------------------------------------------------------------------------
  pageLight("Condições Comerciais", "Alinhamentos & Prazos");
  const terms = current.commercialTermsSnapshot;

  const condBlocks = [
    ["Destinatário", [rec.name, rec.document ? "CPF/CNPJ: " + rec.document : null, rec.email, rec.phone].filter(Boolean).join(" • ")],
    ["Validade da Proposta", date(terms.validUntil)],
    ["Condições de Pagamento", terms.paymentTerms || "Avulso em até 3x. Recorrências com vencimento programado no contrato."],
    ["Previsão de Início", terms.startLeadTimeDays != null ? `${terms.startLeadTimeDays} dias úteis após assinatura e alinhamento dos acessos.` : "Imediato após confirmação."],
    ["Observações do Cliente", terms.clientNotes || "Nenhuma observação adicional."],
  ];

  condBlocks.forEach(([heading, content], i) => {
    const cy = y + i * 18;
    doc.setFillColor("#ffffff");
    doc.roundedRect(margin, cy, 257, 15, 2, 2, "F");
    text(heading, margin + 6, cy + 6, 8, true, "#059669");
    text(content, margin + 6, cy + 12, 9.5, false, "#1e293b");
  });

  // ---------------------------------------------------------------------------
  // SLIDE: PRÓXIMOS PASSOS & ACEITE
  // ---------------------------------------------------------------------------
  pageLight("Finalização", "Próximos Passos & Aceite");
  doc.setFillColor("#05372c");
  doc.roundedRect(margin, y, 257, 24, 4, 4, "F");
  text("Um plano claro. Uma parceria para colocar em prática.", margin + 8, y + 15, 14, true, "#ffffff");
  y += 35;

  const stepsList = [
    "1. Revisão e validação do escopo apresentado nesta proposta.",
    "2. Aprovação comercial e geração automática da minuta de contrato.",
    "3. Início do onboarding da Otimizza com levantamento de acessos e kickoff.",
  ];
  stepsList.forEach((st, idx) => {
    text(st, margin, y + idx * 8, 10.5, false, "#1e293b");
  });

  y = 145;
  doc.setDrawColor("#94a3b8");
  doc.line(margin, y, 120, y);
  doc.line(160, y, 277, y);
  text("Otimizza Data & Growth", margin, y + 6, 10, true, "#05372c");
  text("Aceite do Cliente: " + clientName, 160, y + 6, 10, true, "#05372c");
  text("Data: ______ / ______ / __________", 160, y + 16, 9, false, "#64748b");

  // Rodapés em todas as páginas
  const count = doc.getNumberOfPages();
  for (let i = 1; i <= count; i++) {
    doc.setPage(i);
    doc.setDrawColor(i === 1 || i === 2 || i === 5 || i === 8 ? "#064e3b" : "#d6dcd5");
    doc.line(margin, 194, 277, 194);
    const color = i === 1 || i === 2 || i === 5 || i === 8 ? "#a7f3d0" : "#64748b";
    text(
      "OTIMIZZA DATA & GROWTH  /  " + proposal.proposalCode + "  /  v" + current.versionNumber,
      margin,
      201,
      8,
      false,
      color
    );
    doc.setFontSize(8);
    doc.setTextColor(color);
    doc.text("Página " + i + " de " + count, 275, 201, { align: "right" });
  }

  return Buffer.from(doc.output("arraybuffer"));
}
