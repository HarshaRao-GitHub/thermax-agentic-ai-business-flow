import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/Header';
import { WorkflowProvider } from '@/components/WorkflowContext';

export const metadata: Metadata = {
  title: 'Thermax 9-Stage Agentic AI Operating System',
  description:
    'End-to-end enterprise Agentic AI system covering 9 workflow stages with AgentGuard governance — Signal to Service, powered by Enterprise LLM.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans min-h-screen flex flex-col">
        <WorkflowProvider>
        <Header />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-thermax-line bg-white">
          <div className="max-w-7xl mx-auto px-6 py-5 text-xs text-thermax-slate flex flex-wrap items-center justify-between gap-2">
            <span>
              Thermax 9-Stage Agentic AI Operating System · Enterprise LLM · Designed &amp; Developed by Harsha Rao | Director - AI Strategy &amp; Consulting | Regenesys School of AI
            </span>
            <span className="font-mono text-[10px]">
              9 Stages · 10 Agents · 31 Tools · 4,086 Data Records · AgentGuard Governance
            </span>
          </div>
        </footer>
        </WorkflowProvider>
      </body>
    </html>
  );
}
