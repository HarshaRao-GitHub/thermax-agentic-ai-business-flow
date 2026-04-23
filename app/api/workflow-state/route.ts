import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ allApprovals: [], stats: { total: 0, pending: 0, approved: 0, rejected: 0, escalated: 0 } });
}
