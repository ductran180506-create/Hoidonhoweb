import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const BASE_DIR = 'D:\\video tiktok';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const relativePath = searchParams.get('file');

  if (!relativePath) {
    return new NextResponse('Missing file parameter', { status: 400 });
  }

  // Prevent path traversal
  const normalized = path.normalize(relativePath).replace(/^(\.\.[\/\\])+/, '');
  const fullPath = path.join(BASE_DIR, normalized);

  if (!fs.existsSync(fullPath)) {
    return new NextResponse('File not found: ' + normalized, { status: 404 });
  }

  try {
    const ext = path.extname(fullPath).toLowerCase();
    let contentType = 'image/png';
    if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.webp') contentType = 'image/webp';

    const fileBuffer = fs.readFileSync(fullPath);
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err: any) {
    return new NextResponse('Error reading file: ' + err.message, { status: 500 });
  }
}
