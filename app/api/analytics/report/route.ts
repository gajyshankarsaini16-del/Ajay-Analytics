export const dynamic = 'force-dynamic';
export const maxDuration = 60;
import { NextResponse } from 'next/server';

// ── Groq caller with retry on rate limit ──
async function callGroq(system: string, user: string) {
  // Multiple keys support - rotate karo
  const keys = [
    process.env.GROQ_REPORT_API_KEY,
    process.env.GROQ_API_KEY,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3,
  ].filter(Boolean) as string[];

  if (keys.length === 0) throw new Error('No Groq key found');

  // Har key try karo
  for (const key of keys) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 50000);
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

        // Rate limit aaya - wait karke next attempt
        if (r.status === 429) {
          const waitMs = (attempt + 1) * 3000; // 3s, 6s, 9s
          console.warn(`[Groq] Rate limit on key ...${key.slice(-4)}, waiting ${waitMs}ms`);
          await new Promise(res => setTimeout(res, waitMs));
          continue;
        }

        if (!r.ok) throw new Error(`Groq error: ${r.status}`);
        const d = await r.json();
        return d.choices?.[0]?.message?.content || '';

      } catch (e: any) {
        clearTimeout(timeout);
        if (e.name === 'AbortError') throw new Error('Groq timeout');
        if (attempt === 2) throw e; // Last attempt failed
        await new Promise(res => setTimeout(res, 2000));
      }
    }
  }
  throw new Error('All Groq keys exhausted');
}

// ── Gemini caller ──
async function callGemini(prompt: string) {
  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
  const r = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
  return r.text || '';
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

// ── Smart AI caller: Gemini PEHLE (zyada limit), phir Groq, phir Claude ──
async function callAI(system: string, prompt: string): Promise<string> {
  // 1. Gemini pehle try karo - 1M tokens/day free, bade data ke liye best
  if (process.env.GEMINI_API_KEY) {
    try { return await callGemini(`${system}\n\n${prompt}`); }
    catch (e) { console.error('[Gemini failed, trying Groq]', e); }
  }
  // 2. Groq fallback - retry + multi-key support ke saath
  if (process.env.GROQ_API_KEY || process.env.GROQ_REPORT_API_KEY) {
    try { return await callGroq(system, prompt); }
    catch (e) { console.error('[Groq failed, trying Claude]', e); }
  }
  // 3. Claude last resort
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
