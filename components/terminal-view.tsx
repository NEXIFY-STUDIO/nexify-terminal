"use client"

import { useEffect, useRef } from "react"

interface TerminalViewProps {
  sessionId: string
}

export function TerminalView({ sessionId }: TerminalViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<any>(null)

  useEffect(() => {
    let isDestroyed = false
    let eventSource: EventSource | null = null
    let termInstance: any = null
    let resizeHandler: (() => void) | null = null

    async function initTerminal() {
      // Dynamically import xterm to prevent SSR issues in Next.js
      const { Terminal } = await import("xterm")
      const { FitAddon } = await import("xterm-addon-fit")

      if (isDestroyed || !containerRef.current) return

      // Create terminal instance
      const term = new Terminal({
        cursorBlink: true,
        cursorStyle: "bar",
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        fontSize: 13,
        lineHeight: 1.2,
        theme: {
          background: "#09090b", // Match Zyricon background
          foreground: "#e4e4e7",
          cursor: "#06b6d4", // Cyan cursor
          cursorAccent: "#09090b",
          selectionBackground: "rgba(6, 182, 212, 0.3)",
          black: "#09090b",
          red: "#ef4444",
          green: "#22c55e",
          yellow: "#eab308",
          blue: "#3b82f6",
          magenta: "#a855f7",
          cyan: "#06b6d4",
          white: "#f4f4f5",
        },
      })

      termInstance = term
      terminalRef.current = term

      const fitAddon = new FitAddon()
      term.loadAddon(fitAddon)

      // Open terminal in element
      term.open(containerRef.current)
      fitAddon.fit()

      // Handle window resize event
      resizeHandler = () => {
        if (!isDestroyed && term && fitAddon) {
          try {
            fitAddon.fit()
            const { cols, rows } = term
            fetch(`/api/shell?path=sessions/${sessionId}/resize`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ cols, rows }),
            }).catch((err) => console.warn("Failed to send terminal resize:", err))
          } catch (e) {
            console.error("Resize fit error:", e)
          }
        }
      }

      window.addEventListener("resize", resizeHandler)
      
      // Perform initial resize delay to let DOM adjust
      setTimeout(() => {
        if (resizeHandler) resizeHandler()
      }, 100)

      // Listen for keystrokes in xterm and send them directly to PTY stdin
      term.onData((data) => {
        if (isDestroyed) return
        fetch(`/api/shell?path=sessions/${sessionId}/input`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: data }),
        }).catch((err) => console.error("Failed to write stdin:", err))
      })

      // Establish EventSource connection to stream terminal stdout/stderr back into xterm
      eventSource = new EventSource(`/api/shell?path=sessions/${sessionId}/stream`)
      
      eventSource.onmessage = (event) => {
        if (isDestroyed) return
        try {
          const data = JSON.parse(event.data)
          if (data.type === "output" && data.chunk) {
            term.write(data.chunk)
          }
        } catch (err) {
          console.error("Failed to parse SSE in xterm:", err)
        }
      }

      eventSource.onerror = () => {
        // Retry connection or close if session died
        if (eventSource) eventSource.close()
      }
    }

    initTerminal()

    return () => {
      isDestroyed = true
      if (eventSource) eventSource.close()
      if (termInstance) {
        termInstance.dispose()
      }
      if (resizeHandler) {
        window.removeEventListener("resize", resizeHandler)
      }
    }
  }, [sessionId])

  return (
    <div className="w-full h-full bg-[#09090b] rounded-2xl border border-border/40 shadow-2xl flex flex-col overflow-hidden relative">
      {/* Top Bar Decoration */}
      <div className="flex items-center justify-between border-b border-border/30 px-5 py-2.5 bg-black/40 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
          <span className="ml-2 text-xs font-semibold text-muted-foreground font-[var(--font-heading)] tracking-wider uppercase">
            Nexify Interactive Shell
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-[10px] font-medium text-cyan-400/80 tracking-wide uppercase">Interactive</span>
        </div>
      </div>
      
      {/* Actual Terminal Container */}
      <div className="flex-1 w-full h-full p-4 overflow-hidden relative">
        <div ref={containerRef} className="w-full h-full min-h-[350px] overflow-hidden" />
      </div>
    </div>
  )
}
