import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "",
});

function buildPrompt(type: string, context: any): string {
  switch (type) {
    case "column_insight":
      if (context.type === "numeric") {
        return `You are a data analyst. Analyze this numeric column and give exactly 4-5 bullet point insights.
Column: "${context.name}"
Stats: min=${context.min}, max=${context.max}, mean=${context.mean}, median=${context.median}, std=${context.std}
Rules:
- Start each bullet with "- "
- Include: range interpretation, spread/variability, outlier risk, business meaning
- Be specific with numbers
- No headers, no markdown bold, just plain bullet points`;
      } else if (context.dateColumn) {
        return `You are a data analyst. Analyze this date/time column and give exactly 4-5 bullet point insights.
Column: "${context.name}"
Unique dates: ${context.uniqueCount}, Missing: ${context.missing}
Sample values: ${(context.sample || []).join(", ")}
Rules:
- Start each bullet with "- "
- Include: date range, granularity, coverage, gaps, business meaning
- Be specific
- No headers, no markdown bold, just plain bullet points`;
      } else {
        return `You are a data analyst. Analyze this categorical column and give exactly 4-5 bullet point insights.
Column: "${context.name}"
Unique values: ${context.uniqueCount}, Missing: ${context.missing}
Top values: ${(context.topValues || []).slice(0, 8).map((v: any) => `${v.name}(${v.value})`).join(", ")}
Rules:
- Start each bullet with "- "
- Include: distribution, dominant categories, concentration, business meaning
- Be specific with numbers and percentages
- No headers, no markdown bold, just plain bullet points`;
      }

    case "relation_insight":
      const ctx = context;
      return `You are a data analyst. Analyze the relationship between two columns and give exactly 5-6 bullet point insights.
Column A: "${ctx.colA}" (${ctx.typeA})
Column B: "${ctx.colB}" (${ctx.typeB})
Relation type: ${ctx.typeA === "numeric" && ctx.typeB === "numeric" ? `Correlation (Pearson r = ${ctx.pearsonR}, ${ctx.strength} ${ctx.direction})` : "Group averages"}
Sample data: ${JSON.stringify(ctx.sampleData?.slice(0, 6))}
Row count: ${ctx.rowCount}
Rules:
- Start each bullet with "- "
- Include: pattern description, strongest/weakest group, anomalies, business action
- Be specific with the actual values from the data
- No headers, no markdown bold, just plain bullet points`;

    case "question_insight":
      return `You are a data analyst. Analyze this survey question and give a 2-3 sentence insight.
Question: "${context.label}" (type: ${context.type})
Total answers: ${context.totalAnswers}
Data: ${JSON.stringify(context.chartData?.slice(0, 10))}
Rules:
- Plain sentences, no bullets, no headers
- Include dominant answer, distribution pattern, actionable observation`;

    case "form_report":
      return `You are a data analyst. Analyze this form/survey data and give 6-7 bullet point insights.
Form: "${context.formTitle}"
Total submissions: ${context.totalSubmissions}
Questions: ${context.questions?.length}
Top questions by response: ${context.questions?.slice(0, 5).map((q: any) => `${q.label}(${q.totalAnswers})`).join(", ")}
Rules:
- Start each bullet with "- "
- Include: participation rate, popular questions, drop-off, patterns, recommendations
- Be specific
- No headers, no markdown bold`;

    case "dataset":
      return `You are a data analyst. Analyze this dataset overview and give 6-7 bullet point insights.
Dataset: "${context.filename}"
Rows: ${context.rowCount}, Columns: ${context.columnCount}
Column types: ${context.columns?.map((c: any) => `${c.name}(${c.type})`).join(", ")}
Numeric columns summary: ${context.columns?.filter((c: any) => c.type === "numeric").slice(0, 5).map((c: any) => `${c.name}: mean=${c.mean}, min=${c.min}, max=${c.max}`).join("; ")}
Rules:
- Start each bullet with "- "
- Include: data shape, numeric patterns, categorical diversity, data quality, business insights
- Be specific with actual column names and values
- No headers, no markdown bold`;

    default:
      return `Analyze the following data and provide 5 bullet point insights:\n${JSON.stringify(context)}`;
  }
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    let type = "general";
    let context: any = {};
    let content = "";

    // Handle both JSON and FormData
    if (contentType.includes("application/json")) {
      const body = await req.json();
      type = body.type || "general";
      context = body.context || body;
    } else {
      // Legacy formData support
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const textInput = formData.get("text") as string | null;
      if (file) {
        content = await file.text();
      } else if (textInput) {
        content = textInput;
      } else {
        return NextResponse.json({ error: "No input provided" }, { status: 400 });
      }
      type = "general";
      context = { content };
    }

    const prompt = type === "general" && content
      ? `You are an advanced data analyst AI. Analyze the following data and provide:\n1. Key Insights\n2. Trends\n3. Summary\n4. Anomalies\n\nData:\n${content}`
      : buildPrompt(type, context);

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });

    const result = response.text || "";

    return NextResponse.json({
      success: true,
      analysis: result,   // ← page.tsx reads d.analysis
      data: result,       // ← legacy compat
    });
  } catch (error: any) {
    console.error("AI Analyze Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Something went wrong", analysis: "" },
      { status: 500 }
    );
  }
}
