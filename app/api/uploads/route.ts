import { NextResponse } from 'next/server';
import { failure, limit, sameOrigin, requireLive } from '@/lib/server';
import { upload, uploadToken } from '@/lib/files';
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    requireLive();
    await limit(request, 'uploads', 15);
    const length = Number(request.headers.get('content-length'));
    if (!length || length > 11 * 1024 * 1024) throw new Error('Files must be smaller than 10 MB.');
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) throw new Error('Select a file to upload.');
    const stored = await upload(file);
    return NextResponse.json({
      token: uploadToken(stored),
      name: stored.name
    });
  } catch (e) {
    return failure(e);
  }
}
