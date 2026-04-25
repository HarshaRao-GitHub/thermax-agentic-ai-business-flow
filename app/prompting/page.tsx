import type { Metadata } from 'next';
import PromptPlayground from '@/components/PromptPlayground';

export const metadata: Metadata = {
  title: 'Prompting Mode — Thermax Agentic AI',
  description:
    'A free-form prompt engineering playground for Thermax leaders to explore ideas, research topics, and build structured thinking through progressively detailed prompts.'
};

export default function PromptingPage() {
  return <PromptPlayground />;
}
