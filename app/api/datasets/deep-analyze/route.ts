export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { datasetId } = await request.json();
    if (!datasetId) return NextResponse.json({ error: 'datasetId required' }, { status: 400 });

    const dataset = await prisma.dataset.findUnique({ where: { id: datasetId } });
    if (!dataset) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    let rows: Record<string, any>[] = [];
    try { rows = JSON.parse(dataset.data); } catch {}

    const colNames = rows.length > 0 ? Object.keys(rows[0]) : [];

    // Deep stats per column
    const columnAnalysis = colNames.map(col => {
      const vals = rows.map(r => r[col]);
      const nonNull = vals.filter(v => v !== null && v !== undefined && v !== '');
      const missing = vals.length - nonNull.length;
      const missingPct = Math.round((missing / vals.length) * 100);
      const nums = nonNull.map(Number).filter(n => !isNaN(n));
      const isNumeric = nums.length / Math.max(nonNull.length, 1) >= 0.75 && nums.length > 0;

      if (isNumeric) {
        const sorted = [...nums].sort((a, b) => a - b);
        const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
        const variance = nums.reduce((acc, n) => acc + (n - mean) ** 2, 0) / nums.length;
        const std = Math.sqrt(variance);
        const q1 = sorted[Math.floor(sorted.length * 0.25)];
        const q3 = sorted[Math.floor(sorted.length * 0.75)];
        const iqr = q3 - q1;
        const outliers = nums.filter(n => n < q1 - 1.5 * iqr || n > q3 + 1.5 * iqr).length;
        const skewness = nums.length > 2
          ? nums.reduce((acc, n) => acc + ((n - mean) / (std || 1)) ** 3, 0) / nums.length
          : 0;

        // Histogram
        const min = sorted[0], max = sorted[sorted.length - 1];
        const binSize = (max - min) / 10 || 1;
        const histogram = Array.from({ length: 10 }, (_, i) => {
          const lo = min + i * binSize, hi = lo + binSize;
          return { range: `${lo.toFixed(1)}–${hi.toFixed(1)}`, count: nums.filter(n => n >= lo && n < hi).length };
        }).filter(b => b.count > 0);

        return {
          column: col, type: 'numeric',
          count: nums.length, missing, missingPct,
          min: +sorted[0].toFixed(3), max: +sorted[sorted.length - 1].toFixed(3),
          mean: +mean.toFixed(3), median: +sorted[Math.floor(sorted.length / 2)].toFixed(3),
          std: +std.toFixed(3), variance: +variance.toFixed(3),
          q1: +q1.toFixed(3), q3: +q3.toFixed(3), iqr: +iqr.toFixed(3),
          outliers, outlierPct: Math.round((outliers / nums.length) * 100),
          skewness: +skewness.toFixed(3),
          skewnessLabel: skewness > 1 ? 'Highly right-skewed' : skewness < -1 ? 'Highly left-skewed' : Math.abs(skewness) > 0.5 ? 'Moderately skewed' : 'Approximately symmetric',
          histogram,
        };
      } else {
        const freq: Record<string, number> = {};
        nonNull.forEach(v => { const k = String(v); freq[k] = (freq[k] || 0) + 1; });
        const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
        const entropy = -sorted.reduce((acc, [, c]) => {
          const p = c / nonNull.length;
          return acc + (p > 0 ? p * Math.log2(p) : 0);
        }, 0);
        return {
          column: col, type: 'categorical',
          count: nonNull.length, missing, missingPct,
          uniqueCount: sorted.length,
          uniquePct: Math.round((sorted.length / nonNull.length) * 100),
          topValues: sorted.slice(0, 10).map(([value, count]) => ({ value, count, pct: Math.round((count / nonNull.length) * 100) })),
          entropy: +entropy.toFixed(3),
          diversityLabel: entropy > 3 ? 'High diversity' : entropy > 1.5 ? 'Moderate diversity' : 'Low diversity (concentrated)',
          dominantValue: sorted[0]?.[0],
          dominantPct: Math.round(((sorted[0]?.[1] || 0) / nonNull.length) * 100),
        };
      }
    });

    // Correlations between all numeric columns
    const numCols = columnAnalysis.filter(c => c.type === 'numeric');
    const correlations: any[] = [];
    for (let i = 0; i < numCols.length; i++) {
      for (let j = i + 1; j < numCols.length; j++) {
        const a = numCols[i].column, b = numCols[j].column;
        const pairs = rows.map(r => [parseFloat(r[a]), parseFloat(r[b])]).filter(([x, y]) => !isNaN(x) && !isNaN(y));
        if (pairs.length < 3) continue;
        const n = pairs.length;
        const ma = pairs.reduce((s, [x]) => s + x, 0) / n;
        const mb = pairs.reduce((s, [, y]) => s + y, 0) / n;
        const num = pairs.reduce((s, [x, y]) => s + (x - ma) * (y - mb), 0);
        const da = Math.sqrt(pairs.reduce((s, [x]) => s + (x - ma) ** 2, 0));
        const db = Math.sqrt(pairs.reduce((s, [, y]) => s + (y - mb) ** 2, 0));
        if (!da || !db) continue;
        const r = Math.round((num / (da * db)) * 100) / 100;
        if (Math.abs(r) > 0.3) {
          correlations.push({
            colA: a, colB: b, r,
            strength: Math.abs(r) > 0.7 ? 'Strong' : Math.abs(r) > 0.4 ? 'Moderate' : 'Weak',
            direction: r > 0 ? 'Positive' : 'Negative',
          });
        }
      }
    }
    correlations.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));

    // Data quality score
    const totalCells = rows.length * colNames.length;
    const missingCells = columnAnalysis.reduce((s, c) => s + (c.missing || 0), 0);
    const qualityScore = Math.round(((totalCells - missingCells) / totalCells) * 100);

    // Dataset type inference
    const hasDateCol = colNames.some(c => /date|time|year|month|day/i.test(c));
    const hasIdCol   = colNames.some(c => /id|_id|key/i.test(c));
    const numericRatio = numCols.length / colNames.length;
    const datasetType = hasDateCol ? 'Time-series / Longitudinal data'
      : numericRatio > 0.7 ? 'Quantitative / Survey responses'
      : numericRatio < 0.3 ? 'Categorical / Text data'
      : 'Mixed data';

    // Now call AI for narrative
    let aiNarrative = '';
    const summaryForAI = {
      filename: dataset.filename,
      rows: rows.length,
      columns: colNames.length,
      datasetType,
      qualityScore,
      numericColumns: numCols.length,
      categoricalColumns: columnAnalysis.filter(c => c.type === 'categorical').length,
      topCorrelations: correlations.slice(0, 3),
      columnSummaries: columnAnalysis.slice(0, 8).map(c => ({
        name: c.column, type: c.type,
        missing: c.missingPct,
        ...(c.type === 'numeric' ? { mean: (c as any).mean, std: (c as any).std, outliers: (c as any).outlierPct + '%' } : { unique: (c as any).uniqueCount, dominant: (c as any).dominantValue + ' (' + (c as any).dominantPct + '%)' })
      }))
    };

    const aiPrompt = `You are an expert data scientist. Analyze this dataset and provide a comprehensive report exactly like a professional analytics tool would.

Dataset: ${JSON.stringify(summaryForAI, null, 2)}

Provide:

## 📊 Dataset Overview
What kind of dataset is this? What domain/industry? What story does it tell?

## 🔍 Key Findings
Top 5 most interesting statistical insights with specific numbers.

## 📈 Patterns & Trends  
Notable patterns, distributions, anomalies discovered.

## 🔗 Correlations & Relationships
What variables are related? What does this mean?

## ⚠️ Data Quality Issues
Missing values, outliers, inconsistencies found.

## 💡 Actionable Recommendations
Top 5 specific actions to take based on this data.

## 🎯 Next Steps
What analysis should be done next?

Be specific, use actual numbers from the data. Write like a senior data scientist.`;

    try {
      if (process.env.ANTHROPIC_API_KEY) {
        const r = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({ model: 'claude-opus-4-5', max_tokens: 1500,
            system: 'You are a senior data scientist providing detailed, specific analysis. Use markdown formatting.',
            messages: [{ role: 'user', content: aiPrompt }] })
        });
        const d = await r.json();
        aiNarrative = d.content?.[0]?.text || '';
      } else if (process.env.GEMINI_API_KEY) {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const rr = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: aiPrompt });
        aiNarrative = rr.text || '';
      }
    } catch {}

    return NextResponse.json({
      id: dataset.id,
      filename: dataset.filename,
      rowCount: rows.length,
      columnCount: colNames.length,
      datasetType,
      qualityScore,
      columnAnalysis,
      correlations,
      aiNarrative,
    });
  } catch (err: any) {
    console.error('[DeepAnalyze Error]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
