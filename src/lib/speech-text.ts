import type { Locale } from "./i18n.ts"

export const SPEECH_LANG: Record<Locale, string> = {
  "zh-HK": "yue-Hant-HK",
  "zh-CN": "cmn-Hans-CN",
  en: "en-US",
}

// Spoken text goes after what the visitor already typed, never in place of it.
export function appendSpeech(typed: string, spoken: string, locale: Locale, max: number): string {
  const said = spoken.trim()
  if (!said) return typed.slice(0, max)
  const gap = typed && locale === "en" && !/\s$/.test(typed) ? " " : ""
  return (typed + gap + said).slice(0, max)
}
