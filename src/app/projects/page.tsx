import { AppShell } from "@/components/layout/app-shell";
import { ProjectViews } from "@/components/projects/project-views";
import Link from "next/link";
export default function ProjectsPage(){return <AppShell activeSection="projects"><div className="space-y-6"><div className="flex justify-between items-center"><h1 className="text-2xl font-bold">Projetos</h1><div className="flex gap-4"><Link href="/projects/templates">Modelos de Projeto</Link><Link href="/projects/new" className="rounded bg-indigo-600 text-white px-4 py-2">Novo projeto</Link></div></div><ProjectViews/></div></AppShell>;}
