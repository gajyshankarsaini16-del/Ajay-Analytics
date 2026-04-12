'use client';

import { useState, useEffect } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  ClipboardList, Database, Globe, Loader2, BrainCircuit,
  Sparkles, RefreshCw, TrendingUp, TrendingDown, AlertCircle,
  CheckCircle, ChevronDown, ChevronUp, GitBranch, Info, Zap
} from 'lucide-react';

const COLORS = ['#6366f1','#10b981','#f59e0b','#ec4899','#8b5cf6','#06b6d4','#f97316','#84cc16'];

const Card = ({ children, style }: any) => (
  <div style={{
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '16px', padding: '1.5rem', ...style
  }}>{children}</div>
);

const KPI = ({ label, value, sub, color = '#6366f1', growth }: any) => (
  <div style={{
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '14px', padding: '1.25rem',
  }}>
    <p style={{ margin: 0, fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
    <p style={{ margin: '6px 0 2px', fontSize: '2rem', fontWeight: 700, color: '#fff', lineHeight: 1 }}>{value ?? '—'}</p>
    {growth !== undefined && (
      <p style={{ margin: 0, fontSize: '0.75rem', color: growth > 0 ? '#10b981' : growth < 0 ? '#ef4444' : '#a1a1aa',
        display: 'flex', alignItems: 'center', gap: '4px' }}>
        {growth > 0 ? <TrendingUp size={12}/> : growth < 0 ? <TrendingDown size={12}/> : null}
        {growth > 0 ? '+' : ''}{growth}% MoM
      </p>
    )}
    {sub && growth === undefined && <p style={{ margin: 0, fontSize: '0.75rem', color }}>{sub}</p>}
  </div>
);

const AIBox = ({ text, loading }: { text: string|null, loading: boolean }) => {
  if (!text && !loading) return null;
  return (
    <div style={{
      background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.18)',
      borderRadius: '10px', padding: '0.9rem 1rem', marginTop: '0.75rem',
      display: 'flex', gap: '8px', alignItems: 'flex-start'
    }}>
      {loading
        ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite', color: '#a5b4fc', flexShrink: 0, marginTop: '2px' }} />
        : <Sparkles size={14} style={{ color: '#a5b4fc', flexShrink: 0, marginTop: '2px' }} />}
      <p style={{ margin: 0, fontSize: '0.82rem', color: 'rgba(255,255,255,0.78)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
        {loading ? 'AI analysis chal rahi hai...' : text}
      </p>
    </div>
  );
};

const Desc = ({ text }: { text: string }) => (
  <p style={{ margin: '6px 0 0', fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>{text}</p>
);

const SubTabBtn = ({ active, onClick, children }: any) => (
  <button onClick={onClick} style={{
    padding: '7px 16px', border: 'none', background: 'none',
    borderBottom: active ? '2px solid #6366f1' : '2px solid transparent',
    color: active ? '#a5b4fc' : 'rgba(255,255,255,0.45)',
    cursor: 'pointer', fontWeight: active ? 600 : 400, fontSize: '0.82rem', marginBottom: '-1px'
  }}>{children}</button>
);

function buildTrend(days = 30) {
  const map: Record<string,number> = {};
  for (let i = days-1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    map[d.toISOString().split('T')[0]] = 0;
  }
  return map;
}

function pearson(rows: any[], a: string, b: string) {
  const pairs = rows.map((r:any)=>[parseFloat(r[a]),parseFloat(r[b])]).filter(([x,y])=>!isNaN(x)&&!isNaN(y));
  if (pairs.length < 3) return null;
  const n = pairs.length;
  const ma = pairs.reduce((s,[x])=>s+x,0)/n;
  const mb = pairs.reduce((s,[,y])=>s+y,0)/n;
  const num = pairs.reduce((s,[x,y])=>s+(x-ma)*(y-mb),0);
  const da = Math.sqrt(pairs.reduce((s,[x])=>s+(x-ma)**2,0));
  const db = Math.sqrt(pairs.reduce((s,[,y])=>s+(y-mb)**2,0));
  if (!da||!db) return null;
  return Math.round((num/(da*db))*100)/100;
}

type Tab = 'forms'|'datasets'|'overview';

export default function AnalyticsPage() {
  const [tab, setTab]           = useState<Tab>('forms');
  const [subTab, setSubTab]     = useState('summary');
  const [forms, setForms]       = useState<any[]>([]);
  const [datasets, setDatasets] = useState<any[]>([]);
  const [selForm, setSelForm]   = useState('');
  const [selDs, setSelDs]       = useState('');
  const [formData, setFormData] = useState<any>(null);
  const [dsData, setDsData]     = useState<any>(null);
  const [rawRows, setRawRows]   = useState<any[]>([]);
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading]   = useState(false);
  const [mounted, setMounted]   = useState(false);
  const [trendDays, setTrendDays] = useState(30);
  const [corrA, setCorrA]       = useState('');
  const [corrB, setCorrB]       = useState('');
  const [expandedCol, setExpandedCol] = useState<string|null>(null);

  // AI states
  const [globalAI, setGlobalAI]           = useState<string|null>(null);
  const [globalAILoading, setGlobalAILoading] = useState(false);
  const [colAI, setColAI]                 = useState<Record<string,string>>({});
  const [colAILoading, setColAILoading]   = useState<Record<string,boolean>>({});
  const [qAI, setQAI]                     = useState<Record<string,string>>({});
  const [qAILoading, setQAILoading]       = useState<Record<string,boolean>>({});

  useEffect(() => {
    setMounted(true);
    fetch('/api/forms').then(r=>r.json()).then(d=>{
      const arr = Array.isArray(d)?d:(d.forms||[]);
      setForms(arr); if(arr.length) setSelForm(arr[0].id);
    }).catch(()=>{});
    fetch('/api/datasets').then(r=>r.json()).then(d=>{
      const arr = Array.isArray(d)?d:[];
      setDatasets(arr); if(arr.length) setSelDs(arr[0].id);
    }).catch(()=>{});
    fetchOverview();
  }, []);

  // Auto-load when form selected
  useEffect(() => { if(selForm && tab==='forms') loadForm(selForm); }, [selForm]);
  // Auto-load when dataset selected
  useEffect(() => { if(selDs && tab==='datasets') loadDs(selDs); }, [selDs]);

  const fetchOverview = async () => {
    try { const r=await fetch('/api/analytics'); setOverview(await r.json()); } catch{}
  };

  const callAI = async (type: string, context: any): Promise<string> => {
    const r = await fetch('/api/ai/analyze', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ type, context })
    });
    const d = await r.json();
    if(d.error) throw new Error(d.error);
    return d.analysis;
  };

  const loadForm = async (id: string) => {
    if(!id) return;
    setLoading(true); setFormData(null); setGlobalAI(null); setQAI({}); setSubTab('summary');
    try {
      const r = await fetch(`/api/analytics/questions?formId=${id}`);
      const d = await r.json();
      setFormData(d);
      // Auto global AI
      setGlobalAILoading(true);
      callAI('form_report', d).then(t=>setGlobalAI(t)).catch(()=>{}).finally(()=>setGlobalAILoading(false));
      // Auto per-question AI
      d.questions?.filter((q:any)=>q.totalAnswers>0).forEach((q:any)=>{
        setQAILoading(p=>({...p,[q.fieldId]:true}));
        callAI('question_insight', { label:q.label, type:q.type, totalAnswers:q.totalAnswers, chartData:q.chartData?.slice(0,10) })
          .then(t=>setQAI(p=>({...p,[q.fieldId]:t})))
          .catch(()=>{})
          .finally(()=>setQAILoading(p=>({...p,[q.fieldId]:false})));
      });
    } catch{} finally { setLoading(false); }
  };

  const loadDs = async (id: string) => {
    if(!id) return;
    setLoading(true); setDsData(null); setRawRows([]); setGlobalAI(null); setColAI({}); setSubTab('summary'); setExpandedCol(null);
    try {
      const [r1, r2] = await Promise.all([fetch(`/api/datasets/${id}/analytics`), fetch(`/api/datasets/${id}`)]);
      const d1 = await r1.json();
      const d2 = await r2.json();
      setDsData(d1);
      try { const rows=JSON.parse(d2.data||'[]'); setRawRows(Array.isArray(rows)?rows:[]); } catch{}
      // Auto global AI
      setGlobalAILoading(true);
      callAI('dataset', d1).then(t=>setGlobalAI(t)).catch(()=>{}).finally(()=>setGlobalAILoading(false));
      // Auto per-column AI for first 5 columns
      d1.columns?.slice(0,5).forEach((col:any)=>{
        setColAILoading(p=>({...p,[col.name]:true}));
        callAI('column_insight', { name:col.name, type:col.type,
          ...(col.type==='numeric' ? {min:col.min,max:col.max,mean:col.mean,median:col.median,std:col.std} : {uniqueCount:col.uniqueCount, topValues:col.topValues?.slice(0,5), missing:col.missing})
        }).then(t=>setColAI(p=>({...p,[col.name]:t}))).catch(()=>{}).finally(()=>setColAILoading(p=>({...p,[col.name]:false})));
      });
    } catch{} finally { setLoading(false); }
  };

  const getColAIOnExpand = (col: any) => {
    setExpandedCol(prev => prev===col.name ? null : col.name);
    if (!colAI[col.name] && !colAILoading[col.name]) {
      setColAILoading(p=>({...p,[col.name]:true}));
      callAI('column_insight', { name:col.name, type:col.type,
        ...(col.type==='numeric' ? {min:col.min,max:col.max,mean:col.mean,median:col.median,std:col.std} : {uniqueCount:col.uniqueCount, topValues:col.topValues?.slice(0,5), missing:col.missing})
      }).then(t=>setColAI(p=>({...p,[col.name]:t}))).catch(()=>{}).finally(()=>setColAILoading(p=>({...p,[col.name]:false})));
    }
  };

  /* ── Trend data ── */
  const trendData = (() => {
    const map = buildTrend(trendDays);
    (formData?.submissions || []).forEach((s:any)=>{
      const d = s.submittedAt?.split?.('T')?.[0];
      if(d && map[d]!==undefined) map[d]++;
    });
    return Object.entries(map).map(([date,responses])=>({
      date: new Date(date).toLocaleDateString('en-IN',{day:'numeric',month:'short'}),
      responses
    }));
  })();

  const trendGrowth = (() => {
    if(trendData.length < 2) return 0;
    const half = Math.floor(trendData.length/2);
    const prev = trendData.slice(0,half).reduce((s,d)=>s+d.responses,0);
    const curr = trendData.slice(half).reduce((s,d)=>s+d.responses,0);
    if(!prev) return 100;
    return Math.round(((curr-prev)/prev)*100);
  })();

  const numericCols = dsData?.columns?.filter((c:any)=>c.type==='numeric') || [];
  const corrVal = corrA && corrB && rawRows.length ? pearson(rawRows,corrA,corrB) : null;
  const scatterData = corrA && corrB
    ? rawRows.slice(0,300).map((r:any)=>({x:parseFloat(r[corrA]),y:parseFloat(r[corrB])})).filter(p=>!isNaN(p.x)&&!isNaN(p.y))
    : [];

  /* ── SW detection ── */
  const strengths: string[] = [], weaknesses: string[] = [];
  if(formData) {
    if(formData.totalSubmissions>50) strengths.push('High response volume ('+formData.totalSubmissions+' responses)');
    if(formData.totalSubmissions<5)  weaknesses.push('Very low responses — only '+formData.totalSubmissions);
    const answered = formData.questions?.filter((q:any)=>q.totalAnswers>0).length||0;
    const total    = formData.questions?.length||1;
    const rate     = Math.round((answered/total)*100);
    if(rate>=80) strengths.push('High field engagement — '+rate+'% questions answered');
    else         weaknesses.push('Low engagement — only '+rate+'% questions have responses');
  }
  if(dsData) {
    if(dsData.rowCount>1000) strengths.push('Large dataset ('+dsData.rowCount.toLocaleString()+' rows) — statistically reliable');
    if(dsData.rowCount<50)   weaknesses.push('Small sample size ('+dsData.rowCount+' rows) — low reliability');
    if(numericCols.length>=2) strengths.push(numericCols.length+' numeric columns — correlation analysis possible');
    const missing = dsData.columns?.filter((c:any)=>(c.missing||0)>0).length||0;
    if(missing>0) weaknesses.push(missing+' columns have missing values');
  }

  /* ══ RENDER FORMS ══ */
  const renderForms = () => (
    <div>
      <Card style={{ marginBottom:'1.5rem', display:'flex', alignItems:'center', gap:'1rem', flexWrap:'wrap' }}>
        <ClipboardList size={16} style={{color:'rgba(255,255,255,0.5)'}}/>
        <select value={selForm} onChange={e=>{setSelForm(e.target.value);}}
          style={{ flex:1, minWidth:'200px', maxWidth:'400px', padding:'10px 14px',
            background:'rgba(0,0,0,0.3)', border:'1px solid rgba(255,255,255,0.12)',
            borderRadius:'10px', color:'#fff', fontSize:'0.875rem' }}>
          {forms.length===0 ? <option>No forms yet</option>
            : forms.map(f=><option key={f.id} value={f.id}>{f.title}</option>)}
        </select>
        <div style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'0.78rem',color:'rgba(255,255,255,0.4)'}}>
          <Zap size={13} color="#10b981"/> Auto-analyzing on select
        </div>
      </Card>

      {loading && <div style={{textAlign:'center',padding:'4rem'}}><Loader2 size={36} style={{animation:'spin 1s linear infinite',color:'#6366f1'}}/></div>}

      {formData && !loading && (<>
        {/* Global AI Summary */}
        <div style={{marginBottom:'1.5rem'}}>
          <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'0.5rem'}}>
            <BrainCircuit size={16} color="#a5b4fc"/>
            <span style={{color:'#a5b4fc',fontWeight:600,fontSize:'0.9rem'}}>AI Overall Analysis</span>
            <span style={{fontSize:'0.72rem',color:'rgba(255,255,255,0.3)'}}>— auto generated</span>
          </div>
          <AIBox text={globalAI} loading={globalAILoading}/>
        </div>

        {/* KPIs */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:'1rem',marginBottom:'1.5rem'}}>
          <KPI label="Total Responses" value={formData.totalSubmissions} growth={trendGrowth}/>
          <KPI label="Questions" value={formData.questions?.length||0} sub="in this form" color="#10b981"/>
          <KPI label="Total Answers" value={formData.questions?.reduce((a:number,q:any)=>a+q.totalAnswers,0)||0} sub="all responses" color="#f59e0b"/>
          <KPI label="Completion Rate"
            value={formData.totalSubmissions>0 ? `${Math.round(((formData.questions?.filter((q:any)=>q.totalAnswers>0).length||0)/Math.max(formData.questions?.length||1,1))*100)}%` : '0%'}
            sub="fields answered" color="#ec4899"/>
        </div>

        {/* Sub-tabs */}
        <div style={{borderBottom:'1px solid rgba(255,255,255,0.07)',marginBottom:'1.5rem',display:'flex',gap:'0.25rem'}}>
          {[{id:'summary',l:'Per Question'},{id:'trend',l:'Trend'},{id:'segment',l:'Segmentation'},{id:'sw',l:'Strengths & Weaknesses'}].map(t=>
            <SubTabBtn key={t.id} active={subTab===t.id} onClick={()=>setSubTab(t.id)}>{t.l}</SubTabBtn>
          )}
        </div>

        {/* Per Question */}
        {subTab==='summary' && (
          <div style={{display:'flex',flexDirection:'column',gap:'1.5rem'}}>
            {formData.questions?.map((q:any,idx:number)=>(
              <Card key={q.fieldId}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'0.75rem'}}>
                  <div>
                    <span style={{fontSize:'0.7rem',color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.06em'}}>
                      Q{idx+1} · {q.type}
                    </span>
                    <h3 style={{color:'#fff',margin:'4px 0 0',fontSize:'1rem',fontWeight:600}}>{q.label}</h3>
                    <Desc text={
                      q.type==='text' ? 'Open-ended text question — responses collected but not charted.' :
                      q.type==='rating' ? 'Rating scale question — shows how respondents rated this item.' :
                      q.type==='dropdown' ? 'Dropdown selection — shows distribution of chosen options.' :
                      q.type==='multiple_choice' ? 'Multiple choice — respondents could select multiple options.' :
                      'Question response distribution shown below.'
                    }/>
                  </div>
                  <div style={{textAlign:'right',flexShrink:0}}>
                    <p style={{margin:0,fontSize:'1.5rem',fontWeight:700,color:'#6366f1'}}>{q.totalAnswers}</p>
                    <p style={{margin:0,fontSize:'0.7rem',color:'rgba(255,255,255,0.4)'}}>responses</p>
                    <p style={{margin:'2px 0 0',fontSize:'0.7rem',color: formData.totalSubmissions>0 ? '#10b981' : 'rgba(255,255,255,0.3)'}}>
                      {formData.totalSubmissions>0 ? Math.round((q.totalAnswers/formData.totalSubmissions)*100)+'% rate' : '—'}
                    </p>
                  </div>
                </div>

                {q.chartData?.length>0 && mounted ? (
                  <div style={{display:'grid',gridTemplateColumns:q.chartData.length<=5?'1fr 1fr':'1fr',gap:'1rem'}}>
                    <div>
                      <p style={{fontSize:'0.72rem',color:'rgba(255,255,255,0.35)',marginBottom:'0.4rem'}}>Response Distribution</p>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={q.chartData} layout="vertical">
                          <XAxis type="number" stroke="#a1a1aa" fontSize={11} allowDecimals={false}/>
                          <YAxis type="category" dataKey="name" stroke="#a1a1aa" fontSize={10} width={90}/>
                          <Tooltip contentStyle={{backgroundColor:'#18181b',borderColor:'rgba(255,255,255,0.1)',borderRadius:'8px'}}/>
                          <Bar dataKey="value" radius={[0,6,6,0]}>
                            {q.chartData.map((_:any,i:number)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    {q.chartData.length<=8 && (
                      <div>
                        <p style={{fontSize:'0.72rem',color:'rgba(255,255,255,0.35)',marginBottom:'0.4rem'}}>Share %</p>
                        <ResponsiveContainer width="100%" height={200}>
                          <PieChart>
                            <Pie data={q.chartData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75}>
                              {q.chartData.map((_:any,i:number)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                            </Pie>
                            <Tooltip contentStyle={{backgroundColor:'#18181b',borderColor:'rgba(255,255,255,0.1)',borderRadius:'8px'}}/>
                            <Legend formatter={v=><span style={{color:'rgba(255,255,255,0.6)',fontSize:'0.72rem'}}>{v}</span>}/>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{padding:'1rem',background:'rgba(255,255,255,0.02)',borderRadius:'8px',
                    color:'rgba(255,255,255,0.3)',fontSize:'0.82rem',textAlign:'center'}}>
                    {q.totalAnswers===0 ? 'No responses yet for this question.' : 'Open-ended responses — individual answers collected, no chart available.'}
                  </div>
                )}

                {/* Per-question AI insight */}
                <AIBox text={qAI[q.fieldId]} loading={qAILoading[q.fieldId]||false}/>
              </Card>
            ))}
          </div>
        )}

        {/* Trend */}
        {subTab==='trend' && (
          <Card>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.75rem',flexWrap:'wrap',gap:'0.5rem'}}>
              <div>
                <h3 style={{margin:0,color:'rgba(255,255,255,0.8)',fontSize:'0.95rem'}}>Response Trend Over Time</h3>
                <Desc text="Shows how many responses were collected per day. Spikes indicate high activity periods."/>
                <span style={{fontSize:'0.78rem',color:trendGrowth>=0?'#10b981':'#ef4444',marginTop:'4px',display:'block'}}>
                  {trendGrowth>=0?'+':''}{trendGrowth}% vs previous period
                </span>
              </div>
              <div style={{display:'flex',gap:'6px'}}>
                {[7,14,30].map(d=>(
                  <button key={d} onClick={()=>setTrendDays(d)}
                    style={{padding:'4px 12px',borderRadius:'8px',border:'1px solid',
                      borderColor:trendDays===d?'#6366f1':'rgba(255,255,255,0.1)',
                      background:trendDays===d?'rgba(99,102,241,0.2)':'none',
                      color:trendDays===d?'#a5b4fc':'rgba(255,255,255,0.5)',cursor:'pointer',fontSize:'0.78rem'}}>
                    {d}d
                  </button>
                ))}
              </div>
            </div>
            {mounted && (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.05}/>
                  <XAxis dataKey="date" stroke="#a1a1aa" fontSize={10}/>
                  <YAxis stroke="#a1a1aa" fontSize={11} allowDecimals={false}/>
                  <Tooltip contentStyle={{backgroundColor:'#18181b',borderColor:'rgba(255,255,255,0.1)',borderRadius:'8px'}}/>
                  <Line type="monotone" dataKey="responses" stroke="#6366f1" strokeWidth={2} dot={false} activeDot={{r:4,fill:'#6366f1'}}/>
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>
        )}

        {/* Segmentation */}
        {subTab==='segment' && (
          <div>
            <p style={{color:'rgba(255,255,255,0.45)',fontSize:'0.85rem',marginBottom:'1rem'}}>
              Category breakdown per question — shows which options are most popular among respondents.
            </p>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:'1rem'}}>
              {formData.questions?.filter((q:any)=>q.chartData?.length>0).slice(0,6).map((q:any,i:number)=>(
                <Card key={i}>
                  <h4 style={{color:'rgba(255,255,255,0.8)',fontSize:'0.875rem',marginBottom:'0.25rem'}}>{q.label}</h4>
                  <Desc text={`${q.totalAnswers} responses · Top: "${q.chartData[0]?.name}" with ${q.chartData[0]?.value} votes`}/>
                  {mounted && (
                    <ResponsiveContainer width="100%" height={180} style={{marginTop:'0.75rem'}}>
                      <BarChart data={q.chartData.slice(0,6)}>
                        <XAxis dataKey="name" stroke="#a1a1aa" fontSize={9}/>
                        <YAxis stroke="#a1a1aa" fontSize={10} allowDecimals={false}/>
                        <Tooltip contentStyle={{backgroundColor:'#18181b',borderColor:'rgba(255,255,255,0.1)',borderRadius:'8px'}}/>
                        <Bar dataKey="value" radius={[4,4,0,0]}>
                          {q.chartData.slice(0,6).map((_:any,j:number)=><Cell key={j} fill={COLORS[j%COLORS.length]}/>)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </Card>
              ))}
              {!formData.questions?.some((q:any)=>q.chartData?.length>0) && (
                <Card style={{textAlign:'center',padding:'3rem',color:'rgba(255,255,255,0.4)'}}>No categorical data for segmentation.</Card>
              )}
            </div>
          </div>
        )}

        {/* S&W */}
        {subTab==='sw' && (
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
            <Card style={{background:'rgba(16,185,129,0.05)',borderColor:'rgba(16,185,129,0.2)'}}>
              <h3 style={{color:'#10b981',display:'flex',alignItems:'center',gap:'8px',marginBottom:'1rem'}}>
                <CheckCircle size={16}/> Strengths
              </h3>
              {strengths.length===0
                ? <p style={{color:'rgba(255,255,255,0.4)',fontSize:'0.85rem'}}>Load more data to detect strengths.</p>
                : strengths.map((s,i)=>(
                    <div key={i} style={{display:'flex',gap:'8px',marginBottom:'0.5rem',alignItems:'flex-start'}}>
                      <CheckCircle size={13} color="#10b981" style={{flexShrink:0,marginTop:'2px'}}/>
                      <span style={{fontSize:'0.85rem',color:'rgba(255,255,255,0.75)'}}>{s}</span>
                    </div>
                  ))}
            </Card>
            <Card style={{background:'rgba(239,68,68,0.05)',borderColor:'rgba(239,68,68,0.2)'}}>
              <h3 style={{color:'#ef4444',display:'flex',alignItems:'center',gap:'8px',marginBottom:'1rem'}}>
                <AlertCircle size={16}/> Weaknesses
              </h3>
              {weaknesses.length===0
                ? <p style={{color:'rgba(255,255,255,0.4)',fontSize:'0.85rem'}}>No significant weaknesses detected.</p>
                : weaknesses.map((w,i)=>(
                    <div key={i} style={{display:'flex',gap:'8px',marginBottom:'0.5rem',alignItems:'flex-start'}}>
                      <AlertCircle size={13} color="#ef4444" style={{flexShrink:0,marginTop:'2px'}}/>
                      <span style={{fontSize:'0.85rem',color:'rgba(255,255,255,0.75)'}}>{w}</span>
                    </div>
                  ))}
            </Card>
          </div>
        )}
      </>)}

      {!formData && !loading && (
        <Card style={{textAlign:'center',padding:'4rem'}}>
          <ClipboardList size={40} style={{color:'rgba(255,255,255,0.2)',marginBottom:'1rem'}}/>
          <p style={{color:'rgba(255,255,255,0.4)'}}>Form select karo — analytics automatically load ho jaayegi</p>
        </Card>
      )}
    </div>
  );

  /* ══ RENDER DATASETS ══ */
  const renderDatasets = () => (
    <div>
      <Card style={{marginBottom:'1.5rem',display:'flex',alignItems:'center',gap:'1rem',flexWrap:'wrap'}}>
        <Database size={16} style={{color:'rgba(255,255,255,0.5)'}}/>
        <select value={selDs} onChange={e=>setSelDs(e.target.value)}
          style={{flex:1,minWidth:'200px',maxWidth:'400px',padding:'10px 14px',
            background:'rgba(0,0,0,0.3)',border:'1px solid rgba(255,255,255,0.12)',
            borderRadius:'10px',color:'#fff',fontSize:'0.875rem'}}>
          {datasets.length===0 ? <option>No datasets uploaded</option>
            : datasets.map(d=><option key={d.id} value={d.id}>{d.filename}</option>)}
        </select>
        <div style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'0.78rem',color:'rgba(255,255,255,0.4)'}}>
          <Zap size={13} color="#10b981"/> Auto-analyzing on select
        </div>
      </Card>

      {loading && <div style={{textAlign:'center',padding:'4rem'}}><Loader2 size={36} style={{animation:'spin 1s linear infinite',color:'#10b981'}}/></div>}

      {dsData && !loading && (<>
        {/* Global AI */}
        <div style={{marginBottom:'1.5rem'}}>
          <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'0.5rem'}}>
            <BrainCircuit size={16} color="#a5b4fc"/>
            <span style={{color:'#a5b4fc',fontWeight:600,fontSize:'0.9rem'}}>AI Dataset Analysis</span>
            <span style={{fontSize:'0.72rem',color:'rgba(255,255,255,0.3)'}}>— auto generated</span>
          </div>
          <AIBox text={globalAI} loading={globalAILoading}/>
        </div>

        {/* KPIs */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:'1rem',marginBottom:'1.5rem'}}>
          <KPI label="Total Rows"    value={dsData.rowCount?.toLocaleString()} sub={dsData.filename} color="#10b981"/>
          <KPI label="Columns"       value={dsData.columnCount} sub="total fields" color="#06b6d4"/>
          <KPI label="Numeric Cols"  value={dsData.columns?.filter((c:any)=>c.type==='numeric').length} sub="numeric" color="#f59e0b"/>
          <KPI label="Categorical"   value={dsData.columns?.filter((c:any)=>c.type==='categorical').length} sub="categorical" color="#ec4899"/>
        </div>

        {/* Sub-tabs */}
        <div style={{borderBottom:'1px solid rgba(255,255,255,0.07)',marginBottom:'1.5rem',display:'flex',gap:'0.25rem'}}>
          {[{id:'summary',l:'Columns'},{id:'correlation',l:'Correlation'},{id:'sw',l:'Strengths & Weaknesses'}].map(t=>
            <SubTabBtn key={t.id} active={subTab===t.id} onClick={()=>setSubTab(t.id)}>{t.l}</SubTabBtn>
          )}
        </div>

        {/* Columns */}
        {subTab==='summary' && (
          <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
            {dsData.columns?.map((col:any,idx:number)=>{
              const isExp = expandedCol===col.name;
              return (
                <Card key={col.name}>
                  <button onClick={()=>getColAIOnExpand(col)}
                    style={{width:'100%',background:'none',border:'none',cursor:'pointer',
                      display:'flex',justifyContent:'space-between',alignItems:'center',padding:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                      <span style={{fontSize:'0.65rem',padding:'2px 8px',borderRadius:'6px',fontWeight:700,
                        background:col.type==='numeric'?'rgba(16,185,129,0.15)':'rgba(245,158,11,0.15)',
                        color:col.type==='numeric'?'#10b981':'#f59e0b'}}>
                        {col.type==='numeric'?'123':'ABC'}
                      </span>
                      <span style={{color:'#fff',fontWeight:600,fontSize:'0.95rem'}}>{col.name}</span>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:'1rem'}}>
                      {col.type==='numeric'
                        ? <span style={{fontSize:'0.78rem',color:'rgba(255,255,255,0.4)'}}>
                            avg <b style={{color:'#10b981'}}>{col.mean}</b> · range {col.min}–{col.max}
                          </span>
                        : <span style={{fontSize:'0.78rem',color:'rgba(255,255,255,0.4)'}}>
                            {col.uniqueCount} unique · top: "{col.topValues?.[0]?.name}"
                          </span>}
                      {isExp ? <ChevronUp size={15} color="rgba(255,255,255,0.35)"/> : <ChevronDown size={15} color="rgba(255,255,255,0.35)"/>}
                    </div>
                  </button>

                  {/* Collapsed: show AI inline */}
                  {!isExp && (colAI[col.name] || colAILoading[col.name]) && (
                    <AIBox text={colAI[col.name]} loading={colAILoading[col.name]||false}/>
                  )}

                  {isExp && mounted && (
                    <div style={{marginTop:'1.25rem',borderTop:'1px solid rgba(255,255,255,0.07)',paddingTop:'1.25rem'}}>
                      {col.type==='numeric' ? (<>
                        {/* Stats */}
                        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(100px,1fr))',gap:'0.75rem',marginBottom:'1.25rem'}}>
                          {[['Min',col.min,'#6366f1','Lowest value in this column'],
                            ['Max',col.max,'#ec4899','Highest value'],
                            ['Mean',col.mean,'#10b981','Average value'],
                            ['Median',col.median,'#f59e0b','Middle value (less affected by outliers)'],
                            ['Std Dev',col.std,'#8b5cf6','Spread of values — higher = more variation']].map(([l,v,c,d])=>(
                            <div key={String(l)} style={{background:'rgba(255,255,255,0.04)',borderRadius:'8px',padding:'0.75rem'}}>
                              <p style={{margin:0,fontSize:'0.68rem',color:'rgba(255,255,255,0.4)'}}>{l}</p>
                              <p style={{margin:'4px 0 2px',fontSize:'1.1rem',fontWeight:700,color:String(c)}}>{v}</p>
                              <p style={{margin:0,fontSize:'0.65rem',color:'rgba(255,255,255,0.3)',lineHeight:1.3}}>{d}</p>
                            </div>
                          ))}
                        </div>
                        {/* Histogram */}
                        <p style={{fontSize:'0.75rem',color:'rgba(255,255,255,0.4)',marginBottom:'0.5rem'}}>
                          Histogram — shows frequency distribution of values
                        </p>
                        <ResponsiveContainer width="100%" height={180}>
                          <BarChart data={col.histogram}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.05}/>
                            <XAxis dataKey="range" stroke="#a1a1aa" fontSize={9} angle={-30} textAnchor="end" height={50}/>
                            <YAxis stroke="#a1a1aa" fontSize={10} allowDecimals={false}/>
                            <Tooltip contentStyle={{backgroundColor:'#18181b',borderColor:'rgba(255,255,255,0.1)',borderRadius:'8px'}}/>
                            <Bar dataKey="count" fill={COLORS[idx%COLORS.length]} radius={[4,4,0,0]}/>
                          </BarChart>
                        </ResponsiveContainer>
                      </>) : (<>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
                          <div>
                            <p style={{fontSize:'0.72rem',color:'rgba(255,255,255,0.35)',marginBottom:'0.5rem'}}>
                              Top values — most frequent categories
                            </p>
                            <ResponsiveContainer width="100%" height={180}>
                              <BarChart data={col.topValues?.slice(0,8)} layout="vertical">
                                <XAxis type="number" stroke="#a1a1aa" fontSize={10} allowDecimals={false}/>
                                <YAxis type="category" dataKey="name" stroke="#a1a1aa" fontSize={10} width={80}/>
                                <Tooltip contentStyle={{backgroundColor:'#18181b',borderColor:'rgba(255,255,255,0.1)',borderRadius:'8px'}}/>
                                <Bar dataKey="value" radius={[0,4,4,0]}>
                                  {col.topValues?.slice(0,8).map((_:any,i:number)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                          <div>
                            <p style={{fontSize:'0.72rem',color:'rgba(255,255,255,0.35)',marginBottom:'0.5rem'}}>
                              Share distribution (pie)
                            </p>
                            <ResponsiveContainer width="100%" height={180}>
                              <PieChart>
                                <Pie data={col.topValues?.slice(0,6)} dataKey="value" nameKey="name" innerRadius={35} outerRadius={65}>
                                  {col.topValues?.slice(0,6).map((_:any,i:number)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                                </Pie>
                                <Tooltip contentStyle={{backgroundColor:'#18181b',borderColor:'rgba(255,255,255,0.1)',borderRadius:'8px'}}/>
                                <Legend formatter={v=><span style={{color:'rgba(255,255,255,0.6)',fontSize:'0.72rem'}}>{v}</span>}/>
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                        <div style={{marginTop:'0.75rem',display:'flex',gap:'0.75rem',flexWrap:'wrap'}}>
                          <span style={{fontSize:'0.78rem',color:'rgba(255,255,255,0.4)'}}>
                            Total: <b style={{color:'#fff'}}>{col.count}</b>
                          </span>
                          <span style={{fontSize:'0.78rem',color:'rgba(255,255,255,0.4)'}}>
                            Unique values: <b style={{color:'#f59e0b'}}>{col.uniqueCount}</b>
                          </span>
                          <span style={{fontSize:'0.78rem',color:'rgba(255,255,255,0.4)'}}>
                            Missing: <b style={{color:col.missing>0?'#ef4444':'#10b981'}}>{col.missing}</b>
                          </span>
                        </div>
                      </>)}
                      {/* AI insight */}
                      <AIBox text={colAI[col.name]} loading={colAILoading[col.name]||false}/>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {/* Correlation */}
        {subTab==='correlation' && (
          <div>
            {numericCols.length<2 ? (
              <Card style={{textAlign:'center',padding:'3rem',color:'rgba(255,255,255,0.4)'}}>
                <GitBranch size={32} style={{marginBottom:'1rem',opacity:0.3}}/>
                <p>Correlation ke liye kam se kam 2 numeric columns chahiye.</p>
              </Card>
            ) : (<>
              <Card style={{marginBottom:'1rem'}}>
                <h3 style={{color:'rgba(255,255,255,0.8)',fontSize:'0.95rem',margin:'0 0 0.5rem'}}>Correlation Analysis</h3>
                <p style={{color:'rgba(255,255,255,0.4)',fontSize:'0.82rem',margin:'0 0 1rem',lineHeight:1.5}}>
                  Do numeric columns ke beech relationship dekhne ke liye use hota hai. Pearson r value:
                  +1 = perfect positive, -1 = perfect negative, 0 = no relationship.
                </p>
                <div style={{display:'flex',gap:'1rem',flexWrap:'wrap',alignItems:'center'}}>
                  <div>
                    <label style={{fontSize:'0.72rem',color:'rgba(255,255,255,0.4)',display:'block',marginBottom:'4px'}}>Column A (X-axis)</label>
                    <select value={corrA} onChange={e=>setCorrA(e.target.value)}
                      style={{padding:'8px 12px',background:'rgba(0,0,0,0.3)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'8px',color:'#fff',fontSize:'0.875rem'}}>
                      <option value="">Select</option>
                      {numericCols.map((c:any)=><option key={c.name} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{fontSize:'0.72rem',color:'rgba(255,255,255,0.4)',display:'block',marginBottom:'4px'}}>Column B (Y-axis)</label>
                    <select value={corrB} onChange={e=>setCorrB(e.target.value)}
                      style={{padding:'8px 12px',background:'rgba(0,0,0,0.3)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'8px',color:'#fff',fontSize:'0.875rem'}}>
                      <option value="">Select</option>
                      {numericCols.filter((c:any)=>c.name!==corrA).map((c:any)=><option key={c.name} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                  {corrVal!==null && (
                    <div style={{padding:'10px 18px',background:'rgba(99,102,241,0.15)',border:'1px solid #6366f1',borderRadius:'10px'}}>
                      <p style={{margin:0,fontSize:'0.7rem',color:'rgba(255,255,255,0.5)'}}>Pearson r</p>
                      <p style={{margin:'2px 0 0',fontSize:'1.5rem',fontWeight:700,
                        color:Math.abs(corrVal)>0.7?'#10b981':Math.abs(corrVal)>0.4?'#f59e0b':'#ef4444'}}>
                        {corrVal}
                      </p>
                      <p style={{margin:'2px 0 0',fontSize:'0.72rem',color:'rgba(255,255,255,0.4)'}}>
                        {Math.abs(corrVal)>0.7?'Strong':Math.abs(corrVal)>0.4?'Moderate':'Weak'} {corrVal>0?'positive':'negative'} correlation
                      </p>
                    </div>
                  )}
                </div>
              </Card>
              {scatterData.length>0 && mounted && (
                <Card>
                  <h3 style={{color:'rgba(255,255,255,0.8)',fontSize:'0.9rem',margin:'0 0 0.5rem'}}>
                    Scatter Plot: {corrA} vs {corrB}
                  </h3>
                  <p style={{color:'rgba(255,255,255,0.4)',fontSize:'0.78rem',margin:'0 0 0.75rem'}}>
                    Har point ek data row hai. Agar points ek line mein hain toh strong correlation hai.
                  </p>
                  <ResponsiveContainer width="100%" height={300}>
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.05}/>
                      <XAxis dataKey="x" name={corrA} stroke="#a1a1aa" fontSize={11}/>
                      <YAxis dataKey="y" name={corrB} stroke="#a1a1aa" fontSize={11}/>
                      <Tooltip cursor={{strokeDasharray:'3 3'}} contentStyle={{backgroundColor:'#18181b',borderColor:'rgba(255,255,255,0.1)',borderRadius:'8px'}}/>
                      <Scatter data={scatterData} fill="#6366f1" opacity={0.7}/>
                    </ScatterChart>
                  </ResponsiveContainer>
                </Card>
              )}
            </>)}
          </div>
        )}

        {/* S&W */}
        {subTab==='sw' && (
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
            <Card style={{background:'rgba(16,185,129,0.05)',borderColor:'rgba(16,185,129,0.2)'}}>
              <h3 style={{color:'#10b981',display:'flex',alignItems:'center',gap:'8px',marginBottom:'1rem'}}>
                <CheckCircle size={16}/> Strengths
              </h3>
              {strengths.length===0
                ? <p style={{color:'rgba(255,255,255,0.4)',fontSize:'0.85rem'}}>No significant strengths detected.</p>
                : strengths.map((s,i)=>(
                    <div key={i} style={{display:'flex',gap:'8px',marginBottom:'0.5rem'}}>
                      <CheckCircle size={13} color="#10b981" style={{flexShrink:0,marginTop:'2px'}}/>
                      <span style={{fontSize:'0.85rem',color:'rgba(255,255,255,0.75)'}}>{s}</span>
                    </div>
                  ))}
            </Card>
            <Card style={{background:'rgba(239,68,68,0.05)',borderColor:'rgba(239,68,68,0.2)'}}>
              <h3 style={{color:'#ef4444',display:'flex',alignItems:'center',gap:'8px',marginBottom:'1rem'}}>
                <AlertCircle size={16}/> Weaknesses
              </h3>
              {weaknesses.length===0
                ? <p style={{color:'rgba(255,255,255,0.4)',fontSize:'0.85rem'}}>No significant issues detected.</p>
                : weaknesses.map((w,i)=>(
                    <div key={i} style={{display:'flex',gap:'8px',marginBottom:'0.5rem'}}>
                      <AlertCircle size={13} color="#ef4444" style={{flexShrink:0,marginTop:'2px'}}/>
                      <span style={{fontSize:'0.85rem',color:'rgba(255,255,255,0.75)'}}>{w}</span>
                    </div>
                  ))}
            </Card>
          </div>
        )}
      </>)}

      {!dsData && !loading && (
        <Card style={{textAlign:'center',padding:'4rem'}}>
          <Database size={40} style={{color:'rgba(255,255,255,0.2)',marginBottom:'1rem'}}/>
          <p style={{color:'rgba(255,255,255,0.4)'}}>Dataset select karo — analytics automatically load ho jaayegi</p>
        </Card>
      )}
    </div>
  );

  /* ══ RENDER OVERVIEW ══ */
  const renderOverview = () => (
    <div>
      {overview ? (<>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:'1rem',marginBottom:'1.5rem'}}>
          <KPI label="Total Forms"     value={overview.kpis?.totalForms}      sub="created"/>
          <KPI label="Form Responses"  value={overview.kpis?.totalSubmissions} sub="submissions" color="#10b981"/>
          <KPI label="Datasets"        value={overview.kpis?.totalDatasets}    sub="uploaded" color="#f59e0b"/>
          <KPI label="Total Data Rows" value={overview.kpis?.totalRows}        sub="across all" color="#ec4899"/>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(340px,1fr))',gap:'1.5rem'}}>
          <Card>
            <h3 style={{color:'rgba(255,255,255,0.8)',fontSize:'0.95rem',margin:'0 0 0.25rem'}}>Activity Trend (7 days)</h3>
            <p style={{color:'rgba(255,255,255,0.35)',fontSize:'0.78rem',margin:'0 0 0.75rem'}}>
              Platform pe kitne events (submissions + uploads) har din hue
            </p>
            {mounted && (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={overview.chartData||[]}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.05}/>
                  <XAxis dataKey="date" stroke="#a1a1aa" fontSize={11}/>
                  <YAxis stroke="#a1a1aa" fontSize={11} allowDecimals={false}/>
                  <Tooltip contentStyle={{backgroundColor:'#18181b',borderColor:'rgba(255,255,255,0.1)',borderRadius:'8px'}}/>
                  <Line type="monotone" dataKey="events" stroke="#6366f1" strokeWidth={2} dot={{fill:'#6366f1',r:3}}/>
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>
          <Card>
            <h3 style={{color:'rgba(255,255,255,0.8)',fontSize:'0.95rem',margin:'0 0 0.25rem'}}>Data Source Mix</h3>
            <p style={{color:'rgba(255,255,255,0.35)',fontSize:'0.78rem',margin:'0 0 0.75rem'}}>
              Kitna data forms se aaya aur kitna file uploads se
            </p>
            {mounted && (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={overview.sourceBreakdown||[]} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85}>
                    {(overview.sourceBreakdown||[]).map((_:any,i:number)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                  </Pie>
                  <Tooltip contentStyle={{backgroundColor:'#18181b',borderColor:'rgba(255,255,255,0.1)',borderRadius:'8px'}}/>
                  <Legend formatter={v=><span style={{color:'rgba(255,255,255,0.7)',fontSize:'0.8rem'}}>{v}</span>}/>
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>

        {overview.recentForms?.length>0 && (
          <Card style={{marginTop:'1.5rem'}}>
            <h3 style={{color:'rgba(255,255,255,0.8)',fontSize:'0.95rem',margin:'0 0 0.25rem'}}>Recent Forms</h3>
            <p style={{color:'rgba(255,255,255,0.35)',fontSize:'0.78rem',margin:'0 0 0.75rem'}}>
              Latest forms aur unke response counts
            </p>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.875rem'}}>
              <thead>
                <tr>{['Form','Responses','Created'].map(h=>(
                  <th key={h} style={{padding:'8px 12px',textAlign:'left',color:'rgba(255,255,255,0.35)',
                    borderBottom:'1px solid rgba(255,255,255,0.07)',fontSize:'0.72rem',textTransform:'uppercase'}}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {overview.recentForms.map((f:any)=>(
                  <tr key={f.id} style={{borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                    <td style={{padding:'10px 12px',color:'rgba(255,255,255,0.8)'}}>{f.title}</td>
                    <td style={{padding:'10px 12px',color:'#6366f1',fontWeight:600}}>{f._count.submissions}</td>
                    <td style={{padding:'10px 12px',color:'rgba(255,255,255,0.4)'}}>{new Date(f.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </>) : (
        <div style={{textAlign:'center',padding:'4rem'}}>
          <Loader2 size={36} style={{animation:'spin 1s linear infinite',color:'#6366f1'}}/>
        </div>
      )}
    </div>
  );

  return (
    <div style={{padding:'1.5rem',maxWidth:'1200px',margin:'0 auto',width:'100%',boxSizing:'border-box'}}>
      <div style={{marginBottom:'1.5rem'}}>
        <h1 style={{fontSize:'1.6rem',fontWeight:700,color:'#fff',margin:0}}>Analytics</h1>
        <p style={{color:'rgba(255,255,255,0.4)',margin:'4px 0 0',fontSize:'0.875rem'}}>
          Select karo — AI automatically analyze karke descriptions dega
        </p>
      </div>

      <div style={{display:'flex',gap:'0.5rem',marginBottom:'1.5rem',
        borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
        {([
          {id:'forms',    label:'Form Analytics',    icon:<ClipboardList size={15}/>},
          {id:'datasets', label:'Dataset Analytics', icon:<Database size={15}/>},
          {id:'overview', label:'Platform Overview', icon:<Globe size={15}/>},
        ] as const).map(t=>(
          <button key={t.id} onClick={()=>{setTab(t.id);setSubTab('summary');setGlobalAI(null);}}
            style={{display:'flex',alignItems:'center',gap:'6px',padding:'10px 18px',
              background:'none',border:'none',
              borderBottom:tab===t.id?'2px solid #6366f1':'2px solid transparent',
              color:tab===t.id?'#a5b4fc':'rgba(255,255,255,0.45)',
              cursor:'pointer',fontWeight:tab===t.id?600:400,fontSize:'0.875rem',
              marginBottom:'-1px',transition:'all 0.2s'}}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab==='forms'    && renderForms()}
      {tab==='datasets' && renderDatasets()}
      {tab==='overview' && renderOverview()}

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
