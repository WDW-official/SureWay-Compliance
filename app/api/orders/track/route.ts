import { NextResponse } from 'next/server';
import { db, failure, limit, sameOrigin } from '@/lib/server';
import { download, type StoredFile } from '@/lib/files';
import { cancellationDeadline } from '@/lib/cancellation';
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    await limit(request, 'track', 10);
    const {
      reference,
      email
    } = await request.json();
    if (typeof reference !== 'string' || typeof email !== 'string') throw new Error('Enter a valid reference and email.');
    const order = await (await db()).collection('orders').findOne({
      reference: reference.trim().toUpperCase(),
      email: email.trim().toLowerCase()
    });
    if (!order) return NextResponse.json({
      error: 'No matching order was found.'
    }, {
      status: 404
    });
    return NextResponse.json({
      reference: order.reference,
      make: order.make,
      plate: order.plate,
      status: order.status,
      total: order.total,
      cancellableUntil: cancellationDeadline({
        status: order.status,
        createdAt: order.createdAt,
        documentsCreatedAt: order.documentsCreatedAt,
        documents: order.documents,
        history: order.history
      }),
      refundStatus: order.refund?.status ?? (order.status === 'cancelled' && order.paidAt ? 'review' : null),
      documents: (order.documents as StoredFile[]).map(download)
    }, {
      headers: {
        'Cache-Control': 'no-store'
      }
    });
  } catch (e) {
    return failure(e);
  }
}
