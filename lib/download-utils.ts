/**
 * Download utilities — multi-format export for AI-generated results.
 * Supports: .txt, .md, .csv, .xls, .pdf, .doc
 */

export type ExportFormat = 'txt' | 'md' | 'csv' | 'xls' | 'pdf' | 'doc';

export interface FormatOption {
  format: ExportFormat;
  label: string;
  icon: string;
  description: string;
}

export const FORMAT_OPTIONS: FormatOption[] = [
  { format: 'pdf', label: 'PDF', icon: '📄', description: 'Styled PDF document' },
  { format: 'doc', label: 'Word', icon: '📝', description: 'MS Word document' },
  { format: 'xls', label: 'Excel', icon: '📊', description: 'Excel spreadsheet' },
  { format: 'csv', label: 'CSV', icon: '📋', description: 'Comma-separated values' },
  { format: 'md', label: 'Markdown', icon: '📑', description: 'Markdown text' },
  { format: 'txt', label: 'Text', icon: '📃', description: 'Plain text file' },
];

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function stripMarkdown(md: string): string {
  let text = md;
  text = text.replace(/```\w*\n[\s\S]*?```/g, (m) => {
    return m.replace(/```\w*\n?/, '').replace(/\n?```/, '');
  });
  text = text.replace(/`([^`]+)`/g, '$1');
  text = text.replace(/^#{1,6}\s+/gm, '');
  text = text.replace(/\*\*\*(.+?)\*\*\*/g, '$1');
  text = text.replace(/\*\*(.+?)\*\*/g, '$1');
  text = text.replace(/\*(.+?)\*/g, '$1');
  text = text.replace(/^>\s*/gm, '');
  text = text.replace(/^[-*]\s+/gm, '• ');
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  text = text.replace(/^---+$/gm, '────────────────────');
  return text.trim();
}

function extractTablesAsCsv(md: string): string {
  const tableRegex = /^(\|.+\|)\n(\|[\s:|-]+\|)\n((?:\|.+\|\n?)*)/gm;
  const tables: string[] = [];
  let match;
  let tableIdx = 0;

  while ((match = tableRegex.exec(md)) !== null) {
    tableIdx++;
    const header = match[1];
    const body = match[3].trim();

    const parseRow = (row: string) =>
      row.split('|').filter(c => c.trim()).map(c => {
        const val = c.trim();
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      });

    const headerCells = parseRow(header);
    const bodyRows = body.split('\n').map(r => parseRow(r));

    if (tableIdx > 1) tables.push('');
    tables.push(headerCells.join(','));
    bodyRows.forEach(row => tables.push(row.join(',')));
  }

  if (tables.length > 0) return tables.join('\n');

  const lines = stripMarkdown(md).split('\n').filter(l => l.trim());
  return lines.map(l => {
    const val = l.trim();
    if (val.includes(',') || val.includes('"')) return `"${val.replace(/"/g, '""')}"`;
    return val;
  }).join('\n');
}

function markdownToHtml(md: string): string {
  let html = md;

  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang: string, code: string) => {
    const langLabel = lang ? `<div style="font-size:9px;color:#6b7280;margin-bottom:4px;text-transform:uppercase;">${lang}</div>` : '';
    return `<div style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:6px;padding:12px;margin:8px 0;overflow-x:auto;">${langLabel}<pre style="margin:0;font-size:11px;line-height:1.5;white-space:pre-wrap;font-family:Consolas,Monaco,monospace;">${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre></div>`;
  });

  html = html.replace(/`([^`]+)`/g, '<code style="background:#f1f5f9;padding:1px 5px;border-radius:3px;font-size:12px;font-family:Consolas,Monaco,monospace;">$1</code>');

  html = html.replace(/^(\|.+\|)\n(\|[\s:|-]+\|)\n((?:\|.+\|\n?)*)/gm, (_m, header: string, _sep, body: string) => {
    const thCells = header.split('|').filter((c: string) => c.trim()).map((c: string) =>
      `<th style="border:1px solid #d1d5db;padding:6px 10px;background:#0f1b3d;color:white;font-size:11px;text-align:left;white-space:nowrap;">${c.trim()}</th>`
    ).join('');
    const rows = body.trim().split('\n').map((row: string, ri: number) => {
      const cells = row.split('|').filter((c: string) => c.trim()).map((c: string) =>
        `<td style="border:1px solid #d1d5db;padding:5px 10px;font-size:11px;background:${ri % 2 === 0 ? '#fff' : '#f8fafc'};">${c.trim()}</td>`
      ).join('');
      return `<tr>${cells}</tr>`;
    }).join('');
    return `<table style="border-collapse:collapse;width:100%;margin:10px 0;"><thead><tr>${thCells}</tr></thead><tbody>${rows}</tbody></table>`;
  });

  html = html.replace(/^#### (.+)$/gm, '<h4 style="font-size:13px;font-weight:700;margin:14px 0 6px;color:#1e293b;">$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3 style="font-size:14px;font-weight:700;margin:16px 0 8px;color:#0f172a;border-bottom:1px solid #e2e8f0;padding-bottom:4px;">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 style="font-size:16px;font-weight:700;margin:20px 0 10px;color:#0f1b3d;border-bottom:2px solid #0f1b3d;padding-bottom:4px;">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 style="font-size:20px;font-weight:800;margin:24px 0 12px;color:#0f1b3d;">$1</h1>');

  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  html = html.replace(/^>\s*(.+)$/gm, '<blockquote style="border-left:3px solid #3b82f6;padding:6px 12px;margin:8px 0;background:#eff6ff;color:#1e40af;font-size:12px;font-style:italic;">$1</blockquote>');

  html = html.replace(/^(\s*)[-*]\s+(.+)$/gm, (_m, indent: string, text: string) => {
    const depth = Math.floor(indent.length / 2);
    return `<div style="padding-left:${16 + depth * 16}px;margin:3px 0;font-size:12px;"><span style="color:#3b82f6;margin-right:6px;">&bull;</span>${text}</div>`;
  });

  html = html.replace(/^(\s*)(\d+)\.\s+(.+)$/gm, (_m, indent: string, num: string, text: string) => {
    const depth = Math.floor(indent.length / 2);
    return `<div style="padding-left:${16 + depth * 16}px;margin:3px 0;font-size:12px;"><span style="color:#0f1b3d;font-weight:600;margin-right:6px;">${num}.</span>${text}</div>`;
  });

  html = html.replace(/^---+$/gm, '<hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0;">');
  html = html.replace(/\n\n/g, '</p><p style="margin:8px 0;font-size:12px;line-height:1.7;color:#334155;">');
  html = html.replace(/\n/g, '<br>');

  return `<p style="margin:8px 0;font-size:12px;line-height:1.7;color:#334155;">${html}</p>`;
}

function buildStyledHtmlDocument(content: string, title: string): string {
  const htmlContent = markdownToHtml(content);
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title}</title></head>
<body style="font-family:'Segoe UI',system-ui,-apple-system,sans-serif;padding:30px 40px;color:#1e293b;max-width:900px;margin:0 auto;">
<div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #0f1b3d;padding-bottom:10px;margin-bottom:16px;">
<div><div style="font-size:18px;font-weight:800;color:#0f1b3d;">Thermax AI Intelligence</div>
<div style="font-size:10px;color:#64748b;margin-top:2px;">Agentic AI Business Flow</div></div>
<div style="text-align:right;"><div style="font-size:9px;color:#94a3b8;">Generated: ${new Date().toLocaleString()}</div></div></div>
${htmlContent}
<div style="border-top:1px solid #e2e8f0;margin-top:24px;padding-top:8px;font-size:8px;color:#94a3b8;text-align:center;">
Thermax Agentic AI Platform &mdash; Auto-generated report &mdash; ${new Date().toLocaleDateString()}</div>
</body></html>`;
}

function buildExcelHtml(content: string): string {
  const htmlContent = markdownToHtml(content);
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8">
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
<x:Name>AI Report</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>
<body>${htmlContent}</body></html>`;
}

let html2pdfLoaded = false;

function loadHtml2Pdf(): Promise<void> {
  if (html2pdfLoaded) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.2/html2pdf.bundle.min.js';
    script.onload = () => { html2pdfLoaded = true; resolve(); };
    script.onerror = () => reject(new Error('Failed to load PDF library'));
    document.head.appendChild(script);
  });
}

async function downloadPdf(content: string, filenamePrefix: string): Promise<void> {
  const ts = timestamp();
  const filename = `${filenamePrefix}-${ts}.pdf`;
  const styledHtml = buildStyledHtmlDocument(content, 'Thermax AI Report');

  const wrapper = document.createElement('div');
  wrapper.innerHTML = styledHtml;
  wrapper.style.cssText = 'position:fixed;left:-9999px;top:0;width:210mm;background:white;';
  document.body.appendChild(wrapper);

  try {
    await loadHtml2Pdf();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const html2pdf = (window as any).html2pdf;
    if (!html2pdf) throw new Error('PDF library not available');

    await html2pdf().set({
      margin: [8, 8, 12, 8],
      filename,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    }).from(wrapper.querySelector('body') || wrapper.firstElementChild || wrapper).save();
  } finally {
    document.body.removeChild(wrapper);
  }
}

export async function downloadInFormat(content: string, filenamePrefix: string, format: ExportFormat): Promise<void> {
  const ts = timestamp();
  const base = `${filenamePrefix}-${ts}`;

  switch (format) {
    case 'txt':
      triggerDownload(
        new Blob([stripMarkdown(content)], { type: 'text/plain;charset=utf-8' }),
        `${base}.txt`
      );
      break;

    case 'md':
      triggerDownload(
        new Blob([content], { type: 'text/markdown;charset=utf-8' }),
        `${base}.md`
      );
      break;

    case 'csv':
      triggerDownload(
        new Blob([extractTablesAsCsv(content)], { type: 'text/csv;charset=utf-8' }),
        `${base}.csv`
      );
      break;

    case 'xls':
      triggerDownload(
        new Blob([buildExcelHtml(content)], { type: 'application/vnd.ms-excel;charset=utf-8' }),
        `${base}.xls`
      );
      break;

    case 'pdf':
      await downloadPdf(content, filenamePrefix);
      break;

    case 'doc':
      triggerDownload(
        new Blob([buildStyledHtmlDocument(content, 'Thermax AI Report')], { type: 'application/msword;charset=utf-8' }),
        `${base}.doc`
      );
      break;
  }
}
