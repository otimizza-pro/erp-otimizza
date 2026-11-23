export function isOnboardingTemplate(code?: string | null) {
  return Boolean(code?.startsWith("ONB-"));
}

export function isEditorialTemplate(code?: string | null, name?: string | null) {
  return !isOnboardingTemplate(code) && !/onboarding/i.test(name || "") &&
    (Boolean(code?.startsWith("DEL-SOCIAL")) || /social media|editorial/i.test(name || ""));
}
