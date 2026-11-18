"use client";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { useCompany } from "@/lib/context/company-context";
import { operationAreas, OperationArea } from "@/modules/operations/catalog";
import { OperationalChecklist } from "./checklist";
export function OperationsWorkspace({area}:{area:OperationArea}) {
 const {selectedCompany}=useCompany();
 return <AppShell activeSection={area}><div className="space-y-5"><header><h1 className="text-2xl font-bold">{operationAreas[area].title}</h1><p className="text-zinc-500">{selectedCompany.name} · Planejamento e acompanhamento operacional</p></header>
 <p className="text-sm">Selecione o cliente no topo. Este acompanhamento registra configurações e rotinas; publicação de conteúdo e gestão de campanhas continuam nas plataformas de origem.</p>
 <OperationalChecklist key={selectedCompany.id+area} area={area} scope={selectedCompany.id}/>
 <div className="flex gap-4 text-sm underline"><Link href="/projects">Gerenciar entregas e prazos</Link><Link href="/documents">Documentos</Link><Link href="/passwords">Senhas e acessos</Link></div></div></AppShell>;
}
