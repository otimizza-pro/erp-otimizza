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
  ThumbsUp,
  Sliders,
  ShieldCheck,
  Check,
  Clock,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/whatsapp";

interface ChatOption {
  label: string;
  value: string;
  action?: "APPROVE" | "DONT_KNOW" | "ADJUST" | "RETRY" | "EXPLAIN" | "NEXT";
  payload?: unknown;
}

interface ChatSlider {
  id: string;
  field: string;
  title: string;
  leftLabel: string;
  rightLabel: string;
  defaultValue: number;
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
  slider?: ChatSlider;
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

function formatCleanText(text?: string | null): string {
  if (!text) return "";
  return text.replace(/\*\*/g, "").replace(/\*/g, "");
}

function getGamifiedStage(percent: number): { step: number; name: string } {
  if (percent >= 95) return { step: 5, name: "Conexão e Entrega Final 🚀" };
  if (percent >= 75) return { step: 4, name: "Inspirações e Referências 💡" };
  if (percent >= 50) return { step: 3, name: "Seu Estilo de Falar 🎙️" };
  if (percent >= 30) return { step: 2, name: "Seus Diferenciais Reais ⭐" };
  return { step: 1, name: "Quem você atende 🎯" };
}

export default function PublicBriefingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);

  const [session, setSession] = useState<BriefingSessionData | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [progress, setProgress] = useState<number>(15);
  const [inputVal, setInputVal] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [sending, setSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Slider interativo
  const [sliderVal, setSliderVal] = useState<number>(50);

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

  useEffect(() => {
    async function loadSession() {
      setLoading(true);
      try {
        const res = await fetch(`/api/briefing/${token}`);
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || "Sessão não encontrada.");

        setSession(json.data);
        setMessages(json.data.conversationHistory || []);
        setProgress(json.data.progressPercent || 15);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Erro ao carregar o briefing.");
      } finally {
        setLoading(false);
      }
    }

    loadSession();
  }, [token]);

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

  const handlePauseSession = async () => {
    if (sending) return;
    setSending(true);

    try {
      const res = await fetch(`/api/briefing/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "PAUSE" }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setMessages(json.data.conversationHistory);
      }
    } catch (err) {
      console.error("Erro ao pausar sessão:", err);
    } finally {
      setSending(false);
    }
  };

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
      console.error("Erro ao solicitar sugestão:", err);
    } finally {
      setSending(false);
    }
  };

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
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center text-zinc-900 p-4">
        <div className="w-12 h-12 rounded-xl bg-white border border-zinc-200 shadow-sm flex items-center justify-center mb-4">
          <RefreshCw className="w-5 h-5 text-zinc-700 animate-spin" />
        </div>
        <h2 className="text-base font-semibold text-zinc-900">Iniciando conversa com Edivânia...</h2>
        <p className="text-xs text-zinc-500 mt-1">Estrategista de comunicação da Otimizza</p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center text-zinc-900 p-6 text-center">
        <div className="bg-white border border-zinc-200 p-6 rounded-2xl max-w-sm shadow-sm">
          <h2 className="text-base font-bold text-zinc-900 mb-2">Link não disponível</h2>
          <p className="text-xs text-zinc-600">
            {error || "Este link de briefing não foi encontrado ou já foi concluído. Fale com a equipe da Otimizza."}
          </p>
        </div>
      </div>
    );
  }

  const isCompleted = progress >= 100 || session.status === "COMPLETED";
  const stage = getGamifiedStage(progress);

  return (
    <div className="min-h-screen bg-zinc-100/80 text-zinc-900 flex flex-col items-center justify-start sm:p-4">
      {/* Container Principal Estilo Card Profissional */}
      <div className="w-full max-w-xl bg-white border-x sm:border border-zinc-200 sm:rounded-2xl shadow-sm flex flex-col h-screen sm:h-[92vh] overflow-hidden relative">
        {/* Header Profissional Claro */}
        <header className="bg-white border-b border-zinc-200 px-4 py-3 shrink-0 z-20">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  E
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-semibold text-sm text-zinc-950">Edivânia</h1>
                  <span className="text-[10px] font-medium bg-zinc-100 text-zinc-700 px-1.5 py-0.5 rounded border border-zinc-200">
                    Estrategista Otimizza
                  </span>
                </div>
                <p className="text-xs text-zinc-500 truncate max-w-[220px]">
                  Briefing: <strong className="text-zinc-800 font-medium">{session.companyName}</strong>
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-mono font-bold text-zinc-900 tabular-nums">{progress}%</span>
              <span className="text-[11px] text-zinc-400 block">Concluído</span>
            </div>
          </div>

          {/* Barra de Progresso Gamificada & Nível */}
          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between text-[11px] font-medium text-zinc-500">
              <span>Etapa {stage.step} de 5</span>
              <span className="text-zinc-700 font-semibold">{stage.name}</span>
            </div>
            <div className="w-full bg-zinc-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-zinc-900 h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </header>

        {/* Feed de Mensagens */}
        <main className="flex-1 p-4 space-y-4 overflow-y-auto bg-zinc-50/50 pb-28">
          {messages.map((msg) => {
            const isAssistant = msg.sender === "assistant";

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isAssistant ? "items-start" : "items-end"} space-y-2`}
              >
                {/* Balão de Mensagem */}
                <div
                  className={`max-w-[88%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed shadow-2xs ${
                    isAssistant
                      ? "bg-white border border-zinc-200 text-zinc-900 rounded-tl-xs"
                      : "bg-zinc-950 text-white rounded-tr-xs"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{formatCleanText(msg.text)}</div>
                </div>

                {/* Slider Interativo de Tom de Voz / Estilo */}
                {msg.slider && (
                  <div className="w-full max-w-[95%] bg-white border border-zinc-200 rounded-xl p-4 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                      <span className="text-xs font-semibold text-zinc-950">{msg.slider.title}</span>
                      <span className="text-[11px] font-medium text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                        {sliderVal < 40
                          ? `Mais ${msg.slider.leftLabel}`
                          : sliderVal > 60
                          ? `Mais ${msg.slider.rightLabel}`
                          : "Equilíbrio entre ambos"}
                      </span>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-[11px] font-medium text-zinc-600">
                        <span>{msg.slider.leftLabel}</span>
                        <span>{msg.slider.rightLabel}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={sliderVal}
                        onChange={(e) => setSliderVal(Number(e.target.value))}
                        className="w-full accent-zinc-900 cursor-pointer h-2 bg-zinc-200 rounded-lg"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const styleChoice =
                          sliderVal < 40
                            ? `Preferência de estilo: mais ${msg.slider?.leftLabel}`
                            : sliderVal > 60
                            ? `Preferência de estilo: mais ${msg.slider?.rightLabel}`
                            : `Preferência de estilo: equilíbrio natural entre ${msg.slider?.leftLabel} e ${msg.slider?.rightLabel}`;
                        handleSendMessage(styleChoice);
                      }}
                      className="w-full py-2 bg-zinc-950 hover:bg-zinc-800 text-white font-medium text-xs rounded-lg transition"
                    >
                      Confirmar este estilo
                    </button>
                  </div>
                )}

                {/* Sugestão de Aprovação com 1 Clique */}
                {msg.suggestedData && (
                  <div className="w-full max-w-[95%] bg-white border border-zinc-200 rounded-xl p-3.5 space-y-2.5 shadow-2xs">
                    <div className="flex items-center gap-1.5 text-zinc-900 text-xs font-semibold">
                      <Sparkles className="w-3.5 h-3.5 text-zinc-700" />
                      <span>Sugestão da Edivânia para o seu nicho:</span>
                    </div>

                    <p className="text-xs text-zinc-800 bg-zinc-50 p-2.5 rounded-lg border border-zinc-200 leading-relaxed">
                      &ldquo;{formatCleanText(msg.suggestedData.value)}&rdquo;
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        onClick={() =>
                          handleDecision("APPROVE", msg.suggestedData?.field, msg.suggestedData?.value)
                        }
                        className="flex-1 min-w-[130px] inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-zinc-950 hover:bg-zinc-800 text-white font-medium rounded-lg text-xs transition"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        Gostei, usar esta!
                      </button>

                      <button
                        onClick={() =>
                          handleDecision("ADJUST", msg.suggestedData?.field, msg.suggestedData?.value)
                        }
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-zinc-50 text-zinc-700 font-medium rounded-lg text-xs border border-zinc-200 transition"
                      >
                        <Sliders className="w-3.5 h-3.5 text-zinc-500" />
                        Personalizar
                      </button>

                      <button
                        onClick={() =>
                          handleDecision("RETRY", msg.suggestedData?.field, msg.suggestedData?.value)
                        }
                        className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 bg-white hover:bg-zinc-50 text-zinc-600 font-medium rounded-lg text-xs border border-zinc-200 transition"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-zinc-500" />
                        Outra opção
                      </button>
                    </div>
                  </div>
                )}

                {/* Coleta Segura de Senha do Instagram */}
                {msg.isCredentialStep && !session.credentialsSaved && (
                  <div className="w-full max-w-[95%] bg-white border border-zinc-200 rounded-xl p-4 space-y-3 shadow-2xs">
                    <div className="flex items-center gap-2 text-zinc-900 text-xs font-semibold">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Cofre Criptografado Otimizza (AES-256)</span>
                    </div>
                    <p className="text-xs text-zinc-500">
                      Seus acessos serão armazenados com criptografia de ponta a ponta no servidor seguro da assessoria.
                    </p>

                    <div className="space-y-2">
                      <div>
                        <label className="text-[11px] text-zinc-600 block mb-1 font-medium">Usuário ou E-mail do Instagram</label>
                        <input
                          type="text"
                          placeholder="@seuperfil"
                          value={igUser}
                          onChange={(e) => setIgUser(e.target.value)}
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs text-zinc-900 placeholder-zinc-400 focus:bg-white focus:outline-none focus:border-zinc-400"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-zinc-600 block mb-1 font-medium">Senha</label>
                        <div className="relative">
                          <input
                            type={showPass ? "text" : "password"}
                            placeholder="••••••••"
                            value={igPass}
                            onChange={(e) => setIgPass(e.target.value)}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs text-zinc-900 placeholder-zinc-400 focus:bg-white focus:outline-none focus:border-zinc-400 pr-9"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPass(!showPass)}
                            className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600"
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
                        className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 bg-zinc-950 hover:bg-zinc-800 disabled:opacity-40 text-white font-medium rounded-lg text-xs transition"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        Salvar Acesso no Cofre
                      </button>

                      <button
                        onClick={() => handleSubmitCredentials(true)}
                        className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 text-zinc-600 hover:text-zinc-900 text-xs font-medium transition"
                      >
                        <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600" />
                        Prefiro enviar depois pelo WhatsApp
                      </button>
                    </div>
                  </div>
                )}

                {/* Opções Rápidas (Chips / Múltipla Escolha) */}
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
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-800 font-medium text-xs rounded-lg transition shadow-2xs active:scale-[0.98]"
                      >
                        {formatCleanText(opt.label)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {sending && (
            <div className="flex items-center gap-2 text-xs text-zinc-500 bg-white p-2.5 rounded-xl border border-zinc-200 shadow-2xs max-w-[200px]">
              <RefreshCw className="w-3.5 h-3.5 text-zinc-700 animate-spin" />
              <span>Edivânia está digitando...</span>
            </div>
          )}

          {isCompleted && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center space-y-3 mt-4">
              <div className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-700">
                <Check className="w-5 h-5 stroke-[2.5]" />
              </div>
              <h3 className="font-semibold text-zinc-950 text-sm">Briefing Entregue com Sucesso!</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                As orientações estratégicas da <strong>{session.companyName}</strong> já foram sincronizadas
                diretamente no sistema da Otimizza. Nossa equipe já tem tudo o que precisa para iniciar a criação dos conteúdos.
              </p>
              <a
                href={`https://wa.me/?text=Ol%C3%A1%20equipe%20Otimizza!%20Acabei%20de%20finalizar%20o%20briefing%20de%20redes%20sociais%20da%20${encodeURIComponent(session.companyName)}.%20Podemos%20avan%C3%A7ar!`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-xs transition"
              >
                <WhatsAppIcon className="w-4 h-4" />
                Avisar conclusão no WhatsApp
              </a>
            </div>
          )}

          <div ref={messagesEndRef} />
        </main>

        {/* Rodapé Fixo Profissional */}
        {!isCompleted && (
          <footer className="bg-white border-t border-zinc-200 p-3 shrink-0 z-20">
            <div className="flex items-center gap-2">
              {/* Botão de Pausa: 'Responder depois' */}
              <button
                type="button"
                onClick={handlePauseSession}
                title="Salvar respostas com segurança e continuar em outro momento"
                className="h-10 px-3 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border border-zinc-200 rounded-lg text-xs font-medium flex items-center gap-1.5 shrink-0 transition"
              >
                <Clock className="w-3.5 h-3.5 text-zinc-500" />
                <span className="hidden sm:inline">Responder depois</span>
                <span className="sm:hidden">Pausar</span>
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
                className="flex-1 h-10 bg-zinc-50 border border-zinc-200 rounded-lg px-3.5 text-xs text-zinc-900 placeholder-zinc-400 focus:bg-white focus:outline-none focus:border-zinc-400 transition"
              />

              {/* Botão Enviar */}
              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!inputVal.trim() || sending}
                className="h-10 w-10 flex items-center justify-center bg-zinc-950 hover:bg-zinc-800 disabled:opacity-30 text-white rounded-lg shrink-0 transition shadow-xs"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}
