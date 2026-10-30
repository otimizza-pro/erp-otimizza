"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Lock, Mail, AlertCircle, ShieldCheck, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        throw new Error(
          authError.message === "Invalid login credentials"
            ? "Credenciais inválidas. Verifique seu e-mail e senha."
            : authError.message
        );
      }

      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Falha ao autenticar.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#F8F9FA] font-sans antialiased selection:bg-zinc-900 selection:text-white">
      {/* Lado Esquerdo: Banner de Marca com Background fundo-capa */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-zinc-950 items-center justify-center p-12 text-white">
        {/* Imagem de Fundo (fundo-capa.png) */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40 mix-blend-luminosity scale-105"
          style={{ backgroundImage: "url('/brand/fundo-capa.png')" }}
        />
        {/* Overlay com gradiente escuro e refinado */}
        <div className="absolute inset-0 bg-gradient-to-tr from-zinc-950 via-zinc-950/80 to-transparent" />

        <div className="relative z-10 max-w-lg space-y-8">
          {/* Logo Principal Positiva / Negativa para fundo escuro */}
          <div className="inline-block p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 shadow-2xl">
            <Image
              src="/brand/principal-cor.png"
              alt="Otimizza ERP Logo"
              width={220}
              height={60}
              className="h-12 w-auto object-contain brightness-110 drop-shadow-md"
              priority
            />
          </div>

          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-400 text-xs font-semibold backdrop-blur-xs border border-white/10">
              <ShieldCheck className="w-4 h-4" />
              Ambiente Corporativo Seguro
            </div>
            <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight leading-tight text-white">
              Gestão Financeira, Contratos e Inteligência Operacional
            </h1>
            <p className="text-sm text-zinc-300 leading-relaxed">
              Plataforma empresarial integrada para faturamento recorrente, contas a pagar e receber, baixas manuais auditadas e fluxo de caixa consolidado.
            </p>
          </div>

          <div className="pt-6 border-t border-white/10 grid grid-cols-2 gap-4 text-xs text-zinc-400">
            <div>
              <span className="font-semibold text-white block">Empresa Exclusiva</span>
              <span>Otimizza Tecnologia</span>
            </div>
            <div>
              <span className="font-semibold text-white block">Infraestrutura</span>
              <span>PostgreSQL & Supabase Auth</span>
            </div>
          </div>
        </div>
      </div>

      {/* Lado Direito: Formulário de Autenticação */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-16 xl:px-24">
        <div className="w-full max-w-md mx-auto space-y-8">
          {/* Logo no Mobile */}
          <div className="lg:hidden flex items-center justify-center">
            <Image
              src="/brand/principal-cor.png"
              alt="Otimizza ERP"
              width={180}
              height={50}
              className="h-10 w-auto object-contain"
              priority
            />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950">
              Acesso ao Sistema
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500">
              Informe suas credenciais de administrador para continuar.
            </p>
          </div>

          {/* Card do Formulário */}
          <div className="bg-white p-8 sm:p-10 rounded-3xl border border-zinc-200/90 shadow-xl shadow-zinc-950/[0.03]">
            <form onSubmit={handleLogin} className="space-y-5">
              {error && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-700 text-xs flex items-center gap-3 animate-in fade-in">
                  <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
                  <span className="leading-snug">{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700">
                  E-mail do Administrador
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="otimizzapro@gmail.com"
                    disabled={loading}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-medium text-zinc-900 placeholder-zinc-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-950 transition"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700">
                  Senha de Acesso
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    disabled={loading}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-medium text-zinc-900 placeholder-zinc-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-950 transition"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-xs font-bold text-white bg-zinc-950 hover:bg-zinc-800 active:scale-[0.99] transition shadow-md shadow-zinc-950/10 disabled:opacity-50"
                >
                  {loading ? (
                    "Autenticando..."
                  ) : (
                    <>
                      <span>Entrar no ERP</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-8 pt-6 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-400">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Sessão Supabase Auth
              </span>
              <span>Versão 4.0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
