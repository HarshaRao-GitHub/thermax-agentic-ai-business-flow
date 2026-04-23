import DocIntelligenceHub from '@/components/DocIntelligenceHub';

export const metadata = {
  title: 'Document Intelligence Hub — Thermax\'s AI OS 2030',
  description: 'AI-powered document analysis — summarize, extract, compare, and govern Thermax documents across 7 departments.',
};

export default function DocIntelligencePage() {
  return (
    <main className="max-w-[1600px] mx-auto px-4 py-4">
      <DocIntelligenceHub />
    </main>
  );
}
