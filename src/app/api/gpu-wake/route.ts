import { NextResponse } from 'next/server';

export async function POST() {
  const res = await fetch(`${process.env.GPU_URL_DEPLOYED}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${process.env.HF_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ inputs: { endpoint_num: 0 } }),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
