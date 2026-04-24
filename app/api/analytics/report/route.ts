export const dynamic = 'force-dynamic';
export const maxDuration = 60;
import { NextResponse } from 'next/server';

// ── Smart AI caller (same pattern as your existing analyze/route.ts) ──
async function callGroq(system: string, user: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 50000);
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    signal: controller.signal,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_REPORT_API_KEY || process.env.GROQ_API_KEY}`,
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
  if (!r.ok) throw new Error(`Groq error: ${r.status}`);
  const d = await r.json();
  return d.choices?.[0]?.message?.content || '';
}

async function callGemini(prompt: string) {
  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
  const r = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
  return r.text || '';
}

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

async function callAI(system: string, prompt: string): Promise<string> {
  if (process.env.GROQ_API_KEY) {
    try { return await callGroq(system, prompt); } catch (e) { console.error('[Groq]', e); }
  }
  if (process.env.GEMINI_API_KEY) {
    try { return await callGemini(`${system}\n\n${prompt}`); } catch (e) { console.error('[Gemini]', e); }
  }
  if (process.env.GROQ_REPORT_API_KEY || process.env.GROQ_API_KEY) {
    try { return await callClaude(system, prompt); } catch (e) { console.error('[Claude]', e); }
  }
  throw new Error('No AI API key configured.');
}

// ── POST /api/analytics/report ──
// Body: { context: any, type: 'dataset' | 'form' }
export async function POST(request: Request) {
  try {
    const { context, type } = await request.json();

    const SYSTEM = `You are a senior data analyst writing a professional analytics report.
Be specific, use actual numbers from the data, and provide actionable insights.
Format your response in clean markdown with proper headings.`;

    let prompt = '';

    if (type === 'dataset') {
      prompt = `
Generate a complete professional analytics report for this dataset.

Dataset: ${JSON.stringify(context, null, 2)}

Write the following sections:

## Executive Summary
2-3 sentences covering dataset scale, key purpose, and most important finding.

## Dataset Overview
- Total records, columns, data types breakdown
- Data quality assessment (missing values, outliers)

## Key Statistical Findings
Use actual numbers. Cover each numeric column's mean, range, and notable patterns.
Cover each categorical column's distribution and dominant values.

## Top Insights
Numbered list of 6-8 most important business insights drawn from the data.
Be specific — include numbers, percentages, comparisons.

## Correlations & Relationships
Highlight 2-3 notable relationships between columns and what they imply.

## Recommendations
4-5 specific, actionable recommendations based on the data findings.

## Conclusion
1 paragraph summarizing the overall picture and next steps.
`;
    } else if (type === 'form') {
      prompt = `
Generate a complete professional analytics report for this form response data.

Form Data: ${JSON.stringify(context, null, 2)}

Write the following sections:

## Executive Summary
Overview of form purpose, total responses, and top-level finding.

## Response Overview
- Total submissions, completion rate, most/least answered questions
- Response quality assessment

## Question-by-Question Analysis
For each question: what was asked, what the dominant answer was, and what it means.
Use actual percentages and counts.

## Key Patterns & Trends
What patterns emerge across questions? Any surprising findings?

## Recommendations
4-5 specific actions based on the response data.

## Conclusion
Summary and next steps.
`;
    } else {
      prompt = `Analyze this data and write a full professional report:\n${JSON.stringify(context, null, 2)}`;
    }

    const report = await callAI(SYSTEM, prompt);

    return NextResponse.json({ report });
  } catch (error: any) {
    console.error('[Report API Error]', error);
    return NextResponse.json({ error: error.message || 'Report generation failed' }, { status: 500 });
  }
}
