'use client';

import { useState, useEffect, useRef } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, AreaChart, Area, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, ScatterChart, Scatter
} from 'recharts';
import {
  ClipboardList, Upload, ChevronRight, BarChart2, FileText,
  Loader2, Sparkles, RefreshCw, TrendingUp, TrendingDown,
  AlertCircle, CheckCircle, ChevronDown, ChevronUp, Send,
  Bot, User, X, MessageSquare, Lightbulb, Target, Database,
  Activity, Zap, ArrowUpRight, ArrowDownRight, Filter
} from 'lucide-react';

/* ─── Design Tokens ───────────────────────────────────── */
const T = {
  bg:       '#0a0e1a',
  surface:  '#111827',
  card:     '#151e2d',
  border:   'rgba(255,255,255,0.07)',
  accent:   '#2563eb',
  accent2:  '#7c3aed',
  green:    '#10b981',
  amber:    '#f59e0b',
  red:      '#ef4444',
  cyan:     '#06b6d4',
  pink:     '#ec4899',
  text:     '#f1f5f9',
  muted:    'rgba(241,245,249,0.45)',
  dimmed:   'rgba(241,245,249,0.2)',
};

const CHART_COLORS = ['#2563eb','#7c3aed','#10b981','#f59e0b','#ec4899','#06b6d4','#f97316','#84cc16'];

/* ─── Mini Components ─────────────────────────────────── */
const Card = ({ children, style }: any) => (
  <div style={{
    background: T.card,
    border: `1px solid ${T.border}`,
    borderRadius: 16,
    padding: '1.5rem',
    ...style
  }}>{children}</div>
);

const Chip = ({ label, color = T.accent }: any) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem',
    fontWeight: 600, background: `${color}22`, border: `1px solid ${color}44`,
    color, letterSpacing: '0.04em'
  }}>{label}</span>
);

const KPICard = ({ label, value, delta, color = T.accent, icon: Icon }: any) => {
  const pos = delta > 0;
  return (
    <div style={{
      background: `linear-gradient(135deg, ${T.card}, ${T.surface})`,
      border: `1px solid ${T.border}`,
      borderRadius: 14,
      padding: '1.25rem 1.5rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, right: 0, width: 80, height: 80,
        background: `radial-gradient(circle at 80% 20%, ${color}18, transparent 70%)`,
        pointerEvents: 'none'
      }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <p style={{ margin: 0, fontSize: '0.72rem', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>
        {Icon && <div style={{ padding: 6, borderRadius: 8, background: `${color}18` }}><Icon size={14} color={color} /></div>}
      </div>
      <p style={{ margin: 0, fontSize: '1.9rem', fontWeight: 800, color: T.text, lineHeight: 1 }}>{value}</p>
      {delta !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8 }}>
          {pos ? <ArrowUpRight size={13} color={T.green} /> : <ArrowDownRight size={13} color={T.red} />}
          <span style={{ fontSize: '0.75rem', color: pos ? T.green : T.red, fontWeight: 600 }}>
            {pos ? '+' : ''}{delta}% vs last period
          </span>
        </div>
      )}
    </div>
  );
};

/* ─── Custom Tooltip ──────────────────────────────────── */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#1e2a3a', border: `1px solid ${T.border}`,
      borderRadius: 10, padding: '10px 14px', fontSize: '0.82rem',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
    }}>
      <p style={{ margin: '0 0 6px', color: T.muted, fontWeight: 600 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ margin: '2px 0', color: p.color || T.text }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
};

/* ─── AI Chat Panel ───────────────────────────────────── */
function AIChatPanel({ isOpen, onClose, contextData, dataType, dataId }: any) {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([
    { role: 'ai', text: '👋 Hi! I\'m your **Analytics Copilot**. Ask me anything about this data — patterns, insights, recommendations, or specific questions.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const q = input.trim();
    setInput('');
    setMessages(m => [...m, { role: 'user', text: q }]);
    setLoading(true);
    try {
      const res = await fetch('/api/ai/analyze/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          datasetId: dataType === 'dataset' ? dataId : undefined,
          formId: dataType === 'form' ? dataId : undefined,
          context: contextData,
          history: messages.map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text }))
        })
      });
      const d = await res.json();
      setMessages(m => [...m, { role: 'ai', text: d.answer || d.error || 'No response.' }]);
    } catch {
      setMessages(m => [...m, { role: 'ai', text: 'Connection error. Please try again.' }]);
    }
    setLoading(false);
  };

  const suggestions = [
    'What are the key trends?',
    'Show me top patterns',
    'Any anomalies or outliers?',
    'Give me 3 recommendations',
  ];

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', right: 0, top: 0, bottom: 0, width: 400,
      background: T.surface, borderLeft: `1px solid ${T.border}`,
      display: 'flex', flexDirection: 'column', zIndex: 1000,
      boxShadow: '-8px 0 40px rgba(0,0,0,0.5)',
    }}>
      {/* Header */}
      <div style={{
        padding: '1rem 1.25rem',
        borderBottom: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: `linear-gradient(135deg, ${T.card}, ${T.surface})`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: `linear-gradient(135deg, ${T.accent}, ${T.accent2})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Bot size={18} color="#fff" />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: T.text }}>Analytics Copilot</p>
            <p style={{ margin: 0, fontSize: '0.7rem', color: T.green }}>● Agentic AI Active</p>
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', padding: 4 }}>
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
              background: m.role === 'ai' ? `linear-gradient(135deg, ${T.accent}, ${T.accent2})` : T.card,
              border: m.role === 'user' ? `1px solid ${T.border}` : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {m.role === 'ai' ? <Bot size={14} color="#fff" /> : <User size={14} color={T.muted} />}
            </div>
            <div style={{
              maxWidth: '80%',
              padding: '10px 14px',
              borderRadius: m.role === 'ai' ? '4px 14px 14px 14px' : '14px 4px 14px 14px',
              background: m.role === 'ai' ? T.card : `linear-gradient(135deg, ${T.accent}cc, ${T.accent2}cc)`,
              border: `1px solid ${m.role === 'ai' ? T.border : 'transparent'}`,
              fontSize: '0.85rem', color: T.text, lineHeight: 1.65,
              whiteSpace: 'pre-wrap',
            }}>
              {m.text.replace(/\*\*/g, '')}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: `linear-gradient(135deg, ${T.accent}, ${T.accent2})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bot size={14} color="#fff" />
            </div>
            <div style={{ padding: '10px 14px', borderRadius: '4px 14px 14px 14px', background: T.card, border: `1px solid ${T.border}` }}>
              <Loader2 size={14} color={T.accent} style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 2 && (
        <div style={{ padding: '0 1rem 0.5rem', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {suggestions.map(s => (
            <button key={s} onClick={() => { setInput(s); }}
              style={{
                padding: '5px 10px', borderRadius: 20, fontSize: '0.72rem',
                background: `${T.accent}18`, border: `1px solid ${T.accent}33`,
                color: T.accent, cursor: 'pointer', fontWeight: 500,
              }}>{s}</button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ padding: '0.75rem 1rem 1rem', borderTop: `1px solid ${T.border}` }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Ask about your data..."
            style={{
              flex: 1, padding: '10px 14px',
              background: T.card, border: `1px solid ${T.border}`,
              borderRadius: 10, color: T.text, fontSize: '0.875rem',
              outline: 'none',
            }}
          />
          <button onClick={send} disabled={loading || !input.trim()}
            style={{
              width: 38, height: 38, borderRadius: 10,
              background: `linear-gradient(135deg, ${T.accent}, ${T.accent2})`,
              border: 'none', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: loading || !input.trim() ? 0.5 : 1,
            }}>
            <Send size={15} color="#fff" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Bullet Insights Box ─────────────────────────────── */
function InsightsBox({ insights }: { insights: string[] }) {
  if (!insights.length) return null;
  return (
    <Card style={{ background: `linear-gradient(135deg, #0f1f3d, #1a1040)`, border: `1px solid ${T.accent}33` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
        <div style={{ padding: 6, borderRadius: 8, background: `${T.accent}22` }}>
          <Lightbulb size={15} color={T.accent} />
        </div>
        <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Key Insights
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {insights.map((insight, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{
              width: 20, height: 20, borderRadius: 6, background: `${CHART_COLORS[i % CHART_COLORS.length]}22`,
              border: `1px solid ${CHART_COLORS[i % CHART_COLORS.length]}44`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.65rem', fontWeight: 800, color: CHART_COLORS[i % CHART_COLORS.length],
              flexShrink: 0, marginTop: 1
            }}>{String(i + 1).padStart(2, '0')}</div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(241,245,249,0.85)', lineHeight: 1.6 }}>{insight}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ─── Form Analysis View ──────────────────────────────── */
function FormAnalysis({ formData, formId }: { formData: any; formId: string }) {
  const [aiInsights, setAiInsights] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const generateInsights = async () => {
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'form_report', context: formData })
      });
      const d = await res.json();
      if (d.analysis) {
        // Extract bullet points
        const lines = d.analysis.split('\n')
          .filter((l: string) => l.trim().match(/^[-•*]|^\d+\.|^##/))
          .map((l: string) => l.replace(/^[-•*#\d.]+\s*/, '').replace(/\*\*/g, '').trim())
          .filter((l: string) => l.length > 10)
          .slice(0, 6);
        setAiInsights(lines.length > 0 ? lines : [d.analysis.split('\n')[0]]);
      }
    } catch {}
    setAiLoading(false);
  };

  if (!formData) return null;

  const { formTitle, totalSubmissions, questions = [] } = formData;
  const answeredFields = questions.filter((q: any) => q.totalAnswers > 0).length;
  const completionRate = questions.length > 0 ? Math.round((answeredFields / questions.length) * 100) : 0;
  const topQuestion = [...questions].sort((a: any, b: any) => b.totalAnswers - a.totalAnswers)[0];

  // Build radar data from top categorical questions
  const catQuestions = questions.filter((q: any) => q.chartData?.length > 0).slice(0, 6);
  const radarData = catQuestions.map((q: any) => ({
    subject: q.label.substring(0, 18) + (q.label.length > 18 ? '…' : ''),
    value: q.totalAnswers,
    fullMark: totalSubmissions,
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Header bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '1rem'
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: T.text }}>{formTitle}</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: T.muted }}>Form Analysis Dashboard</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={generateInsights} disabled={aiLoading}
            style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px',
              background: aiLoading ? T.card : `linear-gradient(135deg, ${T.accent}, ${T.accent2})`,
              border: `1px solid ${aiLoading ? T.border : 'transparent'}`,
              borderRadius: 10, color: '#fff', cursor: aiLoading ? 'not-allowed' : 'pointer',
              fontSize: '0.82rem', fontWeight: 700,
            }}>
            {aiLoading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={14} />}
            {aiLoading ? 'Analyzing…' : aiInsights.length ? 'Refresh Insights' : 'Generate Insights'}
          </button>
          <button onClick={() => setChatOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px',
              background: `${T.cyan}18`, border: `1px solid ${T.cyan}44`,
              borderRadius: 10, color: T.cyan, cursor: 'pointer',
              fontSize: '0.82rem', fontWeight: 700,
            }}>
            <MessageSquare size={14} /> AI Insights
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem' }}>
        <KPICard label="Total Responses" value={totalSubmissions} icon={Activity} color={T.accent} />
        <KPICard label="Questions" value={questions.length} icon={ClipboardList} color={T.accent2} />
        <KPICard label="Completion Rate" value={`${completionRate}%`} icon={Target} color={T.green}
          delta={completionRate >= 70 ? 12 : -8} />
        <KPICard label="Most Active Field" value={topQuestion?.totalAnswers || 0} icon={BarChart2} color={T.amber} />
      </div>

      {/* Insights box */}
      {aiInsights.length > 0 && <InsightsBox insights={aiInsights} />}

      {/* Charts grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>

        {/* Response Distribution - Radar */}
        {radarData.length >= 3 && mounted && (
          <Card>
            <p style={{ margin: '0 0 1rem', fontSize: '0.82rem', fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Field Response Distribution
            </p>
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={radarData}>
                <PolarGrid stroke={T.border} />
                <PolarAngleAxis dataKey="subject" tick={{ fill: T.muted, fontSize: 11 }} />
                <Radar name="Responses" dataKey="value" stroke={T.accent} fill={T.accent} fillOpacity={0.25} strokeWidth={2} />
                <Tooltip content={<CustomTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Response over time (if submissions have dates) */}
        {mounted && (
          <Card>
            <p style={{ margin: '0 0 1rem', fontSize: '0.82rem', fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Completion Rate by Field
            </p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={questions.slice(0, 10).map((q: any) => ({
                  name: q.label.substring(0, 14) + (q.label.length > 14 ? '…' : ''),
                  responses: q.totalAnswers,
                  rate: totalSubmissions > 0 ? Math.round((q.totalAnswers / totalSubmissions) * 100) : 0,
                }))}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" stroke={T.border} horizontal={false} />
                <XAxis type="number" stroke={T.dimmed} fontSize={11} />
                <YAxis type="category" dataKey="name" stroke={T.dimmed} fontSize={10} width={110} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="responses" fill={T.accent} radius={[0, 6, 6, 0]}>
                  {questions.slice(0, 10).map((_: any, i: number) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>

      {/* Per-question charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
        {questions.filter((q: any) => q.chartData?.length > 0).map((q: any, qi: number) => (
          <Card key={q.fieldId}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <p style={{ margin: 0, fontSize: '0.68rem', color: T.dimmed, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Q{qi + 1} · {q.type}
                </p>
                <p style={{ margin: '4px 0 0', fontSize: '0.92rem', fontWeight: 700, color: T.text, lineHeight: 1.3 }}>{q.label}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: CHART_COLORS[qi % CHART_COLORS.length] }}>{q.totalAnswers}</p>
                <p style={{ margin: 0, fontSize: '0.65rem', color: T.dimmed }}>responses</p>
              </div>
            </div>
            {mounted && (
              <div style={{ display: 'grid', gridTemplateColumns: q.chartData.length <= 5 ? '1fr 1fr' : '1fr', gap: '0.75rem' }}>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={q.chartData.slice(0, 8)}>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
                    <XAxis dataKey="name" stroke={T.dimmed} fontSize={10} />
                    <YAxis stroke={T.dimmed} fontSize={10} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" radius={[5, 5, 0, 0]}>
                      {q.chartData.slice(0, 8).map((_: any, i: number) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                {q.chartData.length <= 5 && (
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={q.chartData.slice(0, 5)} dataKey="value" nameKey="name" innerRadius={40} outerRadius={65} paddingAngle={3}>
                        {q.chartData.slice(0, 5).map((_: any, i: number) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend formatter={(v: any) => <span style={{ color: T.muted, fontSize: '0.72rem' }}>{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* AI Chat panel */}
      <AIChatPanel
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        contextData={formData}
        dataType="form"
        dataId={formId}
      />
    </div>
  );
}

/* ─── Upload Analysis View ────────────────────────────── */
function UploadAnalysis({ dsData, dsId }: { dsData: any; dsId: string }) {
  const [aiInsights, setAiInsights] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [expandedCol, setExpandedCol] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [corrA, setCorrA] = useState('');
  const [corrB, setCorrB] = useState('');

  useEffect(() => { setMounted(true); }, []);

  const generateInsights = async () => {
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'dataset', context: dsData })
      });
      const d = await res.json();
      if (d.analysis) {
        const lines = d.analysis.split('\n')
          .filter((l: string) => l.trim().match(/^[-•*]|^\d+\.|^##/))
          .map((l: string) => l.replace(/^[-•*#\d.]+\s*/, '').replace(/\*\*/g, '').trim())
          .filter((l: string) => l.length > 10)
          .slice(0, 6);
        setAiInsights(lines.length > 0 ? lines : [d.analysis.split('\n')[0]]);
      }
    } catch {}
    setAiLoading(false);
  };

  if (!dsData) return null;

  const { filename, rowCount, columnCount, columns = [] } = dsData;
  const numCols = columns.filter((c: any) => c.type === 'numeric');
  const catCols = columns.filter((c: any) => c.type === 'categorical');
  const phoneCols = columns.filter((c: any) => c.type === 'phone');
  const emailCols = columns.filter((c: any) => c.type === 'email');
  const tsCols = columns.filter((c: any) => c.type === 'timestamp');
  const nullHeavy = columns.filter((c: any) => (c.missing / rowCount) > 0.2).length;
  const dataQuality = Math.round((1 - nullHeavy / Math.max(columnCount, 1)) * 100);

  // Numeric summary for area chart
  const numericSummary = numCols.slice(0, 6).map((c: any) => ({
    name: c.name.substring(0, 12),
    min: c.min, max: c.max, mean: c.mean
  }));

  // Column type breakdown for pie
  const typePie = [
    { name: 'Numeric', value: numCols.length },
    { name: 'Categorical', value: catCols.length },
    { name: 'Phone', value: phoneCols.length },
    { name: 'Email', value: emailCols.length },
    { name: 'Date', value: tsCols.length },
  ].filter(t => t.value > 0);

  const getBadge = (type: string) => {
    const map: any = {
      numeric: { bg: '#10b98122', color: T.green, label: '123' },
      categorical: { bg: '#f59e0b22', color: T.amber, label: 'ABC' },
      timestamp: { bg: '#6366f122', color: '#a5b4fc', label: '📅' },
      phone: { bg: '#f59e0b22', color: T.amber, label: '📞' },
      email: { bg: '#06b6d422', color: T.cyan, label: '✉️' },
    };
    return map[type] || map.categorical;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: T.text }}>{filename}</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: T.muted }}>Dataset Analysis Dashboard</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={generateInsights} disabled={aiLoading}
            style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px',
              background: aiLoading ? T.card : `linear-gradient(135deg, ${T.accent}, ${T.accent2})`,
              border: `1px solid ${aiLoading ? T.border : 'transparent'}`,
              borderRadius: 10, color: '#fff', cursor: aiLoading ? 'not-allowed' : 'pointer',
              fontSize: '0.82rem', fontWeight: 700,
            }}>
            {aiLoading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={14} />}
            {aiLoading ? 'Analyzing…' : aiInsights.length ? 'Refresh Insights' : 'Generate Insights'}
          </button>
          <button onClick={() => setChatOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px',
              background: `${T.cyan}18`, border: `1px solid ${T.cyan}44`,
              borderRadius: 10, color: T.cyan, cursor: 'pointer',
              fontSize: '0.82rem', fontWeight: 700,
            }}>
            <MessageSquare size={14} /> AI Insights
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem' }}>
        <KPICard label="Total Rows" value={rowCount?.toLocaleString()} icon={Database} color={T.accent} />
        <KPICard label="Columns" value={columnCount} icon={Filter} color={T.accent2} />
        <KPICard label="Data Quality" value={`${dataQuality}%`} icon={CheckCircle} color={dataQuality >= 80 ? T.green : T.amber}
          delta={dataQuality >= 80 ? 5 : -10} />
        <KPICard label="Numeric Cols" value={numCols.length} icon={Activity} color={T.cyan} />
      </div>

      {/* Insights */}
      {aiInsights.length > 0 && <InsightsBox insights={aiInsights} />}

      {/* Overview charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>

        {/* Column type breakdown */}
        {mounted && typePie.length > 0 && (
          <Card>
            <p style={{ margin: '0 0 1rem', fontSize: '0.82rem', fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Column Type Breakdown
            </p>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={typePie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={4}>
                  {typePie.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend formatter={(v: any) => <span style={{ color: T.muted, fontSize: '0.75rem' }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Numeric range overview */}
        {mounted && numericSummary.length > 0 && (
          <Card>
            <p style={{ margin: '0 0 1rem', fontSize: '0.82rem', fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Numeric Column Ranges
            </p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={numericSummary}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
                <XAxis dataKey="name" stroke={T.dimmed} fontSize={10} />
                <YAxis stroke={T.dimmed} fontSize={10} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="min" fill={T.accent2} radius={[4, 4, 0, 0]} name="Min" />
                <Bar dataKey="mean" fill={T.accent} radius={[4, 4, 0, 0]} name="Mean" />
                <Bar dataKey="max" fill={T.cyan} radius={[4, 4, 0, 0]} name="Max" />
                <Legend formatter={(v: any) => <span style={{ color: T.muted, fontSize: '0.75rem' }}>{v}</span>} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>

      {/* Column Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Column Details
        </p>
        {columns.map((col: any, idx: number) => {
          const isExp = expandedCol === col.name;
          const badge = getBadge(col.type);
          return (
            <Card key={col.name} style={{ padding: '1rem 1.25rem' }}>
              <button onClick={() => setExpandedCol(isExp ? null : col.name)}
                style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: '0.65rem', padding: '3px 9px', borderRadius: 8, fontWeight: 700, background: badge.bg, color: badge.color }}>
                    {badge.label}
                  </span>
                  <span style={{ color: T.text, fontWeight: 700, fontSize: '0.95rem' }}>{col.name}</span>
                  <Chip label={col.type} color={badge.color} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: '0.78rem', color: T.muted }}>
                    {col.type === 'numeric'
                      ? `avg: ${col.mean} · range: ${col.min}–${col.max}`
                      : col.type === 'phone' ? `${col.validPhones} valid`
                      : col.type === 'email' ? `${col.validEmails} valid`
                      : `${col.uniqueCount} unique`}
                  </span>
                  {isExp ? <ChevronUp size={15} color={T.dimmed} /> : <ChevronDown size={15} color={T.dimmed} />}
                </div>
              </button>

              {isExp && mounted && (
                <div style={{ marginTop: '1.25rem', borderTop: `1px solid ${T.border}`, paddingTop: '1.25rem' }}>

                  {/* NUMERIC */}
                  {col.type === 'numeric' && (<>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                      {[['Min', col.min, T.accent2], ['Max', col.max, T.pink], ['Mean', col.mean, T.green], ['Median', col.median, T.amber], ['Std Dev', col.std, '#a5b4fc']].map(([l, v, c]: any) => (
                        <div key={l} style={{ background: `${c}11`, borderRadius: 10, padding: '0.75rem', border: `1px solid ${c}22` }}>
                          <p style={{ margin: 0, fontSize: '0.65rem', color: T.muted }}>{l}</p>
                          <p style={{ margin: '4px 0 0', fontSize: '1.1rem', fontWeight: 800, color: c }}>{v}</p>
                        </div>
                      ))}
                    </div>
                    <ResponsiveContainer width="100%" height={180}>
                      <AreaChart data={col.histogram}>
                        <defs>
                          <linearGradient id={`grad${idx}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={CHART_COLORS[idx % CHART_COLORS.length]} stopOpacity={0.4} />
                            <stop offset="95%" stopColor={CHART_COLORS[idx % CHART_COLORS.length]} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
                        <XAxis dataKey="range" stroke={T.dimmed} fontSize={8} angle={-25} textAnchor="end" height={45} />
                        <YAxis stroke={T.dimmed} fontSize={10} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="count" stroke={CHART_COLORS[idx % CHART_COLORS.length]} fill={`url(#grad${idx})`} strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </>)}

                  {/* TIMESTAMP */}
                  {col.type === 'timestamp' && (<>
                    <div style={{ padding: '10px 14px', background: '#6366f111', border: '1px solid #6366f133', borderRadius: 8, marginBottom: '1rem', fontSize: '0.82rem', color: '#a5b4fc' }}>
                      📅 {col.note}
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={col.topValues} layout="vertical">
                        <XAxis type="number" stroke={T.dimmed} fontSize={10} />
                        <YAxis type="category" dataKey="name" stroke={T.dimmed} fontSize={10} width={130} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="value" radius={[0, 5, 5, 0]}>
                          {col.topValues?.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </>)}

                  {/* PHONE */}
                  {col.type === 'phone' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
                      {[['Total', col.count, T.accent], ['Valid', col.validPhones, T.green], ['Invalid', col.invalidPhones, T.red], ['Unique', col.uniqueCount, T.amber]].map(([l, v, c]: any) => (
                        <div key={l} style={{ background: `${c}11`, borderRadius: 10, padding: '0.75rem', border: `1px solid ${c}22` }}>
                          <p style={{ margin: 0, fontSize: '0.65rem', color: T.muted }}>{l}</p>
                          <p style={{ margin: '4px 0 0', fontSize: '1.2rem', fontWeight: 800, color: c }}>{v}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* EMAIL */}
                  {col.type === 'email' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        {[['Total', col.count, T.accent], ['Valid', col.validEmails, T.green], ['Invalid', col.invalidEmails, T.red], ['Unique', col.uniqueCount, T.amber]].map(([l, v, c]: any) => (
                          <div key={l} style={{ background: `${c}11`, borderRadius: 10, padding: '0.6rem', border: `1px solid ${c}22` }}>
                            <p style={{ margin: 0, fontSize: '0.62rem', color: T.muted }}>{l}</p>
                            <p style={{ margin: '2px 0 0', fontSize: '1rem', fontWeight: 800, color: c }}>{v}</p>
                          </div>
                        ))}
                      </div>
                      {col.topDomains?.length > 0 && (
                        <ResponsiveContainer width="100%" height={160}>
                          <BarChart data={col.topDomains} layout="vertical">
                            <XAxis type="number" stroke={T.dimmed} fontSize={10} />
                            <YAxis type="category" dataKey="name" stroke={T.dimmed} fontSize={9} width={140} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="value" radius={[0, 5, 5, 0]}>
                              {col.topDomains?.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  )}

                  {/* CATEGORICAL */}
                  {col.type === 'categorical' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <ResponsiveContainer width="100%" height={Math.max(200, (col.topValues?.length || 8) * 26)}>
                        <BarChart data={col.topValues} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke={T.border} horizontal={false} />
                          <XAxis type="number" stroke={T.dimmed} fontSize={10} />
                          <YAxis type="category" dataKey="name" stroke={T.dimmed} fontSize={10} width={150} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="value" radius={[0, 5, 5, 0]}>
                            {col.topValues?.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie data={col.topValues?.slice(0, 8)} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={3}>
                            {col.topValues?.slice(0, 8).map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                          <Legend formatter={(v: any) => <span style={{ color: T.muted, fontSize: '0.7rem' }}>{v}</span>} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <AIChatPanel
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        contextData={dsData}
        dataType="dataset"
        dataId={dsId}
      />
    </div>
  );
}

/* ─── Form Report View ────────────────────────────────── */
function FormReport({ formData, formId }: { formData: any; formId: string }) {
  const [report, setReport] = useState<any>(null);
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const generateReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/generate-v2?type=form&formId=${formId}`);
      setReport(await res.json());
    } catch {}
    setLoading(false);
  };

  const generateAI = async () => {
    if (!formData) return;
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'form_report', context: formData })
      });
      const d = await res.json();
      setAiAnalysis(d.analysis || '');
    } catch {}
    setAiLoading(false);
  };

  const exportPDF = async () => {
    if (!reportRef.current) return;
    const html2canvas = (await import('html2canvas')).default;
    const jsPDF = (await import('jspdf')).default;
    const canvas = await html2canvas(reportRef.current, { scale: 2, backgroundColor: '#0a0e1a', useCORS: true });
    const img = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const w = pdf.internal.pageSize.getWidth();
    const h = pdf.internal.pageSize.getHeight();
    const imgH = (canvas.height * w) / canvas.width;
    let pos = 0;
    while (pos < imgH) { pdf.addImage(img, 'PNG', 0, -pos, w, imgH); pos += h; if (pos < imgH) pdf.addPage(); }
    pdf.save(`${formData?.formTitle || 'form'}_report.pdf`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={generateReport} disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 7, padding: '9px 20px',
            background: `linear-gradient(135deg, ${T.accent}, ${T.accent2})`,
            border: 'none', borderRadius: 10, color: '#fff', cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '0.82rem', fontWeight: 700, opacity: loading ? 0.6 : 1
          }}>
          {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <FileText size={14} />}
          Generate Report
        </button>
        {report && (<>
          <button onClick={generateAI} disabled={aiLoading}
            style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '9px 20px',
              background: `${T.accent}18`, border: `1px solid ${T.accent}44`,
              borderRadius: 10, color: T.accent, cursor: aiLoading ? 'not-allowed' : 'pointer',
              fontSize: '0.82rem', fontWeight: 700
            }}>
            {aiLoading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={14} />}
            AI Analysis
          </button>
          <button onClick={exportPDF}
            style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '9px 20px',
              background: `${T.green}18`, border: `1px solid ${T.green}44`,
              borderRadius: 10, color: T.green, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700
            }}>
            Export PDF
          </button>
          <button onClick={() => setChatOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '9px 20px',
              background: `${T.cyan}18`, border: `1px solid ${T.cyan}44`,
              borderRadius: 10, color: T.cyan, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700
            }}>
            <MessageSquare size={14} /> AI Copilot
          </button>
        </>)}
      </div>

      {loading && (
        <Card style={{ textAlign: 'center', padding: '3rem' }}>
          <Loader2 size={36} color={T.accent} style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
          <p style={{ color: T.muted, margin: 0 }}>Generating professional report…</p>
        </Card>
      )}

      {report && !loading && (
        <div ref={reportRef} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Title */}
          <Card style={{ background: `linear-gradient(135deg, #0f1f3d, #1a0f3d)`, border: `1px solid ${T.accent}33` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <p style={{ margin: '0 0 6px', fontSize: '0.7rem', color: T.accent, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>DataCore Intelligence</p>
                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: T.text }}>{report.title}</h2>
                <p style={{ margin: '8px 0 0', fontSize: '0.8rem', color: T.muted }}>
                  📅 {new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })} · {report.filters || 'All time'}
                </p>
              </div>
              <div style={{ padding: '12px 20px', background: `${T.accent}18`, border: `1px solid ${T.accent}33`, borderRadius: 12, textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '0.68rem', color: T.accent, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Report Type</p>
                <p style={{ margin: '4px 0 0', fontSize: '1rem', fontWeight: 800, color: T.text }}>Form Report</p>
              </div>
            </div>
          </Card>

          {/* Metrics */}
          {report.metrics?.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
              {report.metrics.map((m: any, i: number) => (
                <KPICard key={i} label={m.label} value={m.value} color={CHART_COLORS[i % CHART_COLORS.length]} icon={Activity} />
              ))}
            </div>
          )}

          {/* AI Analysis */}
          {aiAnalysis && (
            <Card style={{ background: `linear-gradient(135deg, #0f1f2d, #111827)`, border: `1px solid ${T.cyan}33` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
                <Sparkles size={15} color={T.cyan} />
                <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 700, color: T.cyan, textTransform: 'uppercase', letterSpacing: '0.08em' }}>AI Analysis</p>
              </div>
              <div style={{ color: 'rgba(241,245,249,0.85)', lineHeight: 1.8, whiteSpace: 'pre-wrap', fontSize: '0.875rem' }}>
                {aiAnalysis.replace(/\*\*/g, '')}
              </div>
            </Card>
          )}

          {/* Data Table */}
          {report.details?.length > 0 && (
            <Card>
              <p style={{ margin: '0 0 1rem', fontSize: '0.82rem', fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Field Details
              </p>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      {Object.keys(report.details[0]).map(k => (
                        <th key={k} style={{ padding: '10px 14px', textAlign: 'left', color: T.dimmed, borderBottom: `1px solid ${T.border}`, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', background: T.surface }}>
                          {k}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.details.map((row: any, i: number) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${T.border}` }}>
                        {Object.values(row).map((v: any, j) => (
                          <td key={j} style={{ padding: '10px 14px', color: j === 0 ? T.text : T.muted, fontWeight: j === 0 ? 600 : 400 }}>
                            {String(v)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      <AIChatPanel isOpen={chatOpen} onClose={() => setChatOpen(false)} contextData={formData} dataType="form" dataId={formId} />
    </div>
  );
}

/* ─── MAIN PAGE ───────────────────────────────────────── */
type MainView = 'form' | 'upload';
type FormSub = 'analysis' | 'report';

export default function AnalyticsPage() {
  const [view, setView] = useState<MainView | null>(null);
  const [formSub, setFormSub] = useState<FormSub>('analysis');
  const [forms, setForms] = useState<any[]>([]);
  const [datasets, setDatasets] = useState<any[]>([]);
  const [selectedForm, setSelectedForm] = useState('');
  const [selectedDataset, setSelectedDataset] = useState('');
  const [formData, setFormData] = useState<any>(null);
  const [dsData, setDsData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/forms').then(r => r.json()).then(d => {
      const arr = Array.isArray(d) ? d : (d.forms || []);
      setForms(arr);
      if (arr.length) setSelectedForm(arr[0].id);
    }).catch(() => {});
    fetch('/api/datasets').then(r => r.json()).then(d => {
      const arr = Array.isArray(d) ? d : [];
      setDatasets(arr);
      if (arr.length) setSelectedDataset(arr[0].id);
    }).catch(() => {});
  }, []);

  const loadForm = async (id: string) => {
    if (!id) return;
    setLoading(true); setFormData(null);
    try {
      const r = await fetch(`/api/analytics/questions?formId=${id}`);
      setFormData(await r.json());
    } catch {}
    setLoading(false);
  };

  const loadDataset = async (id: string) => {
    if (!id) return;
    setLoading(true); setDsData(null);
    try {
      const r = await fetch(`/api/datasets/${id}/analytics`);
      setDsData(await r.json());
    } catch {}
    setLoading(false);
  };

  /* ── Landing selector ── */
  if (!view) {
    return (
      <div style={{ padding: '2rem', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: T.text, margin: 0 }}>Analytics</h1>
          <p style={{ color: T.muted, margin: '6px 0 0' }}>Select a data source to begin analysis</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {/* Form card */}
          <button onClick={() => setView('form')}
            style={{
              background: `linear-gradient(135deg, #0f1f3d 0%, #1a1040 100%)`,
              border: `1px solid ${T.accent}33`,
              borderRadius: 20, padding: '2rem',
              cursor: 'pointer', textAlign: 'left',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { (e.currentTarget as any).style.border = `1px solid ${T.accent}88`; (e.currentTarget as any).style.transform = 'translateY(-3px)'; }}
            onMouseLeave={e => { (e.currentTarget as any).style.border = `1px solid ${T.accent}33`; (e.currentTarget as any).style.transform = 'none'; }}
          >
            <div style={{ width: 52, height: 52, borderRadius: 14, background: `linear-gradient(135deg, ${T.accent}, ${T.accent2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <ClipboardList size={24} color="#fff" />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem', fontWeight: 800, color: T.text }}>Form</h3>
            <p style={{ margin: '0 0 1.25rem', fontSize: '0.85rem', color: T.muted, lineHeight: 1.6 }}>
              Analyze form responses with charts, trends and AI-powered insights
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <Chip label="00 Analysis" color={T.accent} />
              <Chip label="01 Report" color={T.accent2} />
            </div>
          </button>

          {/* Upload card */}
          <button onClick={() => setView('upload')}
            style={{
              background: `linear-gradient(135deg, #0f2d1f 0%, #1a2a10 100%)`,
              border: `1px solid ${T.green}33`,
              borderRadius: 20, padding: '2rem',
              cursor: 'pointer', textAlign: 'left',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { (e.currentTarget as any).style.border = `1px solid ${T.green}88`; (e.currentTarget as any).style.transform = 'translateY(-3px)'; }}
            onMouseLeave={e => { (e.currentTarget as any).style.border = `1px solid ${T.green}33`; (e.currentTarget as any).style.transform = 'none'; }}
          >
            <div style={{ width: 52, height: 52, borderRadius: 14, background: `linear-gradient(135deg, ${T.green}, ${T.cyan})`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <Upload size={24} color="#fff" />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem', fontWeight: 800, color: T.text }}>Upload File</h3>
            <p style={{ margin: '0 0 1.25rem', fontSize: '0.85rem', color: T.muted, lineHeight: 1.6 }}>
              Deep-dive into uploaded datasets with column stats, distributions and smart AI analysis
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <Chip label="Dataset Analytics" color={T.green} />
              <Chip label="AI Copilot" color={T.cyan} />
            </div>
          </button>
        </div>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  /* ── Form view ── */
  if (view === 'form') {
    return (
      <div style={{ padding: '1.5rem', maxWidth: 1300, margin: '0 auto' }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <button onClick={() => { setView(null); setFormData(null); }}
            style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: '0.875rem', padding: 0 }}>
            Analytics
          </button>
          <ChevronRight size={14} color={T.dimmed} />
          <span style={{ color: T.text, fontSize: '0.875rem', fontWeight: 600 }}>Form</span>
          {formData && (<>
            <ChevronRight size={14} color={T.dimmed} />
            <span style={{ color: T.accent, fontSize: '0.875rem', fontWeight: 600 }}>{formData.formTitle}</span>
          </>)}
        </div>

        {/* Sub-tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: '1.5rem' }}>
          {[
            { id: 'analysis', label: '00  Analysis', icon: BarChart2 },
            { id: 'report',   label: '01  Report',   icon: FileText },
          ].map(t => {
            const Icon = t.icon;
            const active = formSub === t.id;
            return (
              <button key={t.id} onClick={() => setFormSub(t.id as FormSub)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7, padding: '9px 20px',
                  borderRadius: 10, border: `1px solid ${active ? T.accent : T.border}`,
                  background: active ? `${T.accent}18` : 'none',
                  color: active ? T.accent : T.muted,
                  cursor: 'pointer', fontWeight: active ? 700 : 500, fontSize: '0.875rem',
                  transition: 'all 0.15s',
                }}>
                <Icon size={15} /> {t.label}
              </button>
            );
          })}
        </div>

        {/* Form selector */}
        <Card style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <ClipboardList size={16} color={T.muted} />
          <select value={selectedForm} onChange={e => { setSelectedForm(e.target.value); setFormData(null); }}
            style={{ flex: 1, minWidth: 200, maxWidth: 400, padding: '10px 14px', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, fontSize: '0.875rem' }}>
            {forms.length === 0 ? <option>No forms yet</option>
              : forms.map((f: any) => <option key={f.id} value={f.id}>{f.title}</option>)}
          </select>
          <button onClick={() => loadForm(selectedForm)} disabled={!selectedForm || loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '10px 22px',
              background: `linear-gradient(135deg, ${T.accent}, ${T.accent2})`,
              border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: '0.875rem',
              cursor: loading || !selectedForm ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
            }}>
            {loading ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={15} />}
            Load
          </button>
        </Card>

        {loading && (
          <Card style={{ textAlign: 'center', padding: '4rem' }}>
            <Loader2 size={36} color={T.accent} style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
            <p style={{ color: T.muted, margin: 0 }}>Loading analytics…</p>
          </Card>
        )}

        {!loading && !formData && (
          <Card style={{ textAlign: 'center', padding: '4rem' }}>
            <ClipboardList size={44} color={T.dimmed} style={{ marginBottom: 12 }} />
            <p style={{ color: T.muted, margin: 0 }}>Select a form and click Load</p>
          </Card>
        )}

        {!loading && formData && formSub === 'analysis' && (
          <FormAnalysis formData={formData} formId={selectedForm} />
        )}
        {!loading && formData && formSub === 'report' && (
          <FormReport formData={formData} formId={selectedForm} />
        )}

        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  /* ── Upload view ── */
  return (
    <div style={{ padding: '1.5rem', maxWidth: 1300, margin: '0 auto' }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.5rem' }}>
        <button onClick={() => { setView(null); setDsData(null); }}
          style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: '0.875rem', padding: 0 }}>
          Analytics
        </button>
        <ChevronRight size={14} color={T.dimmed} />
        <span style={{ color: T.text, fontSize: '0.875rem', fontWeight: 600 }}>Upload File</span>
        {dsData && (<>
          <ChevronRight size={14} color={T.dimmed} />
          <span style={{ color: T.green, fontSize: '0.875rem', fontWeight: 600 }}>{dsData.filename}</span>
        </>)}
      </div>

      {/* Dataset selector */}
      <Card style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <Database size={16} color={T.muted} />
        <select value={selectedDataset} onChange={e => { setSelectedDataset(e.target.value); setDsData(null); }}
          style={{ flex: 1, minWidth: 200, maxWidth: 400, padding: '10px 14px', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, fontSize: '0.875rem' }}>
          {datasets.length === 0 ? <option>No datasets uploaded</option>
            : datasets.map((d: any) => <option key={d.id} value={d.id}>{d.filename}</option>)}
        </select>
        <button onClick={() => loadDataset(selectedDataset)} disabled={!selectedDataset || loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 7, padding: '10px 22px',
            background: `linear-gradient(135deg, ${T.green}, ${T.cyan})`,
            border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: '0.875rem',
            cursor: loading || !selectedDataset ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
          }}>
          {loading ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={15} />}
          Load
        </button>
      </Card>

      {loading && (
        <Card style={{ textAlign: 'center', padding: '4rem' }}>
          <Loader2 size={36} color={T.green} style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
          <p style={{ color: T.muted, margin: 0 }}>Analyzing dataset…</p>
        </Card>
      )}

      {!loading && !dsData && (
        <Card style={{ textAlign: 'center', padding: '4rem' }}>
          <Upload size={44} color={T.dimmed} style={{ marginBottom: 12 }} />
          <p style={{ color: T.muted, margin: 0 }}>Select a dataset and click Load</p>
        </Card>
      )}

      {!loading && dsData && <UploadAnalysis dsData={dsData} dsId={selectedDataset} />}

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
