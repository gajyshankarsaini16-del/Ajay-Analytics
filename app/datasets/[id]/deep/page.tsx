'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  BarChart, Bar, PieChart, Pie, Cell, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  ArrowLeft, Loader2, Sparkles, BarChart2, GitBranch,
  AlertCircle, CheckCircle, Send, Bot, User, Database,
  TrendingUp, Hash, Type, Zap, RefreshCw
} from 'lucide-react';

const COLORS = ['#6366f1','#10b981','#f59e0b','#ec4899','#8b5cf6','#06b6d4','#f97316','#84cc16'];

export default function DeepAnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const id     = params?.id as string;

  const [analysis, setAnalysis]   = useState<any>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [mounted, setMounted]     = useState(false);

  const [chatHistory, setChatHistory] = useState<{role:string,content:string}[]>([]);
  const [question, setQuestion]       = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); if(id) runAnalysis(); }, [id]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatHistory]);

  const runAnalysis = async () => {
    setLoading(true); setError('');
    try {
      const r = await fetch('/api/datasets/deep-analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datasetId: id })
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed');
      setAnalysis(d);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const sendChat = async () => {
    if (!question.trim() || chatLoading) return;
    const q = question.trim();
    setQuestion('');
    const newHistory = [...chatHistory, { role: 'user', content: q }];
    setChatHistory(newHistory);
    setChatLoading(true);
    try {
      const r = await fetch('/api/ai/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, datasetId: id, history: chatHistory.slice(-6) })
      });
      const d = await r.json();
      setChatHistory(prev => [...prev, { role: 'assistant', content: d.answer || d.error || 'No response' }]);
    } catch (e: any) {
      setChatHistory(prev => [...prev, { role: 'assistant', content: 'Error: ' + e.message }]);
    } finally { setChatLoading(false); }
  };

  const qualityColor = (s: number) => s > 80 ? '#10b981' : s > 60 ? '#f59e0b' : '#ef4444';

  if (loading) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'70vh', gap:'1rem' }}>
      <Loader2 size={48} style={{ animation:'spin 1s linear infinite', color:'#6366f1' }}/>
      <p style={{ color:'rgba(255,255,255,0.5)', fontSize:'1rem' }}>Running deep analysis...</p>
      <p style={{ color:'rgba(255,255,255,0.3)', fontSize:'0.85rem' }}>AI is analyzing every column, finding patterns & correlations</p>
    </div>
  );

  if (error) return (
    <div style={{ padding:'2rem' }}>
      <button onClick={()=>router.back()} style={{ display:'flex', alignItems:'center', gap:'6px', background:'none', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.6)', borderRadius:'8px', padding:'8px 14px', cursor:'pointer', marginBottom:'1rem' }}>
        <ArrowLeft size={15}/> Back
      </button>
      <div style={{ color:'#ef4444', display:'flex', gap:'8px', alignItems:'center' }}>
        <AlertCircle size={20}/> {error}
      </div>
    </div>
  );

  if (!analysis) return null;

  const numCols = analysis.columnAnalysis?.filter((c:any)=>c.type==='numeric') || [];
  const catCols = analysis.columnAnalysis?.filter((c:any)=>c.type==='categorical') || [];

  return (
    <div style={{ padding:'1.5rem', maxWidth:'1300px', margin:'0 auto', boxSizing:'border-box' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:'1rem', marginBottom:'1.5rem', flexWrap:'wrap' }}>
        <button onClick={()=>router.back()}
          style={{ background:'none', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.6)',
            borderRadius:'8px', padding:'8px 14px', cursor:'pointer', display:'flex', alignItems:'center', gap:'6px', fontSize:'0.875rem' }}>
          <ArrowLeft size={15}/> Back
        </button>
        <div>
          <h1 style={{ color:'#fff', fontSize:'1.4rem', fontWeight:700, margin:0 }}>
            🔬 Deep Analysis — {analysis.filename}
          </h1>
          <p style={{ color:'rgba(255,255,255,0.4)', margin:'2px 0 0', fontSize:'0.82rem' }}>
            {analysis.rowCount?.toLocaleString()} rows · {analysis.columnCount} columns · {analysis.datasetType}
          </p>
        </div>
        <button onClick={runAnalysis}
          style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:'6px', padding:'8px 16px',
            background:'rgba(99,102,241,0.15)', border:'1px solid rgba(99,102,241,0.3)',
            borderRadius:'8px', color:'#a5b4fc', cursor:'pointer', fontSize:'0.82rem' }}>
          <RefreshCw size={14}/> Re-analyze
        </button>
      </div>

      {/* KPI strip */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:'0.75rem', marginBottom:'1.5rem' }}>
        {[
          { label:'Total Rows',    value:analysis.rowCount?.toLocaleString(), icon:<Hash size={16}/>,       color:'#6366f1' },
          { label:'Columns',       value:analysis.columnCount,                icon:<Type size={16}/>,       color:'#06b6d4' },
          { label:'Numeric Cols',  value:numCols.length,                      icon:<TrendingUp size={16}/>, color:'#10b981' },
          { label:'Categorical',   value:catCols.length,                      icon:<BarChart2 size={16}/>,  color:'#f59e0b' },
          { label:'Quality Score', value:`${analysis.qualityScore}%`,         icon:<Zap size={16}/>,        color:qualityColor(analysis.qualityScore) },
          { label:'Correlations',  value:analysis.correlations?.length||0,    icon:<GitBranch size={16}/>,  color:'#ec4899' },
        ].map(k=>(
          <div key={k.label} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)',
            borderRadius:'12px', padding:'1rem', display:'flex', alignItems:'center', gap:'10px' }}>
            <div style={{ color:k.color, flexShrink:0 }}>{k.icon}</div>
            <div>
              <p style={{ margin:0, fontSize:'0.68rem', color:'rgba(255,255,255,0.4)', textTransform:'uppercase' }}>{k.label}</p>
              <p style={{ margin:'2px 0 0', fontSize:'1.2rem', fontWeight:700, color:k.color }}>{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:'4px', borderBottom:'1px solid rgba(255,255,255,0.07)', marginBottom:'1.5rem' }}>
        {[
          { id:'overview',     label:'AI Overview' },
          { id:'columns',      label:'Column Analysis' },
          { id:'correlations', label:'Correlations' },
          { id:'quality',      label:'Data Quality' },
          { id:'chat',         label:'💬 Ask AI' },
        ].map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)}
            style={{ padding:'9px 18px', background:'none', border:'none',
              borderBottom:activeTab===t.id?'2px solid #6366f1':'2px solid transparent',
              color:activeTab===t.id?'#a5b4fc':'rgba(255,255,255,0.45)',
              cursor:'pointer', fontWeight:activeTab===t.id?600:400, fontSize:'0.875rem',
              marginBottom:'-1px' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* AI OVERVIEW */}
      {activeTab==='overview' && (
        <div>
          {analysis.aiNarrative ? (
            <div style={{ background:'rgba(99,102,241,0.06)', border:'1px solid rgba(99,102,241,0.2)',
              borderRadius:'16px', padding:'2rem' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'1.25rem' }}>
                <Sparkles size={20} color="#a5b4fc"/>
                <h2 style={{ margin:0, color:'#a5b4fc', fontSize:'1.1rem', fontWeight:700 }}>AI Deep Analysis Report</h2>
              </div>
              <div style={{ color:'rgba(255,255,255,0.85)', lineHeight:1.9, fontSize:'0.9rem' }}
                dangerouslySetInnerHTML={{ __html: analysis.aiNarrative
                  .replace(/## (.*)/g, '<h3 style="color:#a5b4fc;margin:1.5rem 0 0.5rem;font-size:0.95rem;font-weight:700">$1</h3>')
                  .replace(/\*\*(.*?)\*\*/g, '<b style="color:#fff">$1</b>')
                  .replace(/\n/g, '<br/>')
                }}/>
            </div>
          ) : (
            <div style={{ textAlign:'center', padding:'3rem', color:'rgba(255,255,255,0.4)' }}>
              <Sparkles size={32} style={{ marginBottom:'1rem', opacity:0.3 }}/>
              <p>AI analysis not available. Check your API key configuration.</p>
            </div>
          )}
        </div>
      )}

      {/* COLUMNS */}
      {activeTab==='columns' && (
        <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>
          {analysis.columnAnalysis?.map((col:any, idx:number)=>(
            <div key={col.column} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)',
              borderRadius:'14px', padding:'1.5rem' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1rem', flexWrap:'wrap', gap:'0.5rem' }}>
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px' }}>
                    <span style={{ fontSize:'0.65rem', padding:'2px 8px', borderRadius:'6px', fontWeight:700,
                      background:col.type==='numeric'?'rgba(16,185,129,0.15)':'rgba(245,158,11,0.15)',
                      color:col.type==='numeric'?'#10b981':'#f59e0b' }}>
                      {col.type==='numeric'?'NUMERIC':'CATEGORICAL'}
                    </span>
                    <h3 style={{ margin:0, color:'#fff', fontSize:'1rem', fontWeight:700 }}>{col.column}</h3>
                  </div>
                  <p style={{ margin:0, fontSize:'0.78rem', color:'rgba(255,255,255,0.4)' }}>
                    {col.count.toLocaleString()} values · {col.missing} missing ({col.missingPct}%)
                    {col.type==='numeric' && ` · ${col.outliers} outliers (${col.outlierPct}%) · ${col.skewnessLabel}`}
                    {col.type==='categorical' && ` · ${col.uniqueCount} unique · ${col.diversityLabel}`}
                  </p>
                </div>
                {col.missingPct > 20
                  ? <span style={{ padding:'3px 10px', background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:'20px', color:'#ef4444', fontSize:'0.72rem' }}>⚠️ High missing</span>
                  : <span style={{ padding:'3px 10px', background:'rgba(16,185,129,0.15)', border:'1px solid rgba(16,185,129,0.3)', borderRadius:'20px', color:'#10b981', fontSize:'0.72rem' }}>✅ Good quality</span>}
              </div>

              {col.type==='numeric' && (<>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(90px,1fr))', gap:'0.6rem', marginBottom:'1rem' }}>
                  {[
                    ['Min',    col.min,    '#6366f1', 'Lowest value'],
                    ['Max',    col.max,    '#ec4899', 'Highest value'],
                    ['Mean',   col.mean,   '#10b981', 'Average'],
                    ['Median', col.median, '#f59e0b', 'Middle value'],
                    ['Std Dev',col.std,    '#8b5cf6', 'Spread of data'],
                    ['IQR',    col.iqr,    '#06b6d4', '25th–75th percentile range'],
                  ].map(([l,v,c,d])=>(
                    <div key={String(l)} style={{ background:'rgba(255,255,255,0.04)', borderRadius:'8px', padding:'0.65rem' }}>
                      <p style={{ margin:0, fontSize:'0.65rem', color:'rgba(255,255,255,0.35)' }}>{l}</p>
                      <p style={{ margin:'2px 0', fontSize:'1rem', fontWeight:700, color:String(c) }}>{v}</p>
                      <p style={{ margin:0, fontSize:'0.62rem', color:'rgba(255,255,255,0.25)', lineHeight:1.3 }}>{d}</p>
                    </div>
                  ))}
                </div>
                {mounted && col.histogram?.length>0 && (
                  <div>
                    <p style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.35)', margin:'0 0 0.5rem' }}>
                      Frequency Distribution — bars dikhate hain kitni baar koi value aayi
                    </p>
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={col.histogram}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.05}/>
                        <XAxis dataKey="range" stroke="#a1a1aa" fontSize={9} angle={-25} textAnchor="end" height={45}/>
                        <YAxis stroke="#a1a1aa" fontSize={10} allowDecimals={false}/>
                        <Tooltip contentStyle={{ backgroundColor:'#18181b', borderColor:'rgba(255,255,255,0.1)', borderRadius:'8px' }}/>
                        <Bar dataKey="count" fill={COLORS[idx%COLORS.length]} radius={[4,4,0,0]}/>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>)}

              {col.type==='categorical' && col.topValues?.length>0 && mounted && (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
                  <div>
                    <p style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.35)', margin:'0 0 0.5rem' }}>
                      Top values — most frequent categories
                    </p>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={col.topValues.slice(0,8)} layout="vertical">
                        <XAxis type="number" stroke="#a1a1aa" fontSize={10} allowDecimals={false}/>
                        <YAxis type="category" dataKey="value" stroke="#a1a1aa" fontSize={10} width={80}/>
                        <Tooltip formatter={(v:any, n:any, p:any)=>[`${v} (${p.payload.pct}%)`, 'Count']}
                          contentStyle={{ backgroundColor:'#18181b', borderColor:'rgba(255,255,255,0.1)', borderRadius:'8px' }}/>
                        <Bar dataKey="count" radius={[0,4,4,0]}>
                          {col.topValues.slice(0,8).map((_:any,i:number)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div>
                    <p style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.35)', margin:'0 0 0.5rem' }}>
                      Share distribution
                    </p>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={col.topValues.slice(0,6).map((v:any)=>({name:v.value, value:v.count}))} dataKey="value" nameKey="name" innerRadius={35} outerRadius={65}>
                          {col.topValues.slice(0,6).map((_:any,i:number)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor:'#18181b', borderColor:'rgba(255,255,255,0.1)', borderRadius:'8px' }}/>
                        <Legend formatter={v=><span style={{color:'rgba(255,255,255,0.6)',fontSize:'0.72rem'}}>{v}</span>}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* CORRELATIONS */}
      {activeTab==='correlations' && (
        <div>
          {analysis.correlations?.length===0 ? (
            <div style={{ textAlign:'center', padding:'3rem', color:'rgba(255,255,255,0.4)' }}>
              <GitBranch size={40} style={{ marginBottom:'1rem', opacity:0.3 }}/>
              <p>No significant correlations found (r &gt; 0.3). Need at least 2 numeric columns.</p>
            </div>
          ) : (
            <>
              <p style={{ color:'rgba(255,255,255,0.4)', fontSize:'0.85rem', marginBottom:'1.25rem' }}>
                Pearson r: |r| &gt; 0.7 = Strong, &gt; 0.4 = Moderate, &gt; 0.3 = Weak
              </p>
              <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
                {analysis.correlations?.map((c:any, i:number)=>(
                  <div key={i} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)',
                    borderRadius:'12px', padding:'1.25rem', display:'flex', alignItems:'center', gap:'1rem', flexWrap:'wrap' }}>
                    <div style={{ fontSize:'0.82rem', color:'rgba(255,255,255,0.6)', flex:1 }}>
                      <b style={{ color:'#fff' }}>{c.colA}</b>
                      <span style={{ margin:'0 8px', color:'rgba(255,255,255,0.3)' }}>↔</span>
                      <b style={{ color:'#fff' }}>{c.colB}</b>
                    </div>
                    <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                      <span style={{ padding:'4px 12px', borderRadius:'20px', fontWeight:700, fontSize:'0.9rem',
                        background: Math.abs(c.r)>0.7?'rgba(16,185,129,0.15)':Math.abs(c.r)>0.4?'rgba(245,158,11,0.15)':'rgba(99,102,241,0.15)',
                        color: Math.abs(c.r)>0.7?'#10b981':Math.abs(c.r)>0.4?'#f59e0b':'#a5b4fc',
                        border:`1px solid ${Math.abs(c.r)>0.7?'rgba(16,185,129,0.3)':Math.abs(c.r)>0.4?'rgba(245,158,11,0.3)':'rgba(99,102,241,0.3)'}` }}>
                        r = {c.r}
                      </span>
                      <span style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.4)' }}>
                        {c.strength} {c.direction}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* DATA QUALITY */}
      {activeTab==='quality' && (
        <div>
          <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)',
            borderRadius:'14px', padding:'1.5rem', marginBottom:'1.25rem' }}>
            <h3 style={{ color:'rgba(255,255,255,0.8)', fontSize:'0.95rem', margin:'0 0 1rem' }}>Overall Data Quality Score</h3>
            <div style={{ display:'flex', alignItems:'center', gap:'1rem', flexWrap:'wrap' }}>
              <div style={{ fontSize:'3rem', fontWeight:800, color:qualityColor(analysis.qualityScore) }}>
                {analysis.qualityScore}%
              </div>
              <div>
                <p style={{ margin:0, color: qualityColor(analysis.qualityScore), fontWeight:600 }}>
                  {analysis.qualityScore>80?'✅ Good Quality':analysis.qualityScore>60?'⚠️ Moderate Quality':'❌ Poor Quality'}
                </p>
                <p style={{ margin:'4px 0 0', fontSize:'0.8rem', color:'rgba(255,255,255,0.4)' }}>
                  Based on missing values, duplicates, and type consistency
                </p>
              </div>
            </div>
          </div>
          <h3 style={{ color:'rgba(255,255,255,0.6)', fontSize:'0.85rem', margin:'0 0 0.75rem', textTransform:'uppercase', letterSpacing:'0.06em' }}>
            Column Quality Report
          </h3>
          <div style={{ display:'flex', flexDirection:'column', gap:'0.6rem' }}>
            {analysis.columnAnalysis?.map((col:any)=>(
              <div key={col.column} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)',
                borderRadius:'10px', padding:'0.9rem 1.25rem', display:'flex', alignItems:'center', gap:'1rem', flexWrap:'wrap' }}>
                <span style={{ color:'#fff', fontWeight:600, flex:1, fontSize:'0.875rem' }}>{col.column}</span>
                <span style={{ fontSize:'0.75rem', padding:'2px 8px', borderRadius:'6px',
                  background:col.type==='numeric'?'rgba(16,185,129,0.12)':'rgba(245,158,11,0.12)',
                  color:col.type==='numeric'?'#10b981':'#f59e0b' }}>{col.type}</span>
                <span style={{ fontSize:'0.78rem', color: col.missingPct>20?'#ef4444':col.missingPct>5?'#f59e0b':'#10b981' }}>
                  {col.missingPct}% missing
                </span>
                <div style={{ width:'100px', height:'6px', background:'rgba(255,255,255,0.1)', borderRadius:'3px', overflow:'hidden' }}>
                  <div style={{ width:`${100-col.missingPct}%`, height:'100%',
                    background: col.missingPct>20?'#ef4444':col.missingPct>5?'#f59e0b':'#10b981',
                    borderRadius:'3px' }}/>
                </div>
                {col.type==='numeric' && col.outlierPct>10 && (
                  <span style={{ fontSize:'0.72rem', color:'#f59e0b' }}>⚠️ {col.outlierPct}% outliers</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI CHAT */}
      {activeTab==='chat' && (
        <div style={{ display:'flex', flexDirection:'column', height:'500px' }}>
          <div style={{ background:'rgba(99,102,241,0.06)', border:'1px solid rgba(99,102,241,0.15)',
            borderRadius:'12px', padding:'0.9rem 1rem', marginBottom:'1rem', display:'flex', alignItems:'center', gap:'8px' }}>
            <Bot size={16} color="#a5b4fc"/>
            <span style={{ color:'rgba(255,255,255,0.6)', fontSize:'0.82rem' }}>
              Is dataset ke baare mein kuch bhi pooch sako — AI apke data ke context mein jawab dega
            </span>
          </div>

          {chatHistory.length===0 && (
            <div style={{ display:'flex', flexWrap:'wrap', gap:'8px', marginBottom:'1rem' }}>
              {[
                'What are the main insights from this data?',
                'Which column has the most missing values?',
                'What is the average value of numeric columns?',
                'Are there any anomalies or outliers?',
                'What patterns do you see in this data?',
                'Give me a summary of this dataset'
              ].map(q=>(
                <button key={q} onClick={()=>setQuestion(q)}
                  style={{ padding:'6px 12px', background:'rgba(255,255,255,0.04)',
                    border:'1px solid rgba(255,255,255,0.1)', borderRadius:'20px',
                    color:'rgba(255,255,255,0.55)', cursor:'pointer', fontSize:'0.78rem' }}>
                  {q}
                </button>
              ))}
            </div>
          )}

          <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:'0.75rem',
            padding:'0.5rem', marginBottom:'0.75rem' }}>
            {chatHistory.map((msg, i)=>(
              <div key={i} style={{ display:'flex', gap:'8px', alignItems:'flex-start',
                justifyContent: msg.role==='user'?'flex-end':'flex-start' }}>
                {msg.role==='assistant' && <Bot size={20} style={{ color:'#a5b4fc', flexShrink:0, marginTop:'2px' }}/>}
                <div style={{
                  maxWidth:'80%', padding:'0.75rem 1rem',
                  background: msg.role==='user'?'rgba(99,102,241,0.2)':'rgba(255,255,255,0.04)',
                  border:`1px solid ${msg.role==='user'?'rgba(99,102,241,0.3)':'rgba(255,255,255,0.08)'}`,
                  borderRadius: msg.role==='user'?'12px 12px 2px 12px':'12px 12px 12px 2px',
                  color:'rgba(255,255,255,0.85)', fontSize:'0.875rem', lineHeight:1.7, whiteSpace:'pre-wrap'
                }}>
                  {msg.content}
                </div>
                {msg.role==='user' && <User size={20} style={{ color:'#6366f1', flexShrink:0, marginTop:'2px' }}/>}
              </div>
            ))}
            {chatLoading && (
              <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                <Bot size={20} style={{ color:'#a5b4fc' }}/>
                <div style={{ padding:'0.75rem 1rem', background:'rgba(255,255,255,0.04)',
                  border:'1px solid rgba(255,255,255,0.08)', borderRadius:'12px 12px 12px 2px' }}>
                  <Loader2 size={16} style={{ animation:'spin 1s linear infinite', color:'#a5b4fc' }}/>
                </div>
              </div>
            )}
            <div ref={chatEndRef}/>
          </div>

          <div style={{ display:'flex', gap:'8px' }}>
            <input
              value={question} onChange={e=>setQuestion(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&sendChat()}
              placeholder="Kuch bhi pooch sako is data ke baare mein..."
              style={{ flex:1, padding:'11px 16px', background:'rgba(255,255,255,0.05)',
                border:'1px solid rgba(255,255,255,0.12)', borderRadius:'10px',
                color:'#fff', fontSize:'0.875rem', outline:'none' }}
            />
            <button onClick={sendChat} disabled={chatLoading || !question.trim()}
              style={{ padding:'11px 18px', background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
                border:'none', borderRadius:'10px', color:'#fff', cursor:'pointer',
                display:'flex', alignItems:'center', gap:'6px', fontWeight:600,
                opacity: chatLoading || !question.trim() ? 0.6 : 1 }}>
              <Send size={16}/> Send
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
