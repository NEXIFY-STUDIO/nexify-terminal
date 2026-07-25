"use client"

import { useEffect, useRef } from "react"

interface TerminalViewProps {
  sessionId: string
}

export function TerminalView({ sessionId }: TerminalViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<any>(null)
  const fitAddonRef = useRef<any>(null)

  useEffect(() => {
    let isDestroyed = false
    let eventSource: EventSource | null = null
    let handleResize: (() => void) | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let resizeObserver: ResizeObserver | null = null

    function connectStream(term: any) {
      if (isDestroyed) return
      if (eventSource) {
        eventSource.close()
        eventSource = null
      }
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
        if (eventSource) {
          eventSource.close()
          eventSource = null
        }
        if (isDestroyed) return
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null
          if (!isDestroyed && terminalRef.current) {
            connectStream(terminalRef.current)
          }
        }, 1500)
      }
    }

    async function initTerminal() {
      const { Terminal } = await import("xterm")
      const { FitAddon } = await import("xterm-addon-fit")
      await import("xterm/css/xterm.css")

      if (isDestroyed || !containerRef.current) return

      const term = new Terminal({
        cursorBlink: true,
        cursorStyle: "bar",
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        fontSize: 13,
        lineHeight: 1.2,
        theme: {
          background: "#09090b",
          foreground: "#e4e4e7",
          cursor: "#06b6d4",
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

      terminalRef.current = term

      const fitAddon = new FitAddon()
      fitAddonRef.current = fitAddon
      term.loadAddon(fitAddon)

      term.open(containerRef.current)

      handleResize = () => {
        if (!isDestroyed && term && fitAddon && containerRef.current) {
          const { width, height } = containerRef.current.getBoundingClientRect()
          if (width < 8 || height < 8) return
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

      window.addEventListener("resize", handleResize)

      resizeObserver = new ResizeObserver(() => {
        if (handleResize) handleResize()
      })
      resizeObserver.observe(containerRef.current)

      // Double rAF + short delay: tab switch often mounts before layout settles (402×874).
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (handleResize) handleResize()
        })
      })
      setTimeout(() => {
        if (handleResize) handleResize()
      }, 120)

      term.onData((data) => {
        if (isDestroyed) return
        fetch(`/api/shell?path=sessions/${sessionId}/input`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: data }),
        }).catch((err) => console.error("Failed to write stdin:", err))
      })

      connectStream(term)
    }

    initTerminal()

    return () => {
      isDestroyed = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      if (eventSource) eventSource.close()
      if (resizeObserver) {
        resizeObserver.disconnect()
        resizeObserver = null
      }
      if (terminalRef.current) {
        terminalRef.current.dispose()
      }
      fitAddonRef.current = null
      if (handleResize) {
        window.removeEventListener("resize", handleResize)
      }
    }
  }, [sessionId])

  return (
    <div className="w-full h-full bg-[#09090b] rounded-2xl border border-border/40 shadow-2xl flex flex-col overflow-hidden relative">
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

      <div className="flex-1 w-full h-full p-4 overflow-hidden relative">
        <div ref={containerRef} className="w-full h-full min-h-[350px] overflow-hidden" data-testid="xterm-container" />
      </div>
    </div>
  )
}
