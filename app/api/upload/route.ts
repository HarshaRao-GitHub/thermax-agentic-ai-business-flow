import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const MAX_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB
const MAX_TEXT_CHARS = 2_000_000;
const MAX_FILES = 10;
const ALLOWED_EXTENSIONS = [
  '.txt', '.md', '.markdown', '.csv', '.tsv', '.log',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.json', '.xml'
];

interface FileResult {
  filename: string;
  text: string;
  truncated: boolean;
  originalSize: number;
  size: number;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];

    if (!files.length) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_FILES} files allowed per upload. You selected ${files.length}.` },
        { status: 400 }
      );
    }

    const results: FileResult[] = [];
    const errors: string[] = [];

    for (const file of files) {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        errors.push(`${file.name}: unsupported type (${ext}). Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`);
        continue;
      }

      if (file.size > MAX_SIZE_BYTES) {
        errors.push(`${file.name}: exceeds 30 MB limit (${(file.size / 1024 / 1024).toFixed(1)} MB)`);
        continue;
      }

      let text: string;
      if (ext === '.pdf') {
        const buffer = await file.arrayBuffer();
        text = extractTextFromPDF(new Uint8Array(buffer), file.name);
      } else if (ext === '.doc' || ext === '.docx') {
        const buffer = await file.arrayBuffer();
        text = extractTextFromDoc(new Uint8Array(buffer), file.name);
      } else if (ext === '.xls' || ext === '.xlsx') {
        text = await file.text();
      } else {
        text = await file.text();
      }

      const truncated = text.length > MAX_TEXT_CHARS;
      const finalText = truncated ? text.slice(0, MAX_TEXT_CHARS) : text;

      results.push({
        filename: file.name,
        text: finalText,
        truncated,
        originalSize: text.length,
        size: finalText.length
      });
    }

    return NextResponse.json({ files: results, errors });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 }
    );
  }
}

function extractTextFromPDF(bytes: Uint8Array, filename: string): string {
  try {
    const raw = new TextDecoder('utf-8', { fatal: false }).decode(bytes);

    const textChunks: string[] = [];
    const streamRegex = /stream\s*\n([\s\S]*?)\nendstream/g;
    let match;
    while ((match = streamRegex.exec(raw)) !== null) {
      const streamContent = match[1];
      const tjMatches = streamContent.match(/\(([^)]*)\)\s*Tj/g);
      if (tjMatches) {
        for (const tj of tjMatches) {
          const inner = tj.match(/\(([^)]*)\)/);
          if (inner) textChunks.push(inner[1]);
        }
      }
      const tdMatches = streamContent.match(/\[(.*?)\]\s*TJ/g);
      if (tdMatches) {
        for (const td of tdMatches) {
          const parts = td.match(/\(([^)]*)\)/g);
          if (parts) {
            textChunks.push(parts.map(p => p.slice(1, -1)).join(''));
          }
        }
      }
    }

    if (textChunks.length > 0) {
      return `[PDF: ${filename}]\n\n${textChunks.join('\n')}`;
    }

    const readable = raw.replace(/[^\x20-\x7E\n\r\t]/g, ' ')
      .replace(/\s{3,}/g, '\n')
      .trim();
    const lines = readable.split('\n').filter(l => l.trim().length > 20);
    if (lines.length > 5) {
      return `[PDF: ${filename} — extracted readable text]\n\n${lines.join('\n')}`;
    }

    return `[PDF: ${filename}]\n\nThis PDF could not be fully parsed on the server. The file has been received (${(bytes.length / 1024).toFixed(1)} KB). For best results with complex PDFs, consider converting to text or CSV before uploading.`;
  } catch {
    return `[PDF: ${filename}]\n\nFailed to parse PDF content. File size: ${(bytes.length / 1024).toFixed(1)} KB.`;
  }
}

function extractTextFromDoc(bytes: Uint8Array, filename: string): string {
  try {
    const raw = new TextDecoder('utf-8', { fatal: false }).decode(bytes);

    const xmlTextRegex = /<w:t[^>]*>([^<]+)<\/w:t>/g;
    const chunks: string[] = [];
    let match;
    while ((match = xmlTextRegex.exec(raw)) !== null) {
      chunks.push(match[1]);
    }

    if (chunks.length > 0) {
      return `[DOC: ${filename}]\n\n${chunks.join(' ')}`;
    }

    const readable = raw.replace(/[^\x20-\x7E\n\r\t]/g, ' ')
      .replace(/\s{3,}/g, '\n')
      .trim();
    const lines = readable.split('\n').filter(l => l.trim().length > 15);
    if (lines.length > 3) {
      return `[DOC: ${filename} — extracted readable text]\n\n${lines.join('\n')}`;
    }

    return `[DOC: ${filename}]\n\nThis document could not be fully parsed. File size: ${(bytes.length / 1024).toFixed(1)} KB. For best results, consider converting to text or CSV.`;
  } catch {
    return `[DOC: ${filename}]\n\nFailed to parse document. File size: ${(bytes.length / 1024).toFixed(1)} KB.`;
  }
}
