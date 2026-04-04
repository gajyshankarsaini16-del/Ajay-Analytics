export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const submissions = await prisma.formSubmission.findMany({ include: { form: true } });
    const datasets = await prisma.dataset.findMany();

    // Map to store entities by common identifiers (emails, etc.)
    const entityMap: Record<string, { 
      identifier: string, 
      sources: string[], 
      occurrences: number,
      dataPoints: number 
    }> = {};

    const fieldCompletion: Record<string, { label: string, total: number, filled: number }> = {};
    let totalFieldsMeasured = 0;
    let totalNonEmptyFields = 0;

    const findEmails = (text: string) => {
      const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
      return text.match(emailRegex);
    };

    // Process Form Submissions
    submissions.forEach((sub: any) => {
      const parsed = JSON.parse(sub.data);
      const emails = findEmails(sub.data);
      
      if (emails) {
        emails.forEach((email: string) => {
          const lowerEmail = email.toLowerCase();
          if (!entityMap[lowerEmail]) {
            entityMap[lowerEmail] = { identifier: lowerEmail, sources: [], occurrences: 0, dataPoints: 0 };
          }
          entityMap[lowerEmail].occurrences++;
          entityMap[lowerEmail].dataPoints += Object.keys(parsed).length;
          const sourceName = `Form: ${sub.form.title}`;
          if (!entityMap[lowerEmail].sources.includes(sourceName)) {
            entityMap[lowerEmail].sources.push(sourceName);
          }
        });
      }
    });

    // Process Datasets
    datasets.forEach((ds: any) => {
      const rows = JSON.parse(ds.data);
      if (Array.isArray(rows)) {
        rows.forEach((row: any) => {
          const rowStr = JSON.stringify(row);
          const emails = findEmails(rowStr);
          if (emails) {
            emails.forEach((email: string) => {
              const lowerEmail = email.toLowerCase();
              if (!entityMap[lowerEmail]) {
                entityMap[lowerEmail] = { identifier: lowerEmail, sources: [], occurrences: 0, dataPoints: 0 };
              }
              entityMap[lowerEmail].occurrences++;
              entityMap[lowerEmail].dataPoints += Object.keys(row).length;
              const sourceName = `File: ${ds.filename}`;
              if (!entityMap[lowerEmail].sources.includes(sourceName)) {
                entityMap[lowerEmail].sources.push(sourceName);
              }
            });
          }
        });
      }
    });

    // Filter for "High Value" entities (those found in multiple sources)
    const crossSourceEntities = Object.values(entityMap)
      .filter(entity => entity.sources.length > 1)
      .sort((a, b) => b.occurrences - a.occurrences)
      .slice(0, 10);

    // Calculate Data Health (Completeness)
    // Detailed analysis per field
    const processRecord = (data: any) => {
      Object.keys(data).forEach((k: string) => {
        if (!fieldCompletion[k]) fieldCompletion[k] = { label: k, total: 0, filled: 0 };
        fieldCompletion[k].total++;
        totalFieldsMeasured++;
        if (data[k] && data[k] !== "") {
          fieldCompletion[k].filled++;
          totalNonEmptyFields++;
        }
      });
    };

    submissions.forEach((sub: any) => {
      try {
        processRecord(JSON.parse(sub.data));
      } catch {}
    });

    datasets.forEach((ds: any) => {
      try {
        const rows = JSON.parse(ds.data);
        if (Array.isArray(rows)) {
          rows.forEach(row => processRecord(row));
        }
      } catch {}
    });

    const healthScore = totalFieldsMeasured > 0 
      ? Math.round((totalNonEmptyFields / totalFieldsMeasured) * 100) 
      : 100;

    // Source Distribution
    const sourceStats = {
      public: submissions.filter((s: any) => s.source === 'public').length,
      manual: submissions.filter((s: any) => s.source === 'manual').length,
      upload: datasets.length
    };

    return NextResponse.json({
      crossSourceEntities,
      healthScore,
      fieldAnalysis: Object.values(fieldCompletion).map(f => ({
        label: f.label,
        rate: Math.round((f.filled / f.total) * 100)
      })).sort((a, b) => a.rate - b.rate),
      sourceStats,
      totalRecords: submissions.length + datasets.reduce((sum: number, d: any) => sum + (d.rowCount || 0), 0)
    });

  } catch (error) {
    console.error('Failed to generate insights', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
