export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { question, datasetId, formId, context, history } = await request.json();
    if (!question) return NextResponse.json({ error: 'Question required' }, { status: 400 });

    let dataContext = '';

    // Load dataset context
    if (datasetId) {
      const ds = await prisma.dataset.findUnique({ where: { id: datasetId } });
      if (ds) {
        let rows: any[] = [];
        try { rows = JSON.parse(ds.data); } catch {}
        const cols = rows.length > 0 ? Object.keys(rows[0]) : [];
        const sample = rows.slice(0, 5);
        const stats = cols.map(col => {
          const vals = rows.map(r => r[col]).filter(v => v !== null && v !== undefined && v !== '');
          const nums = vals.map(Number).filter(n => !isNaN(n));
          if (nums.length / Math.max(vals.length, 1) > 0.75) {
            const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
            return `${col}: numeric, mean=${mean.toFixed(2)}, min=${Math.min(...nums)}, max=${Math.max(...nums)}`;
          } else {
            const freq: any = {};
            vals.forEach(v => { freq[String(v)] = (freq[String(v)] || 0) + 1; });
            const top = Object.entries(freq).sort((a: any, b: any) => b[1] - a[1]).slice(0, 3);
            return `${col}: categorical, top values: ${top.map(([v, c]) => `${v}(${c})`).join(', ')}`;
          }
        }).join('\n');
        dataContext = `Dataset: "${ds.filename}" — ${rows.length} rows, ${cols.length} columns\n\nColumn Stats:\n${stats}\n\nSample rows:\n${JSON.stringify(sample, null, 2)}`;
      }
    }

    // Load form context
    if (formId) {
      const form = await prisma.form.findUnique({
        where: { id: formId },
        include: { fields: true, submissions: { take: 100 } }
      });
      if (form) {
        const parsed = form.submissions.map(s => { try { return JSON.parse(s.data); } catch { return {}; } });
        const fieldStats = form.fields.map(f => {
          const answers = parsed.map(d => d[f.label]).filter(v => v !== undefined && v !== '');
          const freq: any = {};
          answers.forEach(a => { freq[String(a)] = (freq[String(a)] || 0) + 1; });
          const top = Object.entries(freq).sort((a: any, b: any) => b[1] - a[1]).slice(0, 3);
          return `"${f.label}" (${f.type}): ${answers.length} responses, top: ${top.map(([v, c]) => `${v}(${c})`).join(', ')}`;
        }).join('\n');
        dataContext = `Form: "${form.title}" — ${form.submissions.length} responses, ${form.fields.length} fields\n\nField Stats:\n${fieldStats}`;
      }
    }

    // Use pre-loaded context if provided
    if (context && !dataContext) {
      dataContext = `Current data context:\n${JSON.stringify(context, null, 2)}`;
    }

    const systemPrompt = `You are an expert data analyst AI assistant. You have access to the user's data and can answer questions about it.

Data Context:
${dataContext || 'No specific data loaded. Answer general data analysis questions.'}

Guidelines:
- Answer specifically based on the actual data
- Use numbers and statistics when relevant
- Be concise but complete
- If asked to calculate something, show the calculation
- If the question can't be answered from the data, say so clearly
- Use simple language, mix Hindi-English if needed`;

    // Build conversation history
    const messages = [
      ...(history || []).map((h: any) => ({ role: h.role, content: h.content })),
      { role: 'user', content: question }
    ];

    let answer = '';

    if (process.env.ANTHROPIC_API_KEY) {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-opus-4-5', max_tokens: 600, system: systemPrompt, messages })
      });
      const d = await r.json();
      answer = d.content?.[0]?.text || 'Sorry, could not generate response.';
    } else if (process.env.GEMINI_API_KEY) {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const fullPrompt = `${systemPrompt}\n\nConversation:\n${messages.map(m => `${m.role}: ${m.content}`).join('\n')}\n\nassistant:`;
      const rr = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: fullPrompt });
      answer = rr.text || '';
    } else {
      answer = 'No AI API key configured.';
    }

    return NextResponse.json({ answer });
  } catch (err: any) {
    console.error('[Chat Error]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
