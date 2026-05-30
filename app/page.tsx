"use client"

import { useState } from "react"
import { ChatArea } from "@/components/chat-area"
import { Sidebar } from "@/components/sidebar"

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background">
      {sidebarOpen && <Sidebar onClose={() => setSidebarOpen(false)} />}
      <ChatArea sidebarOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
    </div>
  )
}
