"use client";
import { COMMUNICATION_OPTIONS, CommunicationProfile } from "@/modules/clients/communication-profile";
export function CommunicationProfileFields({
  value,
  onChange,
  onBlur,
  detailsAction,
}: {
  value: CommunicationProfile;
  onChange: (value: CommunicationProfile) => void;
  onBlur?: () => void;
  detailsAction?: React.ReactNode;
}) {
  const groups = {
    speakerTypes: "Quem comunica",
    audienceTypes: "Com quem fala",
    contentVoices: "Como aparece no conteúdo",
  };
  return (
    <section className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-5 shadow-2xs">
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-950">
          Perfil de comunicação
        </h2>
        <p className="text-xs leading-relaxed text-zinc-500 mt-0.5">
          Marque todas as opções que se aplicam. Quem aparece no vídeo pode representar a empresa sem falar em nome próprio.
        </p>
      </div>
      {(Object.entries(groups) as [keyof typeof groups, string][]).map(([field, label]) => (
        <fieldset key={field}>
          <legend className="text-xs font-semibold text-zinc-800 mb-2">{label}</legend>
          <div className="grid sm:grid-cols-2 gap-2">
            {COMMUNICATION_OPTIONS[field].map(option => (
              <label
                key={option}
                className="flex gap-2.5 items-start text-xs p-3 border border-zinc-200 rounded-xl bg-zinc-50/50 cursor-pointer transition hover:bg-zinc-100"
              >
                <input
                  type="checkbox"
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-zinc-950 cursor-pointer"
                  checked={value[field].includes(option)}
                  onChange={() => {
                    const next = {
                      ...value,
                      [field]: value[field].includes(option)
                        ? value[field].filter(v => v !== option)
                        : [...value[field], option],
                    };
                    onChange(next);
                    onBlur?.();
                  }}
                />
                <span className="text-zinc-700">{option}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-semibold text-zinc-800">
            Detalhes e orientações
          </label>
          {detailsAction}
        </div>
        <textarea
          className="block w-full rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-xs sm:text-sm font-normal leading-relaxed text-zinc-900 outline-none focus:border-zinc-500 focus:bg-white focus:ring-2 focus:ring-purple-600/20 min-h-[160px] resize-y"
          rows={6}
          maxLength={5000}
          value={value.details}
          onChange={e => onChange({ ...value, details: e.target.value })}
          onBlur={onBlur}
          placeholder="Ex.: a médica grava como porta-voz da clínica; fala com pacientes e familiares, usando nós para a instituição e eu apenas ao relatar experiência pessoal."
        />
      </div>
      <p className="text-xs text-zinc-500">
        No Estúdio, selecione o público e o emissor de cada peça. Marcar vários perfis não significa falar com todos na mesma publicação.
      </p>
    </section>
  );
}
