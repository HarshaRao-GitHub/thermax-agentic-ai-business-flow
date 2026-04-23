import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'Workflow state is managed client-side.' });
}

export async function POST() {
  return NextResponse.json({ message: 'Workflow state is managed client-side.' });
}

export async function DELETE() {
  return NextResponse.json({ message: 'Workflow state is managed client-side.' });
}
