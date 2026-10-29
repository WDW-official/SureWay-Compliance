import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { sign, equal, limit, sameOrigin, failure } from '@/lib/server';
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    await limit(request, 'admin-login', 5);
    if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length < 16) throw new Error('Admin access is not configured yet.');
    const {
      password
    } = await request.json();
    if (typeof password !== 'string' || !equal(password, process.env.ADMIN_PASSWORD)) return NextResponse.json({
      error: 'Invalid credentials'
    }, {
      status: 401
    });
    (await cookies()).set('sureway-admin', sign({
      role: 'admin',
      exp: Date.now() + 28800000
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 28800
    });
    return NextResponse.json({
      ok: true
    });
  } catch (e) {
    return failure(e);
  }
}
