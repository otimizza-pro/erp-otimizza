import { jsPDF } from "jspdf";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ProposalRecord, ProposalVersionRecord } from "./types";
import { emptyPresentation, serviceIcons } from "@/modules/catalog/presentation";

const currency = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
const date = (value?: string | null) => value ? value.slice(0, 10).split("-").reverse().join("/") : "A combinar";
const period = (value: string) => ({ MONTHLY: "Mensal", YEARLY: "Anual", ONE_TIME: "Avulso / Setup" }[value] || value);

export async function generateProposalPdf(proposal: ProposalRecord, version?: ProposalVersionRecord): Promise<Buffer> {
  const current = version || proposal.currentVersion;
  if (!current) throw new Error("Nenhuma versão de proposta disponível para geração do documento PDF.");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: false });
  doc.setProperties({ title: proposal.title, author: "Otimizza", subject: "Proposta comercial" });
  const width = 297, height = 210, margin = 20, bottom = 183;
  const logo = new Uint8Array(await readFile(path.join(process.cwd(), "public/brand/principal-negativa.png")));
  const darkLogo = new Uint8Array(await readFile(path.join(process.cwd(), "public/brand/principal-cor.png")));
  let y = 0;
  let sectionNumber = 0;
  const text = (content: string, x: number, at: number, size = 11, bold = false, color = "#343b47") => {
    doc.setFont("helvetica", bold ? "bold" : "normal"); doc.setFontSize(size); doc.setTextColor(color); doc.text(content, x, at);
  };
  const header = (label: string, title: string, continuation = false) => {
    doc.setFillColor("#f3f4ef"); doc.rect(0, 0, width, height, "F");
    doc.setFillColor("#111820"); doc.rect(0, 0, width, 3, "F");
    doc.setDrawColor("#d6dcd5"); doc.line(margin, 31, 277, 31);
    if (!continuation) sectionNumber = 0;
    doc.addImage(darkLogo, "PNG", width - 69, 14, 49, 12, "brand-light", "FAST");
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor("#707987");
    doc.text(doc.splitTextToSize(label.toUpperCase(), 190), margin, 23);
    doc.setFont("helvetica", "bold"); doc.setFontSize(29);
    const lines: string[] = doc.splitTextToSize(title + (continuation ? " / continuação" : ""), 205);
    doc.setTextColor("#141a22"); doc.text(lines, margin, 48);
    y = 52 + lines.length * 12;
  };
  const page = (label: string, title: string, continuation = false) => { doc.addPage(); header(label, title, continuation); };
  const paragraph = (content: string, label: string, title: string, maxWidth = 257) => {
    doc.setFont("helvetica", "normal"); doc.setFontSize(11);
    const lines: string[] = doc.splitTextToSize(content.replace(/\r/g, ""), maxWidth);
    for (const line of lines) {
      if (y + 6 > bottom) page(label, title, true);
      text(line, margin, y, 11); y += 6;
    }
    y += 5;
  };
  const section = (heading: string, content: string | undefined | null, label: string, title: string) => {
    if (!content?.trim()) return;
    doc.setFont("helvetica", "normal"); doc.setFontSize(10.5);
    const lines: string[] = doc.splitTextToSize(content, 177);
    let offset = 0;
    sectionNumber++;
    while (offset < lines.length) {
      if (y + 22 > bottom) page(label, title, true);
      const capacity = Math.max(1, Math.floor((bottom - y - 12) / 5));
      const chunk = lines.slice(offset, offset + capacity);
      const cardHeight = Math.max(22, chunk.length * 5 + 12);
      doc.setFillColor("#ffffff"); doc.roundedRect(margin, y, 257, cardHeight, 3, 3, "F");
      text(String(sectionNumber).padStart(2, "0"), margin + 6, y + 9, 8, true, "#078760");
      doc.setFont("helvetica", "bold"); doc.setFontSize(10);
      doc.setTextColor("#1b302a"); doc.text(doc.splitTextToSize(heading, 49), margin + 6, y + 16);
      chunk.forEach((line, i) => text(line, 91, y + 10 + i * 5, 10.5));
      y += cardHeight + 3;
      offset += chunk.length;
    }
  };
  // Capa com a assinatura visual oficial da marca.
  doc.setFillColor("#111820"); doc.rect(0, 0, width, height, "F");
  doc.setFillColor("#12372f"); doc.rect(192, 0, 105, height, "F");
  doc.setFillColor("#10b981");
  doc.roundedRect(205, 107, 20, 61, 2, 2, "F");
  doc.roundedRect(232, 76, 20, 92, 2, 2, "F");
  doc.roundedRect(259, 45, 20, 123, 2, 2, "F");
  text("ESTRATÉGIA  /  DADOS  /  CRESCIMENTO", 204, 184, 7, true, "#87d6b7");
  doc.addImage(logo, "PNG", margin, 20, 83, 20.5, "brand-dark", "FAST");
  text("PROPOSTA COMERCIAL", margin, 70, 11, true, "#10b981");
  doc.setFont("helvetica", "bold"); doc.setFontSize(35);
  const coverTitle: string[] = doc.splitTextToSize(proposal.title, 158);
  // O título é limitado a 200 caracteres pelo domínio; ajustar fonte para capas extensas.
  const titleSize = coverTitle.length > 3 ? 25 : 35;
  doc.setFontSize(titleSize);
  const finalTitle: string[] = doc.splitTextToSize(proposal.title, 158);
  doc.setTextColor("#ffffff"); doc.text(finalTitle, margin, 86);
  const rec: Partial<ProposalVersionRecord["recipientSnapshot"]> = current.recipientSnapshot || { name: proposal.recipientName || "Cliente", document: proposal.recipientDocument };
  text("PREPARADA PARA", margin, 155, 9, true, "#a9b4c1");
  doc.setFontSize(15); doc.setFont("helvetica", "bold"); doc.setTextColor("#ffffff");
  doc.text(doc.splitTextToSize(rec.tradeName || rec.name || "Cliente", 157), margin, 165);
  text(proposal.proposalCode + "  /  Versão " + current.versionNumber, margin, 181, 10, false, "#a9b4c1");
  text("Emissão: " + date(current.createdAt) + "   |   Validade: " + date(current.commercialTermsSnapshot.validUntil), margin, 188, 9, false, "#a9b4c1");

  page("01 / Nossa essência", "Otimizza. Data & Growth.");
  doc.setFillColor("#12372f"); doc.roundedRect(20, y, 95, 82, 4, 4, "F");
  text("NOSSO PONTO DE PARTIDA", 28, y + 12, 8, true, "#7bd9b1");
  text("Clareza para decidir.", 28, y + 32, 19, true, "#ffffff");
  text("Direção para crescer.", 28, y + 43, 19, true, "#ffffff");
  doc.setFontSize(11); doc.setFont("helvetica", "normal"); doc.setTextColor("#b8d6c9");
  doc.text(doc.splitTextToSize("Uma parceria que conecta estratégia, dados e execução ao próximo passo do seu negócio.", 76), 28, y + 62);
  const pillars = [["01", "Estratégia", "Objetivos alinhados e prioridades claras para orientar o trabalho."], ["02", "Execução", "Escopo definido, entregas organizadas e responsabilidades compartilhadas."], ["03", "Acompanhamento", "Uma rotina de análise e alinhamento para sustentar a evolução do projeto."]];
  pillars.forEach(([number, title, body], i) => {
    const at = y + i * 27;
    doc.setFillColor("#ffffff"); doc.roundedRect(122, at, 155, 25, 3, 3, "F");
    text(number, 129, at + 11, 13, true, "#078760"); text(title, 145, at + 9, 13, true);
    doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor("#525d58");
    doc.text(doc.splitTextToSize(body, 122), 145, at + 17);
  });
  y += 89;
  section("O projeto", current.commercialTermsSnapshot.scopeDescription, "Nossa essência", "Sobre a Otimizza");

  for (const [index, item] of current.items.entries()) {
    const p = { ...emptyPresentation, ...current.commercialTermsSnapshot.servicePresentations?.[item.serviceId] };
    const label = "Serviço " + String(index + 1).padStart(2, "0") + " / " + serviceIcons[p.icon];
    page(label, item.serviceName || item.descriptionSnapshot || "Serviço");
    // Ícones vetoriais mantêm nitidez na exportação, sem fontes de símbolos.
    const ix = 263, iy = 47;
    doc.setFillColor("#dcece2"); doc.roundedRect(ix - 11, iy - 11, 22, 22, 4, 4, "F");
    doc.setDrawColor("#078760"); doc.setLineWidth(0.7);
    if (p.icon === "target") { doc.circle(ix, iy, 7); doc.circle(ix, iy, 3); }
    else if (p.icon === "chart") { for (let n = 0; n < 3; n++) { doc.setFillColor("#078760"); doc.rect(ix - 7 + n * 5, iy + 7 - n * 4, 3, 5 + n * 4, "F"); } }
    else if (p.icon === "globe") { doc.circle(ix, iy, 7); doc.ellipse(ix, iy, 3, 7); doc.line(ix - 7, iy, ix + 7, iy); }
    else if (p.icon === "code") { doc.line(ix - 3, iy - 5, ix - 8, iy); doc.line(ix - 8, iy, ix - 3, iy + 5); doc.line(ix + 3, iy - 5, ix + 8, iy); doc.line(ix + 8, iy, ix + 3, iy + 5); }
    else if (p.icon === "palette") { doc.circle(ix, iy, 7); doc.circle(ix - 3, iy - 2, 1); doc.circle(ix + 2, iy - 3, 1); doc.circle(ix + 3, iy + 2, 1); }
    else { doc.triangle(ix - 7, iy - 3, ix + 6, iy - 7, ix + 6, iy + 6); doc.line(ix - 5, iy + 1, ix - 2, iy + 8); }
    if (p.headline) { paragraph(p.headline, label, item.serviceName, 218); }
    if (p.image) {
      const image = doc.getImageProperties(p.image);
      const scale = Math.min(257 / image.width, 67 / image.height);
      if (y + image.height * scale > bottom) page(label, item.serviceName, true);
      doc.addImage(p.image, image.fileType, margin, y, image.width * scale, image.height * scale); y += image.height * scale + 12;
    }
    section("Sobre o serviço", p.overview || item.descriptionSnapshot, label, item.serviceName);
    section("Objetivos e benefícios", p.objectives, label, item.serviceName);
    section("Escopo e entregáveis", p.deliverables, label, item.serviceName);
    section("Como trabalhamos", p.methodology, label, item.serviceName);
    if (p.setup || p.timeline || p.responsibilities || p.exclusions) {
      page("Implantação / " + item.serviceName, "Do início à execução");
      section("Setup e implantação", p.setup, label, item.serviceName);
      section("Cronograma e prazos", p.timeline, label, item.serviceName);
      section("Responsabilidades do cliente", p.responsibilities, label, item.serviceName);
      section("Fora do escopo", p.exclusions, label, item.serviceName);
    }
  }
  const investmentHeader = () => {
    doc.setFillColor("#e6e9ee"); doc.roundedRect(margin, y, 257, 10, 2, 2, "F");
    text("SERVIÇO / PERIODICIDADE", 24, y + 6.5, 8, true); text("QTD.", 158, y + 6.5, 8, true); text("UNITÁRIO", 179, y + 6.5, 8, true); text("DESCONTO", 215, y + 6.5, 8, true); text("TOTAL", 251, y + 6.5, 8, true); y += 18;
  };
  page("Investimento", "Um investimento no próximo passo");
  const activeTotals = [["IMPLANTAÇÃO / AVULSO", current.totalOneTimeEffective], ["MENSALIDADE", current.totalMonthlyEffective], ["ANUIDADE", current.totalYearlyEffective]].filter((entry) => Number(entry[1]) > 0);
  if (activeTotals.length) {
    const cardWidth = (257 - (activeTotals.length - 1) * 5) / activeTotals.length;
    activeTotals.forEach(([label, amount], i) => {
      const x = margin + i * (cardWidth + 5);
      doc.setFillColor(i === 0 ? "#12372f" : "#111820"); doc.roundedRect(x, y, cardWidth, 42, 4, 4, "F");
      text(String(label), x + 8, y + 12, 9, true, "#9bcbb7");
      text(currency(Number(amount)), x + 8, y + 31, 25, true, "#ffffff");
    });
    y += 54;
  }
  investmentHeader();
  for (const item of current.items) {
    doc.setFontSize(10); const lines: string[] = doc.splitTextToSize(item.serviceName || item.descriptionSnapshot || "Serviço", 122);
    for (let i = 0; i < lines.length; i++) {
      if (y + 15 > bottom) { page("Investimento", "Clareza em cada etapa", true); investmentHeader(); }
      text(lines[i], 24, y, 10, true);
      if (i === 0) { text(String(item.quantity), 158, y, 9); text(currency(item.negotiatedUnitPrice), 179, y, 9); text(currency(item.discountAmount), 215, y, 9); text(currency(item.totalAmount), 251, y, 9, true); }
      y += 6;
    }
    text(period(item.periodicity), 24, y, 8, false, "#737c87"); y += 12;
  }
  if (current.discountTotal > 0) { if (y > bottom) page("Investimento", "Descontos"); text("Desconto total aplicado: " + currency(current.discountTotal), margin, y, 10); }
  page("Condições comerciais", "Tudo alinhado para começar");
  const terms = current.commercialTermsSnapshot;
  section("Destinatário", [rec.name, rec.document ? "CPF/CNPJ: " + rec.document : null, rec.email, rec.phone].filter(Boolean).join("\n"), "Condições comerciais", "Condições comerciais");
  section("Validade da proposta", date(terms.validUntil), "Condições comerciais", "Condições comerciais");
  section("Pagamento", terms.paymentTerms || "Forma de pagamento a combinar na contratação.", "Condições comerciais", "Condições comerciais");
  section("Previsão de início", terms.startLeadTimeDays != null ? terms.startLeadTimeDays + " dias úteis após confirmação e alinhamento dos requisitos de início." : "A combinar entre as partes.", "Condições comerciais", "Condições comerciais");
  section("Observações", terms.clientNotes, "Condições comerciais", "Condições comerciais");
  page("Próximos passos", "O próximo capítulo começa aqui.");
  doc.setFillColor("#12372f"); doc.roundedRect(20, y, 257, 27, 4, 4, "F");
  text("Um plano claro. Uma parceria para colocar em prática.", 28, y + 17, 17, true, "#ffffff"); y += 40;
  paragraph("1. Revise o escopo e as condições desta proposta.\n2. Confirme o aceite e formalize a contratação.\n3. Alinhe acessos, materiais e a reunião de início com a Otimizza.", "Próximos passos", "Aceite");
  y = Math.max(y + 18, 128);
  doc.setDrawColor("#aeb6c0"); doc.line(20, y, 132, y); doc.line(161, y, 277, y);
  text("Otimizza", 20, y + 7, 10, true); text("Aceite do cliente", 161, y + 7, 10, true);
  text("Data: ______ / ______ / __________", 161, y + 20, 9);
  const count = doc.getNumberOfPages();
  for (let i = 1; i <= count; i++) {
    doc.setPage(i); doc.setDrawColor(i === 1 ? "#28453c" : "#d6dcd5"); doc.line(margin, 194, 277, 194); const color = i === 1 ? "#a9b4c1" : "#737c87";
    text("OTIMIZZA  /  Proposta confidencial  /  " + proposal.proposalCode + "  /  v" + current.versionNumber, margin, 201, 8, false, color);
    doc.setFontSize(8); doc.setTextColor(color); doc.text("Página " + i + " de " + count, 275, 201, { align: "right" });
  }
  return Buffer.from(doc.output("arraybuffer"));
}
