import { NextResponse } from 'next/server';
import { equal, failure } from '@/lib/server';
import { retryNotifications } from '@/lib/notifications';
export async function POST(request: Request) {
  if (!process.env.CRON_SECRET || !equal(request.headers.get('authorization') || '', `Bearer ${process.env.CRON_SECRET}`)) return new NextResponse(null, {
    status: 401
  });
  try {
    return NextResponse.json(await retryNotifications());
  } catch (e) {
    return failure(e);
  }
}
