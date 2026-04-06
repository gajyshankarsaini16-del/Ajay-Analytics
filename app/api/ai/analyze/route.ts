export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(request: Request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured in the .env file.' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const { context, type } = await request.json();

    let prompt = '';

    if (type === 'analytics') {
      prompt = `You are a senior data analyst for DataCore platform. Provide a concise, insightful executive summary based on these platform-wide metrics. Highlight key trends, anomalies, and actionable recommendations. Use bullet points for key takeaways:
${JSON.stringify(context, null, 2)}`;

    } else if (type === 'dataset') {
      prompt = `You are an expert data scientist. Analyze this uploaded dataset and provide:
1. **Dataset Overview** - What kind of data this appears to be
2. **Key Findings** - Most important patterns, distributions, outliers
3. **Column Insights** - Notable observations per column (especially numeric stats and categorical distributions)
4. **Data Quality** - Missing values, potential issues
5. **Recommendations** - Suggested next steps, analysis, or business actions

Dataset info:
${JSON.stringify(context, null, 2)}

Be specific, professional, and actionable. Use markdown formatting.`;

    } else if (type === 'form_report') {
      prompt = `You are a business intelligence analyst. Analyze this form's response data and provide:
1. **Response Summary** - Overall participation and completion rate
2. **Key Insights** - Most significant patterns in responses  
3. **Field Analysis** - Notable observations for each question
4. **Recommendations** - Actionable suggestions based on the data

Form Data:
${JSON.stringify(context, null, 2)}

Be professional and specific. Use markdown with bullet points.`;

    } else if (type === 'overall_report') {
      prompt = `You are a C-level business intelligence AI. Generate a comprehensive executive report for this data platform:
1. **Executive Summary** - High-level overview
2. **Platform Health** - Overall data quality and engagement metrics
3. **Form Performance** - Key findings from form submissions
4. **Dataset Insights** - Patterns from uploaded data
5. **Strategic Recommendations** - Top 3-5 actionable next steps

Platform Data:
${JSON.stringify(context, null, 2)}

Write in professional executive report style. Use clear sections and bullet points.`;

    } else if (type === 'report') {
      prompt = `You are a business intelligence AI. Review the following report data and provide a professional 2-3 paragraph summary with key takeaways as bullet points:
${JSON.stringify(context, null, 2)}`;

    } else {
      prompt = `Analyze this data and provide insights: ${JSON.stringify(context)}`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return NextResponse.json({ analysis: response.text });
  } catch (error: any) {
    console.error('[AI Analyze Error]', error);
    return NextResponse.json({ error: error.message || 'AI analysis failed' }, { status: 500 });
  }
}
