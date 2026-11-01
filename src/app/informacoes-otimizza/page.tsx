import React from "react";
import { AppShell } from "@/components/layout/app-shell";
import { listAdminPages, getAdminPageTree } from "@/modules/knowledge/service";
import { AdminKnowledgeListClient } from "./admin-list-client";

export const dynamic = "force-dynamic";

export default async function AdminKnowledgePage() {
  const pages = await listAdminPages({ status: "ALL" });
  const tree = await getAdminPageTree();

  return (
    <AppShell activeSection="knowledge_manual">
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        <AdminKnowledgeListClient initialPages={pages} initialTree={tree} />
      </div>
    </AppShell>
  );
}
