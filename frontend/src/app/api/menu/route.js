'use server';

import { NextResponse } from 'next/server';

const ADMIN_API_URL = process.env.NEXT_PUBLIC_WEBSITE_API_URL;
const DEFAULT_LOCATION = 'primary';

export async function GET(request) {
  if (!ADMIN_API_URL) {
    return NextResponse.json(
      { message: 'Missing NEXT_PUBLIC_WEBSITE_API_URL' },
      { status: 500 }
    );
  }

  const url = new URL(`${ADMIN_API_URL}/menu`);
  const location = request.nextUrl.searchParams.get('location') ?? DEFAULT_LOCATION;
  url.searchParams.set('location', location);

  try {
    const response = await fetch(url.href, {
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json(
        { message: 'Failed to load admin menu', location },
        { status: response.status }
      );
    }

    const payload = await response.json();
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { message: 'Unable to reach admin API', error: error?.message ?? null, location },
      { status: 502 }
    );
  }
}
