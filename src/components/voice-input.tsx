"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import type { Locale } from "@/lib/i18n"
import { appendSpeech, SPEECH_LANG } from "@/lib/speech-text"

// Only the parts of the Web Speech API used here; TypeScript's DOM library does not ship it.
type Recognition = {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}
type RecognitionClass = new () => Recognition

// No new words for this long after the last result means the visitor has finished.
const SILENCE_MS = 1500

// Kept here rather than in i18n.ts, which changes often upstream.
const LABEL: Record<Locale, Record<"voice" | "idle" | "listening" | "finishing" | "privacy" | "denied", string>> = {
  "zh-HK": {
    voice: "語音輸入",
    idle: "講",
    listening: "聆聽中",
    finishing: "處理中",
    privacy: "語音由瀏覽器辨識；Chrome 會將聲音傳送至 Google。講完會自動停，再按「問」先送出。",
    denied: "未能使用咪高峰，請檢查瀏覽器權限。",
  },
  "zh-CN": {
    voice: "语音输入",
    idle: "说",
    listening: "聆听中",
    finishing: "处理中",
    privacy: "语音由浏览器识别；Chrome 会将声音传送至 Google。说完会自动停，再按「问」才送出。",
    denied: "未能使用麦克风，请检查浏览器权限。",
  },
  en: {
    voice: "Voice input",
    idle: "Talk",
    listening: "Listening",
    finishing: "Finishing",
    privacy: "Your browser recognises the speech; Chrome sends the audio to Google. It stops when you pause; press Ask to send.",
    denied: "The microphone is not available; check the browser's permission.",
  },
}

function recognitionClass(): RecognitionClass | null {
  const scope = window as unknown as { SpeechRecognition?: RecognitionClass; webkitSpeechRecognition?: RecognitionClass }
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null
}

// Chrome on phones has the API but heard nothing in testing, so touch screens get no button.
function canListen(): boolean {
  return recognitionClass() !== null && !window.matchMedia("(pointer: coarse)").matches
}

const subscribe = () => () => {}

export function VoiceInput(props: { locale: Locale; value: string; max: number; onChange: (text: string) => void }) {
  const { locale, value, max, onChange } = props
  const label = LABEL[locale]
  const supported = useSyncExternalStore(subscribe, canListen, () => false)
  const [state, setState] = useState<"idle" | "listening" | "finishing">("idle")
  const [denied, setDenied] = useState(false)
  const recognition = useRef<Recognition | null>(null)
  const silence = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(
    () => () => {
      clearTimeout(silence.current)
      recognition.current?.abort()
    },
    [],
  )

  // Safari, Firefox and phones get no button.
  if (!supported) return null

  const finish = () => {
    clearTimeout(silence.current)
    setState("finishing")
    recognition.current?.stop()
  }

  const start = () => {
    const Recognition = recognitionClass()
    if (!Recognition) return
    const typed = value
    const listener = new Recognition()
    listener.lang = SPEECH_LANG[locale]
    listener.continuous = true
    listener.interimResults = true
    listener.maxAlternatives = 1
    listener.onresult = (event) => {
      let spoken = ""
      for (let index = 0; index < event.results.length; index += 1) spoken += event.results[index][0].transcript
      onChange(appendSpeech(typed, spoken, locale, max))
      // The silence clock starts at the latest result, not when listening began.
      clearTimeout(silence.current)
      silence.current = setTimeout(finish, SILENCE_MS)
    }
    listener.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed" || event.error === "audio-capture") setDenied(true)
    }
    // Recognition ends here; it is never restarted on its own.
    listener.onend = () => {
      clearTimeout(silence.current)
      recognition.current = null
      setState("idle")
    }
    recognition.current = listener
    setDenied(false)
    setState("listening")
    listener.start()
  }

  const note = denied ? label.denied : state === "idle" ? null : label.privacy

  return (
    <>
      <button
        type="button"
        onClick={state === "idle" ? start : finish}
        disabled={state === "finishing"}
        aria-label={`${label.voice}: ${label[state]}`}
        aria-pressed={state !== "idle"}
        className={`shrink-0 border px-2 py-1 font-[family-name:var(--font-hud)] text-[0.7rem] tracking-[0.08em] text-cyan-50 disabled:opacity-40 ${
          state === "listening" ? "animate-pulse border-rose-300/80 bg-rose-500/20" : "border-cyan-200/40"
        }`}
      >
        {label[state]}
      </button>
      {note ? (
        // basis-full and order-last put the note on its own line under the question box and the Ask button.
        <span role="status" className="order-last basis-full text-[0.65rem] leading-snug text-zinc-400">
          {note}
        </span>
      ) : null}
    </>
  )
}
