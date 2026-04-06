export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type      = searchParams.get('type')      || 'overall';
  const datasetId = searchParams.get('datasetId') || '';
  const formId    = searchParams.get('formId')    || '';
  const from      = searchParams.get('from')      || '';
  const to        = searchParams.get('to')        || '';

  const fromDate = from ? new Date(from) : null;
  const toDate   = to   ? new Date(new Date(to).setHours(23, 59, 59, 999)) : null;

  const dateFilter = (fromDate || toDate)
    ? { gte: fromDate || undefined, lte: toDate || undefined }
    : undefined;

  const filters = [
    from ? `From: ${from}` : '',
    to   ? `To: ${to}`     : '',
  ].filter(Boolean).join(', ') || 'All time';

  try {
    /* ── DATASET REPORT ─────────────────────────────── */
    if (type === 'dataset') {
      if (!datasetId) return NextResponse.json({ error: 'datasetId required' }, { status: 400 });

      const ds = await prisma.dataset.findUnique({ where: { id: datasetId } });
      if (!ds) return NextResponse.json({ error: 'Dataset not found' }, { status: 404 });

      const rows: Record<string, any>[] = JSON.parse(ds.data);
      const colNames = rows.length > 0 ? Object.keys(rows[0]) : [];

      // Basic stats per column
      const colStats = colNames.map(col => {
        const vals = rows.map(r => r[col]);
        const nums = vals.map(Number).filter(n => !isNaN(n) && vals[vals.indexOf(n)] !== '');
        if (nums.length / vals.length >= 0.75 && nums.length > 0) {
          const sorted = [...nums].sort((a, b) => a - b);
          const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
          return { column: col, type: 'numeric', count: nums.length,
            min: +sorted[0].toFixed(2), max: +sorted[sorted.length-1].toFixed(2), mean: +mean.toFixed(2) };
        } else {
          const freq: Record<string, number> = {};
          vals.forEach(v => { const k = String(v ?? ''); freq[k] = (freq[k]||0)+1; });
          const top = Object.entries(freq).sort((a,b)=>b[1]-a[1])[0];
          return { column: col, type: 'categorical', count: vals.length,
            unique: Object.keys(freq).length, topValue: top ? top[0] : '-', topCount: top ? top[1] : 0 };
        }
      });

      const numericCols = colStats.filter(c => c.type === 'numeric').length;
      const catCols     = colStats.filter(c => c.type === 'categorical').length;

      return NextResponse.json({
        title:       `Dataset Report — ${ds.filename}`,
        generatedAt: new Date().toISOString(),
        filters,
        summary:     `Analysis of "${ds.filename}" containing ${rows.length.toLocaleString()} rows and ${colNames.length} columns (${numericCols} numeric, ${catCols} categorical). Uploaded on ${new Date(ds.uploadedAt).toLocaleDateString()}.`,
        metrics: [
          { label: 'Total Rows',     value: rows.length.toLocaleString() },
          { label: 'Columns',        value: colNames.length },
          { label: 'Numeric Cols',   value: numericCols },
          { label: 'Category Cols',  value: catCols },
        ],
        details: colStats,
        context: { filename: ds.filename, rowCount: rows.length, columns: colStats },
      });
    }

    /* ── FORM REPORT ────────────────────────────────── */
    if (type === 'form') {
      if (!formId) return NextResponse.json({ error: 'formId required' }, { status: 400 });

      const form = await prisma.form.findUnique({
        where:   { id: formId },
        include: {
          fields: { orderBy: { order: 'asc' } },
          submissions: {
            where: dateFilter ? { submittedAt: dateFilter } : {},
            orderBy: { submittedAt: 'desc' },
          },
        },
      });
      if (!form) return NextResponse.json({ error: 'Form not found' }, { status: 404 });

      const submissions = form.submissions;
      const parsed      = submissions.map(s => JSON.parse(s.data));

      // Per-field frequency analysis
      const fieldStats = form.fields.map(f => {
        const answers = parsed.map(d => d[f.label]).filter(v => v !== undefined && v !== '');
        const freq: Record<string, number> = {};
        answers.forEach(a => {
          const k = Array.isArray(a) ? a.join(', ') : String(a);
          freq[k] = (freq[k]||0)+1;
        });
        const top = Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,3);
        return { field: f.label, type: f.type, responses: answers.length, topAnswers: top.map(([v,c])=>`${v} (${c})`).join(' | ') };
      });

      const completionRate = form.fields.length > 0 && submissions.length > 0
        ? Math.round((parsed.reduce((acc, d) => acc + Object.values(d).filter(v => v !== '' && v !== null).length, 0)
            / (form.fields.length * submissions.length)) * 100)
        : 0;

      return NextResponse.json({
        title:       `Form Report — ${form.title}`,
        generatedAt: new Date().toISOString(),
        filters,
        summary:     `Analysis of form "${form.title}" with ${submissions.length} responses across ${form.fields.length} fields. Completion rate: ${completionRate}%. Date range: ${filters}.`,
        metrics: [
          { label: 'Total Responses',  value: submissions.length },
          { label: 'Fields',           value: form.fields.length },
          { label: 'Completion Rate',  value: `${completionRate}%` },
          { label: 'Latest Response',  value: submissions[0] ? new Date(submissions[0].submittedAt).toLocaleDateString() : 'N/A' },
        ],
        details: fieldStats,
        context: { formTitle: form.title, totalSubmissions: submissions.length, completionRate, fields: fieldStats },
      });
    }

    /* ── OVERALL REPORT ─────────────────────────────── */
    const [submissions, datasets, forms] = await Promise.all([
      prisma.formSubmission.findMany({
        where: dateFilter ? { submittedAt: dateFilter } : {},
        include: { form: true },
        orderBy: { submittedAt: 'desc' },
      }),
      prisma.dataset.findMany({
        where: dateFilter ? { uploadedAt: dateFilter } : {},
        orderBy: { uploadedAt: 'desc' },
      }),
      prisma.form.findMany({
        include: { _count: { select: { submissions: true } } },
      }),
    ]);

    let totalUploadedRows = 0;
    datasets.forEach(ds => {
      try { const d = JSON.parse(ds.data); if (Array.isArray(d)) totalUploadedRows += d.length; } catch {}
    });

    const formSummary = forms.map(f => ({
      form:        f.title,
      submissions: f._count.submissions,
      created:     new Date(f.createdAt).toLocaleDateString(),
    }));

    return NextResponse.json({
      title:       `Overall Platform Report`,
      generatedAt: new Date().toISOString(),
      filters,
      summary:     `Comprehensive platform report covering ${submissions.length} form submissions from ${forms.length} forms and ${datasets.length} uploaded datasets (${totalUploadedRows.toLocaleString()} data rows). Date range: ${filters}.`,
      metrics: [
        { label: 'Form Submissions', value: submissions.length },
        { label: 'Active Forms',     value: forms.length },
        { label: 'Datasets',         value: datasets.length },
        { label: 'Uploaded Rows',    value: totalUploadedRows.toLocaleString() },
      ],
      details: formSummary,
      context: {
        totalSubmissions: submissions.length,
        totalForms: forms.length,
        totalDatasets: datasets.length,
        totalUploadedRows,
        dateRange: filters,
        formSummary,
      },
    });

  } catch (err: any) {
    console.error('[Reports V2 Error]', err);
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 });
  }
}
