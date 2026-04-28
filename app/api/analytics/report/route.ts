export const dynamic = 'force-dynamic';
export const maxDuration = 60;
import { NextResponse } from 'next/server';

// ── Context ko trim karo - sirf summary bhejo, poora JSON nahi ──
function trimContext(context: any, type: string): string {
  try {
    if (type === 'dataset') {
      const safe = {
        fileName: context.fileName || 'Dataset',
        rowCount: context.rowCount,
        columnCount: context.columnCount,
        dataQuality: context.dataQuality,
        columns: (context.columns || []).slice(0, 20).map((c: any) => ({
          name: c.name,
          type: c.type,
          missing: c.missing,
          unique: c.uniqueCount,
          ...(c.type === 'numeric' ? {
            mean: c.mean?.toFixed(2),
            min: c.min,
            max: c.max,
            std: c.std?.toFixed(2),
          } : {}),
          ...(c.type === 'categorical' ? {
            topValues: (c.topValues || []).slice(0, 5),
          } : {}),
        })),
        sampleRows: (context.sampleRows || context.rows || []).slice(0, 5),
      };
      return JSON.stringify(safe, null, 1);
    }
    if (type === 'form') {
      const safe = {
        formTitle: context.formTitle || context.title || 'Form',
        totalResponses: context.totalResponses || context.totalSubmissions,
        questions: (context.questions || []).slice(0, 15).map((q: any) => ({
          question: q.question || q.title,
          type: q.type,
          totalAnswers: q.totalAnswers,
          chartData: (q.chartData || q.options || []).slice(0, 8).map((d: any) => ({
            name: d.name || d.label,
            value: d.value || d.count,
            percentage: d.percentage,
          })),
        })),
      };
      return JSON.stringify(safe, null, 1);
    }
    const str = JSON.stringify(context, null, 1);
    return str.length > 8000 ? str.slice(0, 8000) + '\n... (truncated)' : str;
  } catch {
    return JSON.stringify(context).slice(0, 5000);
  }
}

// ── Gemini caller ──
async function callGemini(prompt: string) {
  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
  const r = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
  return r.text || '';
}

// ── Groq caller with retry + multi-key rotation ──
async function callGroq(system: string, user: string) {
  const keys = [
    process.env.GROQ_REPORT_API_KEY,
    process.env.GROQ_API_KEY,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3,
  ].filter(Boolean) as string[];

  if (keys.length === 0) throw new Error('No Groq key found');

  for (const key of keys) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45000);
      try {
        const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`,
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            max_tokens: 1500,
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: user },
            ],
          }),
        });
        clearTimeout(timeout);
        if (r.status === 429) {
          const waitMs = (attempt + 1) * 3000;
          console.warn(`[Groq] Rate limit, waiting ${waitMs}ms`);
          await new Promise(res => setTimeout(res, waitMs));
          continue;
        }
        if (!r.ok) throw new Error(`Groq error: ${r.status}`);
        const d = await r.json();
        return d.choices?.[0]?.message?.content || '';
      } catch (e: any) {
        clearTimeout(timeout);
        if (e.name === 'AbortError') throw new Error('Groq timeout');
        if (attempt === 2) throw e;
        await new Promise(res => setTimeout(res, 2000));
      }
    }
  }
  throw new Error('All Groq keys exhausted');
}

// ── Claude caller ──
async function callClaude(system: string, user: string) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY || '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 2000,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!r.ok) throw new Error(`Claude error: ${r.status}`);
  const d = await r.json();
  return d.content?.[0]?.text || '';
}

// ── Priority: Gemini → Groq → Claude ──
async function callAI(system: string, prompt: string): Promise<string> {
  if (process.env.GEMINI_API_KEY) {
    try { return await callGemini(`${system}\n\n${prompt}`); }
    catch (e) { console.error('[Gemini failed]', e); }
  }
  if (process.env.GROQ_API_KEY || process.env.GROQ_REPORT_API_KEY) {
    try { return await callGroq(system, prompt); }
    catch (e) { console.error('[Groq failed]', e); }
  }
  if (process.env.ANTHROPIC_API_KEY) {
    try { return await callClaude(system, prompt); }
    catch (e) { console.error('[Claude failed]', e); }
  }
  throw new Error('No AI API key configured.');
}

// ── POST /api/analytics/report ──
export async function POST(request: Request) {
  try {
    const { context, type } = await request.json();

    const SYSTEM = `You are a senior data analyst writing a professional analytics report.
Be specific, use actual numbers from the data, and provide actionable insights.
Format your response in clean markdown with proper headings.
Keep response concise and under 1200 words.`;

    // ✅ Context trim karo - 504 timeout fix
    const trimmedContext = trimContext(context, type);

    let prompt = '';

    if (type === 'dataset') {
      prompt = `Generate a professional analytics report for this dataset summary:

${trimmedContext}

Write these sections (keep each concise):

## Executive Summary
2-3 sentences: dataset scale, purpose, top finding.

## Dataset Overview
Records, columns, data types, data quality.

## Key Statistical Findings
Important numbers from numeric and categorical columns.

## Top Insights
6-8 numbered business insights with actual numbers.

## Correlations & Relationships
2-3 notable column relationships.

## Recommendations
4-5 actionable recommendations.

## Conclusion
1 paragraph summary and next steps.`;

    } else if (type === 'form') {
      prompt = `Generate a professional analytics report for this form data:

${trimmedContext}

Write these sections (keep each concise):

## Executive Summary
Form purpose, total responses, top finding.

## Response Overview
Submissions, completion rate, response quality.

## Question-by-Question Analysis
Each question: what asked, dominant answer, meaning. Use percentages.

## Key Patterns & Trends
Cross-question patterns and surprising findings.

## Recommendations
4-5 specific actions from response data.

## Conclusion
Summary and next steps.`;

    } else {
      prompt = `Analyze this data and write a concise professional report:\n${trimmedContext}`;
    }

    const report = await callAI(SYSTEM, prompt);
    return NextResponse.json({ report });

  } catch (error: any) {
    console.error('[Report API Error]', error);
    return NextResponse.json(
      { error: error.message || 'Report generation failed' },
      { status: 500 }
    );
  }
}
