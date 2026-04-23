import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ agents: [] });
}

export async function POST() {
  return NextResponse.json({ message: 'Custom agents are managed client-side.' });
}
