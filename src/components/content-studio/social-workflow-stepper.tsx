"use client";

import React from "react";
import Link from "next/link";
import { Layers, Lightbulb, Sparkles, Calendar, ChevronRight } from "lucide-react";

export type SocialWorkflowStep = "editorial" | "brainstorm" | "studio" | "calendar";

const STEPS: Array<{
  id: SocialWorkflowStep;
  number: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "editorial", number: "1", label: "Linha Editorial", href: "/social/editorial", icon: Layers },
  { id: "studio", number: "2", label: "Estúdio Criativo", href: "/prompt-creator", icon: Sparkles },
  { id: "calendar", number: "3", label: "Feed & Criativos", href: "/prompt-creator/saved", icon: Calendar },
];

export function SocialWorkflowStepper({ activeStep }: { activeStep: SocialWorkflowStep }) {
  const normalizedActive: SocialWorkflowStep = activeStep === "brainstorm" ? "studio" : activeStep;
  return (
    <nav
      aria-label="Esteira de Produção Social Media"
      className="flex items-center gap-1.5 overflow-x-auto rounded-2xl border border-zinc-200 bg-white p-2 shadow-2xs"
    >
      {STEPS.map((step, index) => {
        const Icon = step.icon;
        const isActive = step.id === normalizedActive;
        return (
          <React.Fragment key={step.id}>
            <Link
              href={step.href}
              className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                isActive
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              }`}
            >
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
                  isActive ? "bg-white/20 text-white" : "bg-zinc-200 text-zinc-700"
                }`}
              >
                {step.number}
              </span>
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span>{step.label}</span>
            </Link>
            {index < STEPS.length - 1 && (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-300" />
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
