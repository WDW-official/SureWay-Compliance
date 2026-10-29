import { NextResponse } from 'next/server';
import { admin, db, failure, sameOrigin } from '@/lib/server';
import { download, upload, type StoredFile } from '@/lib/files';
import { statuses, statusLabels } from '@/lib/catalog';
import { queue } from '@/lib/notifications';
export async function GET() {
  try {
    await admin();
    const orders = await (await db()).collection('orders').find({}, {
      projection: {
        accessTokenHash: 0,
        consent: 0
      }
    }).sort({
      createdAt: -1
    }).limit(200).toArray();
    return NextResponse.json(orders.map(o => ({
      ...o,
      uploads: (o.uploads as StoredFile[]).map(download),
      documents: (o.documents as StoredFile[]).map(download)
    })), {
      headers: {
        'Cache-Control': 'no-store'
      }
    });
  } catch (e) {
    return failure(e);
  }
}
export async function PATCH(request: Request) {
  try {
    sameOrigin(request);
    await admin();
    const length = Number(request.headers.get('content-length'));
    if (!length || length > 11 * 1024 * 1024) throw new Error('Files must be smaller than 10 MB.');
    const form = await request.formData();
    const reference = String(form.get('reference') || ''),
      status = String(form.get('status') || '');
    if (!statuses.includes(status as typeof statuses[number]) || status === 'paid' || status === 'payment_pending') throw new Error('Invalid status transition');
    const database = await db();
    const order = await database.collection('orders').findOne({
      reference
    });
    if (!order) throw new Error('Order not found');
    if (order.status === 'payment_pending') throw new Error('Only paid orders can be processed.');
    const file = form.get('file');
    const documents: StoredFile[] = [...order.documents];
    if (file instanceof File && file.size) documents.push(await upload(file));
    if (['soft_copies_ready', 'completed'].includes(status) && !documents.length) throw new Error('Upload the completed documents before this status transition.');
    if (status === 'out_for_delivery' && order.delivery !== 'delivery') throw new Error('This order is for collection.');
    if (status === 'ready_for_collection' && order.delivery !== 'collection') throw new Error('This order is for delivery.');
    await database.collection('orders').updateOne({
      reference
    }, {
      $set: {
        status,
        documents,
        updatedAt: new Date()
      },
      $push: {
        history: {
          status,
          at: new Date()
        }
      }
    } as never);
    await queue(`status-${reference}-${status}-${documents.length}`, order.channel === 'whatsapp' ? '' : order.email, `SureWay: ${statusLabels[status]} · ${reference}`, `Hello ${order.name},\n\nYour order ${reference} is now: ${statusLabels[status]}.\n${status === 'ready_for_collection' ? 'Our team will contact you with the collection location.' : ''}\nTrack your order at ${process.env.APP_URL}.`, order.channel === 'email' ? undefined : order.phone, documents);
    return NextResponse.json({
      ok: true
    });
  } catch (e) {
    return failure(e);
  }
}
