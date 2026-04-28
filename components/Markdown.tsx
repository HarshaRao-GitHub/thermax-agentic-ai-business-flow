'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';

let mermaidPromise: Promise<void> | null = null;
let mermaidReady = false;

function loadMermaid(): Promise<void> {
  if (mermaidReady) return Promise.resolve();
  if (mermaidPromise) return mermaidPromise;

  mermaidPromise = new Promise<void>((resolve) => {
    if (typeof window === 'undefined') { resolve(); return; }

    // @ts-expect-error mermaid loaded via CDN
    if (window.mermaid) { mermaidReady = true; resolve(); return; }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js';
    script.onload = () => {
      // @ts-expect-error mermaid loaded via CDN
      window.mermaid?.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose',
        suppressErrorRendering: true,
      });
      mermaidReady = true;
      resolve();
    };
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });

  return mermaidPromise;
}

function sanitizeMermaidCode(code: string): string {
  let cleaned = code.trim();

  if (cleaned.startsWith('```mermaid')) {
    cleaned = cleaned.replace(/^```mermaid\s*\n?/, '').replace(/\n?```\s*$/, '');
  }
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  cleaned = cleaned
    .replace(/×/g, 'x')
    .replace(/÷/g, '/')
    .replace(/°/g, ' deg')
    .replace(/²/g, '2')
    .replace(/³/g, '3')
    .replace(/±/g, '+/-')
    .replace(/≥/g, '>=')
    .replace(/≤/g, '<=')
    .replace(/→/g, '-->')
    .replace(/←/g, '<--')
    .replace(/₹/g, 'INR ')
    .replace(/—/g, '-')
    .replace(/–/g, '-')
    .replace(/'/g, "'")
    .replace(/'/g, "'")
    .replace(/"/g, '"')
    .replace(/"/g, '"')
    .replace(/…/g, '...');

  // eslint-disable-next-line no-control-regex
  cleaned = cleaned.replace(/[\uD83C-\uDBFF][\uDC00-\uDFFF]|\u200D|[\u2600-\u27BF]|[\uFE00-\uFE0F]/g, '');

  cleaned = cleaned.replace(
    /^(\s*title\s+)([^"\n][^\n]*)/gm,
    (_, prefix: string, rest: string) => `${prefix}"${rest.replace(/"/g, '')}"`
  );

  cleaned = cleaned.replace(/^\s*\n/, '');

  return cleaned;
}

function MermaidBlock({ code }: { code: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const rendered = useRef(false);

  const render = useCallback(async () => {
    if (rendered.current) return;
    rendered.current = true;

    const sanitized = sanitizeMermaidCode(code);

    try {
      await loadMermaid();
      // @ts-expect-error mermaid loaded via CDN
      const mermaid = window.mermaid;
      if (!mermaid) { setError('Mermaid library not available'); return; }

      const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const { svg: renderedSvg } = await mermaid.render(id, sanitized);
      setSvg(renderedSvg);
    } catch {
      try {
        // @ts-expect-error mermaid loaded via CDN
        const mermaid = window.mermaid;
        if (mermaid) {
          const simplified = sanitized
            .replace(/quadrantChart/g, 'graph TD')
            .replace(/xychart-beta/g, 'pie');
          const fallbackId = `mermaid-fb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          const { svg: fallbackSvg } = await mermaid.render(fallbackId, simplified);
          setSvg(fallbackSvg);
          return;
        }
      } catch { /* second attempt also failed */ }

      setError('diagram');
    }
  }, [code]);

  useEffect(() => { render(); }, [render]);

  if (error) {
    return (
      <div className="my-3 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
        <div className="px-3 py-2 bg-gray-100 border-b border-gray-200 flex items-center gap-2">
          <span className="text-xs">📊</span>
          <span className="text-[11px] font-semibold text-gray-600">Diagram (source code)</span>
        </div>
        <pre className="p-3 text-[11px] text-gray-700 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">{code.trim()}</pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="my-3 p-4 bg-gray-50 border border-gray-200 rounded-lg flex items-center gap-2 text-[11px] text-gray-500">
        <span className="animate-spin">⏳</span> Rendering chart...
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="my-3 p-4 bg-white border border-gray-200 rounded-lg overflow-x-auto flex justify-center"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

function MermaidPlaceholder() {
  return (
    <div className="my-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg flex items-center gap-3 text-[12px] text-blue-700">
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="font-medium">Chart / diagram will render after response completes...</span>
    </div>
  );
}

interface MarkdownProps {
  children: string;
  isStreaming?: boolean;
}

function MarkdownInner({ children, isStreaming = false }: MarkdownProps) {
  const components = useMemo(() => ({
    code({ className, children: codeChildren, ...props }: React.ComponentPropsWithoutRef<'code'> & { className?: string }) {
      const match = /language-(\w+)/.exec(className || '');
      const lang = match?.[1];

      if (lang === 'mermaid') {
        if (isStreaming) {
          return <MermaidPlaceholder />;
        }
        const codeStr = String(codeChildren).replace(/\n$/, '');
        return <MermaidBlock code={codeStr} />;
      }

      if (lang) {
        return (
          <code className={className} {...props}>
            {codeChildren}
          </code>
        );
      }

      return <code className={className} {...props}>{codeChildren}</code>;
    },
  }), [isStreaming]);

  return (
    <div className="markdown-body text-[13px] leading-relaxed" style={{ contain: 'layout style', contentVisibility: 'auto' }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

const Markdown = React.memo(MarkdownInner, (prev, next) => {
  if (prev.isStreaming !== next.isStreaming) return false;
  if (prev.children === next.children) return true;
  return false;
});

Markdown.displayName = 'Markdown';

export default Markdown;
