"use client"

import { BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { NEXIFY_MANUAL_SECTIONS, NEXIFY_PATHS, NEXIFY_URLS } from "@/lib/operator/nexifyManualContent"

type NexifyManualSheetProps = {
  onOpen?: () => void
  className?: string
}

export function NexifyManualSheet({ onOpen, className }: NexifyManualSheetProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          className={
            className ??
            "btn-3d btn-glow gap-1 bg-gradient-to-br from-cyan-900/80 to-secondary/70 text-cyan-100 hover:from-cyan-800/80 hover:to-secondary/50 backdrop-blur-sm border border-cyan-500/30 shadow-lg text-[10px] px-2 py-1 h-7"
          }
          onClick={() => onOpen?.()}
        >
          <BookOpen className="w-3 h-3" />
          Manuál
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md overflow-y-auto bg-zinc-950/95 border-l border-cyan-500/20"
      >
        <SheetHeader>
          <SheetTitle className="text-cyan-300 font-[var(--font-heading)]">Nexify Manuál</SheetTitle>
          <SheetDescription className="text-zinc-400 text-xs">
            Kompletný návod — príkazy, ENV, iPhone, reštart stacku
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-5 text-sm pb-8">
          <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3 font-mono text-[11px] text-cyan-100/90">
            <div>iPhone: {NEXIFY_URLS.iphoneUi}</div>
            <div>PIN: {NEXIFY_URLS.pin}</div>
            <div className="mt-1 text-zinc-400 break-all">ENV: {NEXIFY_PATHS.envLocal}</div>
          </div>

          {NEXIFY_MANUAL_SECTIONS.map((section) => (
            <section key={section.id}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-cyan-400 mb-2">
                {section.title}
              </h3>
              <ul className="space-y-1.5 text-zinc-300 text-[12px] leading-relaxed">
                {section.lines.map((line) => (
                  <li key={line} className="pl-2 border-l border-zinc-700">
                    {line}
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-cyan-400 mb-2">
              Reštart stacku (copy)
            </h3>
            <pre className="rounded-lg bg-zinc-900 border border-zinc-700 p-3 text-[10px] text-emerald-300/90 overflow-x-auto whitespace-pre-wrap break-all">
              {`launchctl kickstart -k gui/$(id -u)/com.nexify.terminal`}
            </pre>
            <p className="text-[10px] text-zinc-500 mt-2 break-all">
              Projekt: {NEXIFY_PATHS.project}
            </p>
            <p className="text-[10px] text-zinc-500 break-all">
              README: {NEXIFY_PATHS.readme}
            </p>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}