import { z } from 'zod';
import { db, failure, limit, sameOrigin } from '@/lib/server';
import { cancellationFilter } from '@/lib/cancellation';

const details = z.object({
  reference: z.string().trim().toUpperCase().regex(/^SW-[A-F0-9]{16}$/),
  email: z.string().trim().toLowerCase().pipe(z.email())
});

export async function POST(request: Request) {
  try {
    sameOrigin(request);
    await limit(request, 'cancel', 8);
    const parsed = details.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: 'Enter a valid reference and email.' }, { status: 400 });

    const orders = (await db()).collection('orders');
    const now = new Date();
    const order = await orders.findOneAndUpdate(
      { ...parsed.data, ...cancellationFilter(now) },
      { $set: { status: 'cancelled', cancelledAt: now, updatedAt: now } },
      { returnDocument: 'after' }
    );
    if (order) return Response.json({ status: 'cancelled', refundStatus: order.refund?.status ?? (order.paidAt ? 'review' : null) });

    const existing = await orders.findOne(parsed.data, { projection: { status: 1, paidAt: 1, 'refund.status': 1 } });
    if (!existing) return Response.json({ error: 'No matching order was found.' }, { status: 404 });
    if (existing.status === 'cancelled') {
      return Response.json({ status: 'cancelled', refundStatus: existing.refund?.status ?? (existing.paidAt ? 'review' : null) });
    }
    return Response.json({
      error: 'This order can no longer be cancelled. Contact SureWay for help.'
    }, { status: 409 });
  } catch (error) {
    return failure(error);
  }
}
