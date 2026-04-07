'use client';

import { useState, useEffect } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  ClipboardList, Database, Globe, Loader2, BrainCircuit,
  Sparkles, RefreshCw, Users, FileText, TrendingUp, Hash,
  ChevronDown, ChevronUp, AlertCircle
} from 'lucide-react';

const COLORS = ['#6366f1','#10b981','#f59e0b','#ec4899','#8b5cf6','#06b6d4','#f97316','#84cc16'];

/* ── small helpers ── */
const Card = ({ children, style }: any) => (
  <div style={{
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '16px', padding: '1.5rem', ...style
  }}>{children}</div>
);

const KPI = ({ label, value, sub, color = '#6366f1' }: any) => (
  <div style={{
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '14px', padding: '1.25rem',
  }}>
    <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
    <p style={{ margin: '6px 0 2px', fontSize: '2rem', fontWeight: 700, color: '#fff', lineHeight: 1 }}>{value}</p>
    {sub && <p style={{ margin: 0, fontSize: '0.75rem', color }}>{sub}</p>}
  </div>
);

type Tab = 'forms' | 'datasets' | 'overview';

export default function AnalyticsPage() {
  const [tab, setTab]               = useState<Tab>('forms');
  const [forms, setForms]           = useState<any[]>([]);
  const [datasets, setDatasets]     = useState<any[]>([]);
  const [selectedForm, setSelectedForm]       = useState('');
  const [selectedDataset, setSelectedDataset] = useState('');
  const [formData, setFormData]     = useState<any>(null);
  const [datasetData, setDatasetData] = useState<any>(null);
  const [overview, setOverview]     = useState<any>(null);
  const [loading, setLoading]       = useState(false);
  const [aiText, setAiText]         = useState<string | null>(null);
  const [aiLoading, setAiLoading]   = useState(false);
  const [expandedCol, setExpandedCol] = useState<string | null>(null);
  const [mounted, setMounted]       = useState(false);

  useEffect(() => {
    setMounted(true);
    // Load lists
    fetch('/api/forms').then(r=>r.json()).then(d => {
      const arr = Array.isArray(d) ? d : (d.forms||[]);
      setForms(arr);
      if (arr.length) setSelectedForm(arr[0].id);
    }).catch(()=>{});

    fetch('/api/datasets').then(r=>r.json()).then(d => {
      const arr = Array.isArray(d) ? d : [];
      setDatasets(arr);
      if (arr.length) setSelectedDataset(arr[0].id);
    }).catch(()=>{});

    // Overview
    fetchOverview();
  }, []);

  const fetchOverview = async () => {
    try {
      const r = await fetch('/api/analytics');
      const d = await r.json();
      setOverview(d);
    } catch {}
  };

  const loadFormAnalytics = async (id: string) => {
    if (!id) return;
    setLoading(true); setFormData(null); setAiText(null);
    try {
      const r = await fetch(`/api/analytics/questions?formId=${id}`);
      const d = await r.json();
      setFormData(d);
    } catch (e: any) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadDatasetAnalytics = async (id: string) => {
    if (!id) return;
    setLoading(true); setDatasetData(null); setAiText(null);
    try {
      const r = await fetch(`/api/datasets/${id}/analytics`);
      const d = await r.json();
      setDatasetData(d);
    } catch (e: any) { console.error(e); }
    finally { setLoading(false); }
  };

  const generateAI = async () => {
    setAiLoading(true); setAiText(null);
    try {
      const type = tab === 'forms' ? 'form_report'
                 : tab === 'datasets' ? 'dataset'
                 : 'overall_report';
      const context = tab === 'forms' ? formData
                    : tab === 'datasets' ? datasetData
                    : overview;
      const r = await fetch('/api/ai/analyze', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ type, context })
      });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setAiText(d.analysis);
    } catch (e: any) { alert('AI Error: '+e.message); }
    finally { setAiLoading(false); }
  };

  /* ── Tab content ── */
  const renderForms = () => (
    <div>
      {/* Form selector */}
      <Card style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>
          <ClipboardList size={16} /> Select Form
        </div>
        <select value={selectedForm}
          onChange={e => { setSelectedForm(e.target.value); setFormData(null); setAiText(null); }}
          style={{ flex: 1, minWidth: '200px', maxWidth: '400px', padding: '10px 14px',
            background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '10px', color: '#fff', fontSize: '0.875rem' }}>
          {forms.length === 0
            ? <option>No forms yet</option>
            : forms.map(f => <option key={f.id} value={f.id}>{f.title}</option>)}
        </select>
        <button onClick={() => loadFormAnalytics(selectedForm)}
          disabled={!selectedForm || loading}
          style={{ padding: '10px 22px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 600,
            fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
            opacity: loading ? 0.6 : 1 }}>
          <RefreshCw size={15} /> Load Analytics
        </button>
      </Card>

      {loading && <div style={{ textAlign: 'center', padding: '4rem' }}>
        <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', color: '#6366f1' }} />
      </div>}

      {formData && !loading && (
        <>
          {/* Summary KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <KPI label="Total Responses" value={formData.totalSubmissions} sub="form submissions" />
            <KPI label="Questions" value={formData.questions?.length || 0} sub="in this form" color="#10b981" />
            <KPI label="Answered" value={formData.questions?.reduce((a: number, q: any) => a + q.totalAnswers, 0) || 0} sub="total answers" color="#f59e0b" />
            <KPI label="Response Rate"
              value={formData.totalSubmissions > 0 ? '100%' : '0%'}
              sub="of invites" color="#ec4899" />
          </div>

          {/* AI Button */}
          <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem' }}>
            <button onClick={generateAI} disabled={aiLoading}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
                background: aiText ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.15)',
                border: `1px solid ${aiText ? '#10b981' : '#6366f1'}`,
                borderRadius: '10px', color: aiText ? '#10b981' : '#a5b4fc',
                cursor: aiLoading ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '0.875rem' }}>
              {aiLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <BrainCircuit size={16} />}
              {aiText ? 'AI Analysis Done ✓' : 'Generate AI Analysis'}
            </button>
          </div>

          {/* AI Output */}
          {aiText && (
            <Card style={{ marginBottom: '1.5rem', background: 'rgba(99,102,241,0.06)', borderColor: 'rgba(99,102,241,0.2)' }}>
              <h3 style={{ color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                <Sparkles size={16} /> Gemini AI — Form Analysis
              </h3>
              <div style={{ color: 'rgba(255,255,255,0.82)', lineHeight: 1.8, whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>
                {aiText}
              </div>
            </Card>
          )}

          {/* Per-question cards — Google Forms style */}
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
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: '#6366f1' }}>{q.totalAnswers}</p>
                    <p style={{ margin: 0, fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>responses</p>
                  </div>
                </div>

                {q.chartData?.length > 0 && mounted ? (
                  <div style={{ display: 'grid', gridTemplateColumns: q.chartData.length <= 4 ? '1fr 1fr' : '1fr', gap: '1rem' }}>
                    {/* Bar chart */}
                    <div>
                      <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.5rem' }}>Response Distribution</p>
                      <ResponsiveContainer width="100%" height={220}>
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

                    {/* Pie chart */}
                    {q.chartData.length <= 8 && (
                      <div>
                        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.5rem' }}>Share</p>
                        <ResponsiveContainer width="100%" height={220}>
                          <PieChart>
                            <Pie data={q.chartData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
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
                  <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '10px',
                    color: 'rgba(255,255,255,0.35)', fontSize: '0.85rem', textAlign: 'center' }}>
                    {q.totalAnswers === 0 ? 'No responses yet' : 'Text / open-ended responses — no chart available'}
                  </div>
                )}
              </Card>
            ))}
          </div>
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
          {datasets.length === 0
            ? <option>No datasets uploaded</option>
            : datasets.map(d => <option key={d.id} value={d.id}>{d.filename}</option>)}
        </select>
        <button onClick={() => loadDatasetAnalytics(selectedDataset)}
          disabled={!selectedDataset || loading}
          style={{ padding: '10px 22px', background: 'linear-gradient(135deg,#10b981,#06b6d4)',
            border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 600,
            fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
            opacity: loading ? 0.6 : 1 }}>
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
            <KPI label="Numeric"       value={datasetData.columns?.filter((c:any)=>c.type==='numeric').length} sub="numeric cols" color="#f59e0b" />
            <KPI label="Categorical"   value={datasetData.columns?.filter((c:any)=>c.type==='categorical').length} sub="category cols" color="#ec4899" />
          </div>

          <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem' }}>
            <button onClick={generateAI} disabled={aiLoading}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
                background: aiText ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.1)',
                border: `1px solid ${aiText ? '#10b981' : 'rgba(16,185,129,0.4)'}`,
                borderRadius: '10px', color: '#10b981',
                cursor: aiLoading ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '0.875rem' }}>
              {aiLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <BrainCircuit size={16} />}
              {aiText ? 'AI Done ✓' : 'Gemini AI Analysis'}
            </button>
          </div>

          {aiText && (
            <Card style={{ marginBottom: '1.5rem', background: 'rgba(16,185,129,0.05)', borderColor: 'rgba(16,185,129,0.2)' }}>
              <h3 style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                <Sparkles size={16} /> Gemini AI — Dataset Analysis
              </h3>
              <div style={{ color: 'rgba(255,255,255,0.82)', lineHeight: 1.8, whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>
                {aiText}
              </div>
            </Card>
          )}

          {/* Per-column cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {datasetData.columns?.map((col: any, idx: number) => {
              const isExpanded = expandedCol === col.name;
              return (
                <Card key={col.name}>
                  <button onClick={() => setExpandedCol(isExpanded ? null : col.name)}
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
                      {isExpanded ? <ChevronUp size={16} color="rgba(255,255,255,0.4)" /> : <ChevronDown size={16} color="rgba(255,255,255,0.4)" />}
                    </div>
                  </button>

                  {isExpanded && mounted && (
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
                          <ResponsiveContainer width="100%" height={200}>
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
                            <ResponsiveContainer width="100%" height={200}>
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
                            <ResponsiveContainer width="100%" height={200}>
                              <PieChart>
                                <Pie data={col.topValues?.slice(0,6)} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70}>
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

  const renderOverview = () => (
    <div>
      {overview ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <KPI label="Total Forms"       value={overview.kpis?.totalForms}       sub="created" />
            <KPI label="Form Responses"    value={overview.kpis?.totalSubmissions}  sub="submissions" color="#10b981" />
            <KPI label="Datasets"          value={overview.kpis?.totalDatasets}     sub="uploaded" color="#f59e0b" />
            <KPI label="Total Data Rows"   value={overview.kpis?.totalRows}         sub="across all sources" color="#ec4899" />
          </div>

          <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem' }}>
            <button onClick={generateAI} disabled={aiLoading}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
                background: 'rgba(99,102,241,0.15)', border: '1px solid #6366f1',
                borderRadius: '10px', color: '#a5b4fc',
                cursor: aiLoading ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '0.875rem' }}>
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
            {/* Trend chart */}
            <Card>
              <h3 style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.95rem', marginBottom: '1rem' }}>Activity Trend (7 days)</h3>
              {mounted && (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={overview.chartData || []}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.05} />
                    <XAxis dataKey="date" stroke="#a1a1aa" fontSize={11} />
                    <YAxis stroke="#a1a1aa" fontSize={11} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor:'#18181b', borderColor:'rgba(255,255,255,0.1)', borderRadius:'8px' }} />
                    <Line type="monotone" dataKey="events" stroke="#6366f1" strokeWidth={2} dot={{ fill:'#6366f1', r:4 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* Source mix */}
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

          {/* Recent forms table */}
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
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#fff', margin: 0 }}>Analytics</h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', margin: '4px 0 0', fontSize: '0.875rem' }}>
          Form responses, dataset insights, and platform overview
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem',
        borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: '0' }}>
        {([
          { id: 'forms',    label: 'Form Analytics',    icon: <ClipboardList size={15} /> },
          { id: 'datasets', label: 'Dataset Analytics', icon: <Database size={15} /> },
          { id: 'overview', label: 'Platform Overview', icon: <Globe size={15} /> },
        ] as const).map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setAiText(null); }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px',
              background: 'none', border: 'none', borderBottom: tab === t.id ? '2px solid #6366f1' : '2px solid transparent',
              color: tab === t.id ? '#a5b4fc' : 'rgba(255,255,255,0.45)',
              cursor: 'pointer', fontWeight: tab === t.id ? 600 : 400, fontSize: '0.875rem',
              marginBottom: '-1px', transition: 'all 0.2s' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'forms'    && renderForms()}
      {tab === 'datasets' && renderDatasets()}
      {tab === 'overview' && renderOverview()}

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
