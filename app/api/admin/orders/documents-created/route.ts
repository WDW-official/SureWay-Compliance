import { cancellableStatuses } from '@/lib/cancellation';
import { admin, db, failure, sameOrigin } from '@/lib/server';

export async function POST(request: Request) {
  try {
    sameOrigin(request);
    await admin();
    const { reference } = await request.json();
    if (typeof reference !== 'string') return Response.json({ error: 'Enter a valid order reference.' }, { status: 400 });

    const now = new Date();
    const orders = (await db()).collection('orders');
    const order = await orders.findOneAndUpdate(
      { reference, status: { $in: cancellableStatuses.filter(status => status !== 'payment_pending') }, documentsCreatedAt: null },
      { $set: { documentsCreatedAt: now, updatedAt: now }, $inc: { fulfillmentRevision: 1 } },
      { returnDocument: 'after' }
    );
    if (order) return Response.json({ documentsCreatedAt: order.documentsCreatedAt });
    const existing = await orders.findOne({ reference });
    if (existing?.documentsCreatedAt) return Response.json({ documentsCreatedAt: existing.documentsCreatedAt });
    return Response.json({ error: 'Document creation cannot be recorded for this order.' }, { status: 409 });
  } catch (error) {
    return failure(error);
  }
}
