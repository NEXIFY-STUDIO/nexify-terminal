/**
 * Proxy: /api/tools  ->  hacking API tool endpoints
 *   GET /api/tools?tool=<name>&target=<t>&...  -> upstream GET /api/hack/<tool>?...
 *
 * The upstream streams Server-Sent Events. This handler injects the server-side
 * X-Hack-Token (never exposed to the client) and pipes the SSE stream straight
 * back to the browser.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getHackApiUrl, getHackApiToken } from '@/lib/services/serviceConfig';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Tool name must match the upstream allowlist style: short, safe identifier.
const TOOL_NAME_RE = /^[a-z0-9-]{1,32}$/;

export async function GET(request: NextRequest) {
  const token = getHackApiToken();
  if (!token) {
    return NextResponse.json(
      { error: 'HACK_API_TOKEN is not configured on the server.' },
      { status: 503 }
    );
  }

  const params = request.nextUrl.searchParams;
  const tool = params.get('tool') || '';
  if (!TOOL_NAME_RE.test(tool)) {
    return NextResponse.json({ error: 'Invalid or missing tool name.' }, { status: 400 });
  }

  // Forward every query param except `tool` to the upstream (target, ports, etc.).
  const upstreamParams = new URLSearchParams();
  params.forEach((value, key) => {
    if (key !== 'tool') upstreamParams.append(key, value);
  });

  const upstreamUrl = `${getHackApiUrl()}/api/hack/${encodeURIComponent(tool)}?${upstreamParams.toString()}`;

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      method: 'GET',
      headers: {
        'X-Hack-Token': token,
        Accept: 'text/event-stream',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to reach hacking API: ${(error as Error).message}` },
      { status: 502 }
    );
  }

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => '');
    return NextResponse.json(
      { error: `Hacking API error (${upstream.status}).`, detail: detail.slice(0, 500) },
      { status: upstream.status || 502 }
    );
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
