import { NextRequest, NextResponse } from 'next/server';
import { loadCsv, getDataSummary } from '@/lib/csv-loader';
import { stages, governanceConfig } from '@/data/stages';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const folder = searchParams.get('folder');
  const file = searchParams.get('file');
  const action = searchParams.get('action') || 'data';
  const limit = Number(searchParams.get('limit')) || 50;

  if (action === 'catalog') {
    const allSources = [
      ...stages.flatMap((s) => s.dataSources),
      ...governanceConfig.dataSources
    ];
    const unique = allSources.filter(
      (v, i, a) => a.findIndex((t) => t.file === v.file) === i
    );
    return NextResponse.json({ sources: unique, count: unique.length });
  }

  if (!folder || !file) {
    return NextResponse.json(
      { error: 'folder and file query params required' },
      { status: 400 }
    );
  }

  try {
    if (action === 'summary') {
      const summary = getDataSummary(folder, file);
      return NextResponse.json(summary);
    }

    const data = loadCsv(folder, file);
    return NextResponse.json({
      file: data.file,
      headers: data.headers,
      rowCount: data.rowCount,
      rows: data.rows.slice(0, limit)
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to load ${folder}/${file}: ${err instanceof Error ? err.message : 'Unknown'}` },
      { status: 500 }
    );
  }
}
