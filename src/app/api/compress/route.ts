import { NextRequest, NextResponse } from 'next/server';
import { compressImage, compressPDF } from '@/lib/compression-service';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file found' }, { status: 400 });
    }

    // Security check: 50MB Limit
    if (file.size > 50 * 1024 * 1024) { 
       return NextResponse.json({ error: 'File too large (Max 50MB)' }, { status: 413 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    let result;

    if (file.type.startsWith('image/')) {
      result = await compressImage(buffer, file.type);
    } else if (file.type === 'application/pdf') {
      result = await compressPDF(buffer);
    } else {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }

    const originalSize = file.size;
    const compressedSize = result.buffer.length;
    const reduction = ((originalSize - compressedSize) / originalSize) * 100;

    return NextResponse.json({
      success: true,
      fileName: file.name,
      originalSize,
      compressedSize,
      reduction: reduction.toFixed(2),
      data: result.buffer.toString('base64'),
      mimeType: result.mimeType
    });

  } catch (error) {
    console.error('Compression Error:', error);
    return NextResponse.json({ error: 'Compression failed' }, { status: 500 });
  }
}