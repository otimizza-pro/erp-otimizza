import React from "react";
import { notFound } from "next/navigation";

import { getAdminPageById, listAdminPages } from "@/modules/knowledge/service";
import { KnowledgeEditorClient } from "./editor-client";

export const dynamic = "force-dynamic";

export default async function KnowledgePageEditorPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const page = await getAdminPageById(id);

  if (!page) {
    notFound();
  }

  const allPages = await listAdminPages({ status: "ALL" });

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <KnowledgeEditorClient initialPage={page} allPages={allPages} />
      </div>
    </>
  );
}
