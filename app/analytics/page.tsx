'use client';

import { useState, useEffect, useRef } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine
} from 'recharts';
import {
  ClipboardList, Database, Globe, Loader2, BrainCircuit,
  Sparkles, RefreshCw, TrendingUp, TrendingDown, AlertCircle,
  CheckCircle, ChevronDown, ChevronUp, Activity, GitBranch, Download, FileDown
} from 'lucide-react';

const COLORS = ['#6366f1','#10b981','#f59e0b','#ec4899','#8b5cf6','#06b6d4','#f97316','#84cc16'];

/* ── Helpers ── */
const Card = ({ children, style }: any) => (
  <div style={{
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '16px', padding: '1.5rem', ...style
  }}>{children}</div>
);

const KPI = ({ label, value, sub, color = '#6366f1', growth }: any) => {
  const isPositive = growth > 0;
  const isNegative = growth < 0;
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '14px', padding: '1.25rem',
    }}>
      <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
      <p style={{ margin: '6px 0 2px', fontSize: '2rem', fontWeight: 700, color: '#fff', lineHeight: 1 }}>{value}</p>
      {growth !== undefined && (
        <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: isPositive ? '#10b981' : isNegative ? '#ef4444' : '#a1a1aa', display: 'flex', alignItems: 'center', gap: '4px' }}>
          {isPositive ? <TrendingUp size={12} /> : isNegative ? <TrendingDown size={12} /> : null}
          {isPositive ? '+' : ''}{growth}% MoM
        </p>
      )}
      {sub && !growth && <p style={{ margin: 0, fontSize: '0.75rem', color }}>{sub}</p>}
    </div>
  );
};

const Badge = ({ label, type }: { label: string, type: 'strength' | 'weakness' | 'neutral' }) => {
  const colors: any = {
    strength: { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)', text: '#10b981' },
    weakness: { bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.3)',  text: '#ef4444' },
    neutral:  { bg: 'rgba(99,102,241,0.15)', border: 'rgba(99,102,241,0.3)', text: '#a5b4fc' },
  };
  const c = colors[type];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '4px 10px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 500,
      background: c.bg, border: `1px solid ${c.border}`, color: c.text, margin: '3px'
    }}>
      {type === 'strength' ? <CheckCircle size={11} /> : type === 'weakness' ? <AlertCircle size={11} /> : null}
      {label}
    </span>
  );
};

/* ── Analysis Helpers ── */
function computeGrowth(data: any[], dateKey = 'date', valueKey = 'value') {
  if (!data || data.length < 2) return 0;
  const half = Math.floor(data.length / 2);
  const prev = data.slice(0, half).reduce((s: number, d: any) => s + (d[valueKey] || 0), 0);
  const curr = data.slice(half).reduce((s: number, d: any) => s + (d[valueKey] || 0), 0);
  if (prev === 0) return 100;
  return Math.round(((curr - prev) / prev) * 100);
}

function detectStrengthsWeaknesses(data: any) {
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (!data) return { strengths, weaknesses };

  // Form analysis
  if (data.totalSubmissions > 50) strengths.push('High response volume');
  if (data.totalSubmissions > 0 && data.totalSubmissions < 5) weaknesses.push('Low response count');

  if (data.questions) {
    const answered = data.questions.filter((q: any) => q.totalAnswers > 0);
    const rate = data.questions.length > 0 ? (answered.length / data.questions.length) * 100 : 0;
    if (rate >= 80) strengths.push('High field completion rate');
    else if (rate < 50) weaknesses.push('Low field completion rate');

    const textQs = data.questions.filter((q: any) => q.type === 'text' || q.type === 'textarea');
    if (textQs.length > 0) strengths.push('Qualitative insights available');
  }

  // Dataset analysis
  if (data.rowCount > 1000) strengths.push('Large dataset — statistically significant');
  if (data.rowCount > 0 && data.rowCount < 50) weaknesses.push('Small sample size');

  if (data.columns) {
    const numericCols = data.columns.filter((c: any) => c.type === 'numeric');
    if (numericCols.length >= 2) strengths.push('Multiple numeric columns — correlation possible');

    const highNull = data.columns.filter((c: any) => c.nullRate && c.nullRate > 0.2);
    if (highNull.length > 0) weaknesses.push(`${highNull.length} columns have missing data`);

    const highCardinality = data.columns.filter((c: any) => c.type === 'categorical' && c.uniqueCount > 50);
    if (highCardinality.length > 0) weaknesses.push('High cardinality in categorical columns');
  }

  return { strengths, weaknesses };
}

function computeCorrelation(data: any[][], colA: string, colB: string) {
  const pairs = data
    .map((row: any) => [parseFloat(row[colA]), parseFloat(row[colB])])
    .filter(([a, b]) => !isNaN(a) && !isNaN(b));

  if (pairs.length < 3) return null;

  const n = pairs.length;
  const meanA = pairs.reduce((s, [a]) => s + a, 0) / n;
  const meanB = pairs.reduce((s, [, b]) => s + b, 0) / n;
  const num = pairs.reduce((s, [a, b]) => s + (a - meanA) * (b - meanB), 0);
  const denA = Math.sqrt(pairs.reduce((s, [a]) => s + (a - meanA) ** 2, 0));
  const denB = Math.sqrt(pairs.reduce((s, [, b]) => s + (b - meanB) ** 2, 0));
  if (denA === 0 || denB === 0) return null;

  return Math.round((num / (denA * denB)) * 100) / 100;
}

/* ── Trend builder ── */
function buildTrend(submissions: any[], days = 30) {
  const map: Record<string, number> = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    map[d.toISOString().split('T')[0]] = 0;
  }
  submissions.forEach((s: any) => {
    const d = s.submittedAt ? s.submittedAt.split('T')[0] : null;
    if (d && map[d] !== undefined) map[d]++;
  });
  return Object.entries(map).map(([date, count]) => ({
    date: new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    responses: count,
  }));
}

/* ── Sub-tab components ── */
const SubTab = ({ active, onClick, children }: any) => (
  <button onClick={onClick} style={{
    padding: '7px 16px', border: 'none',
    borderBottom: active ? '2px solid #6366f1' : '2px solid transparent',
    background: 'none', color: active ? '#a5b4fc' : 'rgba(255,255,255,0.45)',
    cursor: 'pointer', fontWeight: active ? 600 : 400, fontSize: '0.82rem', marginBottom: '-1px'
  }}>
    {children}
  </button>
);

type MainTab = 'forms' | 'datasets' | 'overview';

export default function AnalyticsPage() {
  const [tab, setTab]             = useState<MainTab>('forms');
  const [subTab, setSubTab]       = useState('summary');
  const [forms, setForms]         = useState<any[]>([]);
  const [datasets, setDatasets]   = useState<any[]>([]);
  const [selectedForm, setSelectedForm]       = useState('');
  const [selectedDataset, setSelectedDataset] = useState('');
  const [formData, setFormData]   = useState<any>(null);
  const [datasetData, setDatasetData] = useState<any>(null);
  const [rawRows, setRawRows]     = useState<any[]>([]);
  const [overview, setOverview]   = useState<any>(null);
  const [loading, setLoading]     = useState(false);
  const [aiText, setAiText]       = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [expandedCol, setExpandedCol] = useState<string | null>(null);
  const [corrA, setCorrA]         = useState('');
  const [corrB, setCorrB]         = useState('');
  const [mounted, setMounted]     = useState(false);
  const [trendDays, setTrendDays] = useState(30);
  const analyticsRef = useRef<HTMLDivElement>(null);

  const downloadPDF = async () => {
    if (!analyticsRef.current) return;
    try {
      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).default;
      const canvas = await html2canvas(analyticsRef.current, { scale: 2, backgroundColor: "#09090b", useCORS: true });
      const img  = canvas.toDataURL("image/png");
      const pdf  = new jsPDF("p", "mm", "a4");
      const w    = pdf.internal.pageSize.getWidth();
      const h    = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height * w) / canvas.width;
      let pos = 0;
      while (pos < imgH) {
        pdf.addImage(img, "PNG", 0, -pos, w, imgH);
        pos += h;
        if (pos < imgH) pdf.addPage();
      }
      const name = tab === "forms" ? (formData?.formTitle || "form-analytics") : tab === "datasets" ? (datasetData?.filename || "dataset-analytics") : "platform-overview";
      pdf.save(name + "_analytics_" + new Date().toISOString().split("T")[0] + ".pdf");
    } catch (e: any) { alert("PDF Error: " + e.message); }
  };

  const downloadCSV = () => {
    let rows: string[][] = [];
    let filename = "analytics";
    if (tab === "forms" && formData?.questions) {
      filename = formData.formTitle || "form-analytics";
      rows = [["Question","Type","Total Answers","Top Answer","Top Count"]];
      formData.questions.forEach((q: any) => { const top = q.chartData?.[0]; rows.push([q.label, q.type, q.totalAnswers, top?.name||"", top?.value||""]); });
    } else if (tab === "datasets" && datasetData?.columns) {
      filename = datasetData.filename || "dataset-analytics";
      rows = [["Column","Type","Min","Max","Mean","Median","Std Dev","Unique Count"]];
      datasetData.columns.forEach((c: any) => { rows.push([c.name, c.type, c.min??"", c.max??"", c.mean??"", c.median??"", c.std??"", c.uniqueCount??""]); });
    } else if (tab === "overview" && overview?.recentForms) {
      filename = "platform-overview";
      rows = [["Form","Submissions","Created"]];
      overview.recentForms.forEach((f: any) => { rows.push([f.title, f._count.submissions, new Date(f.createdAt).toLocaleDateString()]); });
    }
    if (rows.length === 0) { alert("No data to export"); return; }
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, """")}"` ).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename + "_" + new Date().toISOString().split("T")[0] + ".csv";
    a.click(); URL.revokeObjectURL(url);
  };

  useEffect(() => {
    setMounted(true);
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
    fetchOverview();
  }, []);

  const fetchOverview = async () => {
    try {
      const r = await fetch('/api/analytics');
      setOverview(await r.json());
    } catch {}
  };

  const loadFormAnalytics = async (id: string) => {
    if (!id) return;
    setLoading(true); setFormData(null); setAiText(null); setSubTab('summary');
    try {
      const r = await fetch(`/api/analytics/questions?formId=${id}`);
      setFormData(await r.json());
    } catch {}
    finally { setLoading(false); }
  };

  const loadDatasetAnalytics = async (id: string) => {
    if (!id) return;
    setLoading(true); setDatasetData(null); setRawRows([]); setAiText(null); setSubTab('summary');
    try {
      const r = await fetch(`/api/datasets/${id}/analytics`);
      const d = await r.json();
      setDatasetData(d);
      // Also fetch raw rows for correlation scatter
      const r2 = await fetch(`/api/datasets/${id}`);
      const d2 = await r2.json();
      try {
        const rows = JSON.parse(d2.data || '[]');
        setRawRows(Array.isArray(rows) ? rows : []);
      } catch {}
    } catch {}
    finally { setLoading(false); }
  };

  const generateAI = async () => {
    setAiLoading(true); setAiText(null);
    try {
      const type = tab === 'forms' ? 'form_report' : tab === 'datasets' ? 'dataset' : 'overall_report';
      const context = tab === 'forms' ? formData : tab === 'datasets' ? datasetData : overview;
      const r = await fetch('/api/ai/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, context })
      });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setAiText(d.analysis);
    } catch (e: any) { alert('AI Error: ' + e.message); }
    finally { setAiLoading(false); }
  };

  /* ── Segmentation for form ── */
  const getSegmentation = (data: any) => {
    if (!data?.questions) return [];
    return data.questions
      .filter((q: any) => q.chartData?.length > 0 && q.type !== 'text' && q.type !== 'textarea')
      .slice(0, 4)
      .map((q: any) => ({ name: q.label, data: q.chartData }));
  };

  /* ── Correlation pairs for dataset ── */
  const numericCols = datasetData?.columns?.filter((c: any) => c.type === 'numeric') || [];
  const corrResult = (corrA && corrB && rawRows.length > 0)
    ? computeCorrelation(rawRows, corrA, corrB)
    : null;

  const corrScatterData = (corrA && corrB)
    ? rawRows.slice(0, 200).map((row: any) => ({
        x: parseFloat(row[corrA]),
        y: parseFloat(row[corrB]),
      })).filter(p => !isNaN(p.x) && !isNaN(p.y))
    : [];

  /* ── SW for current data ── */
  const currentData = tab === 'forms' ? formData : datasetData;
  const { strengths, weaknesses } = detectStrengthsWeaknesses(currentData);

  /* ── Trend data for form ── */
  const trendData = formData ? buildTrend(formData.submissions || [], trendDays) : [];
  const trendGrowth = computeGrowth(trendData, 'date', 'responses');

  /* ── RENDER: Forms ── */
  const renderForms = () => (
    <div>
      {/* Selector */}
      <Card style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>
          <ClipboardList size={16} /> Select Form
        </div>
        <select value={selectedForm}
          onChange={e => { setSelectedForm(e.target.value); setFormData(null); setAiText(null); }}
          style={{ flex: 1, minWidth: '200px', maxWidth: '400px', padding: '10px 14px',
            background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '10px', color: '#fff', fontSize: '0.875rem' }}>
          {forms.length === 0 ? <option>No forms yet</option>
            : forms.map(f => <option key={f.id} value={f.id}>{f.title}</option>)}
        </select>
        <button onClick={() => loadFormAnalytics(selectedForm)} disabled={!selectedForm || loading}
          style={{ padding: '10px 22px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 600, fontSize: '0.875rem',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', opacity: loading ? 0.6 : 1 }}>
          <RefreshCw size={15} /> Load Analytics
        </button>
      </Card>

      {loading && <div style={{ textAlign: 'center', padding: '4rem' }}>
        <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', color: '#6366f1' }} />
      </div>}

      {formData && !loading && (
        <>
          {/* KPIs with growth */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <KPI label="Total Responses" value={formData.totalSubmissions} growth={trendGrowth} />
            <KPI label="Questions" value={formData.questions?.length || 0} sub="in this form" color="#10b981" />
            <KPI label="Total Answers" value={formData.questions?.reduce((a: number, q: any) => a + q.totalAnswers, 0) || 0} sub="responses" color="#f59e0b" />
            <KPI label="Completion Rate"
              value={formData.totalSubmissions > 0
                ? `${Math.round(((formData.questions?.filter((q:any)=>q.totalAnswers>0).length||0)/Math.max(formData.questions?.length||1,1))*100)}%`
                : '0%'}
              sub="fields answered" color="#ec4899" />
          </div>

          {/* Sub-tabs */}
          <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', marginBottom: '1.5rem', display: 'flex', gap: '0.25rem' }}>
            {[
              { id: 'summary', label: 'Summary' },
              { id: 'trend',   label: 'Trend Analysis' },
              { id: 'segment', label: 'Segmentation' },
              { id: 'sw',      label: 'Strengths & Weaknesses' },
              { id: 'ai',      label: 'AI Insights' },
            ].map(t => <SubTab key={t.id} active={subTab===t.id} onClick={()=>setSubTab(t.id)}>{t.label}</SubTab>)}
          </div>

          {/* Summary sub-tab */}
          {subTab === 'summary' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {formData.questions?.map((q: any, idx: number) => (
                <Card key={q.fieldId}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Q{idx + 1} · {q.type}
                      </span>
                      <h3 style={{ color: '#fff', margin: '4px 0 0', fontSize: '1rem', fontWeight: 600 }}>{q.label}</h3>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: '#6366f1' }}>{q.totalAnswers}</p>
                      <p style={{ margin: 0, fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>responses</p>
                    </div>
                  </div>
                  {q.chartData?.length > 0 && mounted ? (
                    <div style={{ display: 'grid', gridTemplateColumns: q.chartData.length <= 4 ? '1fr 1fr' : '1fr', gap: '1rem' }}>
                      <div>
                        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.5rem' }}>Distribution</p>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={q.chartData} layout="vertical">
                            <XAxis type="number" stroke="#a1a1aa" fontSize={11} allowDecimals={false} />
                            <YAxis type="category" dataKey="name" stroke="#a1a1aa" fontSize={11} width={90} />
                            <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                            <Bar dataKey="value" radius={[0,6,6,0]}>
                              {q.chartData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      {q.chartData.length <= 8 && (
                        <div>
                          <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.5rem' }}>Share</p>
                          <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                              <Pie data={q.chartData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75}>
                                {q.chartData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                              </Pie>
                              <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                              <Legend formatter={(v) => <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem' }}>{v}</span>} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', color: 'rgba(255,255,255,0.35)', fontSize: '0.85rem', textAlign: 'center' }}>
                      {q.totalAnswers === 0 ? 'No responses yet' : 'Open-ended — no chart'}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}

          {/* Trend sub-tab */}
          {subTab === 'trend' && (
            <div>
              <Card style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <h3 style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.95rem', margin: 0 }}>
                    Response Trend
                    <span style={{ marginLeft: '10px', fontSize: '0.78rem', color: trendGrowth >= 0 ? '#10b981' : '#ef4444' }}>
                      {trendGrowth >= 0 ? '+' : ''}{trendGrowth}% vs previous period
                    </span>
                  </h3>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {[7, 14, 30].map(d => (
                      <button key={d} onClick={() => setTrendDays(d)}
                        style={{ padding: '4px 12px', borderRadius: '8px', border: '1px solid',
                          borderColor: trendDays === d ? '#6366f1' : 'rgba(255,255,255,0.1)',
                          background: trendDays === d ? 'rgba(99,102,241,0.2)' : 'none',
                          color: trendDays === d ? '#a5b4fc' : 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.78rem' }}>
                        {d}d
                      </button>
                    ))}
                  </div>
                </div>
                {mounted && (
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.05} />
                      <XAxis dataKey="date" stroke="#a1a1aa" fontSize={10} interval={Math.floor(trendData.length / 6)} />
                      <YAxis stroke="#a1a1aa" fontSize={11} allowDecimals={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                      <Line type="monotone" dataKey="responses" stroke="#6366f1" strokeWidth={2} dot={false}
                        activeDot={{ r: 4, fill: '#6366f1' }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </Card>

              {/* Monthly comparison bar */}
              {formData.monthlyData && formData.monthlyData.length > 0 && mounted && (
                <Card>
                  <h3 style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.95rem', marginBottom: '1rem' }}>Monthly Comparison</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={formData.monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.05} />
                      <XAxis dataKey="month" stroke="#a1a1aa" fontSize={11} />
                      <YAxis stroke="#a1a1aa" fontSize={11} allowDecimals={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                      <Bar dataKey="count" fill="#6366f1" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              )}
            </div>
          )}

          {/* Segmentation sub-tab */}
          {subTab === 'segment' && (
            <div>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                Breakdown of responses by each question category
              </p>
              {getSegmentation(formData).length === 0 ? (
                <Card style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.4)' }}>
                  No categorical data available for segmentation
                </Card>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: '1rem' }}>
                  {getSegmentation(formData).map((seg: any, i: number) => (
                    <Card key={i}>
                      <h3 style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', marginBottom: '1rem' }}>{seg.name}</h3>
                      {mounted && (
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={seg.data.slice(0, 8)}>
                            <XAxis dataKey="name" stroke="#a1a1aa" fontSize={10} />
                            <YAxis stroke="#a1a1aa" fontSize={10} allowDecimals={false} />
                            <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                            <Bar dataKey="value" radius={[4,4,0,0]}>
                              {seg.data.slice(0,8).map((_: any, j: number) => <Cell key={j} fill={COLORS[j % COLORS.length]} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Strengths & Weaknesses */}
          {subTab === 'sw' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Card style={{ background: 'rgba(16,185,129,0.05)', borderColor: 'rgba(16,185,129,0.2)' }}>
                <h3 style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                  <CheckCircle size={16} /> Strengths
                </h3>
                {strengths.length === 0
                  ? <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>Load more data to detect strengths.</p>
                  : strengths.map((s, i) => <div key={i}><Badge label={s} type="strength" /></div>)}
              </Card>
              <Card style={{ background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.2)' }}>
                <h3 style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                  <AlertCircle size={16} /> Weaknesses
                </h3>
                {weaknesses.length === 0
                  ? <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>No significant weaknesses detected.</p>
                  : weaknesses.map((w, i) => <div key={i}><Badge label={w} type="weakness" /></div>)}
              </Card>
            </div>
          )}

          {/* AI sub-tab */}
          {subTab === 'ai' && (
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 style={{ color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <BrainCircuit size={16} /> AI Analysis
                </h3>
                <button onClick={generateAI} disabled={aiLoading}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 18px',
                    background: 'rgba(99,102,241,0.2)', border: '1px solid #6366f1',
                    borderRadius: '8px', color: '#a5b4fc', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                  {aiLoading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={14} />}
                  {aiText ? 'Regenerate' : 'Generate'}
                </button>
              </div>
              {aiText ? (
                <div style={{ color: 'rgba(255,255,255,0.82)', lineHeight: 1.8, whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>
                  {aiText}
                </div>
              ) : (
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.9rem', textAlign: 'center', padding: '2rem' }}>
                  Click "Generate" to get Claude AI insights on this form's data.
                </p>
              )}
            </Card>
          )}
        </>
      )}

      {!formData && !loading && (
        <Card style={{ textAlign: 'center', padding: '4rem' }}>
          <ClipboardList size={40} style={{ color: 'rgba(255,255,255,0.2)', marginBottom: '1rem' }} />
          <p style={{ color: 'rgba(255,255,255,0.4)' }}>Select a form and click "Load Analytics"</p>
        </Card>
      )}
    </div>
  );

  /* ── RENDER: Datasets ── */
  const renderDatasets = () => (
    <div>
      <Card style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>
          <Database size={16} /> Select Dataset
        </div>
        <select value={selectedDataset}
          onChange={e => { setSelectedDataset(e.target.value); setDatasetData(null); setAiText(null); }}
          style={{ flex: 1, minWidth: '200px', maxWidth: '400px', padding: '10px 14px',
            background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '10px', color: '#fff', fontSize: '0.875rem' }}>
          {datasets.length === 0 ? <option>No datasets uploaded</option>
            : datasets.map(d => <option key={d.id} value={d.id}>{d.filename}</option>)}
        </select>
        <button onClick={() => loadDatasetAnalytics(selectedDataset)} disabled={!selectedDataset || loading}
          style={{ padding: '10px 22px', background: 'linear-gradient(135deg,#10b981,#06b6d4)',
            border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 600, fontSize: '0.875rem',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', opacity: loading ? 0.6 : 1 }}>
          <RefreshCw size={15} /> Load Analytics
        </button>
      </Card>

      {loading && <div style={{ textAlign: 'center', padding: '4rem' }}>
        <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', color: '#10b981' }} />
      </div>}

      {datasetData && !loading && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <KPI label="Total Rows"    value={datasetData.rowCount?.toLocaleString()} sub={datasetData.filename} color="#10b981" />
            <KPI label="Columns"       value={datasetData.columnCount} sub="total fields" color="#06b6d4" />
            <KPI label="Numeric Cols"  value={datasetData.columns?.filter((c:any)=>c.type==='numeric').length} sub="numeric" color="#f59e0b" />
            <KPI label="Categorical"   value={datasetData.columns?.filter((c:any)=>c.type==='categorical').length} sub="categorical" color="#ec4899" />
          </div>

          {/* Dataset Sub-tabs */}
          <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', marginBottom: '1.5rem', display: 'flex', gap: '0.25rem' }}>
            {[
              { id: 'summary',     label: 'Column Summary' },
              { id: 'correlation', label: 'Correlation' },
              { id: 'sw',          label: 'Strengths & Weaknesses' },
              { id: 'ai',          label: 'AI Insights' },
            ].map(t => <SubTab key={t.id} active={subTab===t.id} onClick={()=>setSubTab(t.id)}>{t.label}</SubTab>)}
          </div>

          {/* Column Summary */}
          {subTab === 'summary' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {datasetData.columns?.map((col: any, idx: number) => {
                const isExp = expandedCol === col.name;
                return (
                  <Card key={col.name}>
                    <button onClick={() => setExpandedCol(isExp ? null : col.name)}
                      style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: '6px', fontWeight: 700,
                          background: col.type === 'numeric' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                          color: col.type === 'numeric' ? '#10b981' : '#f59e0b' }}>
                          {col.type === 'numeric' ? '123' : 'ABC'}
                        </span>
                        <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem' }}>{col.name}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {col.type === 'numeric'
                          ? <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
                              avg: <b style={{ color: '#10b981' }}>{col.mean}</b> · min: {col.min} · max: {col.max}
                            </span>
                          : <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
                              {col.uniqueCount} unique values
                            </span>}
                        {isExp ? <ChevronUp size={16} color="rgba(255,255,255,0.4)" /> : <ChevronDown size={16} color="rgba(255,255,255,0.4)" />}
                      </div>
                    </button>

                    {isExp && mounted && (
                      <div style={{ marginTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '1.25rem' }}>
                        {col.type === 'numeric' ? (
                          <>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(100px,1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
                              {[['Min',col.min,'#6366f1'],['Max',col.max,'#ec4899'],['Mean',col.mean,'#10b981'],['Median',col.median,'#f59e0b'],['Std Dev',col.std,'#8b5cf6']].map(([l,v,c])=>(
                                <div key={String(l)} style={{ background:'rgba(255,255,255,0.04)', borderRadius:'8px', padding:'0.75rem' }}>
                                  <p style={{ margin:0, fontSize:'0.68rem', color:'rgba(255,255,255,0.4)' }}>{l}</p>
                                  <p style={{ margin:'4px 0 0', fontSize:'1.1rem', fontWeight:700, color: String(c) }}>{v}</p>
                                </div>
                              ))}
                            </div>
                            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.5rem' }}>Histogram</p>
                            <ResponsiveContainer width="100%" height={180}>
                              <BarChart data={col.histogram}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.05} />
                                <XAxis dataKey="range" stroke="#a1a1aa" fontSize={9} angle={-30} textAnchor="end" height={50} />
                                <YAxis stroke="#a1a1aa" fontSize={10} allowDecimals={false} />
                                <Tooltip contentStyle={{ backgroundColor:'#18181b', borderColor:'rgba(255,255,255,0.1)', borderRadius:'8px' }} />
                                <Bar dataKey="count" fill={COLORS[idx % COLORS.length]} radius={[4,4,0,0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </>
                        ) : (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.5rem' }}>Top Values</p>
                              <ResponsiveContainer width="100%" height={180}>
                                <BarChart data={col.topValues?.slice(0,8)} layout="vertical">
                                  <XAxis type="number" stroke="#a1a1aa" fontSize={10} allowDecimals={false} />
                                  <YAxis type="category" dataKey="name" stroke="#a1a1aa" fontSize={10} width={80} />
                                  <Tooltip contentStyle={{ backgroundColor:'#18181b', borderColor:'rgba(255,255,255,0.1)', borderRadius:'8px' }} />
                                  <Bar dataKey="value" radius={[0,4,4,0]}>
                                    {col.topValues?.slice(0,8).map((_:any,i:number)=><Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                            <div>
                              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.5rem' }}>Distribution</p>
                              <ResponsiveContainer width="100%" height={180}>
                                <PieChart>
                                  <Pie data={col.topValues?.slice(0,6)} dataKey="value" nameKey="name" innerRadius={35} outerRadius={65}>
                                    {col.topValues?.slice(0,6).map((_:any,i:number)=><Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                                  </Pie>
                                  <Tooltip contentStyle={{ backgroundColor:'#18181b', borderColor:'rgba(255,255,255,0.1)', borderRadius:'8px' }} />
                                  <Legend formatter={v=><span style={{color:'rgba(255,255,255,0.6)',fontSize:'0.72rem'}}>{v}</span>} />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}

          {/* Correlation */}
          {subTab === 'correlation' && (
            <div>
              {numericCols.length < 2 ? (
                <Card style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.4)' }}>
                  <GitBranch size={32} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                  <p>Need at least 2 numeric columns for correlation analysis.</p>
                </Card>
              ) : (
                <>
                  <Card style={{ marginBottom: '1rem' }}>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                      Select two numeric columns to analyze their relationship
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '4px' }}>Column A (X-axis)</label>
                        <select value={corrA} onChange={e => setCorrA(e.target.value)}
                          style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#fff', fontSize: '0.875rem' }}>
                          <option value="">Select column</option>
                          {numericCols.map((c: any) => <option key={c.name} value={c.name}>{c.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '4px' }}>Column B (Y-axis)</label>
                        <select value={corrB} onChange={e => setCorrB(e.target.value)}
                          style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#fff', fontSize: '0.875rem' }}>
                          <option value="">Select column</option>
                          {numericCols.filter((c: any) => c.name !== corrA).map((c: any) => <option key={c.name} value={c.name}>{c.name}</option>)}
                        </select>
                      </div>
                      {corrResult !== null && (
                        <div style={{ padding: '10px 18px', background: 'rgba(99,102,241,0.15)', border: '1px solid #6366f1', borderRadius: '10px' }}>
                          <p style={{ margin: 0, fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>Pearson Correlation (r)</p>
                          <p style={{ margin: '2px 0 0', fontSize: '1.5rem', fontWeight: 700,
                            color: Math.abs(corrResult) > 0.7 ? '#10b981' : Math.abs(corrResult) > 0.4 ? '#f59e0b' : '#ef4444' }}>
                            {corrResult}
                          </p>
                          <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>
                            {Math.abs(corrResult) > 0.7 ? 'Strong' : Math.abs(corrResult) > 0.4 ? 'Moderate' : 'Weak'}{' '}
                            {corrResult > 0 ? 'positive' : 'negative'} correlation
                          </p>
                        </div>
                      )}
                    </div>
                  </Card>

                  {corrScatterData.length > 0 && mounted && (
                    <Card>
                      <h3 style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                        Scatter Plot: {corrA} vs {corrB}
                      </h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <ScatterChart>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.05} />
                          <XAxis dataKey="x" name={corrA} stroke="#a1a1aa" fontSize={11} label={{ value: corrA, position: 'bottom', fill: '#a1a1aa', fontSize: 11 }} />
                          <YAxis dataKey="y" name={corrB} stroke="#a1a1aa" fontSize={11} label={{ value: corrB, angle: -90, position: 'insideLeft', fill: '#a1a1aa', fontSize: 11 }} />
                          <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#18181b', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                          <Scatter data={corrScatterData} fill="#6366f1" opacity={0.7} />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </Card>
                  )}
                </>
              )}
            </div>
          )}

          {/* S&W for dataset */}
          {subTab === 'sw' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Card style={{ background: 'rgba(16,185,129,0.05)', borderColor: 'rgba(16,185,129,0.2)' }}>
                <h3 style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                  <CheckCircle size={16} /> Strengths
                </h3>
                {strengths.length === 0
                  ? <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>No significant strengths detected.</p>
                  : strengths.map((s, i) => <div key={i}><Badge label={s} type="strength" /></div>)}
              </Card>
              <Card style={{ background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.2)' }}>
                <h3 style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                  <AlertCircle size={16} /> Weaknesses / Issues
                </h3>
                {weaknesses.length === 0
                  ? <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>No significant issues detected.</p>
                  : weaknesses.map((w, i) => <div key={i}><Badge label={w} type="weakness" /></div>)}
              </Card>
            </div>
          )}

          {/* AI for dataset */}
          {subTab === 'ai' && (
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 style={{ color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <BrainCircuit size={16} /> AI Dataset Analysis
                </h3>
                <button onClick={generateAI} disabled={aiLoading}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 18px',
                    background: 'rgba(16,185,129,0.15)', border: '1px solid #10b981',
                    borderRadius: '8px', color: '#10b981', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                  {aiLoading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={14} />}
                  {aiText ? 'Regenerate' : 'Generate'}
                </button>
              </div>
              {aiText ? (
                <div style={{ color: 'rgba(255,255,255,0.82)', lineHeight: 1.8, whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>
                  {aiText}
                </div>
              ) : (
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.9rem', textAlign: 'center', padding: '2rem' }}>
                  Click "Generate" to get Claude AI insights on this dataset.
                </p>
              )}
            </Card>
          )}
        </>
      )}

      {!datasetData && !loading && (
        <Card style={{ textAlign: 'center', padding: '4rem' }}>
          <Database size={40} style={{ color: 'rgba(255,255,255,0.2)', marginBottom: '1rem' }} />
          <p style={{ color: 'rgba(255,255,255,0.4)' }}>Select a dataset and click "Load Analytics"</p>
        </Card>
      )}
    </div>
  );

  /* ── RENDER: Overview ── */
  const renderOverview = () => (
    <div>
      {overview ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <KPI label="Total Forms"     value={overview.kpis?.totalForms}      sub="created" />
            <KPI label="Form Responses"  value={overview.kpis?.totalSubmissions} sub="submissions" color="#10b981" />
            <KPI label="Datasets"        value={overview.kpis?.totalDatasets}    sub="uploaded" color="#f59e0b" />
            <KPI label="Total Data Rows" value={overview.kpis?.totalRows}        sub="across all" color="#ec4899" />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <button onClick={generateAI} disabled={aiLoading}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
                background: 'rgba(99,102,241,0.15)', border: '1px solid #6366f1',
                borderRadius: '10px', color: '#a5b4fc', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}>
              {aiLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <BrainCircuit size={16} />}
              {aiText ? 'AI Done ✓' : 'Platform AI Summary'}
            </button>
            <button onClick={fetchOverview}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px',
                background: 'none', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.875rem' }}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          {aiText && (
            <Card style={{ marginBottom: '1.5rem', background: 'rgba(99,102,241,0.06)', borderColor: 'rgba(99,102,241,0.2)' }}>
              <h3 style={{ color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                <Sparkles size={16} /> Platform AI Summary
              </h3>
              <div style={{ color: 'rgba(255,255,255,0.82)', lineHeight: 1.8, whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>
                {aiText}
              </div>
            </Card>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))', gap: '1.5rem' }}>
            <Card>
              <h3 style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.95rem', marginBottom: '1rem' }}>
                Activity Trend (7 days)
              </h3>
              {mounted && (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={overview.chartData || []}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.05} />
                    <XAxis dataKey="date" stroke="#a1a1aa" fontSize={11} />
                    <YAxis stroke="#a1a1aa" fontSize={11} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor:'#18181b', borderColor:'rgba(255,255,255,0.1)', borderRadius:'8px' }} />
                    <Line type="monotone" dataKey="events" stroke="#6366f1" strokeWidth={2} dot={{ fill:'#6366f1', r:3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Card>
            <Card>
              <h3 style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.95rem', marginBottom: '1rem' }}>Data Source Mix</h3>
              {mounted && (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={overview.sourceBreakdown || []} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85}>
                      {(overview.sourceBreakdown||[]).map((_:any,i:number)=><Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor:'#18181b', borderColor:'rgba(255,255,255,0.1)', borderRadius:'8px' }} />
                    <Legend formatter={v=><span style={{color:'rgba(255,255,255,0.7)',fontSize:'0.8rem'}}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

          {overview.recentForms?.length > 0 && (
            <Card style={{ marginTop: '1.5rem' }}>
              <h3 style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.95rem', marginBottom: '1rem' }}>Recent Forms</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr>{['Form','Responses','Created'].map(h=>(
                    <th key={h} style={{ padding:'8px 12px', textAlign:'left', color:'rgba(255,255,255,0.35)',
                      borderBottom:'1px solid rgba(255,255,255,0.07)', fontSize:'0.72rem', textTransform:'uppercase' }}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {overview.recentForms.map((f:any)=>(
                    <tr key={f.id} style={{ borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding:'10px 12px', color:'rgba(255,255,255,0.8)' }}>{f.title}</td>
                      <td style={{ padding:'10px 12px', color:'#6366f1', fontWeight:600 }}>{f._count.submissions}</td>
                      <td style={{ padding:'10px 12px', color:'rgba(255,255,255,0.4)' }}>{new Date(f.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </>
      ) : (
        <div style={{ textAlign:'center', padding:'4rem' }}>
          <Loader2 size={36} style={{ animation:'spin 1s linear infinite', color:'#6366f1' }} />
        </div>
      )}
    </div>
  );

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#fff', margin: 0 }}>Analytics</h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', margin: '4px 0 0', fontSize: '0.875rem' }}>
            Trend analysis, segmentation, correlation & AI insights
          </p>
        </div>
        {(formData || datasetData || overview) && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={downloadCSV}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px',
                background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)',
                borderRadius: '10px', color: '#10b981', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}>
              <FileDown size={15} /> CSV
            </button>
            <button onClick={downloadPDF}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px',
                background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none',
                borderRadius: '10px', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}>
              <Download size={15} /> PDF
            </button>
          </div>
        )}
      </div>

      {/* Main Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem',
        borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: '0' }}>
        {([
          { id: 'forms',    label: 'Form Analytics',    icon: <ClipboardList size={15} /> },
          { id: 'datasets', label: 'Dataset Analytics', icon: <Database size={15} /> },
          { id: 'overview', label: 'Platform Overview', icon: <Globe size={15} /> },
        ] as const).map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setAiText(null); setSubTab('summary'); }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px',
              background: 'none', border: 'none', borderBottom: tab === t.id ? '2px solid #6366f1' : '2px solid transparent',
              color: tab === t.id ? '#a5b4fc' : 'rgba(255,255,255,0.45)',
              cursor: 'pointer', fontWeight: tab === t.id ? 600 : 400, fontSize: '0.875rem',
              marginBottom: '-1px', transition: 'all 0.2s' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div ref={analyticsRef}>
        {tab === 'forms'    && renderForms()}
        {tab === 'datasets' && renderDatasets()}
        {tab === 'overview' && renderOverview()}
      </div>

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
