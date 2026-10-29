import { NextResponse } from 'next/server';
import { failure, requireLive, limit } from '@/lib/server';
import { paystack, settle } from '@/lib/paystack';
export async function GET(request: Request) {
  try {
    requireLive();
    await limit(request, 'verify', 12);
    const reference = new URL(request.url).searchParams.get('reference');
    if (!reference || !/^SW-[A-F0-9]{16}$/.test(reference)) throw new Error('Invalid payment reference');
    return NextResponse.json(await settle(await paystack('/transaction/verify/' + encodeURIComponent(reference))), {
      headers: {
        'Cache-Control': 'no-store'
      }
    });
  } catch (e) {
    return failure(e);
  }
}
