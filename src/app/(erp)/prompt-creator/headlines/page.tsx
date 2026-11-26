"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function RedirectToUnifiedStudio() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const qs = params.toString();
    router.replace(qs ? `/prompt-creator?${qs}` : "/prompt-creator");
  }, [params, router]);

  return <p className="p-8 text-sm text-zinc-600">Abrindo Estúdio Criativo unificado…</p>;
}

export default function Page() {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-zinc-600">Carregando...</p>}>
      <RedirectToUnifiedStudio />
    </Suspense>
  );
}
