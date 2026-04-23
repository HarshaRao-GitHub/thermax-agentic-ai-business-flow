import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ message: 'Avatars are handled client-side as base64 data URLs.' });
}
