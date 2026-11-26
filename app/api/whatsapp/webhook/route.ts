import { createHmac } from 'node:crypto';
import { equal } from '@/lib/server';

export async function GET(request: Request) {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  if (!verifyToken) return new Response(null, { status: 503 });

  const params = new URL(request.url).searchParams;
  const token = params.get('hub.verify_token');
  if (params.get('hub.mode') !== 'subscribe' || !token || !equal(verifyToken, token)) {
    return new Response(null, { status: 403 });
  }

  const challenge = params.get('hub.challenge');
  if (!challenge) return new Response(null, { status: 400 });

  return new Response(challenge, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

export async function POST(request: Request) {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) return new Response(null, { status: 503 });

  const signature = request.headers.get('x-hub-signature-256');
  if (!signature) return new Response(null, { status: 401 });

  const body = Buffer.from(await request.arrayBuffer());
  const expected = 'sha256=' + createHmac('sha256', appSecret).update(body).digest('hex');
  if (!equal(expected, signature)) return new Response(null, { status: 401 });

  return new Response(null, { status: 200 });
}
