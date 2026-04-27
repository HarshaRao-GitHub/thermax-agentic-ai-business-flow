/**
 * Download utilities — markdown and PDF export for AI-generated results.
 * PDF generation uses html2pdf.js loaded dynamically from CDN (no bundle impact).
 */

export function downloadAsMarkdown(content: string, filenamePrefix: string): void {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filenamePrefix}-${ts}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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

function markdownToHtml(md: string): string {
  let html = md;

  // Code blocks (```lang ... ```)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang: string, code: string) => {
    const langLabel = lang ? `<div style="font-size:9px;color:#6b7280;margin-bottom:4px;text-transform:uppercase;">${lang}</div>` : '';
    return `<div style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:6px;padding:12px;margin:8px 0;overflow-x:auto;">${langLabel}<pre style="margin:0;font-size:11px;line-height:1.5;white-space:pre-wrap;font-family:Consolas,Monaco,monospace;">${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre></div>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code style="background:#f1f5f9;padding:1px 5px;border-radius:3px;font-size:12px;font-family:Consolas,Monaco,monospace;">$1</code>');

  // Tables
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

  // Headers
  html = html.replace(/^#### (.+)$/gm, '<h4 style="font-size:13px;font-weight:700;margin:14px 0 6px;color:#1e293b;">$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3 style="font-size:14px;font-weight:700;margin:16px 0 8px;color:#0f172a;border-bottom:1px solid #e2e8f0;padding-bottom:4px;">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 style="font-size:16px;font-weight:700;margin:20px 0 10px;color:#0f1b3d;border-bottom:2px solid #0f1b3d;padding-bottom:4px;">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 style="font-size:20px;font-weight:800;margin:24px 0 12px;color:#0f1b3d;">$1</h1>');

  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Blockquotes
  html = html.replace(/^>\s*(.+)$/gm, '<blockquote style="border-left:3px solid #3b82f6;padding:6px 12px;margin:8px 0;background:#eff6ff;color:#1e40af;font-size:12px;font-style:italic;">$1</blockquote>');

  // Unordered lists
  html = html.replace(/^(\s*)[-*]\s+(.+)$/gm, (_m, indent: string, text: string) => {
    const depth = Math.floor(indent.length / 2);
    return `<div style="padding-left:${16 + depth * 16}px;margin:3px 0;font-size:12px;"><span style="color:#3b82f6;margin-right:6px;">•</span>${text}</div>`;
  });

  // Ordered lists
  html = html.replace(/^(\s*)(\d+)\.\s+(.+)$/gm, (_m, indent: string, num: string, text: string) => {
    const depth = Math.floor(indent.length / 2);
    return `<div style="padding-left:${16 + depth * 16}px;margin:3px 0;font-size:12px;"><span style="color:#0f1b3d;font-weight:600;margin-right:6px;">${num}.</span>${text}</div>`;
  });

  // Horizontal rules
  html = html.replace(/^---+$/gm, '<hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0;">');

  // Paragraphs (double newlines)
  html = html.replace(/\n\n/g, '</p><p style="margin:8px 0;font-size:12px;line-height:1.7;color:#334155;">');

  // Single newlines to <br>
  html = html.replace(/\n/g, '<br>');

  return `<p style="margin:8px 0;font-size:12px;line-height:1.7;color:#334155;">${html}</p>`;
}

export async function downloadAsPdf(content: string, filenamePrefix: string): Promise<void> {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `${filenamePrefix}-${ts}.pdf`;

  const htmlContent = markdownToHtml(content);

  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <div style="font-family:'Segoe UI',system-ui,-apple-system,sans-serif;padding:20px 30px;color:#1e293b;max-width:100%;">
      <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #0f1b3d;padding-bottom:10px;margin-bottom:16px;">
        <div>
          <div style="font-size:18px;font-weight:800;color:#0f1b3d;">Thermax AI Intelligence</div>
          <div style="font-size:10px;color:#64748b;margin-top:2px;">Agentic AI Business Flow — Document Export</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:9px;color:#94a3b8;">Generated: ${new Date().toLocaleString()}</div>
        </div>
      </div>
      ${htmlContent}
      <div style="border-top:1px solid #e2e8f0;margin-top:24px;padding-top:8px;font-size:8px;color:#94a3b8;text-align:center;">
        Thermax Agentic AI Platform — Auto-generated report — ${new Date().toLocaleDateString()}
      </div>
    </div>
  `;
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
    }).from(wrapper.firstElementChild).save();
  } finally {
    document.body.removeChild(wrapper);
  }
}
