import type { Metadata } from 'next';
import TenderIntelligenceTool from '@/components/TenderIntelligenceTool';

export const metadata: Metadata = {
  title: 'Tender Intelligence Tool — AI Nexus — Thermax AI OS 2030',
  description: 'AI-powered tender document extraction, analysis, and proposal acceleration for Thermax engineering divisions.',
};

export default function TenderIntelligencePage() {
  return (
    <main className="max-w-[1600px] mx-auto px-4 py-4">
      <TenderIntelligenceTool />
    </main>
  );
}
