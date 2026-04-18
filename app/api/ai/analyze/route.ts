export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

async function callGemini(prompt: string) {
  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
  const r = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
  return r.text;
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
      model: 'claude-opus-4-5',
      max_tokens: 800,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!r.ok) throw new Error('Claude API failed');
  const d = await r.json();
  return d.content?.[0]?.text || '';
}

export async function POST(request: Request) {
  try {
    const { context, type } = await request.json();
    const useAnthropic = !!process.env.ANTHROPIC_API_KEY;

    let analysis = '';

    /* ── Question-level insight ── */
    if (type === 'question_insight') {
      const prompt = `You are a form analytics expert. In 2-3 sentences, give a clear, specific insight about this form question's responses. Be direct and actionable. Mention the most interesting pattern.

Question: "${context.label}" (type: ${context.type})
Total answers: ${context.totalAnswers}
Top answers: ${JSON.stringify(context.chartData?.slice(0,5))}

Write in simple English. Start with the key finding directly.`;

      analysis = useAnthropic
        ? await callClaude('You are a concise data analyst. Give specific, actionable insights in 2-3 sentences.', prompt)
        : await callGemini(prompt);
    }

    /* ── Column-level insight ── */
    else if (type === 'column_insight') {
      const prompt = `You are a data scientist. In 2-3 sentences, give a specific insight about this dataset column. Mention anomalies, patterns, or recommendations.

Column: "${context.name}" (type: ${context.type})
${context.type === 'numeric'
  ? `Min: ${context.min}, Max: ${context.max}, Mean: ${context.mean}, Median: ${context.median}, Std: ${context.std}`
  : `Unique values: ${context.uniqueCount}, Top values: ${JSON.stringify(context.topValues)}, Missing: ${context.missing}`}

Be specific. Start directly with the insight.`;

      analysis = useAnthropic
        ? await callClaude('You are a concise data scientist. Give specific column-level insights in 2-3 sentences.', prompt)
        : await callGemini(prompt);
    }

    /* ── Full form report ── */
    else if (type === 'form_report') {
      const prompt = `Analyze this form response data and provide a professional report:

## Key Findings
What are the 3 most important patterns in the responses? Be specific with numbers.

## Response Quality
Assess the completion rate and engagement quality.

## Recommendations
2-3 specific, actionable next steps based on the data.

Form Data: ${JSON.stringify(context, null, 2)}`;

      analysis = useAnthropic
        ? await callClaude('You are a business intelligence analyst specializing in form data. Be specific, use actual numbers, format with markdown.', prompt)
        : await callGemini(prompt);
    }

    /* ── Dataset report ── */
    else if (type === 'dataset') {
      const prompt = `Analyze this dataset and provide insights:

## Dataset Overview
What kind of data is this? What's its scale?

## Key Statistical Findings
Most important patterns, outliers, distributions (use actual numbers).

## Data Quality
Missing values, inconsistencies, issues.

## Recommendations
Top 3 actionable next steps based on this data.

Dataset: ${JSON.stringify(context, null, 2)}`;

      analysis = useAnthropic
        ? await callClaude('You are a senior data scientist. Be specific, use actual numbers, format with markdown.', prompt)
        : await callGemini(prompt);
    }

    /* ── Overall platform ── */
    else if (type === 'overall_report') {
      const prompt = `Generate an executive platform report:

## Executive Summary
2-3 sentence overview for stakeholders.

## Platform Health
Overall metrics assessment with specific numbers.

## Top Recommendations
3 prioritized action items.

Platform Data: ${JSON.stringify(context, null, 2)}`;

      analysis = useAnthropic
        ? await callClaude('You are a C-level business intelligence advisor. Be concise and data-driven.', prompt)
        : await callGemini(prompt);
    }

    /* ── Analytics summary ── */
    else if (type === 'analytics') {
      const prompt = `Analyze these platform metrics and give bullet-point insights:\n${JSON.stringify(context, null, 2)}`;
      analysis = useAnthropic
        ? await callClaude('You are an analytics consultant. Be concise and actionable.', prompt)
        : await callGemini(prompt);
    }

    /* ── Report ── */
    else if (type === 'report') {
      const prompt = `Review this report data and provide a 2-3 paragraph professional summary with key takeaways as bullet points:\n${JSON.stringify(context, null, 2)}`;
      analysis = useAnthropic
        ? await callClaude('You are a business intelligence AI. Format professionally with markdown.', prompt)
        : await callGemini(prompt);
    }

    /* ── Relation insight ── */
    else if (type === 'relation_insight') {
      const c = context;
      const relType = c.typeA==='numeric'&&c.typeB==='numeric' ? 'Numerical correlation (Pearson r)' 
                    : c.typeA==='categorical'&&c.typeB==='categorical' ? 'Categorical frequency distribution' 
                    : 'Category vs Numeric aggregation';
      const prompt = `You are a senior business data analyst. Analyze the relationship between "${c.colA}" (${c.typeA}) and "${c.colB}" (${c.typeB}).

Relationship Type: ${relType}
Dataset: ${c.rowCount} rows
${c.pearsonR!==undefined?`Pearson r = ${c.pearsonR} → ${c.strength} ${c.direction} correlation`:''}
${c.top?`Highest group: ${c.top.name} (avg ${c.colA||c.colB}: ${c.top.avg})`:''}
${c.bottom?`Lowest group: ${c.bottom.name} (avg: ${c.bottom.avg})`:''}
${c.catBValues?`Sub-categories: ${c.catBValues.join(', ')}`:''}
${c.uniqueA?`${c.colA}: ${c.uniqueA} unique values, ${c.colB}: ${c.uniqueB} unique values`:''}

Sample aggregated data:
${JSON.stringify(c.sampleData, null, 2)}

Output EXACTLY 5-6 bullet points. Rules:
- Each point must start with "- "
- Include specific numbers/percentages
- Be actionable and business-focused
- Max 25 words per bullet
- No headings, no extra explanation`;

      analysis = useAnthropic
        ? await callClaude('You are a concise data analyst. Output ONLY bullet points starting with "- ". No headers. No preamble.', prompt)
        : await callGemini(prompt);
    }

    else {
      const prompt = `Analyze this data and provide professional insights: ${JSON.stringify(context)}`;
      analysis = useAnthropic
        ? await callClaude('You are a data expert.', prompt)
        : await callGemini(prompt);
    }

    return NextResponse.json({ analysis });
  } catch (error: any) {
    console.error('[AI Analyze Error]', error);
    // Fallback to Gemini if Claude fails
    try {
      if (process.env.GEMINI_API_KEY) {
        const { context, type } = await request.clone().json();
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const r = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `Analyze this ${type} data and give insights: ${JSON.stringify(context)}`
        });
        return NextResponse.json({ analysis: r.text });
      }
    } catch {}
    return NextResponse.json({ error: error.message || 'AI analysis failed' }, { status: 500 });
  }
}
