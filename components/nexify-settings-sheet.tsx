"use client"

import { useEffect, useState } from "react"
import { Lock, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { resolveSpeechLanguage } from "@/lib/operator/voiceInput.mjs"

export type NexifyModelOption = {
  label: string
  provider: string
  model: string
}

type NexifySettingsSheetProps = {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  activeModel: NexifyModelOption
  onModelChange: (model: NexifyModelOption) => void
  voiceLang: "sk-SK" | "en-US"
  onVoiceLangChange: (lang: "sk-SK" | "en-US") => void
  onLock: () => void
  triggerClassName?: string
  hideTrigger?: boolean
}

const MODEL_OPTIONS: NexifyModelOption[] = [
  { label: "Mistral Small", provider: "mistral", model: "mistral-small-latest" },
  { label: "Gemini 2.5 Flash", provider: "gemini", model: "gemini-2.5-flash" },
  { label: "GPT-4.1 Mini", provider: "github-models", model: "openai/gpt-4.1-mini" },
]

export function NexifySettingsSheet({
  open,
  onOpenChange,
  activeModel,
  onModelChange,
  voiceLang,
  onVoiceLangChange,
  onLock,
  triggerClassName,
  hideTrigger = false,
}: NexifySettingsSheetProps) {
  const [stackStatus, setStackStatus] = useState<string>("…")

  useEffect(() => {
    if (!open) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/health", { cache: "no-store" })
        const data = await res.json()
        if (cancelled) return
        const overall = data.overall || data.status || "unknown"
        const ai = data.ai?.status ?? "?"
        const hack = data.hackApi?.status ?? "?"
        setStackStatus(`stack ${overall} · ai ${ai} · hack ${hack}`)
      } catch {
        if (!cancelled) setStackStatus("health unreachable")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {!hideTrigger && (
        <SheetTrigger asChild>
          <Button
            type="button"
            data-testid="settings-trigger"
            className={
              triggerClassName ??
              "nexify-hdr-btn active:scale-[0.98] gap-1 text-[11px]"
            }
          >
            <Settings className="w-3.5 h-3.5" />
            Settings
          </Button>
        </SheetTrigger>
      )}
      <SheetContent
        side="right"
        className="w-full sm:max-w-md overflow-y-auto bg-zinc-950/95 border-l border-border/40"
      >
        <SheetHeader>
          <SheetTitle className="font-[var(--font-heading)]">Settings</SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            Default model, voice language, lock screen
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-5 pb-8">
          <section>
            <h3 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Default model
            </h3>
            <div className="space-y-1.5">
              {MODEL_OPTIONS.map((opt) => (
                <button
                  key={opt.model}
                  type="button"
                  className={`w-full text-left rounded-lg border px-3 py-2.5 text-xs transition-colors ${
                    activeModel.model === opt.model
                      ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-100"
                      : "border-border/40 bg-secondary/30 text-foreground hover:bg-secondary/50"
                  }`}
                  onClick={() => onModelChange(opt)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Voice language
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {(["sk-SK", "en-US"] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  className={`rounded-lg border px-3 py-2.5 text-xs font-mono transition-colors ${
                    voiceLang === lang
                      ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-100"
                      : "border-border/40 bg-secondary/30 text-foreground hover:bg-secondary/50"
                  }`}
                  onClick={() => onVoiceLangChange(lang)}
                >
                  {lang}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground">
              Browser default: {resolveSpeechLanguage(typeof navigator !== "undefined" ? navigator.language : "")}
            </p>
          </section>

          <section>
            <h3 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Stack status
            </h3>
            <div className="rounded-lg border border-border/40 bg-secondary/20 px-3 py-2.5 font-mono text-[11px] text-muted-foreground">
              {stackStatus}
            </div>
          </section>

          <section>
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 gap-2 border-amber-500/30 text-amber-100 hover:bg-amber-500/10"
              onClick={() => {
                onLock()
                onOpenChange?.(false)
              }}
            >
              <Lock className="w-4 h-4" />
              Lock screen
            </Button>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}
