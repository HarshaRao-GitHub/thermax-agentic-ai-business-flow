import { NextRequest, NextResponse } from 'next/server';
import { loadCsv } from '@/lib/csv-loader';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const folder = req.nextUrl.searchParams.get('folder');
  const file = req.nextUrl.searchParams.get('file');

  if (!folder || !file) {
    return NextResponse.json({ error: 'Missing folder or file parameter' }, { status: 400 });
  }

  if (file.includes('..') || folder.includes('..')) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  try {
    const data = loadCsv(folder, file);
    return NextResponse.json({
      file: data.file,
      headers: data.headers,
      rows: data.rows,
      rowCount: data.rowCount,
    });
  } catch (err) {
    console.error('view-data error:', err);
    return NextResponse.json(
      { error: `Failed to load ${file}: ${err instanceof Error ? err.message : 'unknown'}` },
      { status: 404 }
    );
  }
}
