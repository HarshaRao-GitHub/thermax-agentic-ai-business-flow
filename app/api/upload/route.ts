import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const MAX_SIZE_PER_FILE = 200_000;
const MAX_FILES = 10;
const ALLOWED_EXTENSIONS = ['.txt', '.md', '.markdown', '.csv', '.tsv', '.log'];

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
        { error: `Too many files. Maximum ${MAX_FILES} allowed.` },
        { status: 400 }
      );
    }

    const results: FileResult[] = [];
    const errors: string[] = [];

    for (const file of files) {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        errors.push(`${file.name}: unsupported type (${ext})`);
        continue;
      }

      const text = await file.text();
      const truncated = text.length > MAX_SIZE_PER_FILE;
      const finalText = truncated ? text.slice(0, MAX_SIZE_PER_FILE) : text;

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
