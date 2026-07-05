import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "nexify-terminal",
    port: Number(process.env.WEB_PORT || process.env.NEXT_PORT || 3322),
  })
}