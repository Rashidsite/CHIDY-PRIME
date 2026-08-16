import { NextResponse } from 'next/server';
import { uploadToImgBB } from '@/lib/imgbb';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const limit = rateLimit(ip, { limit: 15, windowMs: 60 * 1000 });
    if (!limit.success) {
      return NextResponse.json({ success: false, error: 'Too many upload requests. Please wait a minute.' }, { status: 429 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided in form data' }, { status: 400 });
    }

    const imageUrl = await uploadToImgBB(file);
    return NextResponse.json({ success: true, url: imageUrl });
  } catch (error: any) {
    console.error('ImgBB Upload Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Image upload failed' },
      { status: 500 }
    );
  }
}
