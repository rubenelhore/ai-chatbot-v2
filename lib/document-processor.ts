import mammoth from 'mammoth';
import * as pdfParse from 'pdf-parse';

export async function extractTextFromFile(
  buffer: Buffer,
  fileName: string
): Promise<string> {
  const fileExtension = fileName.split('.').pop()?.toLowerCase();

  switch (fileExtension) {
    case 'pdf':
      const pdf = pdfParse as any;
      const pdfData = await pdf.default(buffer);
      return pdfData.text;

    case 'docx':
      const result = await mammoth.extractRawText({ buffer });
      return result.value;

    case 'txt':
      return buffer.toString('utf-8');

    default:
      throw new Error(`Unsupported file type: ${fileExtension}`);
  }
}

export function preprocessText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function chunkText(
  text: string,
  chunkSize: number = 1000,
  overlap: number = 200
): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    let chunk = text.slice(start, end);

    // Try to end at a sentence boundary
    if (end < text.length) {
      const lastPeriod = chunk.lastIndexOf('.');
      const lastNewline = chunk.lastIndexOf('\n');
      const lastBoundary = Math.max(lastPeriod, lastNewline);

      if (lastBoundary > chunkSize * 0.5) {
        chunk = chunk.slice(0, lastBoundary + 1);
      }
    }

    chunks.push(chunk.trim());
    start += chunk.length - overlap;
  }

  return chunks.filter((chunk) => chunk.length > 0);
}
