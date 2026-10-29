import { NextResponse } from 'next/server';
import { db, failure, hash, equal, requireLive, limit, sameOrigin } from '@/lib/server';
import { paystack } from '@/lib/paystack';
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    requireLive();
    await limit(request, 'payment', 8);
    const {
      reference,
      accessToken
    } = await request.json();
    if (typeof reference !== 'string' || typeof accessToken !== 'string') throw new Error('Invalid payment request');
    const order = await (await db()).collection('orders').findOne({
      reference
    });
    if (!order || !equal(hash(accessToken), order.accessTokenHash) || order.status !== 'payment_pending') throw new Error('Invalid payment request');
    const data = await paystack('/transaction/initialize', {
      email: order.email,
      amount: Math.round(order.total * 100),
      currency: 'NGN',
      reference: order.reference,
      callback_url: `${process.env.APP_URL}/payment/return`,
      metadata: {
        order_reference: reference
      }
    });
    const url = new URL(data.authorization_url);
    if (url.protocol !== 'https:' || url.hostname !== 'checkout.paystack.com') throw new Error('Payment authorization failed');
    return NextResponse.json({
      authorizationUrl: url.href
    });
  } catch (e) {
    return failure(e);
  }
}
