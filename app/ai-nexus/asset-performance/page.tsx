import type { Metadata } from 'next';
import AssetPerformancePlatform from '@/components/AssetPerformancePlatform';

export const metadata: Metadata = {
  title: 'Asset Performance Platform — AI Nexus — Thermax AI OS 2030',
  description: 'AI-powered industrial asset monitoring, predictive maintenance, and efficiency optimization across Thermax fleet.',
};

export default function AssetPerformancePage() {
  return <AssetPerformancePlatform />;
}
