export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const datasets = await prisma.dataset.findMany({
      orderBy: { uploadedAt: 'desc' }
    });
    const formattedDatasets = datasets.map(ds => ({
      id: ds.id,
      filename: ds.filename,
      uploadedAt: ds.uploadedAt,
    }));
    return NextResponse.json(formattedDatasets);
  } catch (error) {
    console.error('Failed to fetch datasets', error);
    return NextResponse.json({ error: 'Failed to fetch datasets' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { filename, data } = body;

    if (!filename || !data) {
      return NextResponse.json({ error: 'filename and data are required' }, { status: 400 });
    }

    const dataset = await prisma.dataset.create({
      data: {
        filename,
        data: JSON.stringify(data)
      }
    });

    return NextResponse.json({ id: dataset.id, filename: dataset.filename }, { status: 201 });
  } catch (error) {
    console.error('Failed to create dataset', error);
    return NextResponse.json({ error: 'Failed to create dataset' }, { status: 500 });
  }
}
