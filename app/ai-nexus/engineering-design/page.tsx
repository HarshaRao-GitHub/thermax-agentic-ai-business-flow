import type { Metadata } from 'next';
import EngineeringDesignAssistant from '@/components/EngineeringDesignAssistant';

export const metadata: Metadata = {
  title: 'Agentic Engineering Design — AI Nexus — Thermax AI OS 2030',
  description: 'Multi-agent engineering design assistants for boilers, WHR, water treatment, and APC — reducing proposal engineering from weeks to hours.',
};

export default function EngineeringDesignPage() {
  return <EngineeringDesignAssistant />;
}
