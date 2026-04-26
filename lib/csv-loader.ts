import { readFileSync, existsSync } from 'fs';
import path from 'path';

const EXTERNAL_DATA_ROOT = path.resolve(
  process.cwd(),
  process.env.THERMAX_DATA_PATH || '../SampLe Thermax Data Files'
);

const BUNDLED_DATA_ROOT = path.resolve(process.cwd(), 'public', 'data-backbone');

const SAMPLE_DATA_ROOT = path.resolve(process.cwd(), 'public', 'sample-data');

const csvCache = new Map<string, { data: CsvData; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;

function resolveDataFile(folder: string, file: string): string {
  const external = path.join(EXTERNAL_DATA_ROOT, folder, file);
  if (existsSync(external)) return external;
  const bundled = path.join(BUNDLED_DATA_ROOT, folder, file);
  if (existsSync(bundled)) return bundled;
  const sample = path.join(SAMPLE_DATA_ROOT, folder, file);
  if (existsSync(sample)) return sample;
  throw new Error(`Data file not found: ${folder}/${file}`);
}

export interface CsvData {
  headers: string[];
  rows: Record<string, string>[];
  rowCount: number;
  file: string;
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

export function loadCsv(folder: string, file: string): CsvData {
  const cacheKey = `${folder}/${file}`;
  const cached = csvCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  const filePath = resolveDataFile(folder, file);
  const raw = readFileSync(filePath, 'utf-8');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);

  if (lines.length === 0) {
    const empty = { headers: [], rows: [], rowCount: 0, file };
    csvCache.set(cacheKey, { data: empty, ts: Date.now() });
    return empty;
  }

  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const record: Record<string, string> = {};
    headers.forEach((h, i) => {
      record[h] = values[i] ?? '';
    });
    return record;
  });

  const result = { headers, rows, rowCount: rows.length, file };
  csvCache.set(cacheKey, { data: result, ts: Date.now() });
  return result;
}

export function loadCsvAsMarkdownTable(
  folder: string,
  file: string,
  maxRows?: number
): string {
  const data = loadCsv(folder, file);
  const displayRows = maxRows ? data.rows.slice(0, maxRows) : data.rows;

  const headerLine = '| ' + data.headers.join(' | ') + ' |';
  const separatorLine = '| ' + data.headers.map(() => '---').join(' | ') + ' |';
  const dataLines = displayRows.map(
    (row) => '| ' + data.headers.map((h) => row[h] ?? '').join(' | ') + ' |'
  );

  const lines = [headerLine, separatorLine, ...dataLines];
  if (maxRows && data.rowCount > maxRows) {
    lines.push(`\n*... ${data.rowCount - maxRows} more rows (${data.rowCount} total)*`);
  }
  return lines.join('\n');
}

export function loadCsvAsJson(
  folder: string,
  file: string,
  maxRows?: number
): string {
  const data = loadCsv(folder, file);
  const displayRows = maxRows ? data.rows.slice(0, maxRows) : data.rows;
  return JSON.stringify({
    file,
    totalRows: data.rowCount,
    displayedRows: displayRows.length,
    headers: data.headers,
    data: displayRows
  });
}

export function loadMultipleCsv(
  sources: { folder: string; file: string }[]
): Record<string, CsvData> {
  const result: Record<string, CsvData> = {};
  for (const src of sources) {
    const key = src.file.replace('.csv', '');
    result[key] = loadCsv(src.folder, src.file);
  }
  return result;
}

export function loadTextFile(folder: string, file: string, maxChars = 500000): string {
  const filePath = resolveDataFile(folder, file);
  const raw = readFileSync(filePath, 'utf-8');
  if (raw.length <= maxChars) return raw;
  return raw.slice(0, maxChars) + `\n\n... [truncated — showing first ${maxChars} characters of ${raw.length} total]`;
}

export function isNonCsvDataFile(file: string): boolean {
  return /\.(txt|pdf|json|xlsx)$/i.test(file);
}

export function getDataSummary(
  folder: string,
  file: string
): { file: string; headers: string[]; rowCount: number; sampleRow: Record<string, string> | null } {
  const data = loadCsv(folder, file);
  return {
    file,
    headers: data.headers,
    rowCount: data.rowCount,
    sampleRow: data.rows[0] ?? null
  };
}
