"use client"

import { useState, useRef, useEffect, Dispatch, SetStateAction, ChangeEvent, KeyboardEvent } from "react"
import { Send, Copy, Check, Sparkles, Bot, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

export function DualChatArea() {
  const { toast } = useToast()
  
  // Separate message histories
  const [vibeMessages, setVibeMessages] = useState<Message[]>([
    { id: "v1", role: "assistant", content: "Hi! I am your Vibe Coding Agent. Write me a prompt to generate or review code." }
  ])
  const [geminiMessages, setGeminiMessages] = useState<Message[]>([
    { id: "g1", role: "assistant", content: "Hello! I am your Gemini Coding Agent. How can I help you write or debug code today?" }
  ])

  const [input, setInput] = useState("")
  const [target, setTarget] = useState<"vibe" | "gemini" | "both">("both")
  const [isVibeLoading, setIsVibeLoading] = useState(false)
  const [isGeminiLoading, setIsGeminiLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const vibeEndRef = useRef<HTMLDivElement | null>(null)
  const geminiEndRef = useRef<HTMLDivElement | null>(null)

  // Scroll to bottom helper
  useEffect(() => {
    vibeEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [vibeMessages])

  useEffect(() => {
    geminiEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [geminiMessages])

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      toast({
        title: "Copied!",
        description: "Code snippet copied to clipboard.",
        duration: 1500,
      })
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error("Failed to copy text: ", err)
    }
  }

  // Basic code block formatter
  const renderMessageContent = (content: string, msgId: string) => {
    const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g
    const parts = []
    let lastIndex = 0
    let match
    let blockIndex = 0

    while ((match = codeBlockRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(<span key={`text-${lastIndex}`}>{content.substring(lastIndex, match.index)}</span>)
      }

      const lang = match[1] || "code"
      const codeText = match[2]
      const blockId = `${msgId}-block-${blockIndex++}`

      parts.push(
        <div key={blockId} className="my-3 border border-border/40 rounded-lg overflow-hidden bg-black/60 shadow-inner group/code relative">
          <div className="flex items-center justify-between px-3 py-1.5 bg-secondary/30 text-[10px] text-muted-foreground border-b border-border/20">
            <span>{lang}</span>
            <button
              onClick={() => copyToClipboard(codeText, blockId)}
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              {copiedId === blockId ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-3 text-[11px] overflow-x-auto font-mono text-zinc-100 whitespace-pre-wrap leading-relaxed">
            <code>{codeText}</code>
          </pre>
        </div>
      )

      lastIndex = codeBlockRegex.lastIndex
    }

    if (lastIndex < content.length) {
      parts.push(<span key={`text-${lastIndex}`}>{content.substring(lastIndex)}</span>)
    }

    return <div className="space-y-1">{parts}</div>
  }

  const queryAgent = async (
    prompt: string,
    provider: string,
    model: string,
    setMessages: Dispatch<SetStateAction<Message[]>>,
    setLoading: (loading: boolean) => void
  ) => {
    setLoading(true)
    const assistantId = Math.random().toString()
    
    // Add placeholder message
    setMessages((prev: Message[]) => [...prev, { id: assistantId, role: "assistant", content: "..." }])

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: prompt,
          provider: provider,
          model: model
        })
      })

      if (!res.ok) throw new Error(`API error: ${res.status}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      setMessages((prev: Message[]) =>
        prev.map((m: Message) => m.id === assistantId ? { ...m, content: data.answer || "No response." } : m)
      )
    } catch (err: any) {
      console.error(err)
      setMessages((prev: Message[]) =>
        prev.map((m: Message) => m.id === assistantId ? { ...m, content: `Error generating response: ${err.message}` } : m)
      )
    } finally {
      setLoading(false)
    }
  }

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed) return

    setInput("")

    // Add user messages
    const userMsgId = Math.random().toString()
    if (target === "vibe" || target === "both") {
      setVibeMessages((prev: Message[]) => [...prev, { id: userMsgId, role: "user", content: trimmed }])
      queryAgent(trimmed, "github-models", "openai/gpt-4.1-mini", setVibeMessages, setIsVibeLoading)
    }
    if (target === "gemini" || target === "both") {
      setGeminiMessages((prev: Message[]) => [...prev, { id: userMsgId, role: "user", content: trimmed }])
      queryAgent(trimmed, "gemini", "gemini-2.5-flash", setGeminiMessages, setIsGeminiLoading)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] w-full">
      {/* Side-by-side Dual Panels */}
      <div className="flex-1 flex flex-col md:flex-row gap-4 p-4 min-h-0 overflow-hidden">
        
        {/* Vibe Agent Panel */}
        <div className="flex-1 flex flex-col min-w-0 bg-background/40 backdrop-blur-md rounded-xl border border-purple-500/20 shadow-lg shadow-purple-500/5 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-950/30 to-background/50 border-b border-purple-500/20">
            <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
            <span className="font-semibold text-xs text-purple-300 font-[var(--font-heading)]">Vibe Coder</span>
            {isVibeLoading && <span className="text-[10px] text-purple-400/80 animate-pulse ml-auto">Thinking...</span>}
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
            {vibeMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 max-w-[85%] ${msg.role === "user" ? "ml-auto flex-row-reverse" : ""}`}
              >
                <div className={`w-6 h-6 rounded-md shrink-0 flex items-center justify-center text-[10px] ${
                  msg.role === "user" ? "bg-purple-600/80 text-white" : "bg-purple-950/60 text-purple-300 border border-purple-500/30"
                }`}>
                  {msg.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>
                <div className={`rounded-xl px-3 py-2 text-xs leading-relaxed ${
                  msg.role === "user" 
                    ? "bg-purple-600/20 text-purple-100 border border-purple-500/30" 
                    : "bg-secondary/40 text-muted-foreground border border-border/30"
                }`}>
                  {renderMessageContent(msg.content, msg.id)}
                </div>
              </div>
            ))}
            <div ref={vibeEndRef} />
          </div>
        </div>

        {/* Gemini Agent Panel */}
        <div className="flex-1 flex flex-col min-w-0 bg-background/40 backdrop-blur-md rounded-xl border border-cyan-500/20 shadow-lg shadow-cyan-500/5 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-950/30 to-background/50 border-b border-cyan-500/20">
            <Bot className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-xs text-cyan-300 font-[var(--font-heading)]">Gemini Coder</span>
            {isGeminiLoading && <span className="text-[10px] text-cyan-400/80 animate-pulse ml-auto">Thinking...</span>}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
            {geminiMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 max-w-[85%] ${msg.role === "user" ? "ml-auto flex-row-reverse" : ""}`}
              >
                <div className={`w-6 h-6 rounded-md shrink-0 flex items-center justify-center text-[10px] ${
                  msg.role === "user" ? "bg-cyan-600/80 text-white" : "bg-cyan-950/60 text-cyan-300 border border-cyan-500/30"
                }`}>
                  {msg.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>
                <div className={`rounded-xl px-3 py-2 text-xs leading-relaxed ${
                  msg.role === "user" 
                    ? "bg-cyan-600/20 text-cyan-100 border border-cyan-500/30" 
                    : "bg-secondary/40 text-muted-foreground border border-border/30"
                }`}>
                  {renderMessageContent(msg.content, msg.id)}
                </div>
              </div>
            ))}
            <div ref={geminiEndRef} />
          </div>
        </div>

      </div>

      {/* Shared Input Area */}
      <div className="p-4 bg-background/20 border-t border-border/30 backdrop-blur-md">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          {/* Target selector */}
          <select
            value={target}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setTarget(e.target.value as any)}
            className="bg-secondary/80 border border-border/40 text-foreground text-xs rounded-lg px-3 py-2 outline-none h-10 shadow-lg cursor-pointer"
          >
            <option value="both">Both Agents</option>
            <option value="vibe">Vibe Only</option>
            <option value="gemini">Gemini Only</option>
          </select>

          {/* Text input */}
          <div className="flex-1 relative flex items-center">
            <textarea
              value={input}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
              onKeyDown={(e: KeyboardEvent<HTMLTextAreaElement>) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder="Ask both agents to write or optimize some code..."
              rows={1}
              className="w-full bg-secondary/60 border border-border/40 rounded-lg pl-3 pr-10 py-2.5 text-xs text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:border-primary/50 transition-colors shadow-inner"
              style={{ maxHeight: "120px" }}
            />
            <Button
              onClick={handleSend}
              size="icon"
              className="absolute right-2 h-7 w-7 bg-primary text-white hover:bg-primary/95 shadow-md"
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

    </div>
  )
}
