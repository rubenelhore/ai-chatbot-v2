import mammoth from 'mammoth';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

export async function extractTextFromFile(
  buffer: Buffer,
  fileName: string
): Promise<string> {
  const fileExtension = fileName.split('.').pop()?.toLowerCase();

  switch (fileExtension) {
    case 'pdf':
      // Use pdfjs-dist for serverless compatibility
      const uint8Array = new Uint8Array(buffer);
      const loadingTask = pdfjs.getDocument({ data: uint8Array });
      const pdf = await loadingTask.promise;

      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n';
      }

      return fullText;

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

    const trimmedChunk = chunk.trim();
    if (trimmedChunk.length > 0) {
      chunks.push(trimmedChunk);
    }

    // Ensure we always move forward to avoid infinite loop
    const step = Math.max(chunk.length - overlap, 1);
    start += step;
  }

  return chunks;
}
