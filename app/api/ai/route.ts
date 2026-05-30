/**
 * Proxy: /api/ai  ->  AI proxy service (default http://127.0.0.1:8787/api/ai)
 *
 * Forwards the chat question to the local AI proxy service. Provider API keys
 * live in the AI proxy service env, never in the browser. This handler only
 * relays the request body and response.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAiProxyUrl, PROXY_TIMEOUT_MS } from '@/lib/services/serviceConfig';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  // Health passthrough so the UI can check the AI proxy without exposing it directly.
  try {
    const res = await fetchWithTimeout(`${getAiProxyUrl()}/health`, { method: 'GET' });
    const data = await safeJson(res);
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      { error: `AI proxy unreachable: ${(error as Error).message}` },
      { status: 502 }
    );
  }
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  try {
    const res = await fetchWithTimeout(`${getAiProxyUrl()}/api/ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await safeJson(res);
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to reach AI proxy: ${(error as Error).message}` },
      { status: 502 }
    );
  }
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return { error: `Upstream returned non-JSON (status ${res.status}).` };
  }
}
