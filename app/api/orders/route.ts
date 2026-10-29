import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { orderSchema } from '@/lib/validation';
import { calculatePricing } from '@/lib/catalog';
import { db, requireLive, failure, randomToken, hash, sameOrigin, limit, indexes } from '@/lib/server';
import { resolveUpload } from '@/lib/files';
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    requireLive();
    await limit(request, 'orders', 8);
    const parsed = orderSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({
      error: parsed.error.issues[0].message
    }, {
      status: 400
    });
    const data = parsed.data;
    const reference = 'SW-' + randomBytes(8).toString('hex').toUpperCase();
    const accessToken = randomToken();
    const pricing = calculatePricing(data.services, data.delivery);
    const uploads = data.uploads.map(resolveUpload);
    await indexes();
    await (await db()).collection('orders').insertOne({
      ...data,
      uploads,
      services: [...new Set(data.services)],
      reference,
      accessTokenHash: hash(accessToken),
      pricing,
      total: pricing.total,
      status: 'payment_pending',
      documents: [],
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return NextResponse.json({
      reference,
      accessToken
    }, {
      status: 201
    });
  } catch (e) {
    return failure(e);
  }
}
