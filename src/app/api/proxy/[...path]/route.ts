import { NextRequest, NextResponse } from 'next/server';

const api = process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL : process.env.NEXT_PUBLIC_API_URL_DEPLOYED

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  params = await params
  const path = params.path.join('/');
  const url = new URL(request.url);
  const apiUrl = `${api}/${path}${url.search}`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('API proxy error:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  params = await params
  const path = params.path.join('/');
  const body = await request.json();
  const apiUrl = `${api}/${path}`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('API proxy error:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}