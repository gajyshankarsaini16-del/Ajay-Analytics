export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const formId = searchParams.get('formId');

  try {
    if (!formId) {
      // If no formId, just return a list of available forms to select
      const forms = await prisma.form.findMany({ select: { id: true, title: true } });
      return NextResponse.json({ forms });
    }

    const form = await prisma.form.findUnique({
      where: { id: formId },
      include: { fields: true }
    });

    if (!form) return NextResponse.json({ error: 'Form not found' }, { status: 404 });

    const submissions = await prisma.formSubmission.findMany({
      where: { formId }
    });

    // Map question statistics
    const questionStats = form.fields.map(field => {
      const stats: any = {
        fieldId: field.id,
        label: field.label,
        type: field.type,
        totalAnswers: 0,
        distribution: {} // For categorical
      };

      submissions.forEach(sub => {
        try {
          const parsedData = JSON.parse(sub.data);
          // Forms historically save key as the field label, not field.id
          const answer = parsedData[field.label] || parsedData[field.id];
          
          if (answer !== undefined && answer !== null && answer !== "") {
            stats.totalAnswers++;
            
            // For categorical properties (e.g. dropdown, multiple choice)
            if (['dropdown', 'multiple_choice', 'checkbox', 'rating'].includes(field.type)) {
              // Convert array answers (like checkbox) to single counts
              const values = Array.isArray(answer) ? answer : [answer];
              values.forEach(val => {
                const strVal = String(val);
                stats.distribution[strVal] = (stats.distribution[strVal] || 0) + 1;
              });
            }
          }
        } catch {}
      });

      // Format distribution into a recharts friendly array
      const chartData = Object.entries(stats.distribution).map(([name, value]) => ({
        name,
        value
      })).sort((a: any, b: any) => b.value - a.value); // Sort descending

      return {
        ...stats,
        chartData
      };
    });

    return NextResponse.json({
      formTitle: form.title,
      totalSubmissions: submissions.length,
      questions: questionStats
    });

  } catch (error: any) {
    console.error('[Questions Analytics Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
