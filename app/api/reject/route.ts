import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ message: 'Rejections are managed client-side.' });
}
