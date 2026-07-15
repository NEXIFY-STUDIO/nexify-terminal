import { NextResponse } from "next/server"
import { execFile } from "node:child_process"
import os from "node:os"
import { promisify } from "node:util"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const execFileAsync = promisify(execFile)

const LAUNCHD_LABEL = process.env.NEXIFY_LAUNCHD_LABEL || "com.nexify.terminal"
const RESTART_COOLDOWN_MS = Number(process.env.NEXIFY_RESTART_COOLDOWN_MS || 30_000)

let lastRestartAt = 0

function launchdDomain() {
  return `gui/${os.userInfo().uid}/${LAUNCHD_LABEL}`
}

export async function POST() {
  const now = Date.now()
  const elapsed = now - lastRestartAt

  if (lastRestartAt > 0 && elapsed < RESTART_COOLDOWN_MS) {
    const retryAfter = Math.ceil((RESTART_COOLDOWN_MS - elapsed) / 1000)
    return NextResponse.json(
      {
        error: "Restart cooldown active.",
        retryAfter,
      },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    )
  }

  lastRestartAt = now
  const domain = launchdDomain()

  // Respond before kickstart — Next dies when launchd kills dev-all.
  setImmediate(() => {
    execFile("launchctl", ["kickstart", "-k", domain], (error) => {
      if (error) {
        console.error(`[nexify/restart] kickstart failed for ${domain}:`, error.message)
      }
    })
  })

  return NextResponse.json({
    status: "restarting",
    service: "nexify-terminal",
    label: LAUNCHD_LABEL,
    domain,
  })
}

/** Read-only probe for operator status reports. */
export async function GET() {
  try {
    const { stdout } = await execFileAsync("launchctl", ["print", launchdDomain()], {
      timeout: 5_000,
    })
    const running = /state = running/.test(stdout)
    return NextResponse.json({
      status: running ? "ok" : "stopped",
      label: LAUNCHD_LABEL,
      domain: launchdDomain(),
      launchd: running ? "running" : "stopped",
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        label: LAUNCHD_LABEL,
        domain: launchdDomain(),
        message: (error as Error).message,
      },
      { status: 503 }
    )
  }
}
