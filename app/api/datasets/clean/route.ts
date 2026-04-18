export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function inferType(values: any[]): 'numeric' | 'date' | 'boolean' | 'text' {
  const nonEmpty = values.filter(v => v !== null && v !== undefined && v !== '');
  if (nonEmpty.length === 0) return 'text';
  const numRate = nonEmpty.filter(v => !isNaN(Number(v))).length / nonEmpty.length;
  if (numRate >= 0.8) return 'numeric';
  const dateRate = nonEmpty.filter(v => !isNaN(Date.parse(String(v)))).length / nonEmpty.length;
  if (dateRate >= 0.7) return 'date';
  const boolVals = ['true','false','yes','no','1','0','y','n'];
  const boolRate = nonEmpty.filter(v => boolVals.includes(String(v).toLowerCase())).length / nonEmpty.length;
  if (boolRate >= 0.8) return 'boolean';
  return 'text';
}

export async function POST(request: Request) {
  try {
    const { datasetId } = await request.json();
    if (!datasetId) return NextResponse.json({ error: 'datasetId required' }, { status: 400 });

    const dataset = await prisma.dataset.findUnique({ where: { id: datasetId } });
    if (!dataset) return NextResponse.json({ error: 'Dataset not found' }, { status: 404 });

    let rows: Record<string, any>[] = [];
    try { rows = JSON.parse(dataset.data); } catch {}
    if (!Array.isArray(rows) || rows.length === 0)
      return NextResponse.json({ error: 'Empty dataset' }, { status: 400 });

    const originalCount = rows.length;
    const report: string[] = [];
    const colNames = Object.keys(rows[0]);

    // ── Step 1: Trim whitespace ──
    rows = rows.map(row => {
      const cleaned: Record<string, any> = {};
      for (const col of colNames) {
        const v = row[col];
        cleaned[col] = typeof v === 'string' ? v.trim() : v;
      }
      return cleaned;
    });
    report.push('✅ Whitespace trimmed from all string values');

    // ── Step 2: Remove duplicate rows ──
    const seen = new Set<string>();
    const deduped: Record<string, any>[] = [];
    for (const row of rows) {
      const key = JSON.stringify(Object.values(row));
      if (!seen.has(key)) { seen.add(key); deduped.push(row); }
    }
    const dupCount = rows.length - deduped.length;
    if (dupCount > 0) report.push(`✅ Removed ${dupCount} duplicate rows`);
    else report.push('✅ No duplicate rows found');
    rows = deduped;

    // ── Step 3: Standardize missing values ──
    const nullVariants = ['null','none','n/a','na','nan','undefined','nil','-','--',''];
    let nullFixed = 0;
    rows = rows.map(row => {
      const r = { ...row };
      for (const col of colNames) {
        if (nullVariants.includes(String(r[col] ?? '').toLowerCase())) {
          r[col] = null;
          nullFixed++;
        }
      }
      return r;
    });
    if (nullFixed > 0) report.push(`✅ Standardized ${nullFixed} null/empty variants to null`);

    // ── Step 4: Fill missing numeric with mean ──
    let numFilled = 0;
    for (const col of colNames) {
      const vals = rows.map(r => r[col]);
      if (inferType(vals) !== 'numeric') continue;
      const nums = vals.filter(v => v !== null && !isNaN(Number(v))).map(Number);
      if (nums.length === 0) continue;
      const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
      rows = rows.map(r => {
        if (r[col] === null || r[col] === undefined || r[col] === '') {
          numFilled++;
          return { ...r, [col]: +mean.toFixed(3) };
        }
        return r;
      });
    }
    if (numFilled > 0) report.push(`✅ Filled ${numFilled} missing numeric values with column mean`);

    // ── Step 5: Remove rows where >50% columns are null ──
    const halfCols = colNames.length * 0.5;
    const beforeEmpty = rows.length;
    rows = rows.filter(row => {
      const nulls = colNames.filter(col => row[col] === null || row[col] === undefined || row[col] === '').length;
      return nulls <= halfCols;
    });
    const emptyRemoved = beforeEmpty - rows.length;
    if (emptyRemoved > 0) report.push(`✅ Removed ${emptyRemoved} rows with >50% empty values`);

    // ── Step 6: Standardize column names ──
    const renamedCols: Record<string, string> = {};
    const newColNames = colNames.map(col => {
      const clean = col.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
      if (clean !== col) renamedCols[col] = clean;
      return clean;
    });
    if (Object.keys(renamedCols).length > 0) {
      rows = rows.map(row => {
        const r: Record<string, any> = {};
        colNames.forEach((oldCol, i) => { r[newColNames[i]] = row[oldCol]; });
        return r;
      });
      report.push(`✅ Standardized ${Object.keys(renamedCols).length} column names (spaces→underscores)`);
    }

    // ── Step 7: Type coercion for numeric columns ──
    let typeFixed = 0;
    const finalCols = Object.keys(rows[0] || {});
    for (const col of finalCols) {
      const vals = rows.map(r => r[col]);
      if (inferType(vals) === 'numeric') {
        rows = rows.map(r => {
          if (r[col] !== null && !isNaN(Number(r[col]))) {
            const n = Number(r[col]);
            if (r[col] !== n) typeFixed++;
            return { ...r, [col]: n };
          }
          return r;
        });
      }
    }
    if (typeFixed > 0) report.push(`✅ Converted ${typeFixed} string numbers to numeric type`);

    const cleanedCount = rows.length;
    report.push(`\n📊 Summary: ${originalCount} → ${cleanedCount} rows (removed ${originalCount - cleanedCount} rows)`);

    // Save cleaned version back
    await prisma.dataset.update({
      where: { id: datasetId },
      data: {
        data: JSON.stringify(rows),
        filename: dataset.filename.replace(/\.(csv|xlsx|xls)$/i, '_cleaned.$1'),
      }
    });

    return NextResponse.json({
      success: true,
      originalRows: originalCount,
      cleanedRows: cleanedCount,
      removedRows: originalCount - cleanedCount,
      report,
      preview: rows.slice(0, 5),
    });
  } catch (err: any) {
    console.error('[Clean Error]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
