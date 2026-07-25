"use client"

import { useEffect, useRef, useState, type CSSProperties } from "react"
import {
  ChevronDown,
  MoreHorizontal,
  Paperclip,
  Settings,
  Upload,
  MessageSquare,
  Terminal,
  FolderOpen,
  Cpu,
  Scale,
  Code2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { NexifyManualSheet } from "@/components/nexify-manual-sheet"
import {
  NexifySettingsSheet,
  type NexifyModelOption,
} from "@/components/nexify-settings-sheet"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

export type NexifyViewMode =
  | "chat"
  | "terminal"
  | "files"
  | "system"
  | "insolvency"
  | "dual-chat"

const PRIMARY_VIEWS: Array<{ id: NexifyViewMode; label: string }> = [
  { id: "chat", label: "Chat" },
  { id: "terminal", label: "Terminal" },
  { id: "files", label: "Files" },
  { id: "system", label: "System" },
]

const OVERFLOW_VIEWS: Array<{ id: NexifyViewMode; label: string; icon: typeof Scale }> = [
  { id: "insolvency", label: "Insolvency", icon: Scale },
  { id: "dual-chat", label: "Dual Coder", icon: Code2 },
]

const MODEL_OPTIONS: NexifyModelOption[] = [
  { label: "Gemini 2.5 Flash", provider: "gemini", model: "gemini-2.5-flash" },
  { label: "GPT-4.1 Mini (GitHub)", provider: "github-models", model: "openai/gpt-4.1-mini" },
  { label: "Mistral Small", provider: "mistral", model: "mistral-small-latest" },
]

type NexifyHeaderProps = {
  viewMode: NexifyViewMode
  onViewModeChange: (mode: NexifyViewMode) => void
  activeModel: NexifyModelOption
  onModelChange: (model: NexifyModelOption) => void
  voiceLang: "sk-SK" | "en-US"
  onVoiceLangChange: (lang: "sk-SK" | "en-US") => void
  onClearChat: () => void
  onExportMarkdown: () => void
  onExportJson: () => void
  onAttachFiles: (files: FileList) => void
  onLock: () => void
  onHaptic?: (type: "light" | "medium" | "heavy") => void
}

export function NexifyHeader({
  viewMode,
  onViewModeChange,
  activeModel,
  onModelChange,
  voiceLang,
  onVoiceLangChange,
  onClearChat,
  onExportMarkdown,
  onExportJson,
  onAttachFiles,
  onLock,
  onHaptic,
}: NexifyHeaderProps) {
  const [modelOpen, setModelOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [viewsMoreOpen, setViewsMoreOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const rootRef = useRef<HTMLElement>(null)

  const primaryActive = PRIMARY_VIEWS.some((v) => v.id === viewMode)

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node
      if (!rootRef.current?.contains(target)) {
        setModelOpen(false)
        setExportOpen(false)
      }
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [])

  const shortModelLabel =
    activeModel.label.length > 14
      ? activeModel.label.replace(" (GitHub)", "").replace("Gemini 2.5 ", "Gem ").slice(0, 14)
      : activeModel.label

  return (
    <header
      ref={rootRef}
      data-testid="nexify-header"
      className="nexify-header relative z-20 border-b border-border/50 backdrop-blur-sm bg-background/30"
      style={
        {
          ["--tab-h" as string]: "44px",
          ["--hdr-h" as string]: "36px",
          ["--hdr-gap" as string]: "8px",
          ["--hdr-pad-x" as string]: "12px",
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 8px)",
          paddingBottom: "8px",
          paddingLeft: "var(--hdr-pad-x)",
          paddingRight: "var(--hdr-pad-x)",
        } as CSSProperties
      }
    >
      <div className="w-full max-w-[100vw] mx-auto flex flex-col gap-2">
        {/* Row 1: view tabs */}
        <div
          data-testid="nexify-view-tabs"
          className="flex w-full items-stretch rounded-lg border border-border/30 bg-secondary/80 shadow-lg overflow-hidden"
          style={{ minHeight: "44px", height: "44px" }}
        >
          {PRIMARY_VIEWS.map((view) => (
            <Button
              key={view.id}
              type="button"
              data-testid={`view-tab-${view.id}`}
              className={`flex-1 min-w-[44px] min-h-[44px] h-11 rounded-none px-1 text-[11px] font-medium active:scale-[0.98] ${
                viewMode === view.id
                  ? "bg-gradient-to-br from-primary via-gray-900 to-black text-white shadow-md"
                  : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/40"
              }`}
              onClick={() => {
                onHaptic?.("light")
                onViewModeChange(view.id)
              }}
            >
              <span className="truncate">{view.label}</span>
            </Button>
          ))}
          <Button
            type="button"
            data-testid="view-tab-more"
            aria-label="More views"
            className={`flex-none min-w-[44px] min-h-[44px] h-11 w-11 rounded-none px-0 transition-all duration-200 active:scale-[0.98] ${
              !primaryActive
                ? "bg-gradient-to-br from-primary via-gray-900 to-black text-white shadow-md"
                : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/40"
            }`}
            onClick={() => {
              onHaptic?.("light")
              setViewsMoreOpen(true)
            }}
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>

        {/* Row 2: actions */}
        <div
          data-testid="nexify-action-row"
          className="grid w-full grid-cols-4"
          style={{ gap: "var(--hdr-gap)", height: "var(--hdr-h)", minHeight: "var(--hdr-h)" }}
        >
          <div className="relative min-w-0">
            <Button
              type="button"
              data-testid="model-selector-trigger"
              className="nexify-hdr-btn w-full h-full min-h-0 gap-1 px-1.5 text-[11px] font-medium bg-gradient-to-br from-secondary/90 to-secondary/70 text-foreground border border-border/30 shadow-md active:scale-[0.98]"
              onClick={() => {
                setExportOpen(false)
                setModelOpen((v) => !v)
              }}
            >
              <span className="truncate">{shortModelLabel}</span>
              <ChevronDown
                className={`w-3 h-3 shrink-0 transition-transform ${modelOpen ? "rotate-180" : ""}`}
              />
            </Button>
            {modelOpen && (
              <div className="dropdown-menu absolute left-0 right-0 top-[calc(100%+4px)] z-50" data-testid="model-selector-menu">
                {MODEL_OPTIONS.map((opt) => (
                  <button
                    key={opt.model}
                    type="button"
                    className="dropdown-item text-[11px] w-full text-left"
                    onClick={() => {
                      onModelChange({
                        label: opt.label.replace(" (GitHub)", ""),
                        provider: opt.provider,
                        model: opt.model,
                      })
                      setModelOpen(false)
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <NexifyManualSheet
              onOpen={() => onHaptic?.("light")}
              className="nexify-hdr-btn w-full h-full min-h-0 gap-1 px-1.5 text-[11px] font-medium bg-gradient-to-br from-secondary/90 to-secondary/70 text-accent border border-accent/30 shadow-md active:scale-[0.98]"
            />
          </div>

          <div className="relative min-w-0">
            <Button
              type="button"
              data-testid="export-trigger"
              className="nexify-hdr-btn w-full h-full min-h-0 gap-1 px-1.5 text-[11px] font-medium bg-gradient-to-br from-secondary/90 to-secondary/70 text-foreground border border-border/30 shadow-md active:scale-[0.98]"
              onClick={() => {
                setModelOpen(false)
                setExportOpen((v) => !v)
              }}
            >
              <Upload className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Export</span>
            </Button>
            {exportOpen && (
              <div className="dropdown-menu absolute left-0 right-0 top-[calc(100%+4px)] z-50" data-testid="export-menu">
                <button
                  type="button"
                  className="dropdown-item text-[11px] w-full text-left"
                  onClick={() => {
                    setExportOpen(false)
                    void onExportMarkdown()
                  }}
                >
                  Export as Markdown
                </button>
                <button
                  type="button"
                  className="dropdown-item text-[11px] w-full text-left"
                  onClick={() => {
                    setExportOpen(false)
                    void onExportJson()
                  }}
                >
                  Export as JSON
                </button>
              </div>
            )}
          </div>

          <div className="min-w-0">
            <Button
              type="button"
              data-testid="more-trigger"
              aria-label="More"
              className="nexify-hdr-btn w-full h-full min-h-0 gap-1 px-1.5 text-[11px] font-medium bg-gradient-to-br from-secondary/90 to-secondary/70 text-foreground border border-border/30 shadow-md active:scale-[0.98]"
              onClick={() => {
                onHaptic?.("light")
                setMoreOpen(true)
              }}
            >
              <MoreHorizontal className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">More</span>
            </Button>
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        data-testid="attach-file-input"
        onChange={(e) => {
          if (e.target.files?.length) {
            onAttachFiles(e.target.files)
            e.target.value = ""
          }
        }}
      />

      {/* Overflow views sheet */}
      <Sheet open={viewsMoreOpen} onOpenChange={setViewsMoreOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl bg-zinc-950/95 border-t border-border/40 max-h-[min(85dvh,640px)] overflow-y-auto"
          data-testid="more-views-sheet"
        >
          <SheetHeader>
            <SheetTitle className="text-sm">More views</SheetTitle>
            <SheetDescription className="text-xs">Insolvency and Dual Coder</SheetDescription>
          </SheetHeader>
          <div className="mt-4 grid gap-2 pb-8">
            {OVERFLOW_VIEWS.map((view) => {
              const Icon = view.icon
              return (
                <button
                  key={view.id}
                  type="button"
                  data-testid={`view-overflow-${view.id}`}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 min-h-11 text-sm text-left transition-colors ${
                    viewMode === view.id
                      ? "border-accent/40 bg-accent/10 text-accent"
                      : "border-border/40 bg-secondary/30 hover:bg-secondary/50"
                  }`}
                  onClick={() => {
                    onViewModeChange(view.id)
                    setViewsMoreOpen(false)
                  }}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {view.label}
                </button>
              )
            })}
            {PRIMARY_VIEWS.map((view) => {
              const icons = {
                chat: MessageSquare,
                terminal: Terminal,
                files: FolderOpen,
                system: Cpu,
              } as const
              const Icon = icons[view.id as keyof typeof icons]
              return (
                <button
                  key={`overflow-primary-${view.id}`}
                  type="button"
                  className="flex items-center gap-3 rounded-xl border border-border/30 bg-transparent px-4 py-2.5 text-xs text-muted-foreground text-left"
                  onClick={() => {
                    onViewModeChange(view.id)
                    setViewsMoreOpen(false)
                  }}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {view.label}
                </button>
              )
            })}
          </div>
        </SheetContent>
      </Sheet>

      {/* More actions sheet */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl bg-zinc-950/95 border-t border-border/40">
          <SheetHeader>
            <SheetTitle className="text-sm">More</SheetTitle>
            <SheetDescription className="text-xs">Clear, attach, settings</SheetDescription>
          </SheetHeader>
          <div className="mt-4 grid gap-2 pb-6">
            <button
              type="button"
              data-testid="more-clear-chat"
              className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive text-left"
              onClick={() => {
                onClearChat()
                setMoreOpen(false)
              }}
            >
              Clear Chat
            </button>
            <button
              type="button"
              data-testid="more-attach"
              className="flex items-center gap-3 rounded-xl border border-border/40 bg-secondary/30 px-4 py-3 text-sm text-left hover:bg-secondary/50"
              onClick={() => {
                setMoreOpen(false)
                fileInputRef.current?.click()
              }}
            >
              <Paperclip className="w-4 h-4" />
              Attach file
            </button>
            <button
              type="button"
              data-testid="more-settings"
              className="flex items-center gap-3 rounded-xl border border-border/40 bg-secondary/30 px-4 py-3 text-sm text-left hover:bg-secondary/50"
              onClick={() => {
                setMoreOpen(false)
                setSettingsOpen(true)
              }}
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
            {OVERFLOW_VIEWS.map((view) => {
              const Icon = view.icon
              return (
                <button
                  key={`more-${view.id}`}
                  type="button"
                  className="flex items-center gap-3 rounded-xl border border-border/40 bg-secondary/20 px-4 py-3 text-sm text-left"
                  onClick={() => {
                    onViewModeChange(view.id)
                    setMoreOpen(false)
                  }}
                >
                  <Icon className="w-4 h-4" />
                  {view.label}
                </button>
              )
            })}
          </div>
        </SheetContent>
      </Sheet>

      <NexifySettingsSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        hideTrigger
        activeModel={activeModel}
        onModelChange={onModelChange}
        voiceLang={voiceLang}
        onVoiceLangChange={onVoiceLangChange}
        onLock={onLock}
      />
    </header>
  )
}
