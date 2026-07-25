import { NextResponse } from "next/server"
import { getAiProxyUrl, getHackApiUrl, PROXY_TIMEOUT_MS } from "@/lib/services/serviceConfig"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const WEB_PORT = Number(process.env.WEB_PORT || process.env.NEXT_PORT || 3322)

type HealthPart = {
  status: "ok" | "error"
  port?: number
  code?: number
  message?: string
  provider?: string
  version?: string
}

async function probe(url: string, timeoutMs = Math.min(PROXY_TIMEOUT_MS, 5_000)): Promise<HealthPart> {
  try {
    const res = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    })

    if (!res.ok) {
      return { status: "error", code: res.status }
    }

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
    const ok = data.status === "ok" || data.status === undefined

    return {
      status: ok ? "ok" : "error",
      ...(typeof data.provider === "string" ? { provider: data.provider } : {}),
      ...(typeof data.version === "string" ? { version: data.version } : {}),
    }
  } catch (error) {
    return { status: "error", message: (error as Error).message }
  }
}

export async function GET() {
  const hackApiUrl = getHackApiUrl()
  const aiProxyUrl = getAiProxyUrl()

  const [hackApi, ai] = await Promise.all([
    probe(`${hackApiUrl}/health`),
    probe(`${aiProxyUrl}/health`),
  ])

  const ui: HealthPart = { status: "ok", port: WEB_PORT }
  const hackPort = Number(new URL(hackApiUrl).port || 3021)
  const aiPort = Number(new URL(aiProxyUrl).port || 8788)
  hackApi.port = hackPort
  ai.port = aiPort

  const overall =
    ui.status === "ok" && hackApi.status === "ok" && ai.status === "ok" ? "ok" : "degraded"

  return NextResponse.json({
    status: overall === "ok" ? "ok" : "degraded",
    overall,
    service: "nexify-terminal",
    port: WEB_PORT,
    ui,
    hackApi,
    ai,
    stack: {
      ui: WEB_PORT,
      hackApi: hackApi.port,
      ai: ai.port,
    },
  })
}
