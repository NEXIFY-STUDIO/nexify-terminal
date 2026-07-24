"use client"

import {
  Mic,
  ArrowUp,
  X,
  Check,
  Terminal,
  FolderOpen,
  Copy,
  Clipboard,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState, useEffect, useRef } from "react"
import { ParticleOrb } from "@/components/particle-orb"
import { TerminalView } from "@/components/terminal-view"
import { FileExplorer } from "@/components/file-explorer"
import { SystemMonitor } from "@/components/system-monitor"
import { InsolvencyMonitor } from "@/components/insolvency-monitor"
import { DualChatArea } from "@/components/dual-chat-area"
import { useToast } from "@/hooks/use-toast"
import { extractShellCommands, normalizeShellInput } from "@/lib/operator/shellCommands.mjs"
import {
  detectInputMode,
  getInputPlaceholder,
  getInputModeLabel,
  cycleInputMode,
  applyInputModePrefix,
} from "@/lib/operator/inputMode.mjs"
import { buildSessionFields } from "@/lib/operator/sessionContext.mjs"
import { buildShellFollowUpQuestion } from "@/lib/operator/followUpPrompt.mjs"
import {
  isClearSessionCommand,
  clearNexifySessionMemory,
  restartNexifyApp,
} from "@/lib/operator/sessionReset.mjs"
import {
  isStatusCommand,
  fetchNexifyServiceHealth,
  formatNexifyStatusReport,
  isNexifyStackHealthy,
} from "@/lib/operator/sessionStatus.mjs"
import {
  isRestartServerCommand,
  requestNexifyServerRestart,
  formatRestartServerReport,
} from "@/lib/operator/sessionRestart.mjs"
import { isHelpCommand, formatNexifyHelpReport } from "@/lib/operator/sessionHelp"
import {
  detectVoiceSupport,
  resolveSpeechLanguage,
  createVoiceSession,
  VOICE_UNAVAILABLE_MESSAGE,
} from "@/lib/operator/voiceInput.mjs"
import {
  isExportSessionCommand,
  formatSessionMarkdown,
  formatSessionJson,
  deliverSessionMarkdown,
  deliverSessionText,
  formatExportConfirmation,
} from "@/lib/operator/sessionExport.mjs"
import { NexifyHeader, type NexifyViewMode } from "@/components/nexify-header"

let persistedShellSessionId: string | null = null
let shellSessionCleanupTimer: ReturnType<typeof setTimeout> | null = null

function cancelShellSessionCleanup() {
  if (shellSessionCleanupTimer) {
    clearTimeout(shellSessionCleanupTimer)
    shellSessionCleanupTimer = null
  }
}

function scheduleShellSessionCleanup(sessionId: string) {
  cancelShellSessionCleanup()
  shellSessionCleanupTimer = setTimeout(() => {
    shellSessionCleanupTimer = null
    if (persistedShellSessionId === sessionId) {
      persistedShellSessionId = null
    }
    fetch(`/api/shell?path=sessions/${sessionId}`, { method: 'DELETE' }).catch(() => {})
  }, 2000)
}

async function verifyShellSession(sessionId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/shell?path=sessions/${sessionId}`)
    if (!res.ok) return false
    const data = await res.json()
    return data.status === 'active'
  } catch {
    return false
  }
}

const ChevronIcon = ({ expanded }: { expanded: boolean }) => {
  return (
    <svg className={`chevron ${expanded ? "" : "collapsed"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  )
}

function cleanAnsi(text: string): string {
  if (!text) return '';
  // 1. Strip ESC-based OSC sequences first (operating system commands like window title)
  let cleaned = text.replace(/\u001b\][0-9;]*[^\u0007\u001b]*(?:\u0007|\u001b\\)/g, '');
  // 2. Strip standard ANSI control sequences
  cleaned = cleaned.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
  // 3. Remove residual unescaped title/OSC remnants (e.g. ]2;..., ]1;..., ]7;...)
  cleaned = cleaned.replace(/\]\d+;[^\]\u0007\r\n\s]*/g, '');
  // 4. Remove raw command line color brackets
  cleaned = cleaned.replace(/\[\d+m/g, '');
  cleaned = cleaned.replace(/\[\d+;\d+m/g, '');
  cleaned = cleaned.replace(/\[\d+m%/g, '');
  cleaned = cleaned.replace(/\[\?\d+[lh]/g, '');
  // 5. Remove non-printable control characters, preserving newlines/carriage returns
  cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  return cleaned;
}

function ShellCommandChips({
  commands,
  onRun,
  disabled,
}: {
  commands: string[];
  onRun: (cmd: string) => void;
  disabled?: boolean;
}) {
  if (!commands.length) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-3 pl-2">
      {commands.map((cmd) => (
        <button
          key={cmd}
          type="button"
          disabled={disabled}
          onClick={() => onRun(cmd)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-accent/30 bg-accent/10 text-accent text-xs font-mono hover:bg-accent/20 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none"
        >
          <Terminal className="w-3 h-3 shrink-0" />
          <span>$ {cmd}</span>
        </button>
      ))}
    </div>
  );
}

export function ChatArea({ sidebarOpen, toggleSidebar }: { sidebarOpen: boolean; toggleSidebar: () => void }) {
  const { toast } = useToast()
  
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    textToCopy: string;
    side: 'top' | 'bottom';
  }>({
    visible: false,
    x: 0,
    y: 0,
    textToCopy: "",
    side: 'top',
  })

  const [pasteDialog, setPasteDialog] = useState<{
    visible: boolean;
    tempText: string;
  }>({
    visible: false,
    tempText: "",
  })

  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null)
  const touchActiveRef = useRef<boolean>(false)
  const contextMenuRef = useRef(contextMenu)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const wasLongPressedRef = useRef<boolean>(false)

  useEffect(() => {
    contextMenuRef.current = contextMenu
  }, [contextMenu])

  const [isRecording, setIsRecording] = useState(false)
  const voiceSessionRef = useRef<ReturnType<typeof createVoiceSession> | null>(null)
  const voiceCancelledRef = useRef(false)
  const voiceHoldRef = useRef(false)
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({})
  const [voiceLang, setVoiceLang] = useState<"sk-SK" | "en-US">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("nexify_voice_lang")
      if (saved === "sk-SK" || saved === "en-US") return saved
      return resolveSpeechLanguage(navigator.language)
    }
    return "en-US"
  })

  const isItemExpanded = (id: string, type: 'chat' | 'command-group') => {
    if (expandedItems[id] !== undefined) {
      return expandedItems[id];
    }
    // AI responses (chat/assistant) are expanded by default, terminal/PTY outputs are collapsed by default
    return type === 'chat';
  };

  const toggleItem = (id: string) => {
    // Scan messages to check if this is a command/output message or a chat message
    const msg = messages.find(m => m.id === id);
    const isChat = msg ? msg.type === 'chat' : true;
    const type = isChat ? 'chat' : 'command-group';

    setExpandedItems(prev => {
      const current = prev[id] !== undefined ? prev[id] : (type === 'chat');
      return {
        ...prev,
        [id]: !current
      };
    });
  };

  // Dynamic state for integrated features
  const [messages, setMessages] = useState<Array<{
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    type?: 'chat' | 'command' | 'output';
  }>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nexify_chat_history')
      return saved ? JSON.parse(saved) : []
    }
    return []
  })
  const [input, setInput] = useState("")
  const [keystrokeTrigger, setKeystrokeTrigger] = useState(0)
  const [isActivelyTyping, setIsActivelyTyping] = useState(false)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [])

  const [activeModel, setActiveModel] = useState<{
    label: string;
    provider: string;
    model: string;
  }>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nexify_active_model')
      return saved ? JSON.parse(saved) : {
        label: "Mistral Small",
        provider: "mistral",
        model: "mistral-small-latest"
      }
    }
    return {
      label: "Mistral Small",
      provider: "mistral",
      model: "mistral-small-latest"
    }
  })

  // Persistence effects
  useEffect(() => {
    messagesRef.current = messages
    if (typeof window !== 'undefined') {
      localStorage.setItem('nexify_chat_history', JSON.stringify(messages))
    }
  }, [messages])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('nexify_active_model', JSON.stringify(activeModel))
    }
  }, [activeModel])
  const [shellSessionId, setShellSessionId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<NexifyViewMode>('chat')
  const [isExecutingCommand, setIsExecutingCommand] = useState(false)
  const [serverHealthOk, setServerHealthOk] = useState<boolean | null>(null)
  const [serverHealthFailures, setServerHealthFailures] = useState(0)
  const [isRestartingServer, setIsRestartingServer] = useState(false)
  const messagesRef = useRef(messages)
  const pendingShellFollowUpRef = useRef<string | null>(null)
  const wasExecutingRef = useRef(false)

  // Custom Audio-Haptic vibration feedback helper for iOS
  const triggerHaptic = (type: 'light' | 'medium' | 'heavy' | 'success' | 'error') => {
    try {
      if ('vibrate' in navigator) {
        if (type === 'light') navigator.vibrate(20);
        else if (type === 'medium') navigator.vibrate(50);
        else if (type === 'heavy') navigator.vibrate(100);
        else if (type === 'success') navigator.vibrate([40, 30, 40]);
        else if (type === 'error') navigator.vibrate([100, 50, 100]);
        return;
      }
      
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(60, ctx.currentTime);
      
      if (type === 'light') {
        gain.gain.setValueAtTime(0.8, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.03);
        osc.start();
        osc.stop(ctx.currentTime + 0.03);
      } else if (type === 'medium') {
        gain.gain.setValueAtTime(1.0, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      } else if (type === 'heavy' || type === 'error') {
        gain.gain.setValueAtTime(1.0, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === 'success') {
        gain.gain.setValueAtTime(0.8, ctx.currentTime);
        gain.gain.setValueAtTime(0.01, ctx.currentTime + 0.03);
        gain.gain.setValueAtTime(0.8, ctx.currentTime + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      }
    } catch (e) {
      console.warn('Haptic trigger skipped:', e);
    }
  };

  const showVoiceUnavailableToast = () => {
    triggerHaptic('error');
    toast({
      title: VOICE_UNAVAILABLE_MESSAGE,
      variant: 'destructive',
      duration: 3000,
    });
  };

  const insertVoiceTranscript = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setInput((prev) => {
      const base = prev.trimEnd();
      return base ? `${base} ${trimmed}` : trimmed;
    });
    setKeystrokeTrigger((prev) => prev + 1);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const stopVoiceInput = (cancel = false) => {
    voiceHoldRef.current = false;
    if (cancel) voiceCancelledRef.current = true;
    const session = voiceSessionRef.current;
    if (!session) {
      setIsRecording(false);
      return;
    }
    try {
      if (cancel) session.abort();
      else session.stop();
    } catch {
      setIsRecording(false);
      voiceSessionRef.current = null;
    }
  };

  const startVoiceInput = () => {
    if (!detectVoiceSupport()) {
      showVoiceUnavailableToast();
      return;
    }
    if (voiceSessionRef.current) return;

    voiceCancelledRef.current = false;
    voiceHoldRef.current = true;
    triggerHaptic('light');
    setIsRecording(true);

    const session = createVoiceSession({
      language: voiceLang,
      onError: () => {
        if (!voiceCancelledRef.current) showVoiceUnavailableToast();
        voiceSessionRef.current = null;
        setIsRecording(false);
      },
      onEnd: (finalText) => {
        voiceSessionRef.current = null;
        setIsRecording(false);
        if (!voiceCancelledRef.current) insertVoiceTranscript(finalText);
        voiceCancelledRef.current = false;
      },
    });

    if (!session) {
      showVoiceUnavailableToast();
      setIsRecording(false);
      return;
    }

    voiceSessionRef.current = session;
    try {
      session.start();
    } catch {
      voiceSessionRef.current = null;
      showVoiceUnavailableToast();
      setIsRecording(false);
    }
  };

  const handleMicPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    startVoiceInput();
  };

  const handleMicPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!voiceHoldRef.current && !voiceSessionRef.current) return;
    e.preventDefault();
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    stopVoiceInput(false);
  };

  useEffect(() => {
    return () => {
      if (voiceSessionRef.current) {
        try {
          voiceSessionRef.current.abort();
        } catch {
          // ignore cleanup errors
        }
        voiceSessionRef.current = null;
      }
    };
  }, []);

  // Custom clipboard & long-press gesture handlers
  const getCopyableText = (target: HTMLElement | null): string => {
    if (!target) return "";
    
    // 1. Search for explicit data-copyable-text attribute up the DOM tree
    const copyableEl = target.closest("[data-copyable-text]");
    if (copyableEl) {
      return copyableEl.getAttribute("data-copyable-text") || "";
    }
    
    // 2. If inside a pipeline-item or message block, find the text content
    const pipelineItem = target.closest(".pipeline-item");
    if (pipelineItem) {
      const terminalContent = pipelineItem.querySelector(".terminal-content");
      if (terminalContent) {
        return terminalContent.textContent || "";
      }
      
      const contentEl = pipelineItem.querySelector(".content");
      if (contentEl) {
        return contentEl.textContent || "";
      }
    }

    // 3. Fallback to selection or innerText
    const selection = window.getSelection()?.toString();
    if (selection) return selection;

    const text = target.innerText || target.textContent || "";
    return text.trim();
  };

  const handleCopy = async () => {
    if (!contextMenu.textToCopy) return;
    
    try {
      await navigator.clipboard.writeText(contextMenu.textToCopy);
      triggerHaptic("light");
      toast({
        title: "Skopírované",
        description: "Text bol úspešne uložený do schránky.",
        duration: 2000,
      });
    } catch (err) {
      console.error("Copy failed:", err);
      toast({
        title: "Chyba pri kopírovaní",
        description: "Aplikácia nemá prístup k schránke.",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setContextMenu(prev => ({ ...prev, visible: false }));
    }
  };

  const executePasteText = async (text: string) => {
    if (!text) return;

    if (viewMode === 'terminal') {
      if (!shellSessionId) {
        toast({
          title: "Chyba",
          description: "Relácia terminálu nie je pripravená.",
          variant: "destructive",
        });
        return;
      }

      try {
        const res = await fetch(`/api/shell?path=sessions/${shellSessionId}/input`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: text }),
        });
        if (!res.ok) throw new Error("Terminal input write failed");
        
        triggerHaptic("light");
        toast({
          title: "Vložené do terminálu",
          description: "Text bol úspešne odoslaný do shell relácie.",
          duration: 2000,
        });
      } catch (err) {
        console.error("Terminal paste failed:", err);
        toast({
          title: "Chyba vkladania",
          description: "Nepodarilo sa odoslať text do príkazového riadku.",
          variant: "destructive",
        });
      }
    } else {
      setInput(prev => {
        return prev ? `${prev}\n${text}` : text;
      });

      triggerHaptic("light");
      
      if (viewMode !== 'chat') {
        setViewMode('chat');
      }
      
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const length = textareaRef.current.value.length;
          textareaRef.current.setSelectionRange(length, length);
        }
      }, 50);

      toast({
        title: "Vložené",
        description: "Text zo schránky bol úspešne vložený.",
        duration: 2000,
      });
    }
  };

  const handlePaste = async () => {
    // 1. Check if Clipboard API is available in this context (requires HTTPS or localhost)
    if (typeof navigator === "undefined" || !navigator.clipboard || !navigator.clipboard.readText) {
      setContextMenu(prev => ({ ...prev, visible: false }));
      setPasteDialog({ visible: true, tempText: "" });
      return;
    }

    try {
      const text = await navigator.clipboard.readText();
      if (!text) {
        toast({
          title: "Schránka je prázdna",
          description: "V schránke sa nenachádza žiadny text na vloženie.",
          duration: 3000,
        });
        setContextMenu(prev => ({ ...prev, visible: false }));
        return;
      }

      await executePasteText(text);
    } catch (err) {
      console.error("Paste failed:", err);
      // Apple iOS security prompt cancelled/denied fallback: Open standard input dialog
      setContextMenu(prev => ({ ...prev, visible: false }));
      setPasteDialog({ visible: true, tempText: "" });
    } finally {
      setContextMenu(prev => ({ ...prev, visible: false }));
    }
  };

  useEffect(() => {
    const handleGlobalTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        cancelTouch();
        return;
      }
      
      const target = e.target as HTMLElement;
      
      // Exclude interactive elements or the custom menu itself
      if (
        target.tagName === "BUTTON" ||
        target.tagName === "A" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "INPUT" ||
        target.closest("button") !== null ||
        target.closest("a") !== null ||
        target.closest("#custom-ios-context-menu") !== null ||
        target.closest(".dropdown-menu") !== null
      ) {
        cancelTouch();
        return;
      }

      const touch = e.touches[0];
      touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
      touchActiveRef.current = true;

      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }

      longPressTimerRef.current = setTimeout(() => {
        if (!touchActiveRef.current) return;

        const text = getCopyableText(target);
        const touchX = touch.clientX;
        const touchY = touch.clientY;
        
        const menuWidth = 190;
        const padding = 16;
        const safeX = Math.max(menuWidth / 2 + padding, Math.min(window.innerWidth - menuWidth / 2 - padding, touchX));
        const spaceAbove = touchY > 90;

        triggerHaptic("light");
        
        wasLongPressedRef.current = true;

        setContextMenu({
          visible: true,
          x: safeX,
          y: touchY,
          textToCopy: text,
          side: spaceAbove ? 'top' : 'bottom'
        });

        touchActiveRef.current = false;
        longPressTimerRef.current = null;
      }, 2000);
    };

    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (!touchStartPosRef.current) return;
      const touch = e.touches[0];
      const dx = touch.clientX - touchStartPosRef.current.x;
      const dy = touch.clientY - touchStartPosRef.current.y;
      
      if (Math.sqrt(dx * dx + dy * dy) > 8) {
        cancelTouch();
      }
    };

    const handleGlobalTouchEnd = (e: TouchEvent) => {
      if (wasLongPressedRef.current) {
        e.preventDefault();
        setTimeout(() => {
          wasLongPressedRef.current = false;
        }, 100);
      }
      cancelTouch();
    };

    const cancelTouch = () => {
      touchActiveRef.current = false;
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    };

    const handleGlobalClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (target && !target.closest("#custom-ios-context-menu")) {
        setContextMenu(prev => prev.visible ? { ...prev, visible: false } : prev);
      }
    };

    document.addEventListener("touchstart", handleGlobalTouchStart, { passive: false });
    document.addEventListener("touchmove", handleGlobalTouchMove, { passive: true });
    document.addEventListener("touchend", handleGlobalTouchEnd, { passive: false });
    document.addEventListener("touchcancel", handleGlobalTouchEnd, { passive: false });
    document.addEventListener("mousedown", handleGlobalClickOutside);
    document.addEventListener("touchstart", handleGlobalClickOutside, { passive: true });

    const preventNativeContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (contextMenuRef.current.visible || target.closest(".pipeline-item") || target.closest(".terminal-box")) {
        e.preventDefault();
      }
    };
    document.addEventListener("contextmenu", preventNativeContextMenu);

    return () => {
      document.removeEventListener("touchstart", handleGlobalTouchStart);
      document.removeEventListener("touchmove", handleGlobalTouchMove);
      document.removeEventListener("touchend", handleGlobalTouchEnd);
      document.removeEventListener("touchcancel", handleGlobalTouchEnd);
      document.removeEventListener("mousedown", handleGlobalClickOutside);
      document.removeEventListener("touchstart", handleGlobalClickOutside);
      document.removeEventListener("contextmenu", preventNativeContextMenu);
      cancelTouch();
    };
  }, []);

  const handleViewModeChange = (mode: 'chat' | 'terminal' | 'files' | 'system' | 'insolvency' | 'dual-chat') => {
    triggerHaptic('light');
    setViewMode(mode);
  };

  // Touch swipe navigation helper for PWA standalone mode
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const diffX = touch.clientX - touchStartRef.current.x;
    const diffY = touch.clientY - touchStartRef.current.y;
    
    // Switch between panels (Chat <-> Terminal <-> Files <-> System <-> Insolvency) on clean swipe
    if (Math.abs(diffX) > 100 && Math.abs(diffY) < 40) {
      const modes: ('chat' | 'terminal' | 'files' | 'system' | 'insolvency')[] = ['chat', 'terminal', 'files', 'system', 'insolvency'];
      const currentIndex = modes.indexOf(viewMode as any);
      
      if (diffX > 0) {
        if (currentIndex > 0) {
          handleViewModeChange(modes[currentIndex - 1]);
        }
      } else {
        if (currentIndex < modes.length - 1) {
          handleViewModeChange(modes[currentIndex + 1]);
        }
      }
    }
    touchStartRef.current = null;
  };

  // Prevent double tap zoom and pinch zoom
  useEffect(() => {
    const preventZoom = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };
    
    const preventWheelZoom = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
      }
    };

    let lastTouchTime = 0;
    const preventDoubleTap = (e: TouchEvent) => {
      const currentTime = new Date().getTime();
      const tapLength = currentTime - lastTouchTime;
      if (tapLength < 300 && tapLength > 0) {
        e.preventDefault();
      }
      lastTouchTime = currentTime;
    };

    document.addEventListener('touchmove', preventZoom, { passive: false });
    document.addEventListener('wheel', preventWheelZoom, { passive: false });
    document.addEventListener('touchend', preventDoubleTap, { passive: false });
    
    return () => {
      document.removeEventListener('touchmove', preventZoom);
      document.removeEventListener('wheel', preventWheelZoom);
      document.removeEventListener('touchend', preventDoubleTap);
    };
  }, []);

  const [isIdle, setIsIdle] = useState(false)
  const idleTimerRef = useRef<any>(null)

  const resetIdleTimer = () => {
    setIsIdle(false);
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }

    const isAiThinking = messages.some(m => m.content === '...');
    if (isExecutingCommand || isAiThinking) {
      return;
    }

    idleTimerRef.current = setTimeout(() => {
      setIsIdle(true);
    }, 15000);
  };

  useEffect(() => {
    resetIdleTimer();
    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, [messages, isExecutingCommand, input]);

  const runServerHealthCheck = async () => {
    try {
      const health = await fetchNexifyServiceHealth();
      const ok = isNexifyStackHealthy(health);
      setServerHealthOk(ok);
      setServerHealthFailures((prev) => (ok ? 0 : prev + 1));
      return ok;
    } catch {
      setServerHealthOk(false);
      setServerHealthFailures((prev) => prev + 1);
      return false;
    }
  };

  useEffect(() => {
    void runServerHealthCheck();
    const interval = setInterval(() => {
      void runServerHealthCheck();
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  const handleRestartServer = async (options: { silent?: boolean } = {}) => {
    if (isRestartingServer) return;

    triggerHaptic('heavy');
    setInput("");
    setIsRestartingServer(true);

    if (!options.silent) {
      setMessages((prev) => [
        ...prev,
        { id: Math.random().toString(), role: 'user', content: 'restart', type: 'chat' },
      ]);
    }

    try {
      const result = await requestNexifyServerRestart();
      if (!options.silent) {
        setMessages((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            role: 'assistant',
            content: formatRestartServerReport(result),
            type: 'chat',
          },
        ]);
      }
      toast({
        title: 'Reštartujem Nexify stack',
        description: 'launchd reštartuje služby (~15 s). UI sa obnoví.',
        duration: 5000,
      });
      setServerHealthFailures(0);
      window.setTimeout(() => {
        restartNexifyApp();
      }, 15_000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Reštart zlyhal';
      triggerHaptic('error');
      toast({
        title: 'Reštart zlyhal',
        description: message,
        variant: 'destructive',
        duration: 4000,
      });
      if (!options.silent) {
        setMessages((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            role: 'assistant',
            content: formatRestartServerReport({ error: message }),
            type: 'chat',
          },
        ]);
      }
    } finally {
      setIsRestartingServer(false);
    }
  };

  const showServerDownBanner = serverHealthFailures >= 2 && !isRestartingServer;

  const isTyping = input.length > 0;
  const inputMode = detectInputMode(input);
  const sessionFields = buildSessionFields(messages);
  const lastCommandPreview = sessionFields.lastCommand || '—';

  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Initialize PTY session on mount
  useEffect(() => {
    let activeSessionId: string | null = null;
    let eventSource: EventSource | null = null;
    let isCancelled = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    cancelShellSessionCleanup();

    function connectStream(sessionId: string) {
      if (isCancelled) return;
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      eventSource = new EventSource(`/api/shell?path=sessions/${sessionId}/stream`);
      eventSource.onmessage = (event) => {
        try {
          const streamData = JSON.parse(event.data);
          if (streamData.type === 'output' && streamData.chunk) {
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.type === 'output') {
                return [
                  ...prev.slice(0, -1),
                  { ...last, content: last.content + streamData.chunk }
                ];
              } else {
                return [
                  ...prev,
                  { id: Math.random().toString(), role: 'system', content: streamData.chunk, type: 'output' }
                ];
              }
            });
          } else if (streamData.type === 'exit') {
            setIsExecutingCommand(false);
          }
        } catch (err) {
          console.error('SSE JSON parse error:', err);
        }
      };
      eventSource.onerror = () => {
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        if (isCancelled) return;
        reconnectTimer = setTimeout(async () => {
          reconnectTimer = null;
          if (isCancelled) return;
          const alive = await verifyShellSession(sessionId);
          if (alive) {
            connectStream(sessionId);
          } else {
            void initShell();
          }
        }, 1500);
      };
    }

    async function initShell() {
      try {
        let sessionId = persistedShellSessionId;
        if (sessionId && await verifyShellSession(sessionId)) {
          // Reuse existing session across React Strict Mode remounts / brief outages.
        } else {
          const res = await fetch('/api/shell?path=sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cwd: '/Users/erikbabcan',
              cols: 100,
              rows: 30
            })
          });
          if (!res.ok) {
            const errText = await res.text().catch(() => '');
            throw new Error(`Failed to create PTY session: ${res.status} ${res.statusText}. Response: ${errText}`);
          }
          const data = await res.json();
          if (isCancelled) {
            if (data.sessionId) {
              fetch(`/api/shell?path=sessions/${data.sessionId}`, { method: 'DELETE' }).catch(() => {});
            }
            return;
          }
          if (!data.sessionId) return;
          sessionId = data.sessionId;
          persistedShellSessionId = sessionId;
        }

        if (!sessionId) return;
        activeSessionId = sessionId;
        setShellSessionId(sessionId);
        connectStream(sessionId);
      } catch (err) {
        console.error('PTY Init Error:', err);
      }
    }

    initShell();

    return () => {
      isCancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (eventSource) {
        eventSource.close();
      }
      if (activeSessionId) {
        scheduleShellSessionCleanup(activeSessionId);
      }
    };
  }, []);

  const executeShellCommand = async (cmdText: string) => {
    if (!shellSessionId) {
      setMessages(prev => [
        ...prev,
        { id: Math.random().toString(), role: 'system', content: 'Error: Shell session not initialized.', type: 'output' }
      ]);
      return;
    }

    setIsExecutingCommand(true);
    pendingShellFollowUpRef.current = cmdText;

    // Add command to message history
    const cmdId = Math.random().toString();
    setMessages(prev => [
      ...prev,
      { id: cmdId, role: 'user', content: cmdText, type: 'command' }
    ]);
    setExpandedItems(prev => ({
      ...prev,
      [cmdId]: true
    }));

    try {
      const res = await fetch(`/api/shell?path=sessions/${shellSessionId}/input`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: cmdText + '\n' })
      });
      if (!res.ok) throw new Error('Failed to send command to shell');
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        { id: Math.random().toString(), role: 'system', content: `Error: ${err.message}`, type: 'output' }
      ]);
      setIsExecutingCommand(false);
    }
  };

  const buildOperatorContext = (snapshot = messages) => {
    const session = buildSessionFields(snapshot);
    return {
      workspaceRoot: '/Users/erikbabcan',
      viewMode,
      lastCommand: session.lastCommand,
      recentOutput: session.recentOutput,
      failedLast: session.failedLast,
      stack: 'Nexify :3322 · hack-api :3021 · ai-proxy :8788',
      access: 'Tailscale → domáci uzol (Mac)',
    };
  };

  const sendOperatorFollowUp = async (command: string) => {
    const snapshot = messagesRef.current;
    const session = buildSessionFields(snapshot);
    const question = buildShellFollowUpQuestion(command, session);

    const assistantMsgId = Math.random().toString();
    setMessages((prev) => [
      ...prev,
      { id: assistantMsgId, role: 'assistant', content: '...', type: 'chat' },
    ]);

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          provider: activeModel.provider,
          model: activeModel.model,
          context: {
            ...buildOperatorContext(snapshot),
            lastCommand: command,
          },
        }),
      });

      if (!res.ok) throw new Error(`AI proxy returned ${res.status}`);

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? { ...msg, content: data.answer || 'No response.' }
            : msg
        )
      );
      triggerHaptic('light');
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? { ...msg, content: `Follow-up error: ${err.message}` }
            : msg
        )
      );
    }
  };

  useEffect(() => {
    if (wasExecutingRef.current && !isExecutingCommand && pendingShellFollowUpRef.current) {
      const cmd = pendingShellFollowUpRef.current;
      pendingShellFollowUpRef.current = null;
      const timer = setTimeout(() => {
        void sendOperatorFollowUp(cmd);
      }, 500);
      wasExecutingRef.current = isExecutingCommand;
      return () => clearTimeout(timer);
    }
    wasExecutingRef.current = isExecutingCommand;
  }, [isExecutingCommand]);

  const sendAiPrompt = async (promptText: string) => {
    // Add user prompt to message history
    setMessages(prev => [
      ...prev,
      { id: Math.random().toString(), role: 'user', content: promptText, type: 'chat' }
    ]);

    // Add a placeholder assistant response to stream into
    const assistantMsgId = Math.random().toString();
    setMessages(prev => [
      ...prev,
      { id: assistantMsgId, role: 'assistant', content: '...', type: 'chat' }
    ]);

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: promptText,
          provider: activeModel.provider,
          model: activeModel.model,
          context: buildOperatorContext(),
        })
      });

      if (!res.ok) {
        throw new Error(`AI proxy returned ${res.status}`);
      }

      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }

      // Update assistant response with final answer
      setMessages(prev =>
        prev.map(msg =>
          msg.id === assistantMsgId
            ? { ...msg, content: data.answer || 'No response.' }
            : msg
        )
      );
    } catch (err: any) {
      setMessages(prev =>
        prev.map(msg =>
          msg.id === assistantMsgId
            ? { ...msg, content: `Error calling AI Agent: ${err.message}` }
            : msg
        )
      );
    }
  };

  const handleStatusReport = async () => {
    triggerHaptic('light');
    setInput("");

    const snapshot = messagesRef.current;
    const session = buildSessionFields(snapshot);

    setMessages((prev) => [
      ...prev,
      { id: Math.random().toString(), role: 'user', content: 'status', type: 'chat' },
    ]);

    try {
      const health = await fetchNexifyServiceHealth();
      const report = formatNexifyStatusReport({
        session,
        health,
        shellSessionId: shellSessionId ?? undefined,
        viewMode,
        messageCount: snapshot.length,
      });

      setMessages((prev) => [
        ...prev,
        { id: Math.random().toString(), role: 'assistant', content: report, type: 'chat' },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          role: 'assistant',
          content: `NEXIFY STATUS\nerror: ${err.message}`,
          type: 'chat',
        },
      ]);
    }
  };

  const handleHelpReport = () => {
    triggerHaptic('light');
    setInput("");

    const report = formatNexifyHelpReport({
      iphoneUi: 'http://100.103.0.38:3322',
      pin: process.env.NEXT_PUBLIC_PASSCODE,
    });

    setMessages((prev) => [
      ...prev,
      { id: Math.random().toString(), role: 'user', content: 'help', type: 'chat' },
      { id: Math.random().toString(), role: 'assistant', content: report, type: 'chat' },
    ]);
  };

  const handleExportSession = async (format: 'markdown' | 'json' = 'markdown') => {
    triggerHaptic('light');
    setInput("");

    const snapshot = messagesRef.current;
    const pin = process.env.NEXT_PUBLIC_PASSCODE;
    const payload =
      format === 'json'
        ? formatSessionJson(snapshot, {
            pin,
            session: buildSessionFields(snapshot),
          })
        : formatSessionMarkdown(snapshot, { pin });

    setMessages((prev) => [
      ...prev,
      { id: Math.random().toString(), role: 'user', content: 'export', type: 'chat' },
    ]);

    try {
      const { method } =
        format === 'json'
          ? await deliverSessionText(payload, { title: 'Nexify Session JSON' })
          : await deliverSessionMarkdown(payload);
      toast({
        title: method === 'share' ? 'SESSION zdieľaná' : 'SESSION skopírovaná',
        description:
          method === 'share'
            ? `${format === 'json' ? 'JSON' : 'Markdown'} export odoslaný cez share sheet.`
            : `${format === 'json' ? 'JSON' : 'Markdown'} export je v schránke.`,
        duration: 3000,
      });
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          role: 'assistant',
          content: formatExportConfirmation(method, format),
          type: 'chat',
        },
      ]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Export zlyhal';
      triggerHaptic('error');
      toast({
        title: 'Export zlyhal',
        description: message,
        variant: 'destructive',
        duration: 3000,
      });
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          role: 'assistant',
          content: `NEXIFY EXPORT\nerror: ${message}`,
          type: 'chat',
        },
      ]);
    }
  };

  const handleAttachFiles = async (files: FileList) => {
    triggerHaptic('light');
    const parts: string[] = [];
    for (const file of Array.from(files)) {
      const isText =
        file.type.startsWith('text/') ||
        /\.(md|txt|json|js|ts|tsx|jsx|mjs|cjs|css|html|xml|yml|yaml|env|sh|py|rb|go|rs|java|c|cpp|h|csv|log)$/i.test(
          file.name,
        );
      if (isText && file.size <= 200_000) {
        try {
          const text = await file.text();
          const clipped = text.length > 8000 ? `${text.slice(0, 8000)}\n…[truncated]` : text;
          parts.push(`[attached: ${file.name}]\n\`\`\`\n${clipped}\n\`\`\``);
        } catch {
          parts.push(`[attached: ${file.name} — ${file.size}B, read failed]`);
        }
      } else {
        parts.push(`[attached: ${file.name} — ${file.type || 'binary'}, ${file.size}B]`);
      }
    }
    if (!parts.length) return;
    setInput((prev) => {
      const block = parts.join('\n\n');
      return prev.trim() ? `${prev.trim()}\n\n${block}` : block;
    });
    setViewMode('chat');
    toast({
      title: 'Súbor pripojený',
      description: `${files.length} súbor(ov) vložených do inputu.`,
      duration: 2500,
    });
  };

  const handleLockScreen = () => {
    triggerHaptic('medium');
    localStorage.removeItem('nexify_authenticated');
    window.location.reload();
  };

  const handleVoiceLangChange = (lang: 'sk-SK' | 'en-US') => {
    setVoiceLang(lang);
    localStorage.setItem('nexify_voice_lang', lang);
  };

  const handleClearSession = () => {
    triggerHaptic('heavy');
    setInput("");
    pendingShellFollowUpRef.current = null;
    wasExecutingRef.current = false;
    setIsExecutingCommand(false);
    setMessages([]);

    if (shellSessionId) {
      fetch(`/api/shell?path=sessions/${shellSessionId}`, { method: 'DELETE' }).catch(() => {});
    }

    clearNexifySessionMemory();
    restartNexifyApp();
  };

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    if (isClearSessionCommand(trimmed)) {
      handleClearSession();
      return;
    }

    if (isStatusCommand(trimmed)) {
      void handleStatusReport();
      return;
    }

    if (isRestartServerCommand(trimmed)) {
      void handleRestartServer();
      return;
    }

    if (isHelpCommand(trimmed)) {
      handleHelpReport();
      return;
    }

    if (isExportSessionCommand(trimmed)) {
      void handleExportSession('markdown');
      return;
    }

    triggerHaptic('medium');
    setInput("");

    // Run as shell command if it starts with $ or /
    if (trimmed.startsWith('$') || trimmed.startsWith('/')) {
      executeShellCommand(normalizeShellInput(trimmed));
    } else {
      sendAiPrompt(trimmed);
    }
  };

  // Group commands and outputs together
  const renderGroups: Array<
    | { type: 'chat'; id: string; role: 'user' | 'assistant'; content: string }
    | { type: 'command-group'; id: string; command: string; outputMsgId?: string; output?: string; isExecuting?: boolean }
  > = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.type === 'command') {
      const nextMsg = messages[i + 1];
      if (nextMsg && nextMsg.type === 'output') {
        renderGroups.push({
          type: 'command-group',
          id: msg.id,
          command: msg.content,
          outputMsgId: nextMsg.id,
          output: nextMsg.content,
          isExecuting: isExecutingCommand && (i + 1 === messages.length - 1),
        });
        i++; // skip output message
      } else {
        renderGroups.push({
          type: 'command-group',
          id: msg.id,
          command: msg.content,
          isExecuting: isExecutingCommand && (i === messages.length - 1),
        });
      }
    } else if (msg.type === 'output') {
      // Skip standalone outputs (like the initial PTY startup prompt) to keep home page clean
    } else {
      renderGroups.push({
        type: 'chat',
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      });
    }
  }

  return (
    <main 
      className="flex-1 flex flex-col relative overflow-hidden"
      onMouseMove={resetIdleTimer}
      onKeyDown={resetIdleTimer}
      onClick={resetIdleTimer}
      onTouchStart={(e) => {
        resetIdleTimer();
        handleTouchStart(e);
      }}
      onTouchEnd={handleTouchEnd}
      onTouchMove={resetIdleTimer}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        .pipeline-item {
            display: flex;
            align-items: flex-start;
            margin-bottom: 24px;
            font-size: 14px;
            position: relative;
        }

        /* Draw a high-tech vertical pipeline timeline connection track */
        .pipeline-item::before {
            content: '';
            position: absolute;
            left: 10px; /* Center of 20px icon */
            top: 24px; /* Start below the icon container */
            bottom: -24px; /* Stretch down to next node */
            width: 1px;
            background-color: #27272a;
            z-index: 0;
        }

        .pipeline-item:last-child::before {
            display: none;
        }

        .icon-container {
            margin-right: 16px;
            color: #a1a1aa;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 20px;
            height: 20px;
            margin-top: 2px;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-size: 14px;
            flex-shrink: 0;
            background-color: #09090b; /* Masks the line track under the icon node */
            z-index: 1;
        }

        .content {
            flex-grow: 1;
            max-width: 800px;
            z-index: 1;
        }

        .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            cursor: pointer;
            margin-bottom: 12px;
            color: #a1a1aa;
            font-weight: 400;
            user-select: none;
            transition: color 0.2s ease;
        }

        .header:hover, .header.active {
            color: #e4e4e7;
        }

        .title-group {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .chevron {
            width: 14px;
            height: 14px;
            color: #71717a;
            transition: transform 0.2s ease, color 0.2s ease;
        }

        .chevron.collapsed {
            transform: rotate(-90deg);
        }

        .header:hover .chevron {
            color: #e4e4e7;
        }

        .meta-info {
            color: #71717a;
            font-size: 12px;
        }

        .terminal-box {
            background-color: rgba(9, 9, 11, 0.4);
            border: 1px solid #27272a;
            border-radius: 8px;
            overflow: hidden;
            margin-bottom: 12px;
            margin-left: 2px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(4px);
        }

        .terminal-header {
            padding: 10px 16px;
            border-bottom: 1px solid #27272a;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-size: 13px;
            color: #71717a;
            background: rgba(255, 255, 255, 0.02);
        }

        .terminal-content {
            padding: 16px;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-size: 13px;
            color: #d4d4d8; /* Higher contrast premium text */
            line-height: 1.6;
            white-space: pre-wrap;
            word-break: break-all;
        }

        .terminal-content .cursor {
            display: inline-block;
            width: 7px;
            height: 14px;
            background-color: #d4d4d8;
            vertical-align: text-bottom;
            margin-left: 2px;
            animation: blink 1s step-end infinite;
        }

        @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0; }
        }
        
        .spinner {
            animation: spin 1.2s linear infinite;
            color: #a1a1aa;
        }
        
        @keyframes spin {
            100% { transform: rotate(360deg); }
        }

        .comet-border {
            stroke-dasharray: 22 78;
            --comet-duration: 4.4s;
            animation: comet-spin var(--comet-duration) linear infinite;
            filter: drop-shadow(0 0 2px #ffffff) drop-shadow(0 0 5px #3b82f6) drop-shadow(0 0 12px #8b5cf6);
            opacity: 0.92;
            transition: stroke-width 0.3s ease, filter 0.3s ease;
        }

        .comet-active {
            --comet-duration: 1.6s;
            stroke-width: 4.5px;
            animation: comet-spin var(--comet-duration) linear infinite, border-glow-pulse 0.4s ease-in-out infinite alternate;
        }

        @keyframes border-glow-pulse {
            0% {
                opacity: 0.85;
                filter: drop-shadow(0 0 2px #ffffff) drop-shadow(0 0 5px #3b82f6) drop-shadow(0 0 12px #8b5cf6);
            }
            100% {
                opacity: 1.0;
                filter: drop-shadow(0 0 3.5px #ffffff) drop-shadow(0 0 8px #3b82f6) drop-shadow(0 0 18px #8b5cf6);
            }
        }

        @keyframes comet-spin {
            0% {
                stroke-dashoffset: 100;
            }
            100% {
                stroke-dashoffset: 0;
            }
        }

        @keyframes ios-menu-bounce-top {
            0% {
                opacity: 0;
                transform: translate(-50%, -100%) translateY(-5px) scale(0.85);
            }
            100% {
                opacity: 1;
                transform: translate(-50%, -100%) translateY(-15px) scale(1);
            }
        }

        @keyframes ios-menu-bounce-bottom {
            0% {
                opacity: 0;
                transform: translate(-50%, 0) translateY(15px) scale(0.85);
            }
            100% {
                opacity: 1;
                transform: translate(-50%, 0) translateY(25px) scale(1);
            }
        }
      ` }} />
      <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-950 to-black" />

      {/* Animated gradient orbs for shader effect */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="shader-orb shader-orb-1" />
        <div className="shader-orb shader-orb-2" />
        <div className="shader-orb shader-orb-3" />
      </div>

      {/* Animated grid overlay */}
      <div className="absolute inset-0 opacity-[0.15] grid-background" />

      {/* Noise texture for depth */}
      <div
        className="absolute inset-0 opacity-[0.03] mix-blend-soft-light pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      <NexifyHeader
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        activeModel={activeModel}
        onModelChange={setActiveModel}
        voiceLang={voiceLang}
        onVoiceLangChange={handleVoiceLangChange}
        onClearChat={() => {
          setMessages([])
          triggerHaptic('medium')
        }}
        onExportMarkdown={() => void handleExportSession('markdown')}
        onExportJson={() => void handleExportSession('json')}
        onAttachFiles={(files) => void handleAttachFiles(files)}
        onLock={handleLockScreen}
        onHaptic={(t) => triggerHaptic(t)}
      />

      {viewMode === 'chat' && (
        <div
          className="operator-status relative z-10 px-4 py-1.5 bg-sidebar/80 backdrop-blur-sm font-mono text-[10px] text-muted-foreground truncate"
          title={`workspace: /Users/erikbabcan · stack: Nexify :3322 · hack-api :3021 · ai-proxy :8788`}
        >
          <span className="text-accent/90">{viewMode}</span>
          <span className="mx-1.5 text-border">·</span>
          <span>Nexify :3322 · :3021 · :8788</span>
          <span className="mx-1.5 text-border">·</span>
          <span className="text-zinc-400">last: {lastCommandPreview}</span>
          {serverHealthOk === false && (
            <>
              <span className="mx-1.5 text-border">·</span>
              <span className="text-amber-400/90">stack degraded</span>
            </>
          )}
          {sessionFields.failedLast && (
            <>
              <span className="mx-1.5 text-border">·</span>
              <span className="text-red-400/90">failed</span>
            </>
          )}
        </div>
      )}

      {showServerDownBanner && (
        <div className="relative z-20 px-4 py-2 border-b border-amber-500/30 bg-amber-500/10 backdrop-blur-sm flex items-center justify-between gap-3">
          <div className="font-mono text-[10px] text-amber-200/90 leading-snug">
            Server neodpovedá alebo je zamrznutý. Reštart stacku cez launchd.
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isRestartingServer}
            onClick={() => void handleRestartServer({ silent: true })}
            className="active:scale-[0.98] shrink-0 h-7 px-2 text-[10px] border-amber-500/40 text-amber-100 hover:bg-amber-500/20"
          >
            <RefreshCw className={`w-3 h-3 mr-1 ${isRestartingServer ? 'animate-spin' : ''}`} />
            Reštartovať
          </Button>
        </div>
      )}

      {/* Main Content - flex layout with input at absolute bottom */}
      <div className="relative z-10 flex-1 flex flex-col items-center px-6 pt-4 pb-4 overflow-hidden w-full">
        {viewMode === 'dual-chat' ? (
          <DualChatArea />
        ) : viewMode === 'system' ? (
          <div className="flex-1 w-full max-w-7xl h-full pb-4">
            <SystemMonitor />
          </div>
        ) : viewMode === 'insolvency' ? (
          <div className="flex-1 w-full max-w-7xl h-full pb-4">
            <InsolvencyMonitor />
          </div>
        ) : viewMode === 'files' ? (
          <div className="flex-1 w-full max-w-7xl h-full pb-4">
            <FileExplorer />
          </div>
        ) : viewMode === 'terminal' ? (
          shellSessionId ? (
            <div className="flex-1 w-full max-w-5xl h-full pb-4">
              <TerminalView sessionId={shellSessionId} />
            </div>
          ) : (
            <div className="flex-1 w-full flex items-center justify-center text-muted-foreground font-[var(--font-heading)]">
              Initializing interactive shell session...
            </div>
          )
        ) : renderGroups.length === 0 || isIdle ? (
          <div className="flex-1 w-full relative">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <ParticleOrb isTyping={isTyping} keystrokeTrigger={keystrokeTrigger} />
            </div>
          </div>
        ) : (
          <div className="flex-1 w-full max-w-4xl overflow-y-auto mb-4 pr-2 space-y-4 scrollbar-thin scrollable-container">
            {renderGroups.map((group) => {
              if (group.type === 'chat') {
                if (group.role === 'user') {
                  // User chat message
                  return (
                    <div className="pipeline-item" key={group.id} data-copyable-text={group.content}>
                      <div className="icon-container">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
                          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                      </div>
                      <div className="content">
                        <div className="header active">
                          <div className="title-group">
                            <span className="text-[var(--text-primary)]">{group.content}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  // Assistant chat message (either thinking or real response)
                  if (group.content === '...') {
                    // Thinking spinner state
                    return (
                      <div className="pipeline-item" key={group.id}>
                        <div className="icon-container">
                          <svg className="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                            <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                          </svg>
                        </div>
                        <div className="content">
                          <div className="header">
                            <div className="title-group">
                              <span>Thinking</span>
                              <svg className="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                                <polyline points="9 18 15 12 9 6"></polyline>
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  } else {
                    // Collapsible AI Response
                    const isExpanded = isItemExpanded(group.id, 'chat');
                    return (
                      <div className="pipeline-item" key={group.id} data-copyable-text={group.content}>
                        <div className="icon-container">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
                            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                          </svg>
                        </div>
                        <div className="content">
                          <div
                            className={`header ${isExpanded ? 'active' : ''}`}
                            onClick={() => toggleItem(group.id)}
                            style={{ cursor: 'pointer' }}
                          >
                            <div className="title-group">
                              <span>AI Agent Response</span>
                              <ChevronIcon expanded={isExpanded} />
                            </div>
                          </div>
                          {isExpanded && (
                            <>
                              <div className="text-[var(--text-primary)] text-sm leading-relaxed whitespace-pre-wrap pl-2 mb-2">
                                {group.content}
                              </div>
                              <ShellCommandChips
                                commands={extractShellCommands(group.content)}
                                disabled={isExecutingCommand}
                                onRun={(cmd) => {
                                  triggerHaptic('success');
                                  executeShellCommand(cmd);
                                }}
                              />
                            </>
                          )}
                        </div>
                      </div>
                    );
                  }
                }
              }

              if (group.type === 'command-group') {
                // Collapsible Terminal Command
                const isExpanded = isItemExpanded(group.id, 'command-group');
                return (
                  <div className="pipeline-item" key={group.id} data-copyable-text={group.command}>
                    <div className="icon-container">&lt;/&gt;</div>
                    <div className="content">
                      <div
                        className={`header ${isExpanded ? 'active' : ''}`}
                        onClick={() => toggleItem(group.id)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="title-group">
                          <span>{group.command ? `$ ${group.command}` : 'Terminal Session'}</span>
                          <ChevronIcon expanded={isExpanded} />
                        </div>
                      </div>
                      
                      {isExpanded && (
                        <div className="terminal-box" data-copyable-text={cleanAnsi(group.output || '')}>
                          <div className="terminal-header">Terminal (local)</div>
                          <div className="terminal-content">
                            {cleanAnsi(group.output || '')}
                            {group.isExecuting && <span className="cursor"></span>}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              return null;
            })}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input Area - positioned at absolute bottom with safe area offset + 12px padding */}
        {viewMode !== 'terminal' && viewMode !== 'dual-chat' && (
          <div className="w-full max-w-4xl mt-auto mb-0 pb-[calc(env(safe-area-inset-bottom,0px)+12px)]">
            {isRecording && (
              <div className="mb-3 input-3d bg-gradient-to-r from-black/90 via-black/95 to-black/90 backdrop-blur-xl rounded-full border border-border/50 px-6 py-3 shadow-2xl animate-in slide-in-from-bottom-2 fade-in duration-300">
                <div className="flex items-center justify-between gap-6">
                  {/* Left: Recording indicator */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                    <p className="text-sm font-medium text-foreground">Recording...</p>
                  </div>

                  {/* Center: Voice wave animation spanning full width */}
                  <div className="flex-1 flex items-center justify-center gap-[2px] h-10 overflow-hidden">
                    {[...Array(60)].map((_, i) => (
                      <div
                        key={i}
                        className="voice-wave-bar-horizontal bg-foreground/70 rounded-full shrink-0"
                        style={{
                          width: "2px",
                          animationDelay: `${-i * 0.03}s`,
                          animationDirection: "reverse",
                        }}
                      />
                    ))}
                  </div>

                  {/* Right: Action buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="active:scale-[0.98] h-8 w-8 rounded-full bg-secondary/30 hover:bg-destructive/20 text-white hover:text-destructive"
                      onClick={() => stopVoiceInput(true)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      className="active:scale-[0.98] h-8 w-8 rounded-full bg-gradient-to-br from-primary via-gray-900 to-black hover:from-gray-900 hover:to-black text-white shadow-xl"
                      onClick={() => stopVoiceInput(false)}
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Clean input layout: N | Microphone | Input Field | Send Button - height increased by 5px */}
            <div className="relative input-3d bg-gradient-to-br from-secondary/70 via-secondary/60 to-secondary/50 backdrop-blur-xl rounded-2xl border border-border/50 p-[calc(1rem+2.5px)] shadow-2xl flex items-center gap-3 min-h-[124px]">
              {isTyping && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none rounded-2xl" style={{ zIndex: 10, overflow: 'visible' }}>
                  <defs>
                    <linearGradient id="comet-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="rgba(46, 16, 101, 0)" /> {/* Fully transparent purple tail */}
                      <stop offset="15%" stopColor="rgba(109, 40, 217, 0.25)" /> {/* Soft purple transition */}
                      <stop offset="35%" stopColor="rgba(109, 40, 217, 0.7)" /> {/* Medium purple */}
                      <stop offset="55%" stopColor="#3b82f6" /> {/* Solid blue */}
                      <stop offset="75%" stopColor="#06b6d4" /> {/* Bright cyan */}
                      <stop offset="92%" stopColor="#bae6fd" /> {/* Light blue */}
                      <stop offset="100%" stopColor="#ffffff" /> {/* Pure white head */}
                    </linearGradient>
                  </defs>
                  <rect
                    x="1"
                    y="1"
                    width="100%"
                    height="100%"
                    style={{ width: 'calc(100% - 2px)', height: 'calc(100% - 2px)' }}
                    rx="15px"
                    fill="none"
                    stroke="url(#comet-gradient)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    pathLength="100"
                    className={`comet-border ${isActivelyTyping ? "comet-active" : ""}`}
                  />
                </svg>
              )}
              {/* Sidebar Toggle N Button */}
              <Button
                variant={sidebarOpen ? "secondary" : "ghost"}
                size="icon"
                className="active:scale-[0.98] h-9 w-9 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center justify-center font-bold text-lg shrink-0"
                onClick={() => {
                  triggerHaptic('light');
                  toggleSidebar();
                }}
              >
                N
              </Button>

              {/* Input mode: AI / $ / / */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  const next = cycleInputMode(inputMode);
                  setInput(applyInputModePrefix(input, next));
                  setTimeout(() => textareaRef.current?.focus(), 0);
                }}
                className="active:scale-[0.98] h-9 min-w-9 px-2 rounded-full bg-secondary/50 border border-border/40 text-[11px] font-mono font-semibold text-accent shrink-0 hover:bg-secondary/70"
                title="Prepni režim: AI → $ → /"
              >
                {getInputModeLabel(inputMode)}
              </button>

              {/* Microphone — press-and-hold for speech recognition */}
              <Button
                variant="ghost"
                size="icon"
                className={`active:scale-[0.98] h-9 w-9 shrink-0 touch-none select-none ${
                  isRecording
                    ? 'text-destructive bg-destructive/15'
                    : 'text-white hover:text-foreground'
                }`}
                style={{ touchAction: 'none' }}
                aria-label="Drž pre hlasový vstup"
                aria-pressed={isRecording}
                onPointerDown={handleMicPointerDown}
                onPointerUp={handleMicPointerUp}
                onPointerLeave={handleMicPointerUp}
                onPointerCancel={handleMicPointerUp}
              >
                <Mic className="w-4 h-4" />
              </Button>

              {/* Clean Text Input (Center) */}
              <textarea
                ref={textareaRef}
                value={input}
                rows={3}
                placeholder={getInputPlaceholder(inputMode)}
                onChange={(e) => {
                  setInput(e.target.value)
                  setKeystrokeTrigger(prev => prev + 1)
                  setIsActivelyTyping(true)
                  if (typingTimeoutRef.current) {
                    clearTimeout(typingTimeoutRef.current)
                  }
                  typingTimeoutRef.current = setTimeout(() => {
                    setIsActivelyTyping(false)
                  }, 800)
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                aria-label="Správa"
                className="flex-1 bg-transparent border-none outline-none resize-none text-foreground text-base min-h-[80px] font-normal py-3 leading-6"
              />

              {/* Send Button (Right) */}
              <Button
                size="icon"
                onClick={handleSend}
                className="active:scale-[0.98] h-9 w-9 rounded-full bg-gradient-to-br from-primary via-gray-900 to-black hover:from-gray-900 hover:to-black text-white shadow-xl shrink-0"
              >
                <ArrowUp className="w-5 h-5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {contextMenu.visible && (
        <div
          id="custom-ios-context-menu"
          className="fixed z-[9999] flex items-center gap-1.5 p-1.5 rounded-xl border border-white/10 shadow-2xl backdrop-blur-[12px] bg-zinc-950/85 pointer-events-auto select-none touch-none"
          style={{
            top: `${contextMenu.y}px`,
            left: `${contextMenu.x}px`,
            transform: contextMenu.side === 'top'
              ? 'translate(-50%, -100%) translateY(-15px)'
              : 'translate(-50%, 0) translateY(25px)',
            boxShadow: '0 0 15px rgba(6, 182, 212, 0.25), 0 8px 32px rgba(0, 0, 0, 0.6)',
            animation: contextMenu.side === 'top'
              ? 'ios-menu-bounce-top 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards'
              : 'ios-menu-bounce-bottom 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopy}
            disabled={!contextMenu.textToCopy}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 active:scale-95 ${
              contextMenu.textToCopy
                ? 'text-accent hover:bg-white/5 active:bg-white/10 cursor-pointer'
                : 'text-zinc-600 cursor-not-allowed opacity-50'
            }`}
          >
            <Copy className="w-3.5 h-3.5" />
            Kopírovať
          </button>
          
          {/* Divider */}
          <div className="w-[1px] h-4 bg-white/10" />
          
          {/* Paste Button */}
          <button
            type="button"
            onClick={handlePaste}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-accent hover:bg-white/5 active:bg-white/10 transition-all duration-200 active:scale-95 cursor-pointer"
          >
            <Clipboard className="w-3.5 h-3.5" />
            Vložiť
          </button>
        </div>
      )}

      {pasteDialog.visible && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onContextMenu={(e) => e.preventDefault()}>
          <div
            className="w-full max-w-sm rounded-2xl border border-white/10 p-5 bg-zinc-950/95 shadow-2xl flex flex-col gap-4"
            style={{
              boxShadow: '0 0 25px rgba(6, 182, 212, 0.15), 0 8px 32px rgba(0, 0, 0, 0.8)',
              animation: 'dropdown-in 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.15) forwards',
            }}
          >
            <div className="flex flex-col gap-1.5 font-sans">
              <h3 className="text-sm font-semibold text-foreground font-[var(--font-heading)]">
                Vložiť text (PWA Fallback)
              </h3>
              <p className="text-xs text-muted-foreground leading-normal">
                iOS vyžaduje manuálne vloženie na nezabezpečenom pripojení (HTTP). Podržte prst v poli nižšie a zvoľte **Vložiť**.
              </p>
            </div>

            <textarea
              value={pasteDialog.tempText}
              onChange={(e) => setPasteDialog(prev => ({ ...prev, tempText: e.target.value }))}
              placeholder="Sem vložte skopírovaný text..."
              className="w-full min-h-[90px] p-3 rounded-lg border border-border bg-zinc-900/50 text-foreground text-sm outline-none resize-none focus:border-accent/50 transition-colors"
              autoFocus
            />

            <div className="flex items-center justify-end gap-2 mt-1">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground h-8 px-3 rounded-md"
                onClick={() => setPasteDialog({ visible: false, tempText: "" })}
              >
                Zrušiť
              </Button>
              <Button
                size="sm"
                className="active:scale-[0.98] h-8 px-4 rounded-md bg-gradient-to-br from-primary via-gray-900 to-black text-white text-xs font-semibold shadow-md"
                onClick={async () => {
                  const textToPaste = pasteDialog.tempText;
                  setPasteDialog({ visible: false, tempText: "" });
                  if (textToPaste) {
                    await executePasteText(textToPaste);
                  }
                }}
              >
                Vložiť
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
