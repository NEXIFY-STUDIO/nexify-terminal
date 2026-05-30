/**
 * POST /api/pandora/projects/create
 *
 * Matches the Pandora connector contract (src/lib/pandora/pandoraConnector.js).
 * Phase 1: a safe stub/adapter so the connector has a real endpoint instead of
 * a 404. It validates the incoming brief, then returns a contract-shaped
 * response. When PANDORA_UPSTREAM_URL is set, the request is forwarded to the
 * real Pandora backend instead.
 *
 * Request:  { brief: { projectName, goal, description, contactEmail, ... } }
 * Response: { ok, stage, requestId, message, ...contractFields }
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { normalizeBrief, validateBriefCore } from '@/src/lib/pandora/pandoraSchema.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SCHEMA_VERSION = 'web24h_v1';
const VIBECRAFT_RENDER_BASE = 'https://vibecraft.rubberduck.sk/api/render/';

export async function POST(request: NextRequest) {
  const requestId = randomUUID();

  let payload: { brief?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, stage: 'validation_failed', requestId, message: 'Invalid JSON body.' },
      { status: 400 }
    );
  }

  if (!payload || typeof payload !== 'object' || !payload.brief || typeof payload.brief !== 'object') {
    return NextResponse.json(
      { ok: false, stage: 'validation_failed', requestId, message: 'Missing brief object.' },
      { status: 400 }
    );
  }

  // Validate + normalize using the existing Pandora schema helpers.
  let normalized: Record<string, unknown>;
  try {
    normalized = normalizeBrief(payload.brief);
  } catch (error) {
    return NextResponse.json(
      { ok: false, stage: 'validation_failed', requestId, message: (error as Error).message },
      { status: 400 }
    );
  }

  const core = validateBriefCore(normalized);
  if (!core.valid) {
    return NextResponse.json(
      {
        ok: false,
        stage: 'validation_failed',
        requestId,
        message: core.errors.join('; '),
      },
      { status: 400 }
    );
  }

  // Optional passthrough to a real upstream Pandora backend.
  const upstream = process.env.PANDORA_UPSTREAM_URL;
  if (upstream) {
    try {
      const res = await fetch(`${upstream.replace(/\/+$/, '')}/api/pandora/projects/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.PANDORA_API_TOKEN
            ? { Authorization: `Bearer ${process.env.PANDORA_API_TOKEN}` }
            : {}),
        },
        body: JSON.stringify({ brief: normalized }),
      });
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(data, { status: res.status });
    } catch (error) {
      return NextResponse.json(
        {
          ok: false,
          stage: 'upstream_timeout',
          requestId,
          message: `Pandora upstream unreachable: ${(error as Error).message}`,
        },
        { status: 502 }
      );
    }
  }

  // Phase 1 stub: synthesize a contract-valid response without a real backend.
  const artifactId = randomUUID();
  return NextResponse.json(
    {
      ok: true,
      stage: 'created',
      requestId,
      message: 'Pandora stub: brief accepted (Phase 1 — no live backend).',
      artifactId,
      schemaVersion: SCHEMA_VERSION,
      productType: normalized.productType,
      previewUrl: `${VIBECRAFT_RENDER_BASE}${artifactId}?mode=preview`,
      exportUrl: `${VIBECRAFT_RENDER_BASE}${artifactId}?mode=export`,
    },
    { status: 200 }
  );
}
