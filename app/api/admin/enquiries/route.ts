import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { admin, db, failure, sameOrigin } from '@/lib/server';
export async function GET() {
  try {
    await admin();
    const database = await db();
    const [enquiries, notifications] = await Promise.all([database.collection('enquiries').find().sort({
      createdAt: -1
    }).limit(200).toArray(), database.collection('notification_jobs').find({
      status: {
        $ne: 'sent'
      }
    }, {
      projection: {
        key: 1,
        subject: 1,
        status: 1,
        lastError: 1,
        attempts: 1
      }
    }).limit(100).toArray()]);
    return NextResponse.json({
      enquiries,
      notifications
    }, {
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
    const {
      id,
      status
    } = await request.json();
    if (!ObjectId.isValid(id) || !['new', 'contacted', 'resolved'].includes(status)) throw new Error('Invalid enquiry update');
    await (await db()).collection('enquiries').updateOne({
      _id: new ObjectId(id)
    }, {
      $set: {
        status,
        updatedAt: new Date()
      }
    });
    return NextResponse.json({
      ok: true
    });
  } catch (e) {
    return failure(e);
  }
}
