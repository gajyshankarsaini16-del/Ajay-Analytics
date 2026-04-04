export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(request: Request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured in the .env file.' }, 
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const { context, type } = await request.json();

    let prompt = "";
    if (type === "analytics") {
      prompt = `You are a data analyst for the DataCore platform. Please provide a concise, insightful executive summary based on the following metrics. Do not repeat the raw data, but highlight interesting inferences and actionable insights:
${JSON.stringify(context, null, 2)}`;
    } else if (type === "report") {
      prompt = `You are a business intelligence AI. Review the following generated report data:
${JSON.stringify(context, null, 2)}
Provide a professional, 2-3 paragraph AI generated summary suitable for a PDF export. Include markdown bullet points for key takeaways.`;
    } else {
      prompt = `Analyze this data: ${JSON.stringify(context)}`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return NextResponse.json({ analysis: response.text });
  } catch (error: any) {
    console.error('[AI Analyze Error]', error);
    return NextResponse.json({ error: error.message || 'An error occurred during AI analysis' }, { status: 500 });
  }
}
