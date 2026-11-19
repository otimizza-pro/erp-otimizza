"use client";
import Link from "next/link";

import { useCompany } from "@/lib/context/company-context";
import { operationAreas, OperationArea } from "@/modules/operations/catalog";
import { OperationalChecklist } from "./checklist";
import {DigitalPresenceWorkspace} from "@/components/digital-presence/workspace";
import {isCreationArea} from "@/modules/digital-presence/catalog";
export function OperationsWorkspace({area}:{area:OperationArea}) {
 const {selectedCompany}=useCompany();
 if(isCreationArea(area))return <DigitalPresenceWorkspace area={area}/>;
 return <><div className="space-y-6"><header className="rounded-2xl border border-zinc-200/80 bg-white p-5 sm:p-6 shadow-hourline"><h1 className="text-xl font-bold tracking-tight text-zinc-950">{operationAreas[area].title}</h1><p className="mt-1 text-xs text-zinc-500">{selectedCompany.name} · Planejamento e acompanhamento operacional</p></header>
 <p className="text-xs font-medium text-zinc-600">Selecione o cliente no topo. Este acompanhamento registra configurações e rotinas; publicação de conteúdo e gestão de campanhas continuam nas plataformas de origem.</p>
 <OperationalChecklist key={selectedCompany.id+area} area={area} scope={selectedCompany.id}/>
 <div className="flex flex-wrap gap-3 rounded-2xl border border-zinc-200/80 bg-white p-4 text-xs font-semibold text-zinc-600 shadow-hourline [&_a]:rounded-full [&_a]:border [&_a]:border-zinc-200 [&_a]:px-4 [&_a]:py-2 [&_a:hover]:bg-zinc-50"><Link href="/projects">Gerenciar entregas e prazos</Link><Link href="/documents">Documentos</Link><Link href="/passwords">Senhas e acessos</Link></div></div></>;
}
