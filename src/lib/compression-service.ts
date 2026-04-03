import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import { Buffer } from 'buffer';

export interface CompressionResult {
  buffer: Buffer;
  extension: string;
  mimeType: string;
  originalSize?: number;
  compressedSize?: number;
}

export async function compressImage(fileBuffer: Buffer, mimeType: string): Promise<CompressionResult> {
  let pipeline = sharp(fileBuffer);

  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
    pipeline = pipeline.jpeg({ quality: 80, mozjpeg: true });
  } else if (mimeType === 'image/png') {
    pipeline = pipeline.png({ quality: 80, compressionLevel: 8 });
  } else if (mimeType === 'image/webp') {
    pipeline = pipeline.webp({ quality: 80 });
  }

  const processedBuffer = await pipeline.toBuffer();
  
  return {
    buffer: processedBuffer,
    extension: mimeType.split('/')[1],
    mimeType: mimeType
  };
}

export async function compressPDF(fileBuffer: Buffer): Promise<CompressionResult> {
  const pdfDoc = await PDFDocument.load(fileBuffer);
  const processedBuffer = await pdfDoc.save(); 
  const buffer = Buffer.from(processedBuffer);

  return {
    buffer: buffer,
    extension: 'pdf',
    mimeType: 'application/pdf'
  };
}