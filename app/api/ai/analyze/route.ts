import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "",
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const file = formData.get("file") as File | null;
    const textInput = formData.get("text") as string | null;

    let content = "";

    if (file) {
      const fileText = await file.text();
      content = fileText;
    } else if (textInput) {
      content = textInput;
    } else {
      return NextResponse.json(
        { error: "No input provided" },
        { status: 400 }
      );
    }

    const prompt = `
You are an advanced data analyst AI.

Analyze the following data and provide:
1. Key Insights (important points only)
2. Trends
3. Summary (short)
4. Any anomalies

Data:
${content}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `You are a professional data analyst.\n\n${prompt}`,
    });

    const result = response.text;

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("AI Analyze Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Something went wrong",
      },
      { status: 500 }
    );
  }
}
