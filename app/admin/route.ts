import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let filePath = path.join(process.cwd(), 'views', 'admin.html');
    if (!fs.existsSync(filePath)) {
      filePath = path.join(process.cwd(), 'public', 'admin.html');
    }
    const html = fs.readFileSync(filePath, 'utf8');
    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error: any) {
    return new NextResponse(`Admin Portal Load Error: ${error.message}`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}
