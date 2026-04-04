export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const submissions = await prisma.formSubmission.findMany({
      include: { form: true },
      orderBy: { submittedAt: 'desc' }
    });

    const datasets = await prisma.dataset.findMany({
      orderBy: { uploadedAt: 'desc' }
    });

    const unifiedRecords: any[] = [];

    // Add submissions
    submissions.forEach((sub: any) => {
      unifiedRecords.push({
        id: sub.id,
        source: sub.form.title,
        type: sub.source, // 'public' or 'manual'
        data: JSON.parse(sub.data),
        createdAt: sub.submittedAt
      });
    });

    // Add dataset rows
    datasets.forEach((ds: any) => {
      const rows = JSON.parse(ds.data);
      if (Array.isArray(rows)) {
        rows.forEach((row, index) => {
          unifiedRecords.push({
            id: `${ds.id}-${index}`,
            source: ds.filename,
            type: 'upload',
            data: row,
            createdAt: ds.uploadedAt
          });
        });
      }
    });

    // Sort by date desc
    unifiedRecords.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json(unifiedRecords);
  } catch (error) {
    console.error('Explorer API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch records' }, { status: 500 });
  }
}
