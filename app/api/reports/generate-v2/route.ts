export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type      = searchParams.get('type') || 'overall';
    const datasetId = searchParams.get('datasetId');
    const formId    = searchParams.get('formId');
    const from      = searchParams.get('from');
    const to        = searchParams.get('to');

    const dateFilter = (from || to) ? {
      ...(from && { gte: new Date(from) }),
      ...(to   && { lte: new Date(to)   }),
    } : undefined;

    const filterLabel = from || to
      ? `${from || 'start'} → ${to || 'now'}`
      : null;

    /* ───────────────────────────────────────────
       DATASET REPORT
    ─────────────────────────────────────────── */
    if (type === 'dataset' && datasetId) {
      const dataset = await (prisma as any).dataset.findUnique({
        where: { id: datasetId },
      });
      if (!dataset) return NextResponse.json({ error: 'Dataset not found' }, { status: 404 });

      let rows: any[] = [];
      try { rows = JSON.parse(dataset.data || '[]'); } catch {}
      if (!Array.isArray(rows)) rows = [];

      const columns = dataset.columns ? JSON.parse(dataset.columns) : (rows.length ? Object.keys(rows[0]) : []);

      // Per-column stats
      const colStats = columns.map((col: string) => {
        const vals = rows.map((r: any) => r[col]).filter((v: any) => v !== null && v !== undefined && v !== '');
        const nums = vals.map(Number).filter(n => !isNaN(n));
        const isNumeric = nums.length / Math.max(vals.length, 1) >= 0.75;

        if (isNumeric && nums.length > 0) {
          const sorted = [...nums].sort((a, b) => a - b);
          const mean   = nums.reduce((s, n) => s + n, 0) / nums.length;
          const median = sorted.length % 2 === 0
            ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
            : sorted[Math.floor(sorted.length / 2)];
          const std = Math.sqrt(nums.reduce((s, n) => s + (n - mean) ** 2, 0) / nums.length);
          return {
            Column: col, Type: 'Numeric',
            Count: nums.length,
            Min: +sorted[0].toFixed(2),
            Max: +sorted[sorted.length - 1].toFixed(2),
            Mean: +mean.toFixed(2),
            Median: +median.toFixed(2),
            'Std Dev': +std.toFixed(2),
            'Null %': `${Math.round((1 - vals.length / rows.length) * 100)}%`,
          };
        } else {
          const freq: Record<string, number> = {};
          vals.forEach((v: any) => { const k = String(v); freq[k] = (freq[k] || 0) + 1; });
          const top = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];
          return {
            Column: col, Type: 'Categorical',
            Count: vals.length,
            'Unique Values': Object.keys(freq).length,
            'Top Value': top ? top[0] : '—',
            'Top Count': top ? top[1] : 0,
            'Null %': `${Math.round((1 - vals.length / rows.length) * 100)}%`,
          };
        }
      });

      const numCols = colStats.filter((c: any) => c.Type === 'Numeric').length;
      const catCols = colStats.filter((c: any) => c.Type === 'Categorical').length;
      const nullCols = colStats.filter((c: any) => parseInt(c['Null %']) > 20).length;

      return NextResponse.json({
        title:   `Dataset Analysis Report — ${dataset.filename}`,
        filters: filterLabel || 'All data',
        summary: `This report analyzes "${dataset.filename}" containing ${rows.length.toLocaleString()} rows across ${columns.length} columns (${numCols} numeric, ${catCols} categorical). ${nullCols > 0 ? `${nullCols} column(s) have >20% missing values and require attention.` : 'Data completeness is satisfactory across all columns.'} Generated on ${new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}.`,
        metrics: [
          { label: 'Total Rows',       value: rows.length.toLocaleString() },
          { label: 'Total Columns',    value: columns.length },
          { label: 'Numeric Columns',  value: numCols },
          { label: 'Categorical Cols', value: catCols },
          { label: 'Null-heavy Cols',  value: nullCols },
          { label: 'Est. Data Quality', value: `${Math.round((1 - nullCols / Math.max(columns.length, 1)) * 100)}%` },
        ],
        details: colStats,
        context: {
          filename: dataset.filename,
          rowCount: rows.length,
          columnCount: columns.length,
          columns: colStats,
        },
      });
    }

    /* ───────────────────────────────────────────
       FORM REPORT
    ─────────────────────────────────────────── */
    if (type === 'form' && formId) {
      const form = await (prisma as any).form.findUnique({
        where: { id: formId },
        include: {
          fields: true,
          submissions: {
            where: dateFilter ? { submittedAt: dateFilter } : undefined,
            include: { answers: true },
          },
        },
      });
      if (!form) return NextResponse.json({ error: 'Form not found' }, { status: 404 });

      const subs = form.submissions || [];
      const totalSubs = subs.length;

      // Per-field stats
      const fieldStats = (form.fields || []).map((field: any) => {
        const answers = subs.flatMap((s: any) =>
          (s.answers || []).filter((a: any) => a.fieldId === field.id && a.value)
        );
        const freq: Record<string, number> = {};
        answers.forEach((a: any) => {
          const v = String(a.value || '').trim();
          if (v) freq[v] = (freq[v] || 0) + 1;
        });
        const topAnswer = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];
        const completionRate = totalSubs > 0 ? Math.round((answers.length / totalSubs) * 100) : 0;

        return {
          Field: field.label || field.name,
          Type: field.type,
          Responses: answers.length,
          'Completion %': `${completionRate}%`,
          'Top Answer': topAnswer ? `${topAnswer[0]} (${topAnswer[1]}×)` : '—',
          'Unique Values': Object.keys(freq).length,
        };
      });

      const avgCompletion = fieldStats.length > 0
        ? Math.round(fieldStats.reduce((s: number, f: any) => s + parseInt(f['Completion %']), 0) / fieldStats.length)
        : 0;

      // Build submission trend (last 30 days)
      const trendMap: Record<string, number> = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        trendMap[d.toISOString().split('T')[0]] = 0;
      }
      subs.forEach((s: any) => {
        if (s.submittedAt) {
          const key = new Date(s.submittedAt).toISOString().split('T')[0];
          if (trendMap[key] !== undefined) trendMap[key]++;
        }
      });
      const trendPeak = Math.max(...Object.values(trendMap));
      const peakDate  = Object.entries(trendMap).find(([, v]) => v === trendPeak)?.[0];

      return NextResponse.json({
        title:   `Form Report — ${form.title}`,
        filters: filterLabel || 'All time',
        summary: `This report covers "${form.title}" with ${totalSubs} total submissions${filterLabel ? ` between ${filterLabel}` : ''}. The form has ${form.fields?.length || 0} fields with an average completion rate of ${avgCompletion}%.${peakDate && trendPeak > 0 ? ` Peak activity was on ${new Date(peakDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })} with ${trendPeak} submissions.` : ''} Generated on ${new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}.`,
        metrics: [
          { label: 'Total Submissions', value: totalSubs },
          { label: 'Total Fields',      value: form.fields?.length || 0 },
          { label: 'Avg Completion',    value: `${avgCompletion}%` },
          { label: 'Peak Day Count',    value: trendPeak || 0 },
          { label: 'Date Range',        value: filterLabel || 'All time' },
        ],
        details: fieldStats,
        context: {
          formTitle: form.title,
          totalSubmissions: totalSubs,
          fieldCount: form.fields?.length || 0,
          avgCompletion,
          fields: fieldStats,
          trendMap,
        },
      });
    }

    /* ───────────────────────────────────────────
       OVERALL / EXECUTIVE REPORT
    ─────────────────────────────────────────── */
    const [forms, datasets, recentSubs] = await Promise.all([
      (prisma as any).form.findMany({
        include: {
          _count: { select: { submissions: true } },
          submissions: {
            where: dateFilter ? { submittedAt: dateFilter } : undefined,
            select: { submittedAt: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      (prisma as any).dataset.findMany({
        select: { id: true, filename: true, rowCount: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      (prisma as any).formSubmission?.findMany({
        where: dateFilter ? { submittedAt: dateFilter } : undefined,
        select: { submittedAt: true },
        orderBy: { submittedAt: 'desc' },
        take: 1000,
      }).catch(() => []),
    ]);

    const totalForms      = forms.length;
    const totalSubs       = forms.reduce((s: number, f: any) => s + f._count.submissions, 0);
    const totalDatasets   = datasets.length;
    const totalRows       = datasets.reduce((s: number, d: any) => s + (d.rowCount || 0), 0);
    const topForm         = [...forms].sort((a: any, b: any) => b._count.submissions - a._count.submissions)[0];
    const avgSubsPerForm  = totalForms > 0 ? Math.round(totalSubs / totalForms) : 0;

    const formDetails = forms.map((f: any) => ({
      Form: f.title,
      Submissions: f._count.submissions,
      'Created': new Date(f.createdAt).toLocaleDateString('en-IN'),
    }));

    return NextResponse.json({
      title:   'Executive Intelligence Report',
      filters: filterLabel || 'All time — complete platform data',
      summary: `This executive report provides a platform-wide view of ${totalForms} form(s) and ${totalDatasets} dataset(s). A total of ${totalSubs.toLocaleString()} form responses have been collected${filterLabel ? ` in the period ${filterLabel}` : ''}. ${totalDatasets > 0 ? `Datasets together contain ${totalRows.toLocaleString()} rows of structured data.` : 'No datasets have been uploaded yet.'} ${topForm ? `The best-performing form is "${topForm.title}" with ${topForm._count.submissions} submissions.` : ''} Generated on ${new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}.`,
      metrics: [
        { label: 'Total Forms',        value: totalForms },
        { label: 'Total Submissions',  value: totalSubs.toLocaleString() },
        { label: 'Avg Subs / Form',    value: avgSubsPerForm },
        { label: 'Datasets Uploaded',  value: totalDatasets },
        { label: 'Total Data Rows',    value: totalRows.toLocaleString() },
        { label: 'Top Form',           value: topForm?.title || '—' },
      ],
      details: formDetails,
      context: {
        totalForms,
        totalSubmissions: totalSubs,
        totalDatasets,
        totalRows,
        avgSubsPerForm,
        topForm: topForm ? { title: topForm.title, submissions: topForm._count.submissions } : null,
        forms: formDetails,
        datasets: datasets.map((d: any) => ({ filename: d.filename, rowCount: d.rowCount || 0 })),
      },
    });

  } catch (error: any) {
    console.error('[generate-v2 error]', error);
    return NextResponse.json({ error: error.message || 'Report generation failed' }, { status: 500 });
  }
}
