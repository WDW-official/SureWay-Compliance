import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { sameOrigin, failure } from '@/lib/server';
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    (await cookies()).delete('sureway-admin');
    return NextResponse.json({
      ok: true
    });
  } catch (e) {
    return failure(e);
  }
}
