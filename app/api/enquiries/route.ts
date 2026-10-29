import { NextResponse } from 'next/server';
import { enquirySchema } from '@/lib/validation';
import { db, failure, limit, sameOrigin } from '@/lib/server';
import { queue } from '@/lib/notifications';
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    await limit(request, 'enquiries', 5);
    const parsed = enquirySchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({
      error: parsed.error.issues[0].message
    }, {
      status: 400
    });
    if (!process.env.TEAM_EMAIL) throw new Error('Team enquiries are not configured yet.');
    const data = {
      ...parsed.data,
      email: parsed.data.email.toLowerCase(),
      status: 'new',
      createdAt: new Date()
    };
    const result = await (await db()).collection('enquiries').insertOne(data);
    await queue('enquiry-' + result.insertedId, process.env.TEAM_EMAIL, `New ${data.kind} enquiry${data.company ? ' · ' + data.company : ''}`, `Contact: ${data.name}\nEmail: ${data.email}\nPhone: ${data.phone}\nOrganization: ${data.company}\nFleet size: ${data.fleetSize || 'N/A'}\nDocuments: ${data.documents.join(', ')}\n\n${data.message}\n\nReview: ${process.env.APP_URL}/admin`);
    return NextResponse.json({
      received: true
    }, {
      status: 201
    });
  } catch (e) {
    return failure(e);
  }
}
