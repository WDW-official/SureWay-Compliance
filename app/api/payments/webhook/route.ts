import { NextResponse } from 'next/server';
import { createHmac } from 'node:crypto';
import { equal } from '@/lib/server';
import { settle } from '@/lib/paystack';
export async function POST(request: Request) {
  if (!process.env.PAYSTACK_SECRET_KEY) return new NextResponse(null, {
    status: 503
  });
  const body = await request.text();
  const sig = request.headers.get('x-paystack-signature') || '';
  if (!equal(createHmac('sha512', process.env.PAYSTACK_SECRET_KEY).update(body).digest('hex'), sig)) return new NextResponse(null, {
    status: 401
  });
  try {
    const event = JSON.parse(body);
    if (event.event === 'charge.success') await settle(event.data);
    return NextResponse.json({
      received: true
    });
  } catch {
    return new NextResponse(null, {
      status: 500
    });
  }
}
