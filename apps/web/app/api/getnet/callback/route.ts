import { NextResponse } from 'next/server';

function getApiPublicBaseUrl(): string {
  const base =
    process.env.API_PUBLIC_URL ??
    process.env.API_PUBLIC_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    'http://localhost:3001';
  return base.replace(/\/$/, '');
}

function buildUpstreamWebhookUrl(): string {
  return `${getApiPublicBaseUrl()}/public/payments/getnet/webhook`;
}

function pickForwardHeaders(request: Request): Headers {
  const out = new Headers();
  const contentType = request.headers.get('content-type');
  if (contentType) out.set('content-type', contentType);

  const authorization = request.headers.get('authorization');
  if (authorization) out.set('authorization', authorization);

  const webhookHeaderName =
    process.env.GETNET_WEBHOOK_HEADER_NAME?.trim() || 'x-getnet-webhook-secret';
  const webhookSecret = request.headers.get(webhookHeaderName);
  if (webhookSecret) out.set(webhookHeaderName, webhookSecret);

  return out;
}

async function proxyPostToApiWebhook(request: Request): Promise<NextResponse> {
  const upstreamUrl = buildUpstreamWebhookUrl();
  const body = await request.arrayBuffer();

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      method: 'POST',
      headers: pickForwardHeaders(request),
      body,
      cache: 'no-store',
    });
  } catch (err) {
    console.error('[getnet/callback] upstream unreachable', {
      upstreamUrl,
      message: err instanceof Error ? err.message : 'fetch failed',
    });
    return NextResponse.json(
      { ok: false, message: 'Payment API unavailable' },
      { status: 502 },
    );
  }

  const responseText = await upstream.text();
  const responseContentType =
    upstream.headers.get('content-type') ?? 'application/json';

  if (!upstream.ok) {
    console.warn('[getnet/callback] upstream non-OK', { status: upstream.status });
  }

  return new NextResponse(responseText, {
    status: upstream.status,
    headers: { 'content-type': responseContentType },
  });
}

/** Portal verification (Getnet may probe with GET). */
export async function GET() {
  return NextResponse.json({ ok: true, route: 'getnet-callback' }, { status: 200 });
}

/** Legacy portal callback URL → API webhook (Basic Auth / header secret forwarded). */
export async function POST(request: Request) {
  return proxyPostToApiWebhook(request);
}
