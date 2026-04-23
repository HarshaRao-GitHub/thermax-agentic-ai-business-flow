import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import { WorkflowProvider } from '@/components/WorkflowContext';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-inter',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Thermax 9-Stage Agentic AI Operating System',
  description:
    'End-to-end enterprise Agentic AI system covering 9 workflow stages with AgentGuard governance — Signal to Service, powered by Enterprise LLM.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
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
