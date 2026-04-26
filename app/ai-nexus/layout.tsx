import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Nexus — Thermax AI Operating System 2030',
  description: 'Where AI, Gen-AI, and Agentic AI converge — enterprise applications for industrial operations powered by Predictive ML, Generative LLMs, and Autonomous Agents.',
};

export default function AINexusLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
