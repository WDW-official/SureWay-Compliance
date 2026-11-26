import { NextResponse } from 'next/server';
import { equal, failure } from '@/lib/server';
import { retryNotifications } from '@/lib/notifications';
import { processSubmissions } from '@/lib/submissions';
export const maxDuration = 300;
export async function POST(request: Request) {
  if (!process.env.CRON_SECRET || !equal(request.headers.get('authorization') || '', `Bearer ${process.env.CRON_SECRET}`)) return new NextResponse(null, {
    status: 401
  });
  try {
    const submissions = await processSubmissions();
    return NextResponse.json({ ...await retryNotifications(), submissions });
  } catch (e) {
    return failure(e);
  }
}
