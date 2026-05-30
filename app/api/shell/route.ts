/**
 * Proxy: /api/shell  ->  hacking API remote shell endpoints
 *
 * The upstream exposes several shell endpoints under /api/shell/sessions/...
 * This handler forwards them generically using a `path` query param, injecting
 * the server-side X-Shell-Token (never exposed to the client).
 *
 *   POST /api/shell?path=sessions                      -> create session
 *   GET  /api/shell?path=sessions/<id>                 -> session info
 *   GET  /api/shell?path=sessions/<id>/stream          -> SSE stream
 *   POST /api/shell?path=sessions/<id>/input           -> write input
 *   POST /api/shell?path=sessions/<id>/resize          -> resize
 *   DELETE /api/shell?path=sessions/<id>               -> close session
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getHackApiUrl, getShellToken } from '@/lib/services/serviceConfig';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Allow only the known shell sub-paths to avoid open-proxying the upstream.
const SHELL_PATH_RE = /^sessions(\/[A-Za-z0-9-]{1,64}(\/(stream|input|resize))?)?$/;

function resolveUpstream(request: NextRequest): { url: string } | { error: string } {
  const path = request.nextUrl.searchParams.get('path') || 'sessions';
  if (!SHELL_PATH_RE.test(path)) {
    return { error: 'Invalid shell path.' };
  }
  return { url: `${getHackApiUrl()}/api/shell/${path}` };
}

async function forward(request: NextRequest, method: string, withBody: boolean) {
  const token = getShellToken();
  if (!token) {
    return NextResponse.json(
      { error: 'Remote shell is disabled on this server (SHELL_TOKEN not set).' },
      { status: 503 }
    );
  }

  const resolved = resolveUpstream(request);
  if ('error' in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: 400 });
  }

  const headers: Record<string, string> = { 'X-Shell-Token': token };
  let body: string | undefined;
  if (withBody) {
    body = await request.text();
    headers['Content-Type'] = 'application/json';
  }

  let upstream: Response;
  try {
    upstream = await fetch(resolved.url, { method, headers, body });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to reach shell API: ${(error as Error).message}` },
      { status: 502 }
    );
  }

  // Stream SSE responses straight through.
  const contentType = upstream.headers.get('content-type') || '';
  if (contentType.includes('text/event-stream') && upstream.body) {
    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  }

  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: { 'Content-Type': contentType || 'application/json' },
  });
}

export async function GET(request: NextRequest) {
  return forward(request, 'GET', false);
}

export async function POST(request: NextRequest) {
  return forward(request, 'POST', true);
}

export async function DELETE(request: NextRequest) {
  return forward(request, 'DELETE', false);
}
