'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useEffect, useRef, useState, useCallback } from 'react';

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
      window.mermaid?.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'loose' });
      mermaidReady = true;
      resolve();
    };
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });

  return mermaidPromise;
}

function MermaidBlock({ code }: { code: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const rendered = useRef(false);

  const render = useCallback(async () => {
    if (rendered.current) return;
    rendered.current = true;

    try {
      await loadMermaid();
      // @ts-expect-error mermaid loaded via CDN
      const mermaid = window.mermaid;
      if (!mermaid) { setError('Mermaid library not available'); return; }

      const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const { svg: renderedSvg } = await mermaid.render(id, code.trim());
      setSvg(renderedSvg);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chart rendering failed');
    }
  }, [code]);

  useEffect(() => { render(); }, [render]);

  if (error) {
    return (
      <div className="my-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-[11px] text-red-400">
        <div className="font-semibold mb-1">Chart rendering error</div>
        <div className="font-mono text-[10px] text-red-400/70">{error}</div>
        <pre className="mt-2 p-2 bg-black/20 rounded text-white/50 text-[10px] overflow-x-auto whitespace-pre-wrap">{code}</pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="my-3 p-4 bg-white/[0.03] border border-white/5 rounded-lg flex items-center gap-2 text-[11px] text-white/40">
        <span className="animate-spin">⏳</span> Rendering chart...
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="my-3 p-4 bg-white/[0.03] border border-white/5 rounded-lg overflow-x-auto flex justify-center"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export default function Markdown({ children }: { children: string }) {
  return (
    <div className="markdown-body text-[13px] leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children: codeChildren, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const lang = match?.[1];

            if (lang === 'mermaid') {
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
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
