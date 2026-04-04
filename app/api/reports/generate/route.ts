export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'project';

  try {
    const [submissions, datasets, forms] = await Promise.all([
      prisma.formSubmission.findMany({ include: { form: true } }),
      prisma.dataset.findMany(),
      prisma.form.findMany({ include: { fields: true, _count: { select: { submissions: true } } } })
    ]);

    let reportData: any = {
      title: type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ') + " Report",
      generatedAt: new Date().toISOString(),
      summary: "",
      metrics: [],
      charts: []
    };

    // Merge all data records for universal processing
    const allRecords = [
      ...submissions.map((s: any) => ({ data: JSON.parse(s.data), source: s.source, date: s.submittedAt })),
      ...datasets.map((d: any) => {
        try {
          return { data: JSON.parse(d.data), source: 'upload', date: d.uploadedAt };
        } catch {
          return null;
        }
      }).filter(Boolean) as any[]
    ];

    switch (type) {
      case 'financial':
        let totalVal = 0;
        let currencyFields = 0;
        allRecords.forEach(record => {
          Object.entries(record.data).forEach(([k, v]: [string, any]) => {
            if (k.toLowerCase().includes('price') || k.toLowerCase().includes('cost') || k.toLowerCase().includes('amount')) {
              totalVal += Number(v) || 0;
              currencyFields++;
            }
          });
        });
        reportData.summary = `Detailed financial overview across all sources. Analysis includes ${allRecords.length} total records and ${currencyFields} identified monetary data points.`;
        reportData.metrics = [
          { label: 'Total Aggregated Value', value: `$${totalVal.toLocaleString()}` },
          { label: 'Avg Value per Entry', value: `$${currencyFields > 0 ? (totalVal / currencyFields).toFixed(2) : '0'}` },
          { label: 'Data Sources Mix', value: datasets.length > 0 ? 'MULTIPLE' : 'SINGLE' }
        ];
        break;

      case 'feasibility':
        const totalPossibleEntries = forms.reduce((acc: number, f: any) => acc + (f.fields.length * f._count.submissions), 0) + 
                                   datasets.reduce((acc: number, d: any) => acc + (Object.keys(JSON.parse(d.data)).length), 0);
        let filledFields = 0;
        allRecords.forEach(record => {
          Object.values(record.data).forEach((v: any) => { if (v && v !== '') filledFields++; });
        });
        const completionRate = totalPossibleEntries > 0 ? (filledFields / totalPossibleEntries) * 100 : 0;
        reportData.summary = `Data feasibility analysis based on cross-source completeness. Real-world Health Score: ${completionRate.toFixed(1)}%.`;
        reportData.metrics = [
          { label: 'Unified Health Score', value: `${completionRate.toFixed(1)}%` },
          { label: 'Decision Viability', value: completionRate > 80 ? 'HIGH' : completionRate > 50 ? 'MEDIUM' : 'LOW' },
          { label: 'Total Analyzed Fields', value: filledFields }
        ];
        break;

      case 'progress':
        const totalTodayVal = allRecords.length;
        const lastWeekDate = new Date(); lastWeekDate.setDate(lastWeekDate.getDate() - 7);
        const prevRecs = allRecords.filter(r => new Date(r.date) < lastWeekDate).length;
        const growthPct = prevRecs > 0 ? ((totalTodayVal - prevRecs) / prevRecs) * 100 : 100;
        reportData.summary = `Unified project progress tracking. Total data repository size: ${totalTodayVal} records.`;
        reportData.metrics = [
          { label: 'Total Unified Records', value: totalTodayVal },
          { label: 'Growth Trend', value: `${growthPct.toFixed(1)}%` },
          { label: 'Upload Contribution', value: `${((datasets.length / (allRecords.length || 1)) * 100).toFixed(0)}%` }
        ];
        break;

      case 'research':
        const uniqueEmails = new Set();
        allRecords.forEach(record => {
          const content = JSON.stringify(record.data);
          const emailMatches = content.match(/[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+/gi);
          if (emailMatches) emailMatches.forEach((m: string) => uniqueEmails.add(m.toLowerCase()));
        });
        reportData.summary = `Detailed research analysis. Successfully mapped ${uniqueEmails.size} unique participant entities across form submissions and uploaded datasets.`;
        reportData.metrics = [
          { label: 'Unique Participants', value: uniqueEmails.size },
          { label: 'Source Diversification', value: `${(forms.length + datasets.length)} Channels` },
          { label: 'Cross-Source Matches', value: (allRecords.length - uniqueEmails.size) > 0 ? (allRecords.length - uniqueEmails.size) : 0 }
        ];
        break;

      default:
        reportData.summary = "General project status and executive summary of unified data intelligence.";
        reportData.metrics = [
          { label: 'Unified Repo Size', value: allRecords.length },
          { label: 'Active Sources', value: forms.length + datasets.length },
          { label: 'Data Quality Index', value: 'OPTIMIZED' }
        ];
    }

    return NextResponse.json(reportData);
  } catch (error) {
    console.error('Reports API Error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
