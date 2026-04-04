export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const totalForms = await prisma.form.count();
    const submissions = await prisma.formSubmission.findMany({
      select: { data: true, submittedAt: true }
    });

    const datasets = await prisma.dataset.findMany({
      select: { data: true, uploadedAt: true }
    });

    // Grouping logic for trends
    const trendMap: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      trendMap[d.toISOString().split('T')[0]] = 0;
    }

    submissions.forEach((s: any) => {
      const d = s.submittedAt.toISOString().split('T')[0];
      if (trendMap[d] !== undefined) trendMap[d]++;
    });

    datasets.forEach((ds: any) => {
      const d = ds.uploadedAt.toISOString().split('T')[0];
      if (trendMap[d] !== undefined) trendMap[d]++;
    });

    const chartData = Object.entries(trendMap).map(([date, count]) => ({
      date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
      events: count
    }));

    // KPI logic
    let totalUploadedRows = 0;
    datasets.forEach((ds: any) => {
      try {
        const parsed = JSON.parse(ds.data);
        if (Array.isArray(parsed)) totalUploadedRows += parsed.length;
      } catch {}
    });

    const totalRows = submissions.length + totalUploadedRows;

    const sourceBreakdown = [
      { name: 'Form Entries', value: submissions.length },
      { name: 'File Uploads', value: totalUploadedRows }
    ];

    const recentForms = await prisma.form.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { submissions: true }
        }
      }
    });

    return NextResponse.json({
      kpis: {
        totalForms,
        totalSubmissions: submissions.length,
        totalDatasets: datasets.length,
        totalRows
      },
      chartData,
      sourceBreakdown,
      recentForms
    });
  } catch (error) {
    console.error('Failed to fetch analytics', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
