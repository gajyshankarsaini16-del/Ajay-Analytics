export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const dataset = await prisma.dataset.findUnique({
      where: { id: params.id }
    });

    if (!dataset) {
      return NextResponse.json({ error: 'Dataset not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: dataset.id,
      filename: dataset.filename,
      uploadedAt: dataset.uploadedAt,
      data: JSON.parse(dataset.data)
    });
  } catch (error) {
    console.error('Failed to fetch dataset', error);
    return NextResponse.json({ error: 'Failed to fetch dataset' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.dataset.delete({
      where: { id: params.id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete dataset', error);
    return NextResponse.json({ error: 'Failed to delete dataset' }, { status: 500 });
  }
}
