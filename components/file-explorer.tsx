"use client"

import { useState, useEffect } from "react"
import {
  Folder,
  FolderOpen,
  File,
  FileCode,
  Image as ImageIcon,
  Trash2,
  Plus,
  FolderPlus,
  RefreshCw,
  Save,
  FileText,
  ChevronRight,
  ChevronDown,
  Search,
  ArrowLeft,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface FileItem {
  name: string
  isDirectory: boolean
  size: number
  mtime: string
}

export function FileExplorer() {
  const [currentPath, setCurrentPath] = useState<string>(
    "/Users/erikbabcan/HUB/01-Projekty/aaa-terminalnexify2-with-v-main"
  )
  const [files, setFiles] = useState<FileItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Creation state
  const [showCreateInput, setShowCreateInput] = useState<'file' | 'directory' | null>(null)
  const [createName, setCreateName] = useState("")

  // Active file/editing state
  const [activeFile, setActiveFile] = useState<{ path: string; name: string; content?: string; isImage?: boolean; dataUrl?: string } | null>(null)
  const [editorContent, setEditorContent] = useState("")
  const [saving, setSaving] = useState(false)

  // Fetch file list
  const loadDirectory = async (path: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/files?path=${encodeURIComponent(path)}`)
      const data = await res.json()
      if (data.success) {
        setFiles(data.files)
        setCurrentPath(data.currentPath)
      } else {
        setError(data.error || "Failed to load directory.")
      }
    } catch (err: any) {
      setError(err.message || "Failed to contact files server.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDirectory(currentPath)
  }, [])

  // Navigation handlers
  const handleFolderClick = (folderName: string) => {
    const nextPath = currentPath === "/" ? `/${folderName}` : `${currentPath}/${folderName}`
    loadDirectory(nextPath)
  }

  const handleGoBack = () => {
    if (currentPath === "/Users/erikbabcan" || currentPath === "/") return
    const parts = currentPath.split("/")
    parts.pop()
    const parentPath = parts.join("/") || "/"
    loadDirectory(parentPath)
  }

  const handleRefresh = () => {
    loadDirectory(currentPath)
  }

  // File CRUD triggers
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createName.trim() || !showCreateInput) return

    const newPath = `${currentPath}/${createName.trim()}`
    try {
      const res = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          path: newPath,
          type: showCreateInput,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setShowCreateInput(null)
        setCreateName("")
        handleRefresh()
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (err: any) {
      alert(`Network error: ${err.message}`)
    }
  }

  const handleDelete = async (fileName: string, e: React.MouseEvent) => {
    e.stopPropagation() // Don't trigger file clicks
    if (!confirm(`Are you sure you want to delete ${fileName}?`)) return

    const targetPath = `${currentPath}/${fileName}`
    try {
      const res = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          path: targetPath,
        }),
      })
      const data = await res.json()
      if (data.success) {
        if (activeFile && activeFile.path === targetPath) {
          setActiveFile(null)
        }
        handleRefresh()
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (err: any) {
      alert(`Network error: ${err.message}`)
    }
  }

  const handleFileClick = async (file: FileItem) => {
    const filePath = `${currentPath}/${file.name}`
    setLoading(true)
    try {
      const res = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "read",
          path: filePath,
        }),
      })
      const data = await res.json()
      if (data.success) {
        if (data.isImage) {
          setActiveFile({
            path: filePath,
            name: file.name,
            isImage: true,
            dataUrl: data.dataUrl,
          })
        } else {
          setActiveFile({
            path: filePath,
            name: file.name,
            content: data.content,
          })
          setEditorContent(data.content)
        }
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (err: any) {
      alert(`Failed to read file: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveFile = async () => {
    if (!activeFile) return
    setSaving(true)
    try {
      const res = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "write",
          path: activeFile.path,
          content: editorContent,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setActiveFile(prev => prev ? { ...prev, content: editorContent } : null)
        alert("File saved successfully.")
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (err: any) {
      alert(`Save failed: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  // Helper for icons based on file type
  const getFileIcon = (file: FileItem) => {
    if (file.isDirectory) return <Folder className="w-4 h-4 text-accent shrink-0" />
    const ext = file.name.split(".").pop()?.toLowerCase() || ""
    if (["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext)) {
      return <ImageIcon className="w-4 h-4 text-emerald-400 shrink-0" />
    }
    if (["js", "ts", "tsx", "html", "css", "json", "md", "sh", "mjs"].includes(ext)) {
      return <FileCode className="w-4 h-4 text-violet-400 shrink-0" />
    }
    return <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
  }

  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))

  const pathBreadcrumbs = currentPath.split("/").filter(Boolean)

  return (
    <div className="w-full h-full grid grid-cols-1 md:grid-cols-12 gap-5 overflow-hidden">
      
      {/* LEFT COLUMN: Files Navigation (5 cols) */}
      <div className="md:col-span-5 bg-[#09090b]/80 border border-border/40 rounded-2xl p-4 flex flex-col overflow-hidden backdrop-blur-xl shadow-2xl">
        {/* Navigation Breadcrumbs */}
        <div className="flex items-center gap-2 mb-3 overflow-x-auto whitespace-nowrap scrollbar-none border-b border-border/30 pb-3">
          <Button
            variant="ghost"
            size="icon"
            className="active:scale-[0.98] h-7 w-7 rounded-lg text-muted-foreground hover:text-white"
            onClick={handleGoBack}
            disabled={
              currentPath === "/Users/erikbabcan/HUB/01-Projekty/aaa-terminalnexify2-with-v-main" ||
              currentPath === "/Users/erikbabcan" ||
              currentPath === "/"
            }
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </Button>
          <span className="text-[10px] text-muted-foreground tracking-wider uppercase font-[var(--font-heading)]">
            Home
          </span>
          {pathBreadcrumbs.slice(2).map((part, index) => (
            <span key={index} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ChevronRight className="w-3 h-3 text-muted-foreground/45" />
              <span className="text-foreground/80 font-medium">{part}</span>
            </span>
          ))}
        </div>

        {/* Action Panel */}
        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search in folder..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-secondary/30 border border-border/50 rounded-xl py-1.5 pl-8 pr-3 text-xs outline-none text-foreground placeholder:text-muted-foreground focus:border-accent/50 transition-colors"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="active:scale-[0.98] h-8 w-8 rounded-xl hover:bg-secondary/40 text-muted-foreground hover:text-accent"
            onClick={() => setShowCreateInput(showCreateInput === 'file' ? null : 'file')}
            title="New File"
          >
            <Plus className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="active:scale-[0.98] h-8 w-8 rounded-xl hover:bg-secondary/40 text-muted-foreground hover:text-accent"
            onClick={() => setShowCreateInput(showCreateInput === 'directory' ? null : 'directory')}
            title="New Folder"
          >
            <FolderPlus className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`active:scale-[0.98] h-8 w-8 rounded-xl hover:bg-secondary/40 text-muted-foreground hover:text-white ${loading ? "animate-spin" : ""}`}
            onClick={handleRefresh}
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Inline Create Input Form */}
        {showCreateInput && (
          <form onSubmit={handleCreate} className="mb-3 flex gap-2 animate-in slide-in-from-top-2 duration-200">
            <input
              type="text"
              placeholder={`Enter new ${showCreateInput} name...`}
              value={createName}
              onChange={e => setCreateName(e.target.value)}
              className="flex-1 bg-secondary/50 border border-border/50 rounded-xl px-3 py-1.5 text-xs outline-none text-foreground focus:border-accent/50"
              autoFocus
            />
            <Button
              type="submit"
              className="active:scale-[0.98] bg-accent/20 text-accent border border-accent/30 hover:bg-accent/30 text-xs px-3 h-8 rounded-xl"
            >
              Create
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="active:scale-[0.98] h-8 w-8 rounded-xl p-0"
              onClick={() => {
                setShowCreateInput(null)
                setCreateName("")
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </form>
        )}

        {/* Scrollable File List */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-1 scrollbar-thin">
          {loading && files.length === 0 ? (
            <div className="text-center py-10 text-xs text-muted-foreground">Loading file tree...</div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center py-10 text-xs text-muted-foreground">Folder is empty.</div>
          ) : (
            filteredFiles.map((file, i) => (
              <div
                key={i}
                onClick={() => file.isDirectory ? handleFolderClick(file.name) : handleFileClick(file)}
                className="group flex items-center justify-between px-3 py-2 rounded-xl bg-secondary/15 hover:bg-secondary/35 border border-transparent hover:border-border/30 transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {getFileIcon(file)}
                  <span className="text-xs text-foreground/80 font-medium truncate group-hover:text-foreground">
                    {file.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                    onClick={(e) => handleDelete(file.name, e)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: File Editor / Viewer (7 cols) */}
      <div className="md:col-span-7 bg-[#09090b]/80 border border-border/40 rounded-2xl p-4 flex flex-col overflow-hidden backdrop-blur-xl shadow-2xl">
        {activeFile ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Editor Top Bar */}
            <div className="flex items-center justify-between border-b border-border/30 pb-3 mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-accent" />
                <span className="text-xs font-semibold text-foreground/90 tracking-wide font-mono">
                  {activeFile.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {!activeFile.isImage && (
                  <Button
                    onClick={handleSaveFile}
                    disabled={saving}
                    className="active:scale-[0.98] gap-1.5 bg-gradient-to-br from-accent via-gray-900 to-black hover:from-accent hover:to-black text-white text-xs px-3 h-8 rounded-xl shadow-xl font-medium"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  className="active:scale-[0.98] text-muted-foreground hover:text-white text-xs px-3 h-8 rounded-xl hover:bg-secondary/40"
                  onClick={() => setActiveFile(null)}
                >
                  Close
                </Button>
              </div>
            </div>

            {/* Content Viewer / Textarea Editor */}
            <div className="flex-1 w-full h-full overflow-hidden relative">
              {activeFile.isImage ? (
                <div className="w-full h-full flex items-center justify-center p-6 bg-black/35 rounded-xl border border-border/30 overflow-auto">
                  <img
                    src={activeFile.dataUrl}
                    alt={activeFile.name}
                    className="max-w-full max-h-full object-contain rounded-lg shadow-xl"
                  />
                </div>
              ) : (
                <div className="w-full h-full flex bg-[#030303] rounded-xl border border-border/30 font-mono text-xs overflow-hidden">
                  {/* Left row numbers indicator decoration */}
                  <div className="bg-black/50 border-r border-border/20 px-2 py-3 text-right text-[10px] text-muted-foreground/35 select-none shrink-0 text-right">
                    {editorContent.split("\n").map((_, i) => (
                      <div key={i} className="leading-5 h-5">{i + 1}</div>
                    ))}
                  </div>
                  {/* Textarea */}
                  <textarea
                    value={editorContent}
                    onChange={e => setEditorContent(e.target.value)}
                    className="flex-1 h-full bg-transparent border-none outline-none resize-none p-3 text-[#d4d4d8] leading-5 font-mono text-xs overflow-y-auto selection:bg-accent/20"
                    placeholder="Empty file content..."
                  />
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Placeholder */
          <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
            <div className="max-w-sm text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-secondary/20 border border-border/40 flex items-center justify-center mx-auto shadow-inner shadow-black">
                <FolderOpen className="w-7 h-7 text-accent animate-pulse" />
              </div>
              <h3 className="text-base font-semibold text-foreground font-[var(--font-heading)]">
                Files Explorer Dashboard
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Select a file from the list to view its code, edit it directly, or display an image preview. Drag and drop file uploads coming soon.
              </p>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
