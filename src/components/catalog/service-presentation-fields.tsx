"use client";
import { useState } from "react";
import Image from "next/image";
import { Target, Megaphone, ChartNoAxesCombined, Globe, Palette, Code, Upload, X } from "lucide-react";
import { type ServicePresentation, serviceIcons } from "@/modules/catalog/presentation";
const icons = { target: Target, megaphone: Megaphone, chart: ChartNoAxesCombined, globe: Globe, palette: Palette, code: Code };
const fields = [
  ["headline", "Chamada do serviço", "Uma frase que apresenta o valor do serviço"],
  ["overview", "Apresentação do serviço", "O que oferecemos e como ajudamos o cliente"],
  ["objectives", "Objetivos e benefícios", "Quais objetivos o trabalho busca alcançar"],
  ["deliverables", "Escopo e entregáveis", "O que está incluso, quantidades e frequência"],
  ["methodology", "Metodologia de trabalho", "Como o serviço será executado e acompanhado"],
  ["setup", "Setup e implantação", "Configurações iniciais, diagnóstico, acessos e reunião de início"],
  ["timeline", "Cronograma e prazos", "Etapas, prazo de implantação e rotina de entregas"],
  ["responsibilities", "Responsabilidades do cliente", "Materiais, acessos e aprovações necessários"],
  ["exclusions", "O que não está incluso", "Verba de mídia, ferramentas e demais despesas adicionais"],
] as const;
export function ServicePresentationFields({ value, onChange }: { value: ServicePresentation; onChange: (v: ServicePresentation) => void }) {
  const [error, setError] = useState("");
  const update = (key: keyof ServicePresentation, content: string) => onChange({ ...value, [key]: content });
  return <section className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-5">
    <div className="flex items-center gap-4"><Image src="/brand/principal-cor.png" alt="Otimizza" width={125} height={42} className="h-9 w-auto" /><div><h2 className="font-semibold text-zinc-950">Apresentação na proposta</h2><p className="text-xs text-zinc-500 mt-1">Estes conteúdos entram automaticamente no PDF horizontal ao selecionar o serviço. Campos vazios são omitidos.</p></div></div>
    <fieldset><legend className="text-xs font-medium mb-2">Ícone do serviço</legend><div className="flex flex-wrap gap-2">{Object.entries(serviceIcons).map(([key, label]) => { const Icon = icons[key as keyof typeof icons]; return <button key={key} type="button" aria-pressed={value.icon === key} onClick={() => onChange({ ...value, icon: key as ServicePresentation["icon"] })} className={"flex items-center gap-2 rounded-xl border px-3 py-2 text-xs " + (value.icon === key ? "bg-zinc-950 text-white border-zinc-950" : "border-zinc-200 text-zinc-600")}><Icon size={16}/>{label}</button>; })}</div></fieldset>
    <div className="rounded-xl border border-dashed border-zinc-300 p-4 space-y-3"><label className="flex items-center gap-2 text-xs font-medium"><Upload size={16}/>Imagem de apresentação (PNG ou JPEG, até 1 MB)<input type="file" accept="image/png,image/jpeg" className="block text-xs" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; if (!["image/png", "image/jpeg"].includes(file.type) || file.size > 1000000) { setError("Selecione PNG ou JPEG de até 1 MB."); return; } const reader = new FileReader(); reader.onload = () => { update("image", String(reader.result)); setError(""); }; reader.onerror = () => setError("Não foi possível ler a imagem."); reader.readAsDataURL(file); event.target.value = ""; }}/></label>{error && <p role="alert" className="text-xs text-red-600">{error}</p>}{value.image && <div className="flex gap-4 items-center"><Image unoptimized src={value.image} alt="Imagem do serviço" width={240} height={135} className="h-32 w-56 object-contain rounded-lg bg-zinc-50"/><button type="button" onClick={() => update("image", "")} className="flex gap-1 text-xs text-red-600"><X size={14}/>Remover imagem</button></div>}</div>
    <div className="grid md:grid-cols-2 gap-4">{fields.map(([key, label, placeholder]) => <label key={key} className="block text-xs font-medium text-zinc-700">{label}<textarea rows={key === "headline" ? 2 : 4} maxLength={key === "headline" ? 180 : 12000} value={value[key]} onChange={(event) => update(key, event.target.value)} placeholder={placeholder} className="mt-1 w-full rounded-xl bg-zinc-50 border border-zinc-200 px-3 py-2 font-normal focus:outline-none focus:border-zinc-900"/></label>)}</div>
  </section>;
}
