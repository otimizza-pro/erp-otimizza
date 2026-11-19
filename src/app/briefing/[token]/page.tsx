"use client";

import React, { useState, useEffect, useRef, use } from "react";
import {
  Sparkles,
  Send,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  RefreshCw,
  HelpCircle,
  ThumbsUp,
  Sliders,
  ShieldCheck,
  Check,
  Zap,
} from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/whatsapp";

interface ChatOption {
  label: string;
  value: string;
  action?: "APPROVE" | "DONT_KNOW" | "ADJUST" | "RETRY" | "EXPLAIN" | "NEXT";
  payload?: unknown;
}

interface ChatMessage {
  id: string;
  sender: "assistant" | "user";
  text: string;
  timestamp: string;
  options?: ChatOption[];
  suggestedData?: {
    field: string;
    value: string;
  };
  isCredentialStep?: boolean;
}

interface BriefingSessionData {
  id: string;
  token: string;
  companyName: string;
  contactName: string;
  websiteUrl?: string;
  instagramUrl?: string;
  initialNotes?: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  progressPercent: number;
  conversationHistory: ChatMessage[];
  credentialsSaved?: boolean;
}

export default function PublicBriefingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);

  const [session, setSession] = useState<BriefingSessionData | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [progress, setProgress] = useState<number>(20);
  const [inputVal, setInputVal] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [sending, setSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Credenciais
  const [igUser, setIgUser] = useState<string>("");
  const [igPass, setIgPass] = useState<string>("");
  const [showPass, setShowPass] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending]);

  // Carregar sessão inicial
  useEffect(() => {
    async function loadSession() {
      setLoading(true);
      try {
        const res = await fetch(`/api/briefing/${token}`);
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || "Sessão não encontrada.");

        setSession(json.data);
        setMessages(json.data.conversationHistory || []);
        setProgress(json.data.progressPercent || 20);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Erro ao carregar o briefing.");
      } finally {
        setLoading(false);
      }
    }

    loadSession();
  }, [token]);

  // Enviar mensagem de texto normal
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputVal).trim();
    if (!text || sending) return;

    setInputVal("");
    setSending(true);

    try {
      const res = await fetch(`/api/briefing/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "MESSAGE",
          message: text,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setMessages(json.data.conversationHistory);
        setProgress(json.data.progressPercent);
      }
    } catch (err) {
      console.error("Erro ao enviar mensagem:", err);
    } finally {
      setSending(false);
    }
  };

  // Clicar em "Não sei / Me sugira"
  const handleDontKnow = async () => {
    if (sending) return;
    setSending(true);

    try {
      const res = await fetch(`/api/briefing/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "DONT_KNOW" }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setMessages(json.data.conversationHistory);
        setProgress(json.data.progressPercent);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  // Decisão sobre uma sugestão (Aprovar, Ajustar, Outra Opção)
  const handleDecision = async (
    decision: "APPROVE" | "ADJUST" | "RETRY",
    field?: string,
    value?: string
  ) => {
    if (decision === "ADJUST") {
      setInputVal(value || "");
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`/api/briefing/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DECISION",
          decision,
          suggestedField: field,
          suggestedValue: value,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setMessages(json.data.conversationHistory);
        setProgress(json.data.progressPercent);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  // Enviar credenciais de rede social
  const handleSubmitCredentials = async (skip = false) => {
    setSending(true);
    try {
      const res = await fetch(`/api/briefing/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: skip ? "SKIP_CREDENTIALS" : "SUBMIT_CREDENTIALS",
          credentials: skip
            ? null
            : {
                username: igUser,
                password: igPass,
              },
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setMessages(json.data.conversationHistory);
        setProgress(json.data.progressPercent);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-4">
          <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin" />
        </div>
        <h2 className="text-lg font-bold">Iniciando seu Briefing...</h2>
        <p className="text-xs text-slate-400 mt-1">Conectando com a Sofia (IA da Otimizza)</p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-6 text-center">
        <div className="bg-rose-500/10 border border-rose-500/30 p-6 rounded-2xl max-w-sm">
          <h2 className="text-base font-bold text-rose-400 mb-2">Link Indisponível</h2>
          <p className="text-xs text-slate-300">
            {error || "Este link de briefing não foi encontrado ou expirou. Fale com a equipe da Otimizza."}
          </p>
        </div>
      </div>
    );
  }

  const isCompleted = progress >= 100 || session.status === "COMPLETED";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col max-w-lg mx-auto shadow-2xl relative">
      {/* Top Header & Sticky Progress */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 p-3.5">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-md">
                <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                </div>
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-900 rounded-full" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-white">Sofia</span>
                <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-500/30">
                  Otimizza IA
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-[200px]">
                Briefing: <strong className="text-slate-200">{session.companyName}</strong>
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs font-mono font-bold text-emerald-400">{progress}%</span>
            <span className="text-[10px] text-slate-400 block">Concluído</span>
          </div>
        </div>

        {/* Gamified Accelerated Progress Bar */}
        <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden relative">
          <div
            className="bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 h-full rounded-full transition-all duration-700 ease-out shadow-sm"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      {/* Chat Messages Feed */}
      <main className="flex-1 p-4 space-y-4 overflow-y-auto pb-32">
        {messages.map((msg) => {
          const isAssistant = msg.sender === "assistant";

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isAssistant ? "items-start" : "items-end"} space-y-2`}
            >
              {/* Balão de Mensagem */}
              <div
                className={`max-w-[88%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed shadow-sm ${
                  isAssistant
                    ? "bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-xs"
                    : "bg-emerald-600 text-white rounded-tr-xs"
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.text}</div>
              </div>

              {/* Bloco de Sugestão com Botões Interativos (Aprovar, Ajustar, Outra Opção) */}
              {msg.suggestedData && (
                <div className="w-full max-w-[95%] bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
                    <Zap className="w-3.5 h-3.5" />
                    <span>Sugestão Estratégica da Sofia:</span>
                  </div>

                  <p className="text-xs text-slate-200 italic bg-slate-900/60 p-2.5 rounded-xl border border-emerald-500/20">
                    &ldquo;{msg.suggestedData.value}&rdquo;
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      onClick={() =>
                        handleDecision("APPROVE", msg.suggestedData?.field, msg.suggestedData?.value)
                      }
                      className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs transition shadow-sm"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      Aprovar esta
                    </button>

                    <button
                      onClick={() =>
                        handleDecision("ADJUST", msg.suggestedData?.field, msg.suggestedData?.value)
                      }
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs border border-slate-700 transition"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      Ajustar
                    </button>

                    <button
                      onClick={() =>
                        handleDecision("RETRY", msg.suggestedData?.field, msg.suggestedData?.value)
                      }
                      className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-400 font-medium rounded-xl text-xs transition"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Outra
                    </button>
                  </div>
                </div>
              )}

              {/* Bloco de Coleta Segura de Senha do Instagram */}
              {msg.isCredentialStep && !session.credentialsSaved && (
                <div className="w-full max-w-[95%] bg-slate-900/95 border border-slate-700/80 rounded-2xl p-4 space-y-3 shadow-lg">
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Cofre Criptografado Otimizza (AES-256)</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Seus acessos serão armazenados com chave de alta segurança no ERP da assessoria.
                  </p>

                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Usuário ou E-mail do Instagram</label>
                      <input
                        type="text"
                        placeholder="@seuperfil"
                        value={igUser}
                        onChange={(e) => setIgUser(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Senha</label>
                      <div className="relative">
                        <input
                          type={showPass ? "text" : "password"}
                          placeholder="••••••••"
                          value={igPass}
                          onChange={(e) => setIgPass(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 pr-9"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPass(!showPass)}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200"
                        >
                          {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col gap-2">
                    <button
                      onClick={() => handleSubmitCredentials(false)}
                      disabled={!igUser || !igPass}
                      className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-slate-950 font-bold rounded-xl text-xs transition"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      Salvar Acesso com Segurança
                    </button>

                    <button
                      onClick={() => handleSubmitCredentials(true)}
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 text-slate-400 hover:text-slate-200 text-xs font-semibold transition"
                    >
                      <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-400" />
                      Prefiro enviar depois pelo WhatsApp
                    </button>
                  </div>
                </div>
              )}

              {/* Botões Rápidos de Opções */}
              {msg.options && msg.options.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {msg.options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        if (opt.action === "DONT_KNOW") {
                          handleDontKnow();
                        } else if (opt.action === "APPROVE" && opt.payload) {
                          handleSendMessage(String(opt.payload));
                        } else if (opt.value === "WHATSAPP") {
                          handleSubmitCredentials(true);
                        } else if (opt.value === "FINALIZE") {
                          handleDecision("APPROVE", "completion", "FINALIZE");
                        } else {
                          handleSendMessage(opt.label);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-emerald-300 font-semibold text-xs rounded-xl transition shadow-xs"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {sending && (
          <div className="flex items-center gap-2 text-xs text-slate-400 italic bg-slate-900/50 p-2.5 rounded-xl border border-slate-800/60 max-w-[200px]">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
            <span>Sofia está digitando...</span>
          </div>
        )}

        {isCompleted && (
          <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-5 text-center space-y-3 mt-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>
            <h3 className="font-bold text-white text-base">Briefing Entregue com Sucesso!</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              As diretrizes estratégicas da <strong>{session.companyName}</strong> já foram sincronizadas
              diretamente no sistema da Otimizza. A equipe da Otimizza dará os próximos passos.
            </p>
            <a
              href={`https://wa.me/?text=Ol%C3%A1%20equipe%20Otimizza!%20Acabei%20de%20finalizar%20o%20briefing%20de%20redes%20sociais%20da%20${encodeURIComponent(session.companyName)}.%20Podemos%20avan%C3%A7ar!`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs transition"
            >
              <WhatsAppIcon className="w-4 h-4" />
              Compartilhar conclusão no WhatsApp
            </a>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* Sticky Bottom Bar (Input + Botão 'Não sei') */}
      {!isCompleted && (
        <footer className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-slate-900/95 backdrop-blur-md border-t border-slate-800 p-3 z-30">
          <div className="flex items-center gap-2">
            {/* Botão de Socorro: "Não sei responder" */}
            <button
              type="button"
              onClick={handleDontKnow}
              title="Clique se não souber o que responder e Sofia te dará sugestões personalizadas"
              className="px-2.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 shrink-0 transition"
            >
              <HelpCircle className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Não sei</span>
            </button>

            {/* Input de Texto */}
            <input
              type="text"
              placeholder="Digite sua resposta..."
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="flex-1 bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition"
            />

            {/* Botão Enviar */}
            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={!inputVal.trim() || sending}
              className="p-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-30 text-slate-950 rounded-xl shrink-0 transition shadow-sm"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}
