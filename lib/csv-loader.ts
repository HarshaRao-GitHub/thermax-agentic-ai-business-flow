import { readFileSync } from 'fs';
import path from 'path';

const DATA_ROOT = path.resolve(
  process.cwd(),
  process.env.THERMAX_DATA_PATH || '../SampLe Thermax Data Files'
);

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
  const filePath = path.join(DATA_ROOT, folder, file);
  const raw = readFileSync(filePath, 'utf-8');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);

  if (lines.length === 0) {
    return { headers: [], rows: [], rowCount: 0, file };
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

  return { headers, rows, rowCount: rows.length, file };
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
