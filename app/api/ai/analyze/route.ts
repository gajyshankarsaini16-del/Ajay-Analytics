import { NextRequest, NextResponse } from "next/server";

// If using OpenAI SDK (recommended)
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    // Get file or text input
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

    // 🔥 AI Analysis Prompt
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

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a professional data analyst.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
    });

    const result = response.choices[0]?.message?.content;

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
