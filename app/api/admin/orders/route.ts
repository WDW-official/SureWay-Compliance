import { NextResponse } from 'next/server';
import { admin, db, failure, sameOrigin } from '@/lib/server';
import { download, upload, type StoredFile } from '@/lib/files';
import { statuses, statusLabels, type UploadKind } from '@/lib/catalog';
import { queue } from '@/lib/notifications';
import { issuanceStatuses } from '@/lib/cancellation';
import { refundPausesFulfillment } from '@/lib/refunds';
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
      uploads: (o.uploads as (StoredFile & { documentType?: UploadKind })[]).map(file => ({
        ...download(file),
        documentType: file.documentType
      })),
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
    const orders = database.collection('orders');
    const order = await orders.findOne({
      reference
    });
    if (!order) throw new Error('Order not found');
    if (order.status === 'cancelled') return NextResponse.json({ error: 'This order has been cancelled.' }, { status: 409 });
    if (order.status === 'payment_pending') throw new Error('Only paid orders can be processed.');
    if (refundPausesFulfillment(order.refund, order.total)) {
      return NextResponse.json({ error: 'Fulfillment is paused for this refund.' }, { status: 409 });
    }
    if (order.status === 'completed' && status !== 'completed') return NextResponse.json({ error: 'Completed orders cannot return to fulfillment.' }, { status: 409 });
    const file = form.get('file');
    const documents: StoredFile[] = [...order.documents];
    const hasFile = file instanceof File && file.size > 0;
    if (['soft_copies_ready', 'completed'].includes(status) && !documents.length && !hasFile) throw new Error('Upload the completed documents before this status transition.');
    if (order.insurance && !order.services.length && ['out_for_delivery', 'ready_for_collection'].includes(status)) {
      throw new Error('Insurance-only orders are fulfilled digitally.');
    }
    if (status === 'out_for_delivery' && order.delivery !== 'delivery') throw new Error('This order is for collection.');
    if (status === 'ready_for_collection' && order.delivery !== 'collection') throw new Error('This order is for delivery.');
    let revision = order.fulfillmentRevision ?? null;
    let documentsCreatedAt = order.documentsCreatedAt;
    if (hasFile && !documentsCreatedAt) {
      const now = new Date();
      const marked = await orders.findOneAndUpdate(
        { _id: order._id, status: order.status, fulfillmentRevision: revision },
        { $set: { documentsCreatedAt: now, updatedAt: now }, $inc: { fulfillmentRevision: 1 } },
        { returnDocument: 'after' }
      );
      if (!marked) return NextResponse.json({ error: 'This order changed. Refresh and try again.' }, { status: 409 });
      documentsCreatedAt = marked.documentsCreatedAt;
      revision = marked.fulfillmentRevision;
    }
    if (hasFile) documents.push(await upload(file));
    if (!documentsCreatedAt && (documents.length || issuanceStatuses.includes(status))) documentsCreatedAt = new Date();
    const result = await orders.updateOne({
      _id: order._id,
      status: order.status,
      fulfillmentRevision: revision
    }, {
      $set: {
        status,
        documents,
        ...(documentsCreatedAt && { documentsCreatedAt }),
        updatedAt: new Date()
      },
      $inc: { fulfillmentRevision: 1 },
      $push: {
        history: {
          status,
          at: new Date()
        }
      }
    } as never);
    if (!result.matchedCount) return NextResponse.json({ error: 'This order changed. Refresh and try again.' }, { status: 409 });
    await queue(`status-${reference}-${status}-${documents.length}`, order.channel === 'whatsapp' ? '' : order.email, `SureWay: ${statusLabels[status]} · ${reference}`, `Hello ${order.name},\n\nYour order ${reference} is now: ${statusLabels[status]}.\n${status === 'ready_for_collection' ? 'Our team will contact you with the collection location.' : ''}\nTrack your order at ${process.env.APP_URL}.`, order.channel === 'email' ? undefined : order.phone, documents);
    return NextResponse.json({
      ok: true
    });
  } catch (e) {
    return failure(e);
  }
}
