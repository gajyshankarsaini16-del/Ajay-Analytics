'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis
} from 'recharts';
import {
  ClipboardList, Database, Globe, Loader2, BrainCircuit, Sparkles,
  TrendingUp, TrendingDown, AlertCircle, CheckCircle, ChevronDown, ChevronUp,
  GitBranch, Zap, BarChart2, Activity, Target, Award, Filter,
  RefreshCw, Download, Eye, Hash, Type, Calendar, Info, Layers
} from 'lucide-react';

const COLORS = ['#6366f1','#10b981','#f59e0b','#ec4899','#8b5cf6','#06b6d4','#f97316','#84cc16'];
const AREA_COLORS = ['#6366f1','#10b981'];

/* ── Reusable UI pieces ── */
const Card = ({ children, style, onClick }: any) => (
  <div onClick={onClick} style={{
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '16px', padding: '1.5rem',
    transition: 'all 0.2s', cursor: onClick ? 'pointer' : 'default',
    ...(onClick ? { ':hover': { borderColor: 'rgba(255,255,255,0.15)' } } : {}),
    ...style
  }}>{children}</div>
);

const KPI = ({ label, value, sub, color = '#6366f1', growth, icon }: any) => (
  <div style={{
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '14px', padding: '1.25rem', position: 'relative', overflow: 'hidden'
  }}>
    <div style={{ position: 'absolute', top: '1rem', right: '1rem', opacity: 0.15 }}>
      {icon && <span style={{ fontSize: '2rem' }}>{icon}</span>}
    </div>
    <p style={{ margin: 0, fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>
    <p style={{ margin: '6px 0 2px', fontSize: '2rem', fontWeight: 700, color: '#fff', lineHeight: 1 }}>{value ?? '—'}</p>
    {growth !== undefined && (
      <p style={{ margin: 0, fontSize: '0.75rem', color: growth > 0 ? '#10b981' : growth < 0 ? '#ef4444' : '#a1a1aa', display: 'flex', alignItems: 'center', gap: '4px' }}>
        {growth > 0 ? <TrendingUp size={12} /> : growth < 0 ? <TrendingDown size={12} /> : null}
        {growth > 0 ? '+' : ''}{growth}% vs prev period
      </p>
    )}
    {sub && growth === undefined && <p style={{ margin: 0, fontSize: '0.75rem', color }}>{sub}</p>}
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', background: color, borderRadius: '0 0 14px 14px', opacity: 0.6 }} />
  </div>
);

const AIBox = ({ text, loading, label = 'AI Insight' }: { text: string | null, loading: boolean, label?: string }) => {
  if (!text && !loading) return null;
  return (
    <div style={{
      background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.18)',
      borderRadius: '12px', padding: '1rem 1.1rem', marginTop: '0.85rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.5rem' }}>
        {loading
          ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite', color: '#a5b4fc' }} />
          : <Sparkles size={13} style={{ color: '#a5b4fc' }} />}
        <span style={{ fontSize: '0.7rem', color: '#a5b4fc', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      </div>
      <p style={{ margin: 0, fontSize: '0.83rem', color: 'rgba(255,255,255,0.78)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
        {loading ? 'AI analysis chal rahi hai...' : text}
      </p>
    </div>
  );
};

const Tab = ({ active, onClick, children, icon }: any) => (
  <button onClick={onClick} style={{
    display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 20px',
    background: 'none', border: 'none',
    borderBottom: active ? '2px solid #6366f1' : '2px solid transparent',
    color: active ? '#a5b4fc' : 'rgba(255,255,255,0.45)',
    cursor: 'pointer', fontWeight: active ? 600 : 400, fontSize: '0.875rem', marginBottom: '-1px',
    transition: 'all 0.2s'
  }}>{icon}{children}</button>
);

const SubTab = ({ active, onClick, children }: any) => (
  <button onClick={onClick} style={{
    padding: '6px 14px', border: 'none',
    background: active ? 'rgba(99,102,241,0.15)' : 'none',
    borderRadius: '8px',
    color: active ? '#a5b4fc' : 'rgba(255,255,255,0.45)',
    cursor: 'pointer', fontWeight: active ? 600 : 400, fontSize: '0.82rem', transition: 'all 0.15s'
  }}>{children}</button>
);

function buildTrend(days = 30) {
  const map: Record<string, number> = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    map[d.toISOString().split('T')[0]] = 0;
  }
  return map;
}

function pearson(rows: any[], a: string, b: string) {
  const pairs = rows.map((r: any) => [parseFloat(r[a]), parseFloat(r[b])]).filter(([x, y]) => !isNaN(x) && !isNaN(y));
  if (pairs.length < 3) return null;
  const n = pairs.length;
  const ma = pairs.reduce((s, [x]) => s + x, 0) / n;
  const mb = pairs.reduce((s, [, y]) => s + y, 0) / n;
  const num = pairs.reduce((s, [x, y]) => s + (x - ma) * (y - mb), 0);
  const da = Math.sqrt(pairs.reduce((s, [x]) => s + (x - ma) ** 2, 0));
  const db = Math.sqrt(pairs.reduce((s, [, y]) => s + (y - mb) ** 2, 0));
  if (!da || !db) return null;
  return Math.round((num / (da * db)) * 100) / 100;
}

type MainTab = 'forms' | 'datasets' | 'overview';

export default function AnalyticsPage() {
  const [tab, setTab] = useState<MainTab>('forms');
  const [subTab, setSubTab] = useState('summary');
  const [forms, setForms] = useState<any[]>([]);
  const [datasets, setDatasets] = useState<any[]>([]);
  const [selForm, setSelForm] = useState('');
  const [selDs, setSelDs] = useState('');
  const [formData, setFormData] = useState<any>(null);
  const [dsData, setDsData] = useState<any>(null);
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [trendDays, setTrendDays] = useState(30);
  const [corrA, setCorrA] = useState('');
  const [corrB, setCorrB] = useState('');
  const [expandedCol, setExpandedCol] = useState<string | null>(null);
  const [chartType, setChartType] = useState<'bar' | 'pie' | 'area'>('bar');
  const [searchCol, setSearchCol] = useState('');

  // AI states
  const [globalAI, setGlobalAI] = useState<string | null>(null);
  const [globalAILoading, setGlobalAILoading] = useState(false);
  const [colAI, setColAI] = useState<Record<string, string>>({});
  const [colAILoading, setColAILoading] = useState<Record<string, boolean>>({});
  const [qAI, setQAI] = useState<Record<string, string>>({});
  const [qAILoading, setQAILoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setMounted(true);
    fetch('/api/forms').then(r => r.json()).then(d => {
      const arr = Array.isArray(d) ? d : (d.forms || []);
      setForms(arr); if (arr.length) setSelForm(arr[0].id);
    }).catch(() => {});
    fetch('/api/datasets').then(r => r.json()).then(d => {
      const arr = Array.isArray(d) ? d : [];
      setDatasets(arr); if (arr.length) setSelDs(arr[0].id);
    }).catch(() => {});
    fetchOverview();
  }, []);

  useEffect(() => { if (selForm && tab === 'forms') loadForm(selForm); }, [selForm]);
  useEffect(() => { if (selDs && tab === 'datasets') loadDs(selDs); }, [selDs]);

  const fetchOverview = async () => {
    try { const r = await fetch('/api/analytics'); setOverview(await r.json()); } catch {}
  };

  const callAI = async (type: string, context: any): Promise<string> => {
    const r = await fetch('/api/ai/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, context }) });
    const d = await r.json();
    if (d.error) throw new Error(d.error);
    return d.analysis;
  };

  const loadForm = async (id: string) => {
    if (!id) return;
    setLoading(true); setFormData(null); setGlobalAI(null); setQAI({}); setSubTab('summary');
    try {
      const r = await fetch(`/api/analytics/questions?formId=${id}`);
      const d = await r.json();
      setFormData(d);
      setGlobalAILoading(true);
      callAI('form_report', d).then(t => setGlobalAI(t)).catch(() => {}).finally(() => setGlobalAILoading(false));
      d.questions?.filter((q: any) => q.totalAnswers > 0).forEach((q: any) => {
        setQAILoading(p => ({ ...p, [q.fieldId]: true }));
        callAI('question_insight', { label: q.label, type: q.type, totalAnswers: q.totalAnswers, chartData: q.chartData?.slice(0, 10) })
          .then(t => setQAI(p => ({ ...p, [q.fieldId]: t })))
          .catch(() => {})
          .finally(() => setQAILoading(p => ({ ...p, [q.fieldId]: false })));
      });
    } catch {} finally { setLoading(false); }
  };

  const loadDs = async (id: string) => {
    if (!id) return;
    setLoading(true); setDsData(null); setRawRows([]); setGlobalAI(null); setColAI({});
    setSubTab('summary'); setExpandedCol(null); setCorrA(''); setCorrB('');
    try {
      const [r1, r2] = await Promise.all([fetch(`/api/datasets/${id}/analytics`), fetch(`/api/datasets/${id}`)]);
      const d1 = await r1.json(); const d2 = await r2.json();
      setDsData(d1);
      try { const rows = JSON.parse(d2.data || '[]'); setRawRows(Array.isArray(rows) ? rows : []); } catch {}
      setGlobalAILoading(true);
      callAI('dataset', d1).then(t => setGlobalAI(t)).catch(() => {}).finally(() => setGlobalAILoading(false));
      d1.columns?.slice(0, 6).forEach((col: any) => {
        setColAILoading(p => ({ ...p, [col.name]: true }));
        callAI('column_insight', {
          name: col.name, type: col.type,
          ...(col.type === 'numeric' ? { min: col.min, max: col.max, mean: col.mean, median: col.median, std: col.std }
            : { uniqueCount: col.uniqueCount, topValues: col.topValues?.slice(0, 5), missing: col.missing })
        }).then(t => setColAI(p => ({ ...p, [col.name]: t }))).catch(() => {})
          .finally(() => setColAILoading(p => ({ ...p, [col.name]: false })));
      });
    } catch {} finally { setLoading(false); }
  };

  const getColAIOnExpand = (col: any) => {
    setExpandedCol(prev => prev === col.name ? null : col.name);
    if (!colAI[col.name] && !colAILoading[col.name]) {
      setColAILoading(p => ({ ...p, [col.name]: true }));
      callAI('column_insight', {
        name: col.name, type: col.type,
        ...(col.type === 'numeric' ? { min: col.min, max: col.max, mean: col.mean, median: col.median, std: col.std }
          : { uniqueCount: col.uniqueCount, topValues: col.topValues?.slice(0, 5), missing: col.missing })
      }).then(t => setColAI(p => ({ ...p, [col.name]: t }))).catch(() => {})
        .finally(() => setColAILoading(p => ({ ...p, [col.name]: false })));
    }
  };

  // Trend data
  const trendData = (() => {
    const map = buildTrend(trendDays);
    (formData?.submissions || []).forEach((s: any) => {
      const d = s.submittedAt?.split?.('T')?.[0];
      if (d && map[d] !== undefined) map[d]++;
    });
    return Object.entries(map).map(([date, responses]) => ({
      date: new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), responses
    }));
  })();

  const trendGrowth = (() => {
    if (trendData.length < 2) return 0;
    const half = Math.floor(trendData.length / 2);
    const prev = trendData.slice(0, half).reduce((s, d) => s + d.responses, 0);
    const curr = trendData.slice(half).reduce((s, d) => s + d.responses, 0);
    if (!prev) return 100;
    return Math.round(((curr - prev) / prev) * 100);
  })();

  const numericCols = dsData?.columns?.filter((c: any) => c.type === 'numeric') || [];
  const corrVal = corrA && corrB && rawRows.length ? pearson(rawRows, corrA, corrB) : null;
  const scatterData = corrA && corrB
    ? rawRows.slice(0, 400).map((r: any) => ({ x: parseFloat(r[corrA]), y: parseFloat(r[corrB]) })).filter(p => !isNaN(p.x) && !isNaN(p.y))
    : [];

  // Strengths & Weaknesses
  const strengths: string[] = [], weaknesses: string[] = [];
  if (formData) {
    if (formData.totalSubmissions > 50) strengths.push(`High response volume — ${formData.totalSubmissions} responses collected`);
    if (formData.totalSubmissions < 5) weaknesses.push(`Very low responses — only ${formData.totalSubmissions} submitted`);
    const answered = formData.questions?.filter((q: any) => q.totalAnswers > 0).length || 0;
    const total = formData.questions?.length || 1;
    const rate = Math.round((answered / total) * 100);
    if (rate >= 80) strengths.push(`High field engagement — ${rate}% of questions answered`);
    else weaknesses.push(`Low engagement — only ${rate}% questions have responses`);
    const topQ = formData.questions?.filter((q: any) => q.chartData?.length > 0)?.[0];
    if (topQ?.chartData?.[0]) strengths.push(`"${topQ.label}" — most popular answer: "${topQ.chartData[0].name}" (${topQ.chartData[0].value} times)`);
  }
  if (dsData) {
    if (dsData.rowCount > 1000) strengths.push(`Large dataset — ${dsData.rowCount.toLocaleString()} rows, statistically reliable`);
    if (dsData.rowCount < 50) weaknesses.push(`Small sample size — ${dsData.rowCount} rows only`);
    if (numericCols.length >= 2) strengths.push(`${numericCols.length} numeric columns available — correlation analysis possible`);
    const missingCols = dsData.columns?.filter((c: any) => (c.missing || 0) > 0) || [];
    if (missingCols.length > 0) weaknesses.push(`${missingCols.length} column(s) have missing values — data cleaning needed`);
    const highCard = dsData.columns?.find((c: any) => c.type === 'categorical' && c.uniqueCount > 50);
    if (highCard) weaknesses.push(`"${highCard.name}" has ${highCard.uniqueCount} unique values — consider grouping`);
  }

  const filteredCols = dsData?.columns?.filter((c: any) =>
    !searchCol || c.name.toLowerCase().includes(searchCol.toLowerCase())
  ) || [];

  /* ═══ FORMS RENDER ═══ */
  const renderForms = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Selector */}
      <Card style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', padding: '1rem 1.25rem' }}>
        <ClipboardList size={16} style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0 }} />
        <select value={selForm} onChange={e => setSelForm(e.target.value)} style={{
          flex: 1, minWidth: '200px', maxWidth: '400px', padding: '10px 14px',
          background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '10px', color: '#fff', fontSize: '0.875rem'
        }}>
          {forms.length === 0 ? <option>No forms yet</option> : forms.map(f => <option key={f.id} value={f.id}>{f.title}</option>)}
        </select>
        {formData && (
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { label: 'Responses', value: formData.totalSubmissions, color: '#6366f1' },
              { label: 'Questions', value: formData.questions?.length || 0, color: '#10b981' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>{label}</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color }}>{value}</div>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', marginLeft: 'auto' }}>
          <Zap size={12} color="#10b981" /> Auto-analyzing
        </div>
      </Card>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem', gap: '1rem' }}>
          <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: '#6366f1' }} />
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem' }}>Form data load ho raha hai...</p>
        </div>
      )}

      {formData && !loading && (
        <>
          {/* Global AI */}
          <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '16px', padding: '1.25rem 1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.6rem' }}>
              <BrainCircuit size={16} color="#a5b4fc" />
              <span style={{ color: '#a5b4fc', fontWeight: 600, fontSize: '0.9rem' }}>AI Overall Analysis</span>
              {globalAILoading && <Loader2 size={13} style={{ animation: 'spin 1s linear infinite', color: '#a5b4fc' }} />}
              <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginLeft: '4px' }}>auto generated</span>
            </div>
            {globalAI ? (
              <p style={{ margin: 0, fontSize: '0.84rem', color: 'rgba(255,255,255,0.8)', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{globalAI}</p>
            ) : globalAILoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {['Form responses parse ho rahi hain...', 'Patterns dhundh raha hai...', 'Insights generate ho rahi hain...'].map((t, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)' }}>
                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(165,180,252,0.4)', flexShrink: 0, marginTop: '6px' }} />{t}
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '1rem' }}>
            <KPI label="Total Responses" value={formData.totalSubmissions} growth={trendGrowth} icon="📋" />
            <KPI label="Questions" value={formData.questions?.length || 0} sub="in this form" color="#10b981" icon="❓" />
            <KPI label="Total Answers" value={formData.questions?.reduce((a: number, q: any) => a + q.totalAnswers, 0) || 0} sub="all responses" color="#f59e0b" icon="✍️" />
            <KPI label="Completion Rate"
              value={formData.totalSubmissions > 0 ? `${Math.round(((formData.questions?.filter((q: any) => q.totalAnswers > 0).length || 0) / Math.max(formData.questions?.length || 1, 1)) * 100)}%` : '0%'}
              sub="fields answered" color="#ec4899" icon="🎯" />
          </div>

          {/* Sub-tabs */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: '0.25rem' }}>
            {[
              { id: 'summary', label: 'Per Question' },
              { id: 'trend', label: 'Response Trend' },
              { id: 'segment', label: 'Segmentation' },
              { id: 'sw', label: 'Strengths & Gaps' },
            ].map(t => <SubTab key={t.id} active={subTab === t.id} onClick={() => setSubTab(t.id)}>{t.label}</SubTab>)}
          </div>

          {/* Per Question */}
          {subTab === 'summary' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Chart type toggle */}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>Chart:</span>
                {[{ id: 'bar', label: 'Bar' }, { id: 'pie', label: 'Pie' }, { id: 'area', label: 'Area' }].map(c => (
                  <button key={c.id} onClick={() => setChartType(c.id as any)} style={{
                    padding: '5px 12px', borderRadius: '6px', border: '1px solid',
                    borderColor: chartType === c.id ? '#6366f1' : 'rgba(255,255,255,0.08)',
                    background: chartType === c.id ? 'rgba(99,102,241,0.15)' : 'transparent',
                    color: chartType === c.id ? '#a5b4fc' : 'rgba(255,255,255,0.4)',
                    fontSize: '0.78rem', cursor: 'pointer'
                  }}>{c.label}</button>
                ))}
              </div>

              {formData.questions?.map((q: any, idx: number) => (
                <Card key={q.fieldId}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{
                          fontSize: '0.65rem', padding: '2px 8px', borderRadius: '6px', fontWeight: 700,
                          background: q.type === 'rating' ? 'rgba(245,158,11,0.15)' : q.type === 'text' ? 'rgba(161,161,170,0.15)' : 'rgba(99,102,241,0.15)',
                          color: q.type === 'rating' ? '#f59e0b' : q.type === 'text' ? '#71717a' : '#a5b4fc'
                        }}>Q{idx + 1} · {q.type}</span>
                        {q.totalAnswers > 0 && (
                          <span style={{ fontSize: '0.7rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Activity size={10} /> {q.totalAnswers} responses
                          </span>
                        )}
                      </div>
                      <h3 style={{ color: '#fff', margin: 0, fontSize: '1rem', fontWeight: 600, lineHeight: 1.4 }}>{q.label}</h3>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '1rem' }}>
                      <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, color: '#6366f1', lineHeight: 1 }}>{q.totalAnswers}</p>
                      <p style={{ margin: '2px 0 0', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>answers</p>
                      {formData.totalSubmissions > 0 && (
                        <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: q.totalAnswers / formData.totalSubmissions >= 0.8 ? '#10b981' : '#f59e0b' }}>
                          {Math.round((q.totalAnswers / formData.totalSubmissions) * 100)}% rate
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Response rate bar */}
                  {formData.totalSubmissions > 0 && (
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 2, transition: 'width 0.6s',
                          width: `${Math.round((q.totalAnswers / formData.totalSubmissions) * 100)}%`,
                          background: q.totalAnswers / formData.totalSubmissions >= 0.8 ? '#10b981' : '#6366f1'
                        }} />
                      </div>
                    </div>
                  )}

                  {q.chartData?.length > 0 && mounted ? (
                    <div style={{ display: 'grid', gridTemplateColumns: q.chartData.length <= 5 ? '1fr 1fr' : '1fr', gap: '1rem' }}>
                      <div>
                        <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginBottom: '0.4rem' }}>Response Distribution</p>
                        <ResponsiveContainer width="100%" height={220}>
                          {chartType === 'pie' ? (
                            <PieChart>
                              <Pie data={q.chartData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={3}>
                                {q.chartData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                              </Pie>
                              <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                              <Legend formatter={v => <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.72rem' }}>{v}</span>} />
                            </PieChart>
                          ) : chartType === 'area' ? (
                            <AreaChart data={q.chartData}>
                              <CartesianGrid strokeDasharray="3 3" opacity={0.05} />
                              <XAxis dataKey="name" stroke="#a1a1aa" fontSize={10} />
                              <YAxis stroke="#a1a1aa" fontSize={10} allowDecimals={false} />
                              <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                              <Area type="monotone" dataKey="value" stroke="#6366f1" fill="rgba(99,102,241,0.2)" strokeWidth={2} />
                            </AreaChart>
                          ) : (
                            <BarChart data={q.chartData} layout="vertical">
                              <XAxis type="number" stroke="#a1a1aa" fontSize={11} allowDecimals={false} />
                              <YAxis type="category" dataKey="name" stroke="#a1a1aa" fontSize={10} width={100} />
                              <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                                {q.chartData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                              </Bar>
                            </BarChart>
                          )}
                        </ResponsiveContainer>
                      </div>

                      {q.chartData.length <= 8 && chartType === 'bar' && (
                        <div>
                          <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginBottom: '0.4rem' }}>Share %</p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '0.5rem' }}>
                            {q.chartData.slice(0, 6).map((item: any, i: number) => {
                              const total = q.chartData.reduce((a: number, d: any) => a + d.value, 0);
                              const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                              return (
                                <div key={i}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                                    <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>{item.name}</span>
                                    <span style={{ fontSize: '0.72rem', color: COLORS[i % COLORS.length], fontWeight: 600, flexShrink: 0 }}>{pct}%</span>
                                  </div>
                                  <div style={{ height: 5, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', borderRadius: 2, width: `${pct}%`, background: COLORS[i % COLORS.length], transition: 'width 0.6s' }} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', color: 'rgba(255,255,255,0.3)', fontSize: '0.82rem', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                      {q.totalAnswers === 0 ? '📭 No responses yet for this question.' : '📝 Open-ended responses — individual answers collected.'}
                    </div>
                  )}

                  <AIBox text={qAI[q.fieldId]} loading={qAILoading[q.fieldId] || false} label={`AI Insight — ${q.label.slice(0, 40)}`} />
                </Card>
              ))}
            </div>
          )}

          {/* Trend */}
          {subTab === 'trend' && (
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h3 style={{ margin: 0, color: 'rgba(255,255,255,0.85)', fontSize: '0.95rem', fontWeight: 600 }}>Response Trend Over Time</h3>
                  <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
                    Kitni responses per day mili — spikes high activity periods indicate karte hain
                  </p>
                  <span style={{ fontSize: '0.78rem', color: trendGrowth >= 0 ? '#10b981' : '#ef4444', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {trendGrowth >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                    {trendGrowth >= 0 ? '+' : ''}{trendGrowth}% vs previous period
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {[7, 14, 30].map(d => (
                    <button key={d} onClick={() => setTrendDays(d)} style={{
                      padding: '5px 12px', borderRadius: '8px', border: '1px solid',
                      borderColor: trendDays === d ? '#6366f1' : 'rgba(255,255,255,0.1)',
                      background: trendDays === d ? 'rgba(99,102,241,0.2)' : 'none',
                      color: trendDays === d ? '#a5b4fc' : 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.78rem'
                    }}>{d}d</button>
                  ))}
                </div>
              </div>
              {mounted && (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.05} />
                    <XAxis dataKey="date" stroke="#a1a1aa" fontSize={10} />
                    <YAxis stroke="#a1a1aa" fontSize={11} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                    <Area type="monotone" dataKey="responses" stroke="#6366f1" strokeWidth={2.5} fill="url(#trendGrad)" dot={false} activeDot={{ r: 5, fill: '#6366f1' }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </Card>
          )}

          {/* Segmentation */}
          {subTab === 'segment' && (
            <div>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.84rem', marginBottom: '1rem', lineHeight: 1.5 }}>
                Har question ka response breakdown — kaunse options sabse popular hain
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: '1rem' }}>
                {formData.questions?.filter((q: any) => q.chartData?.length > 0).slice(0, 8).map((q: any, i: number) => (
                  <Card key={i}>
                    <h4 style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem', marginBottom: '4px' }}>{q.label}</h4>
                    <p style={{ margin: '0 0 0.75rem', fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)' }}>
                      {q.totalAnswers} responses · Top: "{q.chartData[0]?.name}"
                    </p>
                    {mounted && (
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={q.chartData.slice(0, 6)}>
                          <XAxis dataKey="name" stroke="#a1a1aa" fontSize={9} angle={-20} textAnchor="end" height={40} />
                          <YAxis stroke="#a1a1aa" fontSize={9} allowDecimals={false} />
                          <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                            {q.chartData.slice(0, 6).map((_: any, j: number) => <Cell key={j} fill={COLORS[j % COLORS.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </Card>
                ))}
                {!formData.questions?.some((q: any) => q.chartData?.length > 0) && (
                  <Card style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.4)' }}>
                    <BarChart2 size={40} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                    <p>Categorical data ke liye responses chahiye.</p>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* S&W */}
          {subTab === 'sw' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: '1rem' }}>
              <Card style={{ background: 'rgba(16,185,129,0.04)', borderColor: 'rgba(16,185,129,0.2)' }}>
                <h3 style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', fontSize: '0.95rem' }}>
                  <Award size={16} /> Strengths
                </h3>
                {strengths.length === 0
                  ? <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>Zyada data load karo to strengths detect hongi.</p>
                  : strengths.map((s, i) => (
                    <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '10px', alignItems: 'flex-start' }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                        <CheckCircle size={11} color="#10b981" />
                      </div>
                      <span style={{ fontSize: '0.84rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>{s}</span>
                    </div>
                  ))}
              </Card>
              <Card style={{ background: 'rgba(239,68,68,0.04)', borderColor: 'rgba(239,68,68,0.2)' }}>
                <h3 style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', fontSize: '0.95rem' }}>
                  <Target size={16} /> Gaps & Opportunities
                </h3>
                {weaknesses.length === 0
                  ? <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>Koi significant weaknesses nahi mili.</p>
                  : weaknesses.map((w, i) => (
                    <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '10px', alignItems: 'flex-start' }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                        <AlertCircle size={11} color="#ef4444" />
                      </div>
                      <span style={{ fontSize: '0.84rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>{w}</span>
                    </div>
                  ))}
              </Card>
            </div>
          )}
        </>
      )}

      {!formData && !loading && (
        <Card style={{ textAlign: 'center', padding: '4rem' }}>
          <ClipboardList size={48} style={{ color: 'rgba(255,255,255,0.15)', marginBottom: '1rem' }} />
          <h3 style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem', fontWeight: 500 }}>Form Analytics</h3>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.875rem' }}>Upar se ek form select karo — AI automatically analyze karega</p>
        </Card>
      )}
    </div>
  );

  /* ═══ DATASETS RENDER ═══ */
  const renderDatasets = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Selector */}
      <Card style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', padding: '1rem 1.25rem' }}>
        <Database size={16} style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0 }} />
        <select value={selDs} onChange={e => setSelDs(e.target.value)} style={{
          flex: 1, minWidth: '200px', maxWidth: '400px', padding: '10px 14px',
          background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '10px', color: '#fff', fontSize: '0.875rem'
        }}>
          {datasets.length === 0 ? <option>No datasets uploaded</option> : datasets.map(d => <option key={d.id} value={d.id}>{d.filename}</option>)}
        </select>
        {dsData && (
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { label: 'Rows', value: dsData.rowCount?.toLocaleString(), color: '#10b981' },
              { label: 'Columns', value: dsData.columnCount, color: '#6366f1' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>{label}</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color }}>{value}</div>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', marginLeft: 'auto' }}>
          <Zap size={12} color="#10b981" /> Auto-analyzing
        </div>
      </Card>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem', gap: '1rem' }}>
          <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: '#10b981' }} />
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem' }}>Dataset analyze ho raha hai...</p>
        </div>
      )}

      {dsData && !loading && (
        <>
          {/* Global AI */}
          <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '16px', padding: '1.25rem 1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.6rem' }}>
              <BrainCircuit size={16} color="#a5b4fc" />
              <span style={{ color: '#a5b4fc', fontWeight: 600, fontSize: '0.9rem' }}>AI Dataset Analysis</span>
              {globalAILoading && <Loader2 size={13} style={{ animation: 'spin 1s linear infinite', color: '#a5b4fc' }} />}
            </div>
            {globalAI ? (
              <p style={{ margin: 0, fontSize: '0.84rem', color: 'rgba(255,255,255,0.8)', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{globalAI}</p>
            ) : globalAILoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {['Dataset structure samajh raha hai...', 'Statistical analysis chal rahi hai...', 'Recommendations prepare ho rahi hain...'].map((t, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)' }}>
                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(165,180,252,0.4)', flexShrink: 0, marginTop: '6px' }} />{t}
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '1rem' }}>
            <KPI label="Total Rows" value={dsData.rowCount?.toLocaleString()} sub={dsData.filename} color="#10b981" icon="📊" />
            <KPI label="Columns" value={dsData.columnCount} sub="total fields" color="#06b6d4" icon="🔢" />
            <KPI label="Numeric" value={dsData.columns?.filter((c: any) => c.type === 'numeric').length} sub="numeric cols" color="#f59e0b" icon="#️⃣" />
            <KPI label="Categorical" value={dsData.columns?.filter((c: any) => c.type === 'categorical').length} sub="categorical" color="#ec4899" icon="🏷️" />
            <KPI label="Missing Data" value={dsData.columns?.filter((c: any) => (c.missing || 0) > 0).length > 0 ? `${dsData.columns?.filter((c: any) => (c.missing || 0) > 0).length} cols` : 'Clean'} sub="with gaps" color={dsData.columns?.filter((c: any) => (c.missing || 0) > 0).length > 0 ? '#ef4444' : '#10b981'} icon="🔍" />
          </div>

          {/* Sub-tabs */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: '0.25rem' }}>
            {[
              { id: 'summary', label: 'Column Explorer' },
              { id: 'correlation', label: 'Correlation' },
              { id: 'sw', label: 'Strengths & Gaps' },
            ].map(t => <SubTab key={t.id} active={subTab === t.id} onClick={() => setSubTab(t.id)}>{t.label}</SubTab>)}
          </div>

          {/* Column Explorer */}
          {subTab === 'summary' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Search */}
              <div style={{ position: 'relative' }}>
                <Filter size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                <input
                  type="text" placeholder="Column name search karo..."
                  value={searchCol} onChange={e => setSearchCol(e.target.value)}
                  style={{ paddingLeft: '36px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', fontSize: '0.875rem', padding: '10px 14px 10px 36px' }}
                />
              </div>

              {filteredCols.map((col: any, idx: number) => {
                const isExp = expandedCol === col.name;
                return (
                  <Card key={col.name} style={{ padding: '0' }}>
                    <button onClick={() => getColAIOnExpand(col)} style={{
                      width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '1.25rem 1.5rem', textAlign: 'left'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                        <span style={{
                          fontSize: '0.62rem', padding: '3px 10px', borderRadius: '6px', fontWeight: 700, flexShrink: 0,
                          background: col.type === 'numeric' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                          color: col.type === 'numeric' ? '#10b981' : '#f59e0b'
                        }}>
                          {col.type === 'numeric' ? '123' : 'ABC'}
                        </span>
                        <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{col.name}</span>
                        {col.missing > 0 && (
                          <span style={{ fontSize: '0.68rem', padding: '2px 7px', borderRadius: '999px', background: 'rgba(239,68,68,0.15)', color: '#f87171', flexShrink: 0 }}>
                            {col.missing} missing
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0, marginLeft: '1rem' }}>
                        {col.type === 'numeric' ? (
                          <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>
                            avg <b style={{ color: '#10b981' }}>{col.mean}</b> · <span style={{ color: 'rgba(255,255,255,0.3)' }}>range {col.min}–{col.max}</span>
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>
                            {col.uniqueCount} unique · top: "<span style={{ color: '#f59e0b' }}>{col.topValues?.[0]?.name}</span>"
                          </span>
                        )}
                        {isExp ? <ChevronUp size={15} color="rgba(255,255,255,0.3)" /> : <ChevronDown size={15} color="rgba(255,255,255,0.3)" />}
                      </div>
                    </button>

                    {/* Collapsed AI */}
                    {!isExp && (colAI[col.name] || colAILoading[col.name]) && (
                      <div style={{ padding: '0 1.5rem 1.25rem' }}>
                        <AIBox text={colAI[col.name]} loading={colAILoading[col.name] || false} label={`AI — ${col.name}`} />
                      </div>
                    )}

                    {/* Expanded */}
                    {isExp && mounted && (
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '1.25rem 1.5rem' }}>
                        {col.type === 'numeric' ? (
                          <>
                            {/* Stat cards */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(100px,1fr))', gap: '8px', marginBottom: '1.25rem' }}>
                              {[
                                { l: 'Min', v: col.min, c: '#06b6d4', d: 'Lowest value' },
                                { l: 'Max', v: col.max, c: '#ec4899', d: 'Highest value' },
                                { l: 'Mean', v: col.mean, c: '#10b981', d: 'Average' },
                                { l: 'Median', v: col.median, c: '#f59e0b', d: 'Middle value' },
                                { l: 'Std Dev', v: col.std, c: '#8b5cf6', d: 'Variation spread' },
                                { l: 'Missing', v: col.missing, c: col.missing > 0 ? '#ef4444' : '#10b981', d: 'Empty cells' },
                              ].map(({ l, v, c, d }) => (
                                <div key={l} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '0.75rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                                  <p style={{ margin: 0, fontSize: '0.63rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{l}</p>
                                  <p style={{ margin: '4px 0 2px', fontSize: '1.15rem', fontWeight: 700, color: c }}>{v ?? '—'}</p>
                                  <p style={{ margin: 0, fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)' }}>{d}</p>
                                </div>
                              ))}
                            </div>
                            {/* Histogram */}
                            <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.5rem' }}>Value distribution histogram</p>
                            <ResponsiveContainer width="100%" height={200}>
                              <BarChart data={col.histogram}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.05} />
                                <XAxis dataKey="range" stroke="#a1a1aa" fontSize={9} angle={-25} textAnchor="end" height={45} />
                                <YAxis stroke="#a1a1aa" fontSize={10} allowDecimals={false} />
                                <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                                <Bar dataKey="count" fill={COLORS[idx % COLORS.length]} radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </>
                        ) : (
                          <>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                              <div>
                                <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginBottom: '0.5rem' }}>Top values — most frequent</p>
                                <ResponsiveContainer width="100%" height={200}>
                                  <BarChart data={col.topValues?.slice(0, 8)} layout="vertical">
                                    <XAxis type="number" stroke="#a1a1aa" fontSize={10} allowDecimals={false} />
                                    <YAxis type="category" dataKey="name" stroke="#a1a1aa" fontSize={10} width={85} />
                                    <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                      {col.topValues?.slice(0, 8).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Bar>
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                              <div>
                                <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginBottom: '0.5rem' }}>Distribution (pie)</p>
                                <ResponsiveContainer width="100%" height={200}>
                                  <PieChart>
                                    <Pie data={col.topValues?.slice(0, 6)} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70} paddingAngle={3}>
                                      {col.topValues?.slice(0, 6).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                                    <Legend formatter={v => <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.72rem' }}>{v}</span>} />
                                  </PieChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                            {/* Meta row */}
                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                              {[
                                { l: 'Total values', v: col.count, c: '#fff' },
                                { l: 'Unique', v: col.uniqueCount, c: '#f59e0b' },
                                { l: 'Missing', v: col.missing, c: col.missing > 0 ? '#ef4444' : '#10b981' },
                              ].map(({ l, v, c }) => (
                                <span key={l} style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>
                                  {l}: <b style={{ color: c }}>{v}</b>
                                </span>
                              ))}
                            </div>
                          </>
                        )}
                        <AIBox text={colAI[col.name]} loading={colAILoading[col.name] || false} label={`AI — ${col.name}`} />
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}

          {/* Correlation */}
          {subTab === 'correlation' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {numericCols.length < 2 ? (
                <Card style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.4)' }}>
                  <GitBranch size={36} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                  <p>Correlation ke liye kam se kam 2 numeric columns chahiye.</p>
                </Card>
              ) : (
                <>
                  <Card>
                    <h3 style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.95rem', margin: '0 0 0.5rem', fontWeight: 600 }}>Correlation Analysis</h3>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem', margin: '0 0 1.25rem', lineHeight: 1.5 }}>
                      Do numeric columns ke beech linear relationship measure karta hai. Pearson r: +1 = perfect positive, -1 = perfect negative, 0 = no relation.
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                      {[{ label: 'Column A (X-axis)', val: corrA, set: setCorrA, excl: corrB }, { label: 'Column B (Y-axis)', val: corrB, set: setCorrB, excl: corrA }].map(({ label, val, set, excl }) => (
                        <div key={label}>
                          <label style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '5px' }}>{label}</label>
                          <select value={val} onChange={e => set(e.target.value)} style={{ padding: '9px 14px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', color: '#fff', fontSize: '0.875rem' }}>
                            <option value="">Select column</option>
                            {numericCols.filter((c: any) => c.name !== excl).map((c: any) => <option key={c.name} value={c.name}>{c.name}</option>)}
                          </select>
                        </div>
                      ))}
                      {corrVal !== null && (
                        <div style={{ padding: '12px 20px', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '12px', minWidth: '140px' }}>
                          <p style={{ margin: 0, fontSize: '0.68rem', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pearson r</p>
                          <p style={{ margin: '4px 0 2px', fontSize: '1.75rem', fontWeight: 700, lineHeight: 1, color: Math.abs(corrVal) > 0.7 ? '#10b981' : Math.abs(corrVal) > 0.4 ? '#f59e0b' : '#ef4444' }}>
                            {corrVal}
                          </p>
                          <p style={{ margin: 0, fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>
                            {Math.abs(corrVal) > 0.7 ? 'Strong' : Math.abs(corrVal) > 0.4 ? 'Moderate' : 'Weak'} {corrVal > 0 ? 'positive' : 'negative'}
                          </p>
                        </div>
                      )}
                    </div>
                  </Card>

                  {scatterData.length > 0 && mounted && (
                    <Card>
                      <h3 style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', margin: '0 0 0.5rem', fontWeight: 600 }}>Scatter Plot: {corrA} vs {corrB}</h3>
                      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem', margin: '0 0 0.75rem' }}>
                        Har point ek data row hai — points ek line mein = strong correlation
                      </p>
                      <ResponsiveContainer width="100%" height={320}>
                        <ScatterChart>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.05} />
                          <XAxis dataKey="x" name={corrA} stroke="#a1a1aa" fontSize={11} label={{ value: corrA, position: 'insideBottom', offset: -5, fill: '#a1a1aa', fontSize: 11 }} />
                          <YAxis dataKey="y" name={corrB} stroke="#a1a1aa" fontSize={11} label={{ value: corrB, angle: -90, position: 'insideLeft', fill: '#a1a1aa', fontSize: 11 }} />
                          <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#18181b', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                            formatter={(val: any, name: string) => [val, name === 'x' ? corrA : corrB]} />
                          <Scatter data={scatterData} fill="#6366f1" opacity={0.65} />
                        </ScatterChart>
                      </ResponsiveContainer>
                      {corrVal !== null && (
                        <div style={{ marginTop: '0.75rem', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                          <b style={{ color: '#a5b4fc' }}>Interpretation:</b>{' '}
                          {Math.abs(corrVal) > 0.7
                            ? `Strong ${corrVal > 0 ? 'positive' : 'negative'} correlation (r=${corrVal}) — "${corrA}" badhta hai to "${corrB}" ${corrVal > 0 ? 'bhi badhta' : 'ghatta'} hai consistently.`
                            : Math.abs(corrVal) > 0.4
                            ? `Moderate correlation (r=${corrVal}) — weak lekin noticeable pattern hai inke beech.`
                            : `Weak correlation (r=${corrVal}) — "${corrA}" aur "${corrB}" mostly independent hain.`}
                        </div>
                      )}
                    </Card>
                  )}
                </>
              )}
            </div>
          )}

          {/* S&W */}
          {subTab === 'sw' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: '1rem' }}>
              <Card style={{ background: 'rgba(16,185,129,0.04)', borderColor: 'rgba(16,185,129,0.2)' }}>
                <h3 style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', fontSize: '0.95rem' }}>
                  <Award size={16} /> Dataset Strengths
                </h3>
                {strengths.length === 0
                  ? <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>Koi significant strengths nahi mili.</p>
                  : strengths.map((s, i) => (
                    <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '10px', alignItems: 'flex-start' }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                        <CheckCircle size={11} color="#10b981" />
                      </div>
                      <span style={{ fontSize: '0.84rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>{s}</span>
                    </div>
                  ))}
              </Card>
              <Card style={{ background: 'rgba(239,68,68,0.04)', borderColor: 'rgba(239,68,68,0.2)' }}>
                <h3 style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', fontSize: '0.95rem' }}>
                  <Target size={16} /> Issues & Gaps
                </h3>
                {weaknesses.length === 0
                  ? <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>Koi significant issues nahi mili.</p>
                  : weaknesses.map((w, i) => (
                    <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '10px', alignItems: 'flex-start' }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                        <AlertCircle size={11} color="#ef4444" />
                      </div>
                      <span style={{ fontSize: '0.84rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>{w}</span>
                    </div>
                  ))}
              </Card>
            </div>
          )}
        </>
      )}

      {!dsData && !loading && (
        <Card style={{ textAlign: 'center', padding: '4rem' }}>
          <Database size={48} style={{ color: 'rgba(255,255,255,0.15)', marginBottom: '1rem' }} />
          <h3 style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem', fontWeight: 500 }}>Dataset Analytics</h3>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.875rem' }}>Upar se ek dataset select karo — AI automatically analyze karega</p>
        </Card>
      )}
    </div>
  );

  /* ═══ OVERVIEW RENDER ═══ */
  const renderOverview = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {overview ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '1rem' }}>
            <KPI label="Total Forms" value={overview.kpis?.totalForms} sub="created" icon="📋" />
            <KPI label="Form Responses" value={overview.kpis?.totalSubmissions} sub="submissions" color="#10b981" icon="✅" />
            <KPI label="Datasets" value={overview.kpis?.totalDatasets} sub="uploaded" color="#f59e0b" icon="📊" />
            <KPI label="Total Data Rows" value={overview.kpis?.totalRows} sub="across all" color="#ec4899" icon="🗄️" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))', gap: '1.5rem' }}>
            <Card>
              <h3 style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.95rem', margin: '0 0 4px', fontWeight: 600 }}>Platform Activity (7 days)</h3>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.78rem', margin: '0 0 0.75rem' }}>Events per day (submissions + uploads)</p>
              {mounted && (
                <ResponsiveContainer width="100%" height={210}>
                  <AreaChart data={overview.chartData || []}>
                    <defs>
                      <linearGradient id="overviewGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.05} />
                    <XAxis dataKey="date" stroke="#a1a1aa" fontSize={11} />
                    <YAxis stroke="#a1a1aa" fontSize={11} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                    <Area type="monotone" dataKey="events" stroke="#6366f1" strokeWidth={2.5} fill="url(#overviewGrad)" dot={{ fill: '#6366f1', r: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </Card>
            <Card>
              <h3 style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.95rem', margin: '0 0 4px', fontWeight: 600 }}>Data Source Mix</h3>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.78rem', margin: '0 0 0.75rem' }}>Forms vs File uploads</p>
              {mounted && (
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie data={overview.sourceBreakdown || []} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={4}>
                      {(overview.sourceBreakdown || []).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                    <Legend formatter={v => <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem' }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

          {overview.recentForms?.length > 0 && (
            <Card>
              <h3 style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.95rem', margin: '0 0 4px', fontWeight: 600 }}>Recent Forms</h3>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.78rem', margin: '0 0 0.75rem' }}>Latest forms aur unke response counts</p>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr>{['Form', 'Responses', 'Created'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'rgba(255,255,255,0.35)', borderBottom: '1px solid rgba(255,255,255,0.07)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {overview.recentForms.map((f: any) => (
                    <tr key={f.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.8)' }}>{f.title}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ color: '#6366f1', fontWeight: 700 }}>{f._count.submissions}</span>
                        <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginLeft: '4px' }}>responses</span>
                      </td>
                      <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem' }}>
                        {new Date(f.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: '#6366f1' }} />
        </div>
      )}
    </div>
  );

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#fff', margin: 0 }}>Analytics</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', margin: '4px 0 0', fontSize: '0.875rem' }}>
            AI-powered analysis — select karo aur instantly insights pao
          </p>
        </div>
        <button onClick={fetchOverview} style={{
          display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '10px', color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', cursor: 'pointer'
        }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Main tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <Tab active={tab === 'forms'} onClick={() => { setTab('forms'); setSubTab('summary'); setGlobalAI(null); }} icon={<ClipboardList size={15} />}>Form Analytics</Tab>
        <Tab active={tab === 'datasets'} onClick={() => { setTab('datasets'); setSubTab('summary'); setGlobalAI(null); }} icon={<Database size={15} />}>Dataset Analytics</Tab>
        <Tab active={tab === 'overview'} onClick={() => setTab('overview')} icon={<Globe size={15} />}>Platform Overview</Tab>
      </div>

      {tab === 'forms' && renderForms()}
      {tab === 'datasets' && renderDatasets()}
      {tab === 'overview' && renderOverview()}

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
