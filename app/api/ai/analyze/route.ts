export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { context, type } = await request.json();

    let systemPrompt = '';
    let userPrompt = '';

    if (type === 'dataset') {
      systemPrompt = `You are a senior data scientist providing professional dataset analysis reports. 
Be specific, use actual numbers from the data, and provide actionable insights. 
Format with clear sections using markdown. Keep it concise but impactful.`;

      userPrompt = `Analyze this dataset and provide a professional report with:

## 1. Dataset Overview
What kind of data this is, its scale and structure.

## 2. Key Statistical Findings
Most important patterns, distributions, and outliers. Reference actual numbers.

## 3. Column-by-Column Insights
Notable observations for numeric stats and categorical distributions.

## 4. Data Quality Assessment
Missing values, inconsistencies, or data issues found.

## 5. Strategic Recommendations
- Top 3-5 specific, actionable next steps based on this data

Dataset:
${JSON.stringify(context, null, 2)}`;

    } else if (type === 'form_report') {
      systemPrompt = `You are a business intelligence analyst specializing in survey and form data analysis.
Provide clear, specific insights with actual numbers. Format professionally with markdown sections.`;

      userPrompt = `Analyze this form response data and provide:

## 1. Response Overview
Total participation, completion rate, and response quality assessment.

## 2. Key Insights
The 3-5 most significant patterns in the responses, with specific numbers.

## 3. Question-by-Question Analysis
Notable findings for each question, especially dominant answers and outliers.

## 4. Respondent Behavior
Patterns in how people answered, drop-off points, and engagement signals.

## 5. Recommendations
- Specific actions based on what the data reveals

Form Data:
${JSON.stringify(context, null, 2)}`;

    } else if (type === 'overall_report') {
      systemPrompt = `You are a C-level business intelligence advisor. Generate executive-grade reports 
that are clear, data-driven, and focus on business impact. Use markdown formatting.`;

      userPrompt = `Generate a comprehensive executive intelligence report:

## Executive Summary
2-3 sentence high-level overview for C-level stakeholders.

## Platform Health Score
Overall assessment of data quality and engagement metrics with specific numbers.

## Form Performance Analysis
Key findings from form submissions — what's working, what needs attention.

## Dataset Intelligence
Patterns and insights from uploaded data sources.

## Risk Flags
Any data quality issues, low engagement areas, or concerning trends.

## Top 5 Strategic Recommendations
Specific, prioritized action items with expected impact.

Platform Data:
${JSON.stringify(context, null, 2)}`;

    } else if (type === 'analytics') {
      systemPrompt = `You are a senior analytics consultant. Provide concise, actionable analysis.`;
      userPrompt = `Analyze these platform metrics and provide insights with bullet points for key takeaways:
${JSON.stringify(context, null, 2)}`;

    } else {
      systemPrompt = `You are a data analysis expert. Be specific and actionable.`;
      userPrompt = `Analyze this data and provide professional insights: ${JSON.stringify(context)}`;
    }

    // Call Claude API via Anthropic
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!response.ok) {
      // Fallback to Gemini if Claude key not set
      if (!process.env.ANTHROPIC_API_KEY && process.env.GEMINI_API_KEY) {
        return fallbackToGemini(userPrompt, process.env.GEMINI_API_KEY);
      }
      const err = await response.json();
      throw new Error(err.error?.message || 'Claude API failed');
    }

    const data = await response.json();
    const analysis = data.content?.[0]?.text || 'No analysis generated.';

    return NextResponse.json({ analysis });
  } catch (error: any) {
    console.error('[AI Analyze Error]', error);
    return NextResponse.json({ error: error.message || 'AI analysis failed' }, { status: 500 });
  }
}

async function fallbackToGemini(prompt: string, apiKey: string) {
  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return NextResponse.json({ analysis: response.text });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
