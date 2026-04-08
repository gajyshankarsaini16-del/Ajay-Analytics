export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type ColType = 'numeric' | 'categorical';

function detectType(values: any[]): ColType {
  const nonEmpty = values.filter(v => v !== null && v !== undefined && v !== '');
  if (nonEmpty.length === 0) return 'categorical';
  const numericCount = nonEmpty.filter(v => !isNaN(Number(v)) && v !== '').length;
  return numericCount / nonEmpty.length >= 0.75 ? 'numeric' : 'categorical';
}

function numericStats(values: any[]) {
  const nums = values.map(Number).filter(n => !isNaN(n));
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const sum = nums.reduce((a, b) => a + b, 0);
  const mean = sum / nums.length;
  const median = sorted[Math.floor(sorted.length / 2)];
  const std = Math.sqrt(nums.reduce((acc, n) => acc + (n - mean) ** 2, 0) / nums.length);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const range = max - min || 1;
  const buckets = 10;
  const size = range / buckets;
  const histogram = Array.from({ length: buckets }, (_, i) => {
    const lo = min + i * size;
    const hi = lo + size;
    return {
      range: `${lo.toFixed(1)}–${hi.toFixed(1)}`,
      count: nums.filter(n => n >= lo && (i === buckets - 1 ? n <= hi : n < hi)).length,
    };
  }).filter(b => b.count > 0);
  return {
    count: nums.length,
    min: +sorted[0].toFixed(3),
    max: +sorted[sorted.length - 1].toFixed(3),
    mean: +mean.toFixed(3),
    median: +median.toFixed(3),
    std: +std.toFixed(3),
    histogram,
  };
}

function categoricalStats(values: any[]) {
  const counts: Record<string, number> = {};
  for (const v of values) {
    const k = String(v ?? '(empty)');
    counts[k] = (counts[k] || 0) + 1;
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return {
    count: values.length,
    uniqueCount: sorted.length,
    topValues: sorted.slice(0, 15).map(([name, value]) => ({ name, value })),
    missing: values.filter(v => v === null || v === undefined || v === '').length,
  };
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const dataset = await prisma.dataset.findUnique({ where: { id: params.id } });
    if (!dataset) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const rows = JSON.parse(dataset.data) as Record<string, any>[];
    if (!Array.isArray(rows) || rows.length === 0)
      return NextResponse.json({ error: 'Dataset is empty' }, { status: 400 });

    const colNames = Object.keys(rows[0]);
    const columns = colNames.map(name => {
      const values = rows.map(r => r[name]);
      const type = detectType(values);
      if (type === 'numeric') {
        return { name, type, ...numericStats(values) };
      } else {
        return { name, type, ...categoricalStats(values) };
      }
    });

    return NextResponse.json({
      id: dataset.id,
      filename: dataset.filename,
      uploadedAt: dataset.uploadedAt,
      rowCount: rows.length,
      columnCount: colNames.length,
      columns,
    });
  } catch (err) {
    console.error('Dataset analytics error', err);
    return NextResponse.json({ error: 'Failed to analyse dataset' }, { status: 500 });
  }
}
