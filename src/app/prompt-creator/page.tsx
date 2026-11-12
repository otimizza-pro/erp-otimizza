"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";

type Field = { label: string; options?: string[]; initial: string };
type Model = { name: string; instruction: string; output: string; fields: Field[] };
const models: Model[] = [
  { name: "Headlines", instruction: "Crie headlines com ângulos distintos, adequadas à aplicação escolhida. Evite variações que só trocam sinônimos.", output: "Lista numerada agrupada por estilo. Confira o total e conte as palavras de cada headline.", fields: [
    { label: "Aplicação", options: ["Capa de carrossel", "Abertura de Reels", "Post estático", "Anúncio", "Landing page"], initial: "Capa de carrossel" }] },
  { name: "Legendas", instruction: "Escreva uma legenda publicável com abertura, desenvolvimento e fechamento coerentes com a peça e o objetivo.", output: "Legenda completa e uma alternativa de abertura. Separe comentários editoriais da copy.", fields: [
    { label: "Rede social", options: ["Instagram", "LinkedIn", "Facebook", "TikTok"], initial: "Instagram" },
    { label: "Peça", options: ["Post estático", "Carrossel", "Reels", "Publicação independente"], initial: "Post estático" },
    { label: "Função da legenda", options: ["Complementar", "Aprofundar um ponto", "Resumir"], initial: "Complementar" },
    { label: "Extensão", options: ["Até 80 palavras", "80 a 150 palavras", "150 a 250 palavras"], initial: "80 a 150 palavras" },
    { label: "Abertura", options: ["Pergunta", "Afirmação direta", "Cena cotidiana", "Objeção"], initial: "Afirmação direta" },
    { label: "Voz", options: ["Eu, como autor", "Nós, como empresa", "Impessoal"], initial: "Nós, como empresa" },
    { label: "Emojis", options: ["Sem emojis", "Uso discreto", "Uso livre"], initial: "Uso discreto" }] },
  { name: "Roteiros de Reels", instruction: "Escreva uma fala natural, com tese central e exemplo concreto. Estime o tempo das falas e pausas e ajuste o texto à duração escolhida.", output: "Tabela por take com tempo estimado, fala e intenção. Inclua direção e texto na tela conforme as opções escolhidas.", fields: [
    { label: "Duração", options: ["30 segundos", "45 segundos", "60 segundos", "90 segundos"], initial: "45 segundos" },
    { label: "Gravação", options: ["Fala para câmera", "Narração com imagens", "Diálogo", "Demonstração"], initial: "Fala para câmera" },
    { label: "Gancho", options: ["Pergunta forte", "Confronto respeitoso", "Cena cotidiana", "Quebra de expectativa"], initial: "Pergunta forte" },
    { label: "Ritmo", options: ["Natural e conversado", "Rápido e energético", "Calmo e didático"], initial: "Natural e conversado" },
    { label: "Divisão", options: ["Takes curtos", "Fala contínua"], initial: "Takes curtos" },
    { label: "Direção", options: ["Incluir pausas, ênfases e intenção", "Somente falas"], initial: "Incluir pausas, ênfases e intenção" },
    { label: "Texto na tela", options: ["Sugerir frases curtas", "Sem texto na tela"], initial: "Sugerir frases curtas" }] },
  { name: "Textos de carrossel", instruction: "Construa capa forte, progressão do argumento e fechamento. Cada slide acrescenta informação. Separe identificação editorial e copy da arte.", output: "Copy slide a slide com título e texto. Confira quantidade de slides e limite de palavras. Se não houver headline fornecida, proponha uma capa.", fields: [
    { label: "Slides", options: ["5", "6", "7", "8", "9", "10"], initial: "6" },
    { label: "Headline própria (opcional)", initial: "" },
    { label: "Estrutura", options: ["Problema, explicação e ação", "Lista comentada", "História com aprendizado", "Mito e esclarecimento", "Passo a passo"], initial: "Problema, explicação e ação" },
    { label: "Máximo de palavras por slide", options: ["20", "30", "40", "60"], initial: "30" },
    { label: "Último slide", options: ["Ação prática e CTA", "Pergunta para reflexão", "Resumo e CTA"], initial: "Ação prática e CTA" },
    { label: "Rodapé", options: ["Sem paginação, próximo → discreto até o penúltimo slide", "Sem rodapé", "Com paginação"], initial: "Sem paginação, próximo → discreto até o penúltimo slide" }] },
  { name: "Textos de landing page", instruction: "Conecte origem do visitante, oferta, benefícios, objeções e provas reais à conversão desejada. Mantenha a promessa coerente com o que a oferta entrega.", output: "Copy por seção com títulos, subtítulos, argumentos e botões. Marque informações e provas ausentes com [PREENCHER].", fields: [
    { label: "Escopo", options: ["Página completa", "Primeira dobra", "Benefícios", "Oferta", "Perguntas frequentes"], initial: "Página completa" },
    { label: "Oferta", initial: "" },
    { label: "Origem do visitante", options: ["Meta Ads", "Google Ads", "Busca orgânica", "Redes sociais", "Indicação"], initial: "Meta Ads" },
    { label: "Conversão", options: ["Conversa no WhatsApp", "Pedido de orçamento", "Agendamento", "Cadastro", "Compra"], initial: "Conversa no WhatsApp" },
    { label: "Objeções", initial: "" }, { label: "Provas disponíveis", initial: "" },
    { label: "Blocos desejados", initial: "Primeira dobra, benefícios, como funciona, provas, oferta, perguntas frequentes e CTA" }] },
];
const styles = ["Pergunta", "Afirmação direta", "Confronto respeitoso", "Lista", "Curiosidade", "Comparação"];
const strategies = ["Educacional", "Quebra de crença", "Dor e problema", "Desejo e aspiração", "Objeção e resposta", "Diagnóstico", "Erros comuns", "Oportunidade desperdiçada", "Prova social", "Bastidores"];
const input = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900";
const button = "rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50";
function initialValues(model: Model) { return Object.fromEntries(model.fields.map(field => [field.label, field.initial])); }

export default function PromptCreatorPage() {
  const [modelIndex, setModelIndex] = useState(0);
  const [idea, setIdea] = useState("");
  const [audience, setAudience] = useState("");
  const [context, setContext] = useState("");
  const [tone, setTone] = useState("Direto e didático");
  const [cta, setCta] = useState("Iniciar uma conversa qualificada");
  const [notes, setNotes] = useState("");
  const [values, setValues] = useState(initialValues(models[0]));
  const [selectedStyles, setSelectedStyles] = useState(["Pergunta", "Afirmação direta"]);
  const [selectedStrategies, setSelectedStrategies] = useState<string[]>([]);
  const [count, setCount] = useState(10);
  const [minWords, setMinWords] = useState(5);
  const [maxWords, setMaxWords] = useState(10);
  const [manual, setManual] = useState(false);
  const [distribution, setDistribution] = useState<Record<string, number>>({});
  const [result, setResult] = useState("");
  const [message, setMessage] = useState("");
  const [stale, setStale] = useState(false);
  const model = models[modelIndex];
  function toggle(value: string, current: string[], update: (values: string[]) => void) {
    update(current.includes(value) ? current.filter(item => item !== value) : [...current, value]);
  }
  function generate() {
    setMessage("");
    if (!idea.trim()) { setMessage("Escreva sua ideia para gerar o prompt."); return; }
    if (modelIndex === 0) {
      if (!Number.isInteger(count) || count < 1 || count > 50) { setMessage("Escolha entre 1 e 50 headlines."); return; }
      if (!Number.isInteger(minWords) || !Number.isInteger(maxWords) || minWords < 1 || maxWords > 50 || minWords > maxWords) { setMessage("Informe uma faixa válida de 1 a 50 palavras."); return; }
      if (!selectedStyles.length || selectedStyles.length > count) { setMessage("Selecione estilos suficientes para distribuir a quantidade de headlines."); return; }
      const quantities = selectedStyles.map(style => distribution[style] ?? 0);
      if (manual && (quantities.some(value => !Number.isInteger(value) || value < 1) || quantities.reduce((sum, value) => sum + value, 0) !== count)) { setMessage("Distribua ao menos uma headline por estilo e confira a soma total."); return; }
    }
    const lines = ["Atue como redator de marketing experiente. Escreva em português brasileiro.", model.instruction, "", "IDEIA", idea.trim(), "", "CONFIGURAÇÃO"];
    for (const [label, value] of [["Público", audience], ["Contexto de marca fornecido", context], ["Tom", tone], ["CTA desejado", cta], ...Object.entries(values)]) {
      if (value.trim()) lines.push(`${label}: ${value.trim()}`);
    }
    if (selectedStrategies.length) lines.push(`Abordagens: ${selectedStrategies.join(", ")}. Combine apenas quando houver coerência com a ideia.`);
    if (modelIndex === 0) {
      lines.push(`Crie exatamente ${count} headlines, com ${minWords} a ${maxWords} palavras cada.`);
      selectedStyles.forEach((style, index) => lines.push(`${style}: ${manual ? distribution[style] : Math.floor(count / selectedStyles.length) + (index < count % selectedStyles.length ? 1 : 0)} headlines.`));
    }
    if (notes.trim()) lines.push(`Orientações adicionais: ${notes.trim()}`);
    lines.push("", "REGRAS", "Use o contexto fornecido. Não invente dados, depoimentos, preços, resultados ou promessas. Marque informações essenciais ausentes com [PREENCHER] e avance com o restante. Identifique exemplos hipotéticos. Evite clichês, exageros e travessões.", "", "ENTREGA", model.output);
    setResult(lines.join("\n")); setStale(false);
  }
  return <AppShell activeSection="prompt_creator"><div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
    <header><h1 className="text-2xl font-semibold text-slate-900">Criador de Prompts</h1><p className="mt-1 text-sm text-slate-500">Transforme sua ideia em um pedido pronto para copiar e usar na IA.</p></header>
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <form className="space-y-5 rounded-xl border border-slate-200 bg-white p-5" onChange={() => { setStale(Boolean(result)); setMessage(""); }} onSubmit={event => { event.preventDefault(); generate(); }}>
        <label className="block text-sm font-medium">O que você vai criar?<select className={input} value={modelIndex} onChange={event => { const index = Number(event.target.value); setModelIndex(index); setValues(initialValues(models[index])); setResult(""); setMessage(""); }}>{models.map((item, index) => <option key={item.name} value={index}>{item.name}</option>)}</select></label>
        <label className="block text-sm font-medium">Qual é a sua ideia?<textarea required maxLength={12000} rows={5} className={input} value={idea} onChange={event => setIdea(event.target.value)} placeholder="Ex.: o empresário acha o lead fraco, mas demora para responder no WhatsApp." /></label>
        <details className="rounded-lg border border-slate-200 p-4"><summary className="cursor-pointer text-sm font-semibold">Personalizar</summary><div className="mt-4 space-y-4">
          <label className="block text-sm">Público<input className={input} value={audience} onChange={event => setAudience(event.target.value)} /></label>
          <label className="block text-sm">Contexto da marca (opcional)<textarea rows={3} className={input} value={context} onChange={event => setContext(event.target.value)} placeholder="Cole aqui o contexto que deseja incluir neste prompt." /></label>
          <label className="block text-sm">Tom<input className={input} value={tone} onChange={event => setTone(event.target.value)} /></label>
          <label className="block text-sm">CTA desejado<input className={input} value={cta} onChange={event => setCta(event.target.value)} /></label>
          {model.fields.map(field => <label key={field.label} className="block text-sm">{field.label}{field.options ? <select className={input} value={values[field.label]} onChange={event => setValues({ ...values, [field.label]: event.target.value })}>{field.options.map(option => <option key={option}>{option}</option>)}</select> : <textarea rows={2} className={input} value={values[field.label]} onChange={event => setValues({ ...values, [field.label]: event.target.value })} />}</label>)}
          {modelIndex === 0 && <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">{[{ label: "Quantidade", value: count, change: setCount }, { label: "Mín. palavras", value: minWords, change: setMinWords }, { label: "Máx. palavras", value: maxWords, change: setMaxWords }].map(field => <label key={field.label} className="text-sm">{field.label}<input type="number" min={1} max={50} className={input} value={Number.isNaN(field.value) ? "" : field.value} onChange={event => field.change(event.target.valueAsNumber)} /></label>)}</div>
            <fieldset><legend className="mb-2 text-sm font-medium">Estilos</legend><div className="flex flex-wrap gap-3">{styles.map(style => <label key={style} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={selectedStyles.includes(style)} onChange={() => toggle(style, selectedStyles, setSelectedStyles)} />{style}</label>)}</div></fieldset>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={manual} onChange={event => setManual(event.target.checked)} />Distribuir manualmente entre estilos</label>
            {manual && <div className="space-y-2">{selectedStyles.map(style => <label key={style} className="block text-sm">{style}<input type="number" min={1} max={50} className={input} value={distribution[style] ?? ""} onChange={event => setDistribution({ ...distribution, [style]: event.target.valueAsNumber })} /></label>)}<p className="text-sm text-slate-500">Soma {selectedStyles.reduce((sum, style) => sum + (distribution[style] || 0), 0)} de {count}</p></div>}
          </div>}
          <fieldset><legend className="mb-2 text-sm font-medium">Abordagens estratégicas</legend><div className="flex flex-wrap gap-3">{strategies.map(strategy => <label key={strategy} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={selectedStrategies.includes(strategy)} onChange={() => toggle(strategy, selectedStrategies, setSelectedStrategies)} />{strategy}</label>)}</div></fieldset>
          <label className="block text-sm">Orientações adicionais<textarea rows={3} className={input} value={notes} onChange={event => setNotes(event.target.value)} /></label>
        </div></details>
        <button className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-800">Gerar prompt</button>
      </form>
      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 lg:sticky lg:top-6" aria-label="Prompt gerado">
        <div className="flex items-center justify-between gap-3"><h2 className="font-semibold">Seu prompt</h2><button type="button" className={button} disabled={!result.trim()} onClick={async () => { try { await navigator.clipboard.writeText(result); setMessage("Prompt copiado."); } catch { setMessage("Selecione o texto do prompt e copie com Ctrl+C."); } }}>Copiar prompt</button></div>
        {stale && <p className="text-sm text-amber-800">As opções mudaram. Gere novamente para atualizar o prompt.</p>}
        <label className="block text-sm">Revise e edite antes de copiar<textarea rows={24} className={`${input} resize-y font-mono leading-6`} value={result} onChange={event => setResult(event.target.value)} placeholder="Seu prompt aparecerá aqui." /></label>
      </section>
    </div>
    {message && <p role="status" className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">{message}</p>}
  </div></AppShell>;
}
