import { NextResponse } from "next/server"
import { getHackApiUrl } from "@/lib/services/serviceConfig"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const res = await fetch(`${getHackApiUrl()}/sysinfo`)
    if (!res.ok) {
      throw new Error(`Upstream system API returned status ${res.status}`)
    }
    const data = await res.json()
    return NextResponse.json({ success: true, ...data })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 502 })
  }
}
