import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const MAX_SIZE_BYTES = 100 * 1024 * 1024;
const MAX_TEXT_CHARS = 10_000_000;
const MAX_FILES = 10;
const MAX_IMAGES_PER_FILE = 20;
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const RASTER_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.tif', '.webp', '.gif'];
const ALLOWED_EXTENSIONS = [
  '.txt', '.md', '.markdown', '.csv', '.tsv', '.log',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.json', '.xml',
  ...RASTER_IMAGE_EXTENSIONS
];

const EXT_TO_MEDIA_TYPE: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.tiff': 'image/tiff',
  '.tif': 'image/tiff',
};

interface ImageAttachment {
  base64: string;
  media_type: string;
  label: string;
}

interface FileResult {
  filename: string;
  text: string;
  images: ImageAttachment[];
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
        errors.push(`${file.name}: exceeds 100 MB limit (${(file.size / 1024 / 1024).toFixed(1)} MB)`);
        continue;
      }

      let text: string;
      let images: ImageAttachment[] = [];
      try {
        if (RASTER_IMAGE_EXTENSIONS.includes(ext)) {
          const result = await extractImage(file, ext);
          text = result.text;
          images = result.images;
        } else if (ext === '.pdf') {
          text = await extractPDF(file);
        } else if (ext === '.docx') {
          const result = await extractDocx(file);
          text = result.text;
          images = result.images;
        } else if (ext === '.doc') {
          text = await extractDoc(file);
        } else if (ext === '.xls' || ext === '.xlsx') {
          text = await extractExcel(file);
        } else {
          text = await file.text();
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'unknown error';
        errors.push(`${file.name}: extraction error — ${errMsg}`);
        text = `[${file.name}]\n\nCould not extract text content. Error: ${errMsg}. File size: ${(file.size / 1024).toFixed(1)} KB.`;
      }

      const truncated = text.length > MAX_TEXT_CHARS;
      const finalText = truncated ? text.slice(0, MAX_TEXT_CHARS) : text;

      results.push({
        filename: file.name,
        text: finalText,
        images,
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

async function extractImage(file: File, ext: string): Promise<{ text: string; images: ImageAttachment[] }> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const sizeKb = (file.size / 1024).toFixed(1);
  const mediaType = EXT_TO_MEDIA_TYPE[ext] || 'image/png';

  const images: ImageAttachment[] = [];
  if (buffer.length <= MAX_IMAGE_SIZE_BYTES) {
    images.push({
      base64: buffer.toString('base64'),
      media_type: mediaType,
      label: file.name,
    });
  }

  return {
    text: `[Image: ${file.name} — ${sizeKb} KB | ${mediaType}]\n\nThis image has been attached for visual analysis. The AI will analyze its contents including any text, diagrams, charts, tables, or other visual elements.`,
    images,
  };
}

async function extractPDF(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string; numpages?: number }>;
    const data = await pdfParse(buffer);

    if (data.text && data.text.trim().length > 0) {
      const meta: string[] = [`[PDF: ${file.name}]`];
      if (data.numpages) meta.push(`Pages: ${data.numpages}`);
      return `${meta.join(' | ')}\n\n${data.text.trim()}`;
    }
  } catch {
    // pdf-parse failed, fall through to raw extraction
  }

  return extractTextFromPDFRaw(buffer, file.name);
}

function extractTextFromPDFRaw(bytes: Buffer, filename: string): string {
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

  return `[PDF: ${filename}]\n\nThis PDF could not be fully parsed. File size: ${(bytes.length / 1024).toFixed(1)} KB. For best results with scanned/image PDFs, convert to text first.`;
}

async function extractDocx(file: File): Promise<{ text: string; images: ImageAttachment[] }> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const images: ImageAttachment[] = [];

  try {
    const mammoth = await import('mammoth');

    const imgIndex = { current: 0 };
    const htmlResult = await mammoth.convertToHtml(
      { buffer },
      {
        convertImage: mammoth.images.imgElement(async (image) => {
          if (imgIndex.current >= MAX_IMAGES_PER_FILE) return { src: '' };
          try {
            const imgBuffer = await image.read();
            if (imgBuffer.length <= MAX_IMAGE_SIZE_BYTES) {
              const mt = image.contentType || 'image/png';
              images.push({
                base64: Buffer.from(imgBuffer).toString('base64'),
                media_type: mt,
                label: `${file.name} — embedded image ${imgIndex.current + 1}`,
              });
              imgIndex.current++;
            }
          } catch { /* skip unreadable images */ }
          return { src: '' };
        }),
      }
    );

    const textResult = await mammoth.extractRawText({ buffer });
    const rawText = textResult.value?.trim() || '';

    const html = htmlResult.value || '';
    const tableText = extractTablesFromHtml(html);

    const parts: string[] = [`[DOCX: ${file.name}]`];
    if (rawText) parts.push('', rawText);
    if (tableText) parts.push('', '## Tables Extracted from Document', '', tableText);
    if (images.length > 0) parts.push('', `[${images.length} embedded image(s) extracted and attached for visual analysis]`);

    return { text: parts.join('\n'), images };
  } catch {
    const fallback = extractDocRaw(buffer, file.name);
    return { text: fallback, images: [] };
  }
}

function extractTablesFromHtml(html: string): string {
  const tables: string[] = [];
  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  let tableMatch;
  let tableIdx = 0;

  while ((tableMatch = tableRegex.exec(html)) !== null) {
    tableIdx++;
    const tableHtml = tableMatch[1];
    const rows: string[][] = [];
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch;

    while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
      const cells: string[] = [];
      const cellRegex = /<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi;
      let cellMatch;

      while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
        const cellText = cellMatch[1]
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .trim();
        cells.push(cellText || ' ');
      }

      if (cells.length > 0) rows.push(cells);
    }

    if (rows.length > 0) {
      const maxCols = Math.max(...rows.map(r => r.length));
      const normalized = rows.map(r => {
        while (r.length < maxCols) r.push(' ');
        return r;
      });

      const header = `| ${normalized[0].join(' | ')} |`;
      const sep = `| ${normalized[0].map(() => '---').join(' | ')} |`;
      const body = normalized.slice(1).map(r => `| ${r.join(' | ')} |`).join('\n');

      tables.push(`### Table ${tableIdx}\n\n${header}\n${sep}\n${body}`);
    }
  }

  return tables.join('\n\n');
}

async function extractDoc(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return extractDocRaw(buffer, file.name);
}

function extractDocRaw(bytes: Buffer, filename: string): string {
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

  return `[DOC: ${filename}]\n\nThis document could not be fully parsed. File size: ${(bytes.length / 1024).toFixed(1)} KB. For best results, convert to text or CSV.`;
}

async function extractExcel(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const XLSX = require('xlsx');
  const workbook = XLSX.read(buffer, { type: 'buffer' });

  const sheetOutputs: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];

    const jsonData: (string | number | boolean | null)[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (!jsonData || jsonData.length === 0) continue;

    const headers = jsonData[0].map((h: unknown) => String(h ?? ''));
    const dataRows = jsonData.slice(1);

    if (headers.length === 0) continue;

    const mdHeader = `| ${headers.join(' | ')} |`;
    const mdSep = `| ${headers.map(() => '---').join(' | ')} |`;
    const mdRows = dataRows.map((row: unknown[]) =>
      `| ${headers.map((_, i: number) => String(row[i] ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ')).join(' | ')} |`
    ).join('\n');

    sheetOutputs.push(`### Sheet: ${sheetName} (${dataRows.length} rows, ${headers.length} columns)\n\n${mdHeader}\n${mdSep}\n${mdRows}`);
  }

  if (sheetOutputs.length > 0) {
    return `[Excel: ${file.name} | ${workbook.SheetNames.length} sheet(s)]\n\n${sheetOutputs.join('\n\n')}`;
  }

  return `[Excel: ${file.name}]\n\nNo readable data found in this spreadsheet. File size: ${(buffer.length / 1024).toFixed(1)} KB.`;
}
