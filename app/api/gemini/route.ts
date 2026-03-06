
import { NextResponse } from 'next/server';

// This file is deprecated and its functionality has been moved to services/geminiService.ts.
// It is kept to avoid rewrite conflicts and explicitly mark the endpoint as gone.
export async function GET() {
    return new NextResponse('This endpoint is deprecated.', { status: 410 });
}
