import { NextRequest, NextResponse } from "next/server"
import fs from "node:fs/promises"
import { getSafePath, getHomeDir } from "@/lib/security/fileUtils"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const rawPath = searchParams.get("path") || getHomeDir()
    const safePath = getSafePath(rawPath)

    const entries = await fs.readdir(safePath, { withFileTypes: true })
    const files = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = `${safePath}/${entry.name}`
        try {
          const stats = await fs.stat(fullPath)
          return {
            name: entry.name,
            isDirectory: entry.isDirectory(),
            size: stats.size,
            mtime: stats.mtime.toISOString(),
          }
        } catch {
          // If stat fails (broken symlink etc.), return fallback stats
          return {
            name: entry.name,
            isDirectory: entry.isDirectory(),
            size: 0,
            mtime: new Date().toISOString(),
          }
        }
      })
    )

    // Sort: directories first, then alphabetical names
    files.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1
      if (!a.isDirectory && b.isDirectory) return 1
      return a.name.localeCompare(b.name)
    })

    return NextResponse.json({ success: true, files, currentPath: safePath })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, path: rawPath } = body

    if (!action || !rawPath) {
      return NextResponse.json({ success: false, error: "Missing action or path" }, { status: 400 })
    }

    const safePath = getSafePath(rawPath)

    switch (action) {
      case "read": {
        const ext = safePath.split('.').pop()?.toLowerCase() || '';
        const isImage = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext);
        if (isImage) {
          const buffer = await fs.readFile(safePath);
          const mime = ext === 'svg' ? 'image/svg+xml' : `image/${ext}`;
          const base64 = buffer.toString('base64');
          return NextResponse.json({ success: true, isImage: true, dataUrl: `data:${mime};base64,${base64}` });
        }
        const content = await fs.readFile(safePath, "utf8")
        return NextResponse.json({ success: true, content })
      }
      case "write": {
        const { content = "" } = body
        await fs.writeFile(safePath, content, "utf8")
        return NextResponse.json({ success: true })
      }
      case "create": {
        const { type = "file" } = body
        if (type === "directory") {
          await fs.mkdir(safePath, { recursive: true })
        } else {
          await fs.writeFile(safePath, "", "utf8")
        }
        return NextResponse.json({ success: true })
      }
      case "delete": {
        await fs.rm(safePath, { recursive: true, force: true })
        return NextResponse.json({ success: true })
      }
      default:
        return NextResponse.json({ success: false, error: `Unsupported action: ${action}` }, { status: 400 })
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }
}
