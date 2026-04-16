'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ScatterChart, Scatter, LineChart, Line
} from 'recharts';
import {
  ClipboardList, Upload, ChevronRight, BarChart2, FileText,
  Loader2, Sparkles, RefreshCw, TrendingUp, TrendingDown,
  AlertCircle, CheckCircle, ChevronDown, ChevronUp, Send,
  Bot, User, X, MessageSquare, Lightbulb, Target, Database,
  Activity, Zap, ArrowUpRight, ArrowDownRight, Filter,
  Download, Table2, GitBranch, Eye, EyeOff
} from 'lucide-react';

const T = {
  bg:'#0a0e1a',surface:'#111827',card:'#151e2d',
  border:'rgba(255,255,255,0.07)',accent:'#2563eb',
  accent2:'#7c3aed',green:'#10b981',amber:'#f59e0b',
  red:'#ef4444',cyan:'#06b6d4',pink:'#ec4899',
  text:'#f1f5f9',muted:'rgba(241,245,249,0.45)',
  dimmed:'rgba(241,245,249,0.2)',
};
const CC = ['#2563eb','#7c3aed','#10b981','#f59e0b','#ec4899','#06b6d4','#f97316','#84cc16'];
const UNIQUE_LIMIT = 8;

const Card=({children,style,id}:any)=><div id={id} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:16,padding:'1.5rem',...style}}>{children}</div>;
const Chip=({label,color=T.accent}:any)=><span style={{display:'inline-flex',alignItems:'center',padding:'3px 10px',borderRadius:20,fontSize:'0.72rem',fontWeight:600,background:`${color}22`,border:`1px solid ${color}44`,color,letterSpacing:'0.04em'}}>{label}</span>;

const KPI=({label,value,delta,color=T.accent,icon:Icon}:any)=>(
  <div style={{background:`linear-gradient(135deg,${T.card},${T.surface})`,border:`1px solid ${T.border}`,borderRadius:14,padding:'1.25rem 1.5rem',position:'relative',overflow:'hidden'}}>
    <div style={{position:'absolute',top:0,right:0,width:80,height:80,background:`radial-gradient(circle at 80% 20%,${color}18,transparent 70%)`,pointerEvents:'none'}}/>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
      <p style={{margin:0,fontSize:'0.72rem',color:T.muted,textTransform:'uppercase',letterSpacing:'0.08em'}}>{label}</p>
      {Icon&&<div style={{padding:6,borderRadius:8,background:`${color}18`}}><Icon size={14} color={color}/></div>}
    </div>
    <p style={{margin:0,fontSize:'1.9rem',fontWeight:800,color:T.text,lineHeight:1}}>{value}</p>
    {delta!==undefined&&<div style={{display:'flex',alignItems:'center',gap:4,marginTop:8}}>
      {delta>0?<ArrowUpRight size={13} color={T.green}/>:<ArrowDownRight size={13} color={T.red}/>}
      <span style={{fontSize:'0.75rem',color:delta>0?T.green:T.red,fontWeight:600}}>{delta>0?'+':''}{delta}%</span>
    </div>}
  </div>
);

const TT=({active,payload,label}:any)=>{
  if(!active||!payload?.length)return null;
  return <div style={{background:'#1e2a3a',border:`1px solid ${T.border}`,borderRadius:10,padding:'10px 14px',fontSize:'0.82rem',boxShadow:'0 8px 32px rgba(0,0,0,0.4)'}}>
    <p style={{margin:'0 0 6px',color:T.muted,fontWeight:600}}>{label}</p>
    {payload.map((p:any,i:number)=><p key={i} style={{margin:'2px 0',color:p.color||T.text}}>{p.name}: <strong>{p.value}</strong></p>)}
  </div>;
};

/* ── Raw table for all unique values ── */
function RawTable({data,colName,uniqueCount}:{data:{name:string;value:number}[];colName:string;uniqueCount:number}){
  const [dir,setDir]=useState<'asc'|'desc'>('desc');
  const [q,setQ]=useState('');
  const [pg,setPg]=useState(0);
  const PS=50;
  const filtered=data.filter(r=>r.name.toLowerCase().includes(q.toLowerCase())).sort((a,b)=>dir==='desc'?b.value-a.value:a.value-b.value);
  const paged=filtered.slice(pg*PS,(pg+1)*PS);
  const pages=Math.ceil(filtered.length/PS);
  const total=data.reduce((s,r)=>s+r.value,0);
  return(
    <div>
      <div style={{display:'flex',alignItems:'center',gap:'0.75rem',marginBottom:'0.75rem',flexWrap:'wrap'}}>
        <div style={{display:'flex',alignItems:'center',gap:6,padding:'5px 12px',background:`${T.amber}18`,border:`1px solid ${T.amber}44`,borderRadius:8}}>
          <Table2 size={13} color={T.amber}/>
          <span style={{fontSize:'0.75rem',color:T.amber,fontWeight:600}}>{uniqueCount} unique values — showing all</span>
        </div>
        <input value={q} onChange={e=>{setQ(e.target.value);setPg(0);}} placeholder="Search values…"
          style={{flex:1,minWidth:160,padding:'6px 12px',background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,color:T.text,fontSize:'0.82rem',outline:'none'}}/>
        <button onClick={()=>setDir(d=>d==='desc'?'asc':'desc')} style={{padding:'6px 12px',background:`${T.accent}18`,border:`1px solid ${T.accent}44`,borderRadius:8,color:T.accent,fontSize:'0.78rem',cursor:'pointer',fontWeight:600,display:'flex',alignItems:'center',gap:5}}>
          {dir==='desc'?<TrendingDown size={13}/>:<TrendingUp size={13}/>}{dir==='desc'?'High→Low':'Low→High'}
        </button>
      </div>
      <div style={{maxHeight:'480px',overflowY:'auto',borderRadius:10,border:`1px solid ${T.border}`}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.85rem'}}>
          <thead style={{position:'sticky',top:0,zIndex:1}}>
            <tr style={{background:T.surface}}>
              {['#',colName,'Count','Share %','Distribution'].map(h=><th key={h} style={{padding:'10px 14px',textAlign:h==='Count'||h==='Share %'?'right':'left',color:T.dimmed,fontSize:'0.72rem',textTransform:'uppercase',letterSpacing:'0.06em',borderBottom:`1px solid ${T.border}`}}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {paged.map((row,i)=>{
              const pct=total>0?((row.value/total)*100).toFixed(1):'0';
              const rank=pg*PS+i+1;
              return(
                <tr key={i} style={{borderBottom:`1px solid ${T.border}`,transition:'background 0.15s'}}
                  onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,0.03)')}
                  onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                  <td style={{padding:'9px 14px',color:T.dimmed,fontSize:'0.75rem'}}>{rank}</td>
                  <td style={{padding:'9px 14px',color:T.text,fontWeight:500,maxWidth:220,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{row.name}</td>
                  <td style={{padding:'9px 14px',textAlign:'right',color:CC[(rank-1)%CC.length],fontWeight:700}}>{row.value.toLocaleString()}</td>
                  <td style={{padding:'9px 14px',textAlign:'right',color:T.muted,fontSize:'0.82rem'}}>{pct}%</td>
                  <td style={{padding:'9px 14px'}}>
                    <div style={{height:6,background:'rgba(255,255,255,0.06)',borderRadius:3,overflow:'hidden',minWidth:80}}>
                      <div style={{height:'100%',width:`${pct}%`,background:CC[(rank-1)%CC.length],borderRadius:3,transition:'width 0.4s'}}/>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {pages>1&&<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:'0.75rem',flexWrap:'wrap',gap:8}}>
        <span style={{fontSize:'0.75rem',color:T.muted}}>{filtered.length} results · Page {pg+1}/{pages}</span>
        <div style={{display:'flex',gap:6}}>
          <button onClick={()=>setPg(p=>Math.max(0,p-1))} disabled={pg===0} style={{padding:'5px 10px',borderRadius:6,border:`1px solid ${T.border}`,background:'none',color:pg===0?T.dimmed:T.muted,cursor:pg===0?'not-allowed':'pointer',fontSize:'0.78rem'}}>← Prev</button>
          {[...Array(Math.min(pages,7))].map((_,i)=>{
            const pageIdx=pages<=7?i:pg<4?i:pg>pages-4?pages-7+i:pg-3+i;
            return<button key={pageIdx} onClick={()=>setPg(pageIdx)} style={{width:30,height:30,borderRadius:6,border:`1px solid ${pg===pageIdx?T.accent:T.border}`,background:pg===pageIdx?`${T.accent}22`:'none',color:pg===pageIdx?T.accent:T.muted,cursor:'pointer',fontSize:'0.78rem',fontWeight:pg===pageIdx?700:400}}>{pageIdx+1}</button>;
          })}
          <button onClick={()=>setPg(p=>Math.min(pages-1,p+1))} disabled={pg===pages-1} style={{padding:'5px 10px',borderRadius:6,border:`1px solid ${T.border}`,background:'none',color:pg===pages-1?T.dimmed:T.muted,cursor:pg===pages-1?'not-allowed':'pointer',fontSize:'0.78rem'}}>Next →</button>
        </div>
      </div>}
    </div>
  );
}

/* ── Raw dataset preview (first N rows, View All) ── */
function DataPreview({dsId,columns}:{dsId:string;columns:any[]}){
  const [rows,setRows]=useState<any[]>([]);
  const [allRows,setAllRows]=useState<any[]>([]);
  const [showAll,setShowAll]=useState(false);
  const [loading,setLoading]=useState(false);
  const [search,setSearch]=useState('');
  const [sortCol,setSortCol]=useState('');
  const [sortDir,setSortDir]=useState<'asc'|'desc'>('asc');
  const [loaded,setLoaded]=useState(false);

  const load=async(full=false)=>{
    if(loaded&&!full)return;
    setLoading(true);
    try{
      const r=await fetch(`/api/datasets/${dsId}`);
      const d=await r.json();
      const parsed=JSON.parse(d.data||'[]');
      setAllRows(Array.isArray(parsed)?parsed:[]);
      setRows(Array.isArray(parsed)?parsed.slice(0,20):[]);
      setLoaded(true);
    }catch{}
    setLoading(false);
  };

  useEffect(()=>{load();},[dsId]);

  const display=showAll?allRows:rows;
  const cols=columns.map(c=>c.name).slice(0,12);

  let filtered=display.filter(row=>
    !search||cols.some(c=>String(row[c]||'').toLowerCase().includes(search.toLowerCase()))
  );
  if(sortCol){
    filtered=[...filtered].sort((a,b)=>{
      const va=a[sortCol],vb=b[sortCol];
      const na=parseFloat(va),nb=parseFloat(vb);
      if(!isNaN(na)&&!isNaN(nb))return sortDir==='asc'?na-nb:nb-na;
      return sortDir==='asc'?String(va).localeCompare(String(vb)):String(vb).localeCompare(String(va));
    });
  }

  const downloadCSV=()=>{
    const header=cols.join(',');
    const body=allRows.map(r=>cols.map(c=>JSON.stringify(r[c]??'')).join(',')).join('\n');
    const blob=new Blob([header+'\n'+body],{type:'text/csv'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='data.csv';a.click();
  };

  return(
    <div style={{marginBottom:'1.5rem'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'0.75rem',flexWrap:'wrap',gap:8}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <Table2 size={15} color={T.muted}/>
          <p style={{margin:0,fontSize:'0.82rem',fontWeight:700,color:T.muted,textTransform:'uppercase',letterSpacing:'0.08em'}}>
            Data Preview {showAll?`(All ${allRows.length.toLocaleString()} rows)`:'(First 20 rows)'}
          </p>
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search rows…"
            style={{padding:'6px 12px',background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,color:T.text,fontSize:'0.82rem',outline:'none',width:180}}/>
          <button onClick={()=>{setShowAll(s=>!s);if(!showAll&&!loaded)load(true);}}
            style={{display:'flex',alignItems:'center',gap:6,padding:'6px 14px',background:showAll?`${T.accent}18`:`${T.green}18`,border:`1px solid ${showAll?T.accent:T.green}44`,borderRadius:8,color:showAll?T.accent:T.green,cursor:'pointer',fontSize:'0.78rem',fontWeight:700}}>
            {showAll?<EyeOff size={13}/>:<Eye size={13}/>}{showAll?'Show Less':'View All'}
          </button>
          <button onClick={downloadCSV} style={{display:'flex',alignItems:'center',gap:6,padding:'6px 14px',background:`${T.amber}18`,border:`1px solid ${T.amber}44`,borderRadius:8,color:T.amber,cursor:'pointer',fontSize:'0.78rem',fontWeight:700}}>
            <Download size={13}/> CSV
          </button>
        </div>
      </div>
      {loading?<div style={{textAlign:'center',padding:'2rem'}}><Loader2 size={24} color={T.accent} style={{animation:'spin 1s linear infinite'}}/></div>:(
        <div style={{overflowX:'auto',borderRadius:10,border:`1px solid ${T.border}`,maxHeight:480,overflowY:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.82rem',minWidth:600}}>
            <thead style={{position:'sticky',top:0,zIndex:1}}>
              <tr style={{background:T.surface}}>
                <th style={{padding:'9px 12px',color:T.dimmed,fontSize:'0.7rem',borderBottom:`1px solid ${T.border}`,textAlign:'left',width:40}}>#</th>
                {cols.map(c=>(
                  <th key={c} onClick={()=>{if(sortCol===c)setSortDir(d=>d==='asc'?'desc':'asc');else{setSortCol(c);setSortDir('asc');}}}
                    style={{padding:'9px 12px',color:sortCol===c?T.accent:T.dimmed,fontSize:'0.7rem',textTransform:'uppercase',letterSpacing:'0.05em',borderBottom:`1px solid ${T.border}`,textAlign:'left',cursor:'pointer',whiteSpace:'nowrap',userSelect:'none'}}>
                    {c} {sortCol===c?(sortDir==='asc'?'↑':'↓'):''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0,showAll?9999:20).map((row,i)=>(
                <tr key={i} style={{borderBottom:`1px solid ${T.border}`}}
                  onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,0.025)')}
                  onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                  <td style={{padding:'8px 12px',color:T.dimmed,fontSize:'0.72rem'}}>{i+1}</td>
                  {cols.map(c=>{
                    const v=row[c];const isNum=!isNaN(parseFloat(v))&&v!==''&&v!==null;
                    return<td key={c} style={{padding:'8px 12px',color:isNum?T.cyan:T.text,fontWeight:isNum?600:400,maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{v===null||v===undefined?<span style={{color:T.dimmed,fontStyle:'italic'}}>null</span>:String(v)}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!showAll&&allRows.length>20&&<p style={{margin:'6px 0 0',fontSize:'0.75rem',color:T.dimmed,textAlign:'center'}}>
        Showing 20 of {allRows.length.toLocaleString()} rows · Click "View All" to see complete dataset
      </p>}
    </div>
  );
}

/* ── RELATION ANALYSIS PANEL ── */
function RelationPanel({columns,dsId,onClose}:{columns:any[];dsId:string;onClose:()=>void}){
  const [colA,setColA]=useState('');
  const [colB,setColB]=useState('');
  const [result,setResult]=useState<any>(null);
  const [loading,setLoading]=useState(false);
  const [mounted,setMounted]=useState(false);
  useEffect(()=>setMounted(true),[]);

  const colNames=columns.map(c=>c.name);
  const getType=(name:string)=>columns.find(c=>c.name===name)?.type||'categorical';

  const analyze=async()=>{
    if(!colA||!colB)return;
    setLoading(true);setResult(null);
    try{
      // Fetch raw data
      const r=await fetch(`/api/datasets/${dsId}`);
      const d=await r.json();
      const rows:any[]=JSON.parse(d.data||'[]');
      const typeA=getType(colA),typeB=getType(colB);
      let chartData:any[]=[];
      let chartType='bar';
      let context:any={colA,colB,typeA,typeB,rowCount:rows.length};

      if(typeA==='numeric'&&typeB==='numeric'){
        // Scatter plot data (sample 300 points)
        chartType='scatter';
        chartData=rows.slice(0,300).map(r=>({x:parseFloat(r[colA]),y:parseFloat(r[colB])})).filter(p=>!isNaN(p.x)&&!isNaN(p.y));
        // Pearson correlation
        const pairs=chartData;const n=pairs.length;
        const ma=pairs.reduce((s,p)=>s+p.x,0)/n,mb=pairs.reduce((s,p)=>s+p.y,0)/n;
        const num=pairs.reduce((s,p)=>s+(p.x-ma)*(p.y-mb),0);
        const da=Math.sqrt(pairs.reduce((s,p)=>s+(p.x-ma)**2,0));
        const db=Math.sqrt(pairs.reduce((s,p)=>s+(p.y-mb)**2,0));
        const r2=da&&db?Math.round((num/(da*db))*100)/100:0;
        context={...context,pearsonR:r2,strength:Math.abs(r2)>0.7?'Strong':Math.abs(r2)>0.4?'Moderate':'Weak',direction:r2>0?'positive':'negative'};
      } else if(typeA==='categorical'&&typeB==='numeric'){
        // Group by A, avg B
        chartType='bar';
        const groups:Record<string,number[]>={};
        rows.forEach(r=>{const k=String(r[colA]||'');const v=parseFloat(r[colB]);if(!isNaN(v)){if(!groups[k])groups[k]=[];groups[k].push(v);}});
        chartData=Object.entries(groups).map(([name,vals])=>({name,avg:+(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2),count:vals.length,sum:+vals.reduce((a,b)=>a+b,0).toFixed(2)})).sort((a,b)=>b.avg-a.avg).slice(0,15);
        context={...context,groups:chartData.length,top:chartData[0],bottom:chartData[chartData.length-1]};
      } else if(typeA==='numeric'&&typeB==='categorical'){
        // Flip: group by B, avg A
        chartType='bar';
        const groups:Record<string,number[]>={};
        rows.forEach(r=>{const k=String(r[colB]||'');const v=parseFloat(r[colA]);if(!isNaN(v)){if(!groups[k])groups[k]=[];groups[k].push(v);}});
        chartData=Object.entries(groups).map(([name,vals])=>({name,avg:+(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2),count:vals.length})).sort((a,b)=>b.avg-a.avg).slice(0,15);
        context={...context,groups:chartData.length,top:chartData[0],bottom:chartData[chartData.length-1]};
      } else {
        // cat vs cat — frequency
        chartType='heatmap';
        const freq:Record<string,Record<string,number>>={};
        const bVals=new Set<string>();
        rows.forEach(r=>{const ka=String(r[colA]||''),kb=String(r[colB]||'');if(!freq[ka])freq[ka]={};freq[ka][kb]=(freq[ka][kb]||0)+1;bVals.add(kb);});
        // Convert to stacked bar format
        const bArr=Array.from(bVals).slice(0,6);
        chartData=Object.entries(freq).map(([name,counts])=>({name,...Object.fromEntries(bArr.map(b=>[b,counts[b]||0]))})).sort((a,b)=>bArr.reduce((s,k)=>s+(b[k]||0)-(a[k]||0),0)).slice(0,10);
        context={...context,catBValues:bArr,uniqueA:Object.keys(freq).length,uniqueB:bVals.size};
      }

      // Call AI for relation insights
      const aiR=await fetch('/api/ai/analyze',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({type:'relation_insight',context:{...context,sampleData:chartData.slice(0,8)}})});
      const aiD=await aiR.json();
      const bullets=parseInsightBullets(aiD.analysis||'');

      setResult({chartData,chartType,context,bullets,bArr:context.catBValues});
    }catch(e){console.error(e);}
    setLoading(false);
  };

  function parseInsightBullets(text:string):string[]{
    const lines=text.split('\n').map((l:string)=>l.trim()).filter(Boolean);
    const pts:string[]=[];
    lines.forEach(line=>{
      const clean=line.replace(/^[-•*#●◦▸►]\s+/,'').replace(/^\d+[.)]\s+/,'').replace(/\*\*/g,'').trim();
      if(clean.length>15&&clean.length<400&&!clean.match(/^#{1,4}\s/))pts.push(clean);
    });
    return pts.slice(0,6);
  }

  const typeA=getType(colA),typeB=getType(colB);
  const relationType=!colA||!colB?'':
    typeA==='numeric'&&typeB==='numeric'?'Numerical ↔ Numerical (Correlation)':
    typeA==='categorical'&&typeB==='categorical'?'Categorical ↔ Categorical (Frequency)':
    'Categorical ↔ Numerical (Group Average)';

  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:999,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{width:'100%',maxWidth:900,maxHeight:'90vh',overflowY:'auto',background:T.surface,borderRadius:20,border:`1px solid ${T.border}`,boxShadow:'0 24px 80px rgba(0,0,0,0.6)'}}>
        {/* Header */}
        <div style={{padding:'1.25rem 1.5rem',borderBottom:`1px solid ${T.border}`,display:'flex',alignItems:'center',justifyContent:'space-between',background:`linear-gradient(135deg,#0f1f3d,#1a1040)`}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{padding:8,borderRadius:10,background:`linear-gradient(135deg,${T.accent},${T.accent2})`}}><GitBranch size={16} color="#fff"/></div>
            <div>
              <p style={{margin:0,fontSize:'1rem',fontWeight:800,color:T.text}}>Relation Analysis</p>
              <p style={{margin:0,fontSize:'0.75rem',color:T.muted}}>Discover relationships between any two columns</p>
            </div>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',color:T.muted,cursor:'pointer',padding:4}}><X size={20}/></button>
        </div>

        <div style={{padding:'1.5rem'}}>
          {/* Column selectors */}
          <div style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',gap:'1rem',alignItems:'flex-end',marginBottom:'1.25rem'}}>
            <div>
              <label style={{display:'block',fontSize:'0.72rem',color:T.muted,marginBottom:6,textTransform:'uppercase',letterSpacing:'0.06em'}}>Column A</label>
              <select value={colA} onChange={e=>setColA(e.target.value)}
                style={{width:'100%',padding:'10px 14px',background:T.card,border:`1px solid ${colA?T.accent:T.border}`,borderRadius:10,color:T.text,fontSize:'0.875rem',outline:'none'}}>
                <option value="">Select column…</option>
                {colNames.map(c=><option key={c} value={c}>{c} ({getType(c)})</option>)}
              </select>
            </div>
            <div style={{paddingBottom:2}}>
              <div style={{width:36,height:36,borderRadius:10,background:`${T.accent}18`,border:`1px solid ${T.accent}33`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <GitBranch size={16} color={T.accent}/>
              </div>
            </div>
            <div>
              <label style={{display:'block',fontSize:'0.72rem',color:T.muted,marginBottom:6,textTransform:'uppercase',letterSpacing:'0.06em'}}>Column B</label>
              <select value={colB} onChange={e=>setColB(e.target.value)}
                style={{width:'100%',padding:'10px 14px',background:T.card,border:`1px solid ${colB?T.accent2:T.border}`,borderRadius:10,color:T.text,fontSize:'0.875rem',outline:'none'}}>
                <option value="">Select column…</option>
                {colNames.filter(c=>c!==colA).map(c=><option key={c} value={c}>{c} ({getType(c)})</option>)}
              </select>
            </div>
          </div>

          {/* Relation type badge + Analyze button */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.25rem',flexWrap:'wrap',gap:8}}>
            {relationType&&<Chip label={relationType} color={T.accent}/>}
            <button onClick={analyze} disabled={!colA||!colB||loading}
              style={{display:'flex',alignItems:'center',gap:8,padding:'10px 24px',background:!colA||!colB?T.card:`linear-gradient(135deg,${T.accent},${T.accent2})`,border:`1px solid ${!colA||!colB?T.border:'transparent'}`,borderRadius:10,color:'#fff',cursor:!colA||!colB||loading?'not-allowed':'pointer',fontWeight:700,fontSize:'0.875rem',opacity:loading?0.7:1}}>
              {loading?<Loader2 size={15} style={{animation:'spin 1s linear infinite'}}/>:<Zap size={15}/>}
              {loading?'Analyzing…':'Analyze Relation'}
            </button>
          </div>

          {/* Results */}
          {result&&mounted&&(
            <div style={{display:'flex',flexDirection:'column',gap:'1.25rem'}}>
              {/* Correlation badge for num-num */}
              {result.context.pearsonR!==undefined&&(
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:'1rem'}}>
                  <div style={{padding:'1rem 1.5rem',borderRadius:12,background:`linear-gradient(135deg,${T.accent}18,${T.accent2}18)`,border:`1px solid ${T.accent}33`,textAlign:'center'}}>
                    <p style={{margin:0,fontSize:'0.72rem',color:T.muted,textTransform:'uppercase'}}>Pearson r</p>
                    <p style={{margin:'6px 0 4px',fontSize:'2.2rem',fontWeight:900,color:Math.abs(result.context.pearsonR)>0.7?T.green:Math.abs(result.context.pearsonR)>0.4?T.amber:T.red}}>{result.context.pearsonR}</p>
                    <p style={{margin:0,fontSize:'0.78rem',color:T.muted}}>{result.context.strength} {result.context.direction}</p>
                  </div>
                  <div style={{padding:'1rem',borderRadius:12,background:`${T.card}`,border:`1px solid ${T.border}`}}>
                    <p style={{margin:0,fontSize:'0.72rem',color:T.muted,textTransform:'uppercase'}}>Data Points</p>
                    <p style={{margin:'6px 0',fontSize:'1.5rem',fontWeight:800,color:T.text}}>{result.chartData.length.toLocaleString()}</p>
                  </div>
                </div>
              )}

              {/* Chart */}
              <Card>
                <p style={{margin:'0 0 1rem',fontSize:'0.82rem',fontWeight:700,color:T.muted,textTransform:'uppercase',letterSpacing:'0.08em'}}>
                  {result.chartType==='scatter'?`Scatter Plot: ${colA} vs ${colB}`:
                   result.chartType==='heatmap'?`Stacked Distribution: ${colA} by ${colB}`:
                   `Average ${typeA==='numeric'?colA:colB} by ${typeA==='categorical'?colA:colB}`}
                </p>

                {result.chartType==='scatter'&&(
                  <ResponsiveContainer width="100%" height={300}>
                    <ScatterChart><CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
                      <XAxis dataKey="x" name={colA} stroke={T.dimmed} fontSize={11} label={{value:colA,position:'insideBottom',offset:-5,fill:T.muted,fontSize:11}}/>
                      <YAxis dataKey="y" name={colB} stroke={T.dimmed} fontSize={11} label={{value:colB,angle:-90,position:'insideLeft',fill:T.muted,fontSize:11}}/>
                      <Tooltip cursor={{strokeDasharray:'3 3'}} content={<TT/>}/>
                      <Scatter data={result.chartData} fill={T.accent} opacity={0.65} r={3}/>
                    </ScatterChart>
                  </ResponsiveContainer>
                )}

                {result.chartType==='bar'&&(
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
                    <div>
                      <p style={{margin:'0 0 0.5rem',fontSize:'0.75rem',color:T.dimmed}}>Bar Chart</p>
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={result.chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false}/>
                          <XAxis dataKey="name" stroke={T.dimmed} fontSize={10} angle={-20} textAnchor="end" height={45}/>
                          <YAxis stroke={T.dimmed} fontSize={10}/>
                          <Tooltip content={<TT/>}/>
                          <Bar dataKey="avg" name="Average" radius={[5,5,0,0]}>
                            {result.chartData.map((_:any,i:number)=><Cell key={i} fill={CC[i%CC.length]}/>)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div>
                      <p style={{margin:'0 0 0.5rem',fontSize:'0.75rem',color:T.dimmed}}>Distribution</p>
                      <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                          <Pie data={result.chartData.slice(0,8).map((d:any)=>({name:d.name,value:d.count||d.avg}))} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={3}>
                            {result.chartData.slice(0,8).map((_:any,i:number)=><Cell key={i} fill={CC[i%CC.length]}/>)}
                          </Pie>
                          <Tooltip content={<TT/>}/>
                          <Legend formatter={(v:any)=><span style={{color:T.muted,fontSize:'0.72rem'}}>{v}</span>}/>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {result.chartType==='heatmap'&&result.bArr&&(
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={result.chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false}/>
                      <XAxis dataKey="name" stroke={T.dimmed} fontSize={10} angle={-20} textAnchor="end" height={45}/>
                      <YAxis stroke={T.dimmed} fontSize={10}/>
                      <Tooltip content={<TT/>}/>
                      <Legend formatter={(v:any)=><span style={{color:T.muted,fontSize:'0.72rem'}}>{v}</span>}/>
                      {result.bArr.map((b:string,i:number)=><Bar key={b} dataKey={b} stackId="a" fill={CC[i%CC.length]}/>)}
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>

              {/* AI Bullet Insights */}
              {result.bullets.length>0&&(
                <div style={{padding:'1.25rem',background:'linear-gradient(135deg,#0f1f3d,#1a1040)',border:`1px solid ${T.accent}33`,borderRadius:14}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:'0.9rem'}}>
                    <div style={{padding:6,borderRadius:8,background:`${T.accent}22`}}><Lightbulb size={14} color={T.accent}/></div>
                    <p style={{margin:0,fontSize:'0.82rem',fontWeight:700,color:T.accent,textTransform:'uppercase',letterSpacing:'0.08em'}}>Key Insights</p>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:7}}>
                    {result.bullets.map((b:string,i:number)=>(
                      <div key={i} style={{display:'flex',gap:10,alignItems:'flex-start'}}>
                        <div style={{width:20,height:20,borderRadius:6,background:`${CC[i%CC.length]}22`,border:`1px solid ${CC[i%CC.length]}44`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.65rem',fontWeight:800,color:CC[i%CC.length],flexShrink:0,marginTop:1}}>{i+1}</div>
                        <p style={{margin:0,fontSize:'0.85rem',color:'rgba(241,245,249,0.85)',lineHeight:1.65}}>{b}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Per-question auto AI insight ── */
function QInsight({q,totalSubmissions}:{q:any;totalSubmissions:number}){
  const [txt,setTxt]=useState('');
  const [load,setLoad]=useState(false);
  const done=useRef(false);
  useEffect(()=>{
    if(done.current||!q?.chartData?.length)return;
    done.current=true; setLoad(true);
    fetch('/api/ai/analyze',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({type:'question_insight',context:{label:q.label,type:q.type,totalAnswers:q.totalAnswers,chartData:q.chartData?.slice(0,10)}})})
    .then(r=>r.json()).then(d=>{if(d.analysis)setTxt(d.analysis);}).catch(()=>{}).finally(()=>setLoad(false));
  },[q?.fieldId]);
  if(!q?.totalAnswers)return null;
  return(
    <div style={{marginTop:'0.85rem',padding:'0.85rem 1rem',background:'linear-gradient(135deg,#0d1829,#120d24)',border:`1px solid ${T.accent}22`,borderRadius:10,display:'flex',gap:10,alignItems:'flex-start'}}>
      <div style={{padding:5,borderRadius:6,background:`${T.accent}18`,flexShrink:0,marginTop:1}}>
        {load?<Loader2 size={12} color={T.accent} style={{animation:'spin 1s linear infinite'}}/>:<Lightbulb size={12} color={T.accent}/>}
      </div>
      <div>
        <p style={{margin:'0 0 3px',fontSize:'0.68rem',color:T.accent,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em'}}>AI Insight</p>
        <p style={{margin:0,fontSize:'0.82rem',color:'rgba(241,245,249,0.8)',lineHeight:1.6}}>{load?'Generating insight…':(txt||'No insight available.')}</p>
      </div>
    </div>
  );
}

/* ── Per-column auto AI insight (bullet points) ── */
function ColInsight({col}:{col:any}){
  const [bullets,setBullets]=useState<string[]>([]);
  const [load,setLoad]=useState(false);
  const done=useRef(false);
  useEffect(()=>{
    if(done.current)return;
    done.current=true; setLoad(true);
    const colContext=col.type==='numeric'
      ?{min:col.min,max:col.max,mean:col.mean,median:col.median,std:col.std}
      :col.type==='timestamp'||col.name?.toLowerCase().includes('date')||col.name?.toLowerCase().includes('time')
        ?{uniqueCount:col.uniqueCount,missing:col.missing,sample:col.topValues?.slice(0,5)?.map((v:any)=>v.name),dateColumn:true}
        :{uniqueCount:col.uniqueCount,topValues:col.topValues?.slice(0,10),missing:col.missing};
    fetch('/api/ai/analyze',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({type:'column_insight',context:{name:col.name,type:col.type,...colContext}})})
    .then(r=>r.json()).then(d=>{
      if(d.analysis){
        const raw=d.analysis;
        const lines=raw.split('\n').map((l:string)=>l.trim()).filter((l:string)=>l.length>0);
        const pts:string[]=[];
        lines.forEach((line:string)=>{
          if(line.match(/^[-•*]\s+/)||line.match(/^\d+\.\s+/)){
            pts.push(line.replace(/^[-•*\d.]+\s*/,'').replace(/\*\*/g,'').trim());
          } else if(line.match(/^##|^#/)){
            // skip headers
          } else {
            const sentences=line.split(/(?<=[.!?])\s+/).filter((s:string)=>s.trim().length>15);
            sentences.forEach((s:string)=>pts.push(s.replace(/\*\*/g,'').trim()));
          }
        });
        setBullets(pts.slice(0,5).filter((p:string)=>p.length>10));
      }
    }).catch(()=>{}).finally(()=>setLoad(false));
  },[col.name]);
  return(
    <div style={{marginTop:'0.85rem',padding:'0.85rem 1rem',background:'linear-gradient(135deg,#0d1829,#120d24)',border:`1px solid ${T.green}22`,borderRadius:10}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:'0.6rem'}}>
        <div style={{padding:5,borderRadius:6,background:`${T.green}18`,flexShrink:0}}>
          {load?<Loader2 size={12} color={T.green} style={{animation:'spin 1s linear infinite'}}/>:<Lightbulb size={12} color={T.green}/>}
        </div>
        <p style={{margin:0,fontSize:'0.68rem',color:T.green,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em'}}>Column Insight</p>
      </div>
      {load&&<p style={{margin:0,fontSize:'0.82rem',color:'rgba(241,245,249,0.5)',paddingLeft:'0.25rem'}}>Analyzing…</p>}
      {!load&&bullets.length>0&&(
        <ul style={{margin:0,padding:'0 0 0 1.1rem',display:'flex',flexDirection:'column',gap:'0.3rem'}}>
          {bullets.map((b,i)=>(
            <li key={i} style={{fontSize:'0.82rem',color:'rgba(241,245,249,0.82)',lineHeight:1.55,paddingLeft:'0.2rem'}}>{b}</li>
          ))}
        </ul>
      )}
      {!load&&bullets.length===0&&<p style={{margin:0,fontSize:'0.82rem',color:'rgba(241,245,249,0.4)',paddingLeft:'0.25rem'}}>{col.type==='timestamp'||col.name?.toLowerCase().includes('date')?'Date column detected — expand to explore values.':'No insight available.'}</p>}
    </div>
  );
}

/* ── Global Insights box with Download ── */
function InsightsBox({insights,loading,onDownload,downloading}:{insights:string[];loading:boolean;onDownload:()=>void;downloading:boolean}){
  if(!insights.length&&!loading)return null;
  return(
    <Card style={{background:'linear-gradient(135deg,#0f1f3d,#1a1040)',border:`1px solid ${T.accent}33`}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1rem',flexWrap:'wrap',gap:8}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{padding:6,borderRadius:8,background:`${T.accent}22`}}><Lightbulb size={15} color={T.accent}/></div>
          <p style={{margin:0,fontSize:'0.85rem',fontWeight:700,color:T.accent,textTransform:'uppercase',letterSpacing:'0.08em'}}>
            AI Insights {loading&&<span style={{color:T.muted,fontWeight:400,textTransform:'none'}}> — generating…</span>}
          </p>
        </div>
        {insights.length>0&&(
          <button onClick={onDownload} disabled={downloading} style={{display:'flex',alignItems:'center',gap:7,padding:'8px 16px',background:downloading?T.card:`${T.green}18`,border:`1px solid ${downloading?T.border:T.green+'44'}`,borderRadius:9,color:downloading?T.muted:T.green,cursor:downloading?'not-allowed':'pointer',fontSize:'0.8rem',fontWeight:700,transition:'all 0.2s'}}>
            {downloading?<Loader2 size={13} style={{animation:'spin 1s linear infinite'}}/>:<Download size={13}/>}
            {downloading?'Exporting…':'Download Report'}
          </button>
        )}
      </div>
      {loading&&!insights.length&&<div style={{display:'flex',alignItems:'center',gap:10,padding:'0.75rem 0'}}><Loader2 size={16} color={T.accent} style={{animation:'spin 1s linear infinite'}}/><span style={{fontSize:'0.85rem',color:T.muted}}>AI is analyzing your data…</span></div>}
      {insights.length>0&&<div style={{display:'flex',flexDirection:'column',gap:8}}>
        {insights.map((ins,i)=>(
          <div key={i} style={{display:'flex',gap:10,alignItems:'flex-start'}}>
            <div style={{width:20,height:20,borderRadius:6,background:`${CC[i%CC.length]}22`,border:`1px solid ${CC[i%CC.length]}44`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.65rem',fontWeight:800,color:CC[i%CC.length],flexShrink:0,marginTop:1}}>{String(i+1).padStart(2,'0')}</div>
            <p style={{margin:0,fontSize:'0.85rem',color:'rgba(241,245,249,0.85)',lineHeight:1.6}}>{ins}</p>
          </div>
        ))}
      </div>}
    </Card>
  );
}

/* ── Download PDF ── */
async function dlReport(title:string,insights:string[],el:HTMLElement|null){
  const h2c=(await import('html2canvas')).default;
  const {default:jsPDF}=await import('jspdf');
  const pdf=new jsPDF('p','mm','a4');
  const pw=pdf.internal.pageSize.getWidth();
  const ph=pdf.internal.pageSize.getHeight();
  const m=15; let y=m;
  pdf.setFillColor(255,255,255); pdf.rect(0,0,pw,ph,'F');
  pdf.setFillColor(37,99,235); pdf.roundedRect(0,0,pw,26,0,0,'F');
  pdf.setTextColor(255,255,255); pdf.setFontSize(14); pdf.setFont('helvetica','bold');
  pdf.text('Analytics Report',m,17);
  pdf.setFontSize(8); pdf.setFont('helvetica','normal');
  pdf.text(new Date().toLocaleDateString('en-IN',{dateStyle:'long'}),pw-m,17,{align:'right'});
  y=36;
  pdf.setTextColor(15,23,42); pdf.setFontSize(18); pdf.setFont('helvetica','bold');
  pdf.text(title,m,y); y+=4;
  pdf.setDrawColor(37,99,235); pdf.setLineWidth(0.8); pdf.line(m,y,pw-m,y); y+=10;
  if(insights.length>0){
    pdf.setFillColor(239,246,255); pdf.roundedRect(m,y,pw-m*2,12+insights.length*10,4,4,'F');
    pdf.setDrawColor(191,219,254); pdf.setLineWidth(0.3); pdf.roundedRect(m,y,pw-m*2,12+insights.length*10,4,4,'S');
    pdf.setTextColor(37,99,235); pdf.setFontSize(10); pdf.setFont('helvetica','bold');
    pdf.text('💡 AI-Generated Insights',m+5,y+7); y+=13;
    pdf.setTextColor(30,41,59); pdf.setFontSize(9); pdf.setFont('helvetica','normal');
    insights.forEach((ins,i)=>{
      const bullet=`${String(i+1).padStart(2,'0')}. ${ins}`;
      const lines=pdf.splitTextToSize(bullet,pw-m*2-10);
      pdf.text(lines,m+5,y); y+=lines.length*5.5+1.5;
    });
    y+=8;
  }
  if(el){
    if(y>ph-80){pdf.addPage();pdf.setFillColor(255,255,255);pdf.rect(0,0,pw,ph,'F');y=m;}
    pdf.setDrawColor(229,231,235); pdf.setLineWidth(0.3); pdf.line(m,y,pw-m,y); y+=7;
    pdf.setTextColor(15,23,42); pdf.setFontSize(12); pdf.setFont('helvetica','bold');
    pdf.text('📊 Charts & Visualizations',m,y); y+=8;
    const canvas=await h2c(el,{scale:2,backgroundColor:'#ffffff',useCORS:true,logging:false});
    const imgData=canvas.toDataURL('image/png');
    const imgW=pw-m*2;
    const imgH=(canvas.height*imgW)/canvas.width;
    pdf.addImage(imgData,'PNG',m,y,imgW,imgH,undefined,'FAST',0);
  }
  const totalPages=pdf.getNumberOfPages();
  for(let p=1;p<=totalPages;p++){
    pdf.setPage(p);
    pdf.setFillColor(248,250,252); pdf.rect(0,ph-12,pw,12,'F');
    pdf.setDrawColor(229,231,235); pdf.line(0,ph-12,pw,ph-12);
    pdf.setTextColor(148,163,184); pdf.setFontSize(7); pdf.setFont('helvetica','normal');
    pdf.text('Generated by Ajay Analytics Platform',m,ph-5);
    pdf.text(`Page ${p} of ${totalPages}`,pw-m,ph-5,{align:'right'});
  }
  pdf.save(`${title.replace(/[^a-z0-9]/gi,'_')}_report.pdf`);
}

/* ── AI Chat sidebar ── */
function ChatPanel({isOpen,onClose,ctx,dtype,did}:any){
  const [msgs,setMsgs]=useState<{role:'user'|'ai';text:string}[]>([{role:'ai',text:"👋 Hi! I'm your Analytics Copilot. Ask me anything about this data."}]);
  const [inp,setInp]=useState('');
  const [busy,setBusy]=useState(false);
  const bot=useRef<HTMLDivElement>(null);
  useEffect(()=>{bot.current?.scrollIntoView({behavior:'smooth'});},[msgs]);
  const send=async()=>{
    if(!inp.trim()||busy)return;
    const q=inp.trim(); setInp('');
    setMsgs(m=>[...m,{role:'user',text:q}]); setBusy(true);
    try{
      const r=await fetch('/api/ai/analyze/chat',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({question:q,datasetId:dtype==='dataset'?did:undefined,formId:dtype==='form'?did:undefined,context:ctx,history:msgs.map(m=>({role:m.role==='ai'?'assistant':'user',content:m.text}))})});
      const d=await r.json();
      setMsgs(m=>[...m,{role:'ai',text:d.answer||d.error||'No response.'}]);
    }catch{setMsgs(m=>[...m,{role:'ai',text:'Connection error.'}]);}
    setBusy(false);
  };
  const sugg=['Key trends?','Top patterns?','Any anomalies?','3 recommendations'];
  if(!isOpen)return null;
  return(
    <div style={{position:'fixed',right:0,top:0,bottom:0,width:400,background:T.surface,borderLeft:`1px solid ${T.border}`,display:'flex',flexDirection:'column',zIndex:1000,boxShadow:'-8px 0 40px rgba(0,0,0,0.5)'}}>
      <div style={{padding:'1rem 1.25rem',borderBottom:`1px solid ${T.border}`,display:'flex',alignItems:'center',justifyContent:'space-between',background:`linear-gradient(135deg,${T.card},${T.surface})`}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:36,height:36,borderRadius:10,background:`linear-gradient(135deg,${T.accent},${T.accent2})`,display:'flex',alignItems:'center',justifyContent:'center'}}><Bot size={18} color="#fff"/></div>
          <div><p style={{margin:0,fontSize:'0.9rem',fontWeight:700,color:T.text}}>Analytics Copilot</p><p style={{margin:0,fontSize:'0.7rem',color:T.green}}>● AI Active</p></div>
        </div>
        <button onClick={onClose} style={{background:'none',border:'none',color:T.muted,cursor:'pointer',padding:4}}><X size={18}/></button>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'1rem',display:'flex',flexDirection:'column',gap:12}}>
        {msgs.map((m,i)=>(
          <div key={i} style={{display:'flex',gap:10,alignItems:'flex-start',flexDirection:m.role==='user'?'row-reverse':'row'}}>
            <div style={{width:28,height:28,borderRadius:8,flexShrink:0,background:m.role==='ai'?`linear-gradient(135deg,${T.accent},${T.accent2})`:T.card,border:m.role==='user'?`1px solid ${T.border}`:'none',display:'flex',alignItems:'center',justifyContent:'center'}}>
              {m.role==='ai'?<Bot size={14} color="#fff"/>:<User size={14} color={T.muted}/>}
            </div>
            <div style={{maxWidth:'80%',padding:'10px 14px',borderRadius:m.role==='ai'?'4px 14px 14px 14px':'14px 4px 14px 14px',background:m.role==='ai'?T.card:`linear-gradient(135deg,${T.accent}cc,${T.accent2}cc)`,border:`1px solid ${m.role==='ai'?T.border:'transparent'}`,fontSize:'0.85rem',color:T.text,lineHeight:1.65,whiteSpace:'pre-wrap'}}>
              {m.text}
            </div>
          </div>
        ))}
        {busy&&<div style={{display:'flex',gap:10,alignItems:'center'}}><div style={{width:28,height:28,borderRadius:8,background:`linear-gradient(135deg,${T.accent},${T.accent2})`,display:'flex',alignItems:'center',justifyContent:'center'}}><Bot size={14} color="#fff"/></div><div style={{padding:'10px 14px',borderRadius:'4px 14px 14px 14px',background:T.card,border:`1px solid ${T.border}`}}><Loader2 size={14} color={T.accent} style={{animation:'spin 1s linear infinite'}}/></div></div>}
        <div ref={bot}/>
      </div>
      {msgs.length<=2&&<div style={{padding:'0 1rem 0.5rem',display:'flex',flexWrap:'wrap',gap:6}}>{sugg.map(s=><button key={s} onClick={()=>setInp(s)} style={{padding:'5px 10px',borderRadius:20,fontSize:'0.72rem',background:`${T.accent}18`,border:`1px solid ${T.accent}33`,color:T.accent,cursor:'pointer',fontWeight:500}}>{s}</button>)}</div>}
      <div style={{padding:'0.75rem 1rem 1rem',borderTop:`1px solid ${T.border}`}}>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <input value={inp} onChange={e=>setInp(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Ask about your data…" style={{flex:1,padding:'10px 14px',background:T.card,border:`1px solid ${T.border}`,borderRadius:10,color:T.text,fontSize:'0.875rem',outline:'none'}}/>
          <button onClick={send} disabled={busy||!inp.trim()} style={{width:38,height:38,borderRadius:10,background:`linear-gradient(135deg,${T.accent},${T.accent2})`,border:'none',cursor:busy||!inp.trim()?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center',opacity:busy||!inp.trim()?0.5:1}}><Send size={15} color="#fff"/></button>
        </div>
      </div>
    </div>
  );
}

/* ── Form Analysis ── */
function FormAnalysis({formData,formId}:{formData:any;formId:string}){
  const [insights,setInsights]=useState<string[]>([]);
  const [insLoad,setInsLoad]=useState(false);
  const [chatOpen,setChatOpen]=useState(false);
  const [mounted,setMounted]=useState(false);
  const [downloading,setDownloading]=useState(false);
  const chartsRef=useRef<HTMLDivElement>(null);
  useEffect(()=>setMounted(true),[]);

  const genInsights=async()=>{
    setInsLoad(true);
    try{
      const r=await fetch('/api/ai/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'form_report',context:formData})});
      const d=await r.json();
      if(d.analysis){
        const lines=d.analysis.split('\n').filter((l:string)=>l.trim().match(/^[-•*]|^\d+\.|^##/)).map((l:string)=>l.replace(/^[-•*#\d.]+\s*/,'').replace(/\*\*/g,'').trim()).filter((l:string)=>l.length>10).slice(0,7);
        setInsights(lines.length>0?lines:[d.analysis.slice(0,200)]);
      }
    }catch{} setInsLoad(false);
  };

  const handleDl=async()=>{setDownloading(true);await dlReport(formData?.formTitle||'Form Report',insights,chartsRef.current);setDownloading(false);};
  if(!formData)return null;
  const{formTitle,totalSubmissions,questions=[]}=formData;
  const answered=questions.filter((q:any)=>q.totalAnswers>0).length;
  const cr=questions.length>0?Math.round((answered/questions.length)*100):0;
  const topQ=[...questions].sort((a:any,b:any)=>b.totalAnswers-a.totalAnswers)[0];
  const catQ=questions.filter((q:any)=>q.chartData?.length>0).slice(0,6);
  const radarData=catQ.map((q:any)=>({subject:q.label.substring(0,18)+(q.label.length>18?'…':''),value:q.totalAnswers,fullMark:totalSubmissions}));

  return(
    <div style={{display:'flex',flexDirection:'column',gap:'1.5rem'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'1rem'}}>
        <div><h2 style={{margin:0,fontSize:'1.3rem',fontWeight:800,color:T.text}}>{formTitle}</h2><p style={{margin:'4px 0 0',fontSize:'0.82rem',color:T.muted}}>Form Analysis Dashboard</p></div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={genInsights} disabled={insLoad} style={{display:'flex',alignItems:'center',gap:7,padding:'9px 18px',background:insLoad?T.card:`linear-gradient(135deg,${T.accent},${T.accent2})`,border:`1px solid ${insLoad?T.border:'transparent'}`,borderRadius:10,color:'#fff',cursor:insLoad?'not-allowed':'pointer',fontSize:'0.82rem',fontWeight:700}}>
            {insLoad?<Loader2 size={14} style={{animation:'spin 1s linear infinite'}}/>:<Zap size={14}/>}{insLoad?'Analyzing…':insights.length?'Refresh Insights':'Generate AI Insights'}
          </button>
          <button onClick={()=>setChatOpen(true)} style={{display:'flex',alignItems:'center',gap:7,padding:'9px 18px',background:`${T.cyan}18`,border:`1px solid ${T.cyan}44`,borderRadius:10,color:T.cyan,cursor:'pointer',fontSize:'0.82rem',fontWeight:700}}><MessageSquare size={14}/> Ask AI</button>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:'1rem'}}>
        <KPI label="Total Responses" value={totalSubmissions} icon={Activity} color={T.accent}/>
        <KPI label="Questions" value={questions.length} icon={ClipboardList} color={T.accent2}/>
        <KPI label="Completion Rate" value={`${cr}%`} icon={Target} color={T.green} delta={cr>=70?12:-8}/>
        <KPI label="Most Active" value={topQ?.totalAnswers||0} icon={BarChart2} color={T.amber}/>
      </div>
      <InsightsBox insights={insights} loading={insLoad} onDownload={handleDl} downloading={downloading}/>
      <div ref={chartsRef}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(360px,1fr))',gap:'1.25rem',marginBottom:'1.25rem'}}>
          {radarData.length>=3&&mounted&&(
            <Card>
              <p style={{margin:'0 0 1rem',fontSize:'0.82rem',fontWeight:700,color:T.muted,textTransform:'uppercase',letterSpacing:'0.08em'}}>Field Response Distribution</p>
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke={T.border}/><PolarAngleAxis dataKey="subject" tick={{fill:T.muted,fontSize:11}}/>
                  <Radar name="Responses" dataKey="value" stroke={T.accent} fill={T.accent} fillOpacity={0.25} strokeWidth={2}/>
                  <Tooltip content={<TT/>}/>
                </RadarChart>
              </ResponsiveContainer>
            </Card>
          )}
          {mounted&&(
            <Card>
              <p style={{margin:'0 0 1rem',fontSize:'0.82rem',fontWeight:700,color:T.muted,textTransform:'uppercase',letterSpacing:'0.08em'}}>Completion Rate by Field</p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={questions.slice(0,10).map((q:any)=>({name:q.label.substring(0,14)+(q.label.length>14?'…':''),responses:q.totalAnswers}))} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={T.border} horizontal={false}/>
                  <XAxis type="number" stroke={T.dimmed} fontSize={11}/><YAxis type="category" dataKey="name" stroke={T.dimmed} fontSize={10} width={110}/>
                  <Tooltip content={<TT/>}/>
                  <Bar dataKey="responses" radius={[0,6,6,0]}>{questions.slice(0,10).map((_:any,i:number)=><Cell key={i} fill={CC[i%CC.length]}/>)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(340px,1fr))',gap:'1.25rem'}}>
          {questions.filter((q:any)=>q.chartData?.length>0).map((q:any,qi:number)=>{
            const uniq=q.chartData?.length||0;
            const useTable=uniq>UNIQUE_LIMIT;
            return(
              <Card key={q.fieldId}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'1rem'}}>
                  <div>
                    <p style={{margin:0,fontSize:'0.68rem',color:T.dimmed,textTransform:'uppercase',letterSpacing:'0.06em'}}>Q{qi+1} · {q.type}</p>
                    <p style={{margin:'4px 0 0',fontSize:'0.92rem',fontWeight:700,color:T.text,lineHeight:1.3}}>{q.label}</p>
                  </div>
                  <div style={{textAlign:'right',flexShrink:0}}>
                    <p style={{margin:0,fontSize:'1.5rem',fontWeight:800,color:CC[qi%CC.length]}}>{q.totalAnswers}</p>
                    <p style={{margin:0,fontSize:'0.65rem',color:T.dimmed}}>responses</p>
                    <div style={{marginTop:4}}><Chip label={useTable?'Table View':'Chart View'} color={useTable?T.amber:T.accent}/></div>
                  </div>
                </div>
                {mounted&&(useTable?(
                  <RawTable data={q.chartData} colName={q.label} uniqueCount={uniq}/>
                ):(
                  <div style={{display:'grid',gridTemplateColumns:q.chartData.length<=5?'1fr 1fr':'1fr',gap:'0.75rem'}}>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={q.chartData.slice(0,20)}>
                        <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false}/>
                        <XAxis dataKey="name" stroke={T.dimmed} fontSize={10}/><YAxis stroke={T.dimmed} fontSize={10} allowDecimals={false}/>
                        <Tooltip content={<TT/>}/>
                        <Bar dataKey="value" radius={[5,5,0,0]}>{q.chartData.slice(0,20).map((_:any,i:number)=><Cell key={i} fill={CC[i%CC.length]}/>)}</Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    {q.chartData.length<=5&&(
                      <ResponsiveContainer width="100%" height={180}>
                        <PieChart><Pie data={q.chartData.slice(0,5)} dataKey="value" nameKey="name" innerRadius={40} outerRadius={65} paddingAngle={3}>
                          {q.chartData.slice(0,5).map((_:any,i:number)=><Cell key={i} fill={CC[i%CC.length]}/>)}
                        </Pie><Tooltip content={<TT/>}/><Legend formatter={(v:any)=><span style={{color:T.muted,fontSize:'0.72rem'}}>{v}</span>}/></PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                ))}
                <QInsight q={q} totalSubmissions={totalSubmissions}/>
              </Card>
            );
          })}
        </div>
      </div>
      <ChatPanel isOpen={chatOpen} onClose={()=>setChatOpen(false)} ctx={formData} dtype="form" did={formId}/>
    </div>
  );
}

/* ── Dataset Analysis ── */
function DatasetAnalysis({dsData,dsId}:{dsData:any;dsId:string}){
  const [insights,setInsights]=useState<string[]>([]);
  const [insLoad,setInsLoad]=useState(false);
  const [chatOpen,setChatOpen]=useState(false);
  const [expanded,setExpanded]=useState<string|null>(null);
  const [mounted,setMounted]=useState(false);
  const [downloading,setDownloading]=useState(false);
  const [showRelation,setShowRelation]=useState(false);
  const chartsRef=useRef<HTMLDivElement>(null);
  useEffect(()=>setMounted(true),[]);

  const genInsights=async()=>{
    setInsLoad(true);
    try{
      const r=await fetch('/api/ai/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'dataset',context:dsData})});
      const d=await r.json();
      if(d.analysis){
        const lines=d.analysis.split('\n').filter((l:string)=>l.trim().match(/^[-•*]|^\d+\.|^##/)).map((l:string)=>l.replace(/^[-•*#\d.]+\s*/,'').replace(/\*\*/g,'').trim()).filter((l:string)=>l.length>10).slice(0,7);
        setInsights(lines.length>0?lines:[d.analysis.slice(0,200)]);
      }
    }catch{} setInsLoad(false);
  };

  const handleDl=async()=>{setDownloading(true);await dlReport(dsData?.filename||'Dataset Report',insights,chartsRef.current);setDownloading(false);};
  if(!dsData)return null;
  const{filename,rowCount,columnCount,columns=[]}=dsData;
  const numCols=columns.filter((c:any)=>c.type==='numeric');
  const catCols=columns.filter((c:any)=>c.type==='categorical');
  const nullHeavy=columns.filter((c:any)=>(c.missing/rowCount)>0.2).length;
  const dq=Math.round((1-nullHeavy/Math.max(columnCount,1))*100);
  const numSummary=numCols.slice(0,6).map((c:any)=>({name:c.name.substring(0,12),min:c.min,max:c.max,mean:c.mean}));
  const typePie=[{name:'Numeric',value:numCols.length},{name:'Categorical',value:catCols.length}].filter(t=>t.value>0);
  const badge=(type:string)=>({numeric:{bg:'#10b98122',color:T.green,label:'123'},categorical:{bg:'#f59e0b22',color:T.amber,label:'ABC'},timestamp:{bg:'#6366f122',color:'#a5b4fc',label:'📅'}}[type]||{bg:'#f59e0b22',color:T.amber,label:'ABC'});

  return(
    <div style={{display:'flex',flexDirection:'column',gap:'1.5rem'}}>
      {/* Header with Relation button */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'1rem'}}>
        <div><h2 style={{margin:0,fontSize:'1.3rem',fontWeight:800,color:T.text}}>{filename}</h2><p style={{margin:'4px 0 0',fontSize:'0.82rem',color:T.muted}}>Dataset Analysis Dashboard</p></div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <button onClick={genInsights} disabled={insLoad} style={{display:'flex',alignItems:'center',gap:7,padding:'9px 18px',background:insLoad?T.card:`linear-gradient(135deg,${T.accent},${T.accent2})`,border:`1px solid ${insLoad?T.border:'transparent'}`,borderRadius:10,color:'#fff',cursor:insLoad?'not-allowed':'pointer',fontSize:'0.82rem',fontWeight:700}}>
            {insLoad?<Loader2 size={14} style={{animation:'spin 1s linear infinite'}}/>:<Zap size={14}/>}{insLoad?'Analyzing…':insights.length?'Refresh Insights':'Generate AI Insights'}
          </button>
          {/* ← RELATION BUTTON */}
          <button onClick={()=>setShowRelation(true)} style={{display:'flex',alignItems:'center',gap:7,padding:'9px 18px',background:`${T.accent2}18`,border:`1px solid ${T.accent2}44`,borderRadius:10,color:T.accent2,cursor:'pointer',fontSize:'0.82rem',fontWeight:700}}>
            <GitBranch size={14}/> Relation
          </button>
          <button onClick={handleDl} disabled={downloading} style={{display:'flex',alignItems:'center',gap:7,padding:'9px 18px',background:downloading?T.card:`${T.green}18`,border:`1px solid ${downloading?T.border:T.green+'66'}`,borderRadius:10,color:downloading?T.muted:T.green,cursor:downloading?'not-allowed':'pointer',fontSize:'0.82rem',fontWeight:700}}>
            {downloading?<Loader2 size={14} style={{animation:'spin 1s linear infinite'}}/>:<Download size={14}/>}{downloading?'Exporting…':'Download Report'}
          </button>
          <button onClick={()=>setChatOpen(true)} style={{display:'flex',alignItems:'center',gap:7,padding:'9px 18px',background:`${T.cyan}18`,border:`1px solid ${T.cyan}44`,borderRadius:10,color:T.cyan,cursor:'pointer',fontSize:'0.82rem',fontWeight:700}}><MessageSquare size={14}/> Ask AI</button>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:'1rem'}}>
        <KPI label="Total Rows" value={rowCount?.toLocaleString()} icon={Database} color={T.accent}/>
        <KPI label="Columns" value={columnCount} icon={Filter} color={T.accent2}/>
        <KPI label="Data Quality" value={`${dq}%`} icon={CheckCircle} color={dq>=80?T.green:T.amber} delta={dq>=80?5:-10}/>
        <KPI label="Numeric Cols" value={numCols.length} icon={Activity} color={T.cyan}/>
      </div>

      <InsightsBox insights={insights} loading={insLoad} onDownload={handleDl} downloading={downloading}/>

      <div ref={chartsRef}>
        {/* Overview charts */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(340px,1fr))',gap:'1.25rem',marginBottom:'1.25rem'}}>
          {mounted&&typePie.length>0&&(
            <Card>
              <p style={{margin:'0 0 1rem',fontSize:'0.82rem',fontWeight:700,color:T.muted,textTransform:'uppercase',letterSpacing:'0.08em'}}>Column Type Breakdown</p>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart><Pie data={typePie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={4}>
                  {typePie.map((_:any,i:number)=><Cell key={i} fill={CC[i%CC.length]}/>)}
                </Pie><Tooltip content={<TT/>}/><Legend formatter={(v:any)=><span style={{color:T.muted,fontSize:'0.75rem'}}>{v}</span>}/></PieChart>
              </ResponsiveContainer>
            </Card>
          )}
          {mounted&&numSummary.length>0&&(
            <Card>
              <p style={{margin:'0 0 1rem',fontSize:'0.82rem',fontWeight:700,color:T.muted,textTransform:'uppercase',letterSpacing:'0.08em'}}>Numeric Column Ranges</p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={numSummary}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false}/>
                  <XAxis dataKey="name" stroke={T.dimmed} fontSize={10}/><YAxis stroke={T.dimmed} fontSize={10}/>
                  <Tooltip content={<TT/>}/>
                  <Bar dataKey="min" fill={T.accent2} radius={[4,4,0,0]} name="Min"/>
                  <Bar dataKey="mean" fill={T.accent} radius={[4,4,0,0]} name="Mean"/>
                  <Bar dataKey="max" fill={T.cyan} radius={[4,4,0,0]} name="Max"/>
                  <Legend formatter={(v:any)=><span style={{color:T.muted,fontSize:'0.75rem'}}>{v}</span>}/>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}
        </div>

        {/* ── DATA PREVIEW (first 20 rows + View All) ── */}
        <DataPreview dsId={dsId} columns={columns}/>

        {/* Column Details */}
        <div style={{display:'flex',flexDirection:'column',gap:'0.75rem'}}>
          <p style={{margin:'0 0 0.5rem',fontSize:'0.82rem',fontWeight:700,color:T.muted,textTransform:'uppercase',letterSpacing:'0.08em'}}>Column Details</p>
          {columns.map((col:any,idx:number)=>{
            const isExp=expanded===col.name;
            const b=badge(col.type);
            const uniq=col.uniqueCount||0;
            const isDateCol=col.type==='timestamp'||col.name?.toLowerCase().includes('date')||col.name?.toLowerCase().includes('time');
            const useTable=(col.type==='categorical'&&uniq>UNIQUE_LIMIT)||isDateCol;
            return(
              <Card key={col.name} style={{padding:'1rem 1.25rem'}}>
                <button onClick={()=>setExpanded(isExp?null:col.name)} style={{width:'100%',background:'none',border:'none',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',padding:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:12,minWidth:0}}>
                    <span style={{fontSize:'0.65rem',padding:'3px 9px',borderRadius:8,fontWeight:700,background:b.bg,color:b.color,flexShrink:0}}>{b.label}</span>
                    <span style={{color:T.text,fontWeight:700,fontSize:'0.95rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{col.name}</span>
                    <Chip label={col.type} color={b.color}/>
                    {useTable&&<Chip label={`${uniq} unique`} color={T.amber}/>}
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:12,flexShrink:0,marginLeft:'1rem'}}>
                    <span style={{fontSize:'0.78rem',color:T.muted}}>{col.type==='numeric'?`avg: ${col.mean} · ${col.min}–${col.max}`:`${col.uniqueCount} unique`}</span>
                    {isExp?<ChevronUp size={15} color={T.dimmed}/>:<ChevronDown size={15} color={T.dimmed}/>}
                  </div>
                </button>

                {!isExp&&idx<3&&<ColInsight col={col}/>}

                {isExp&&mounted&&(
                  <div style={{marginTop:'1.25rem',borderTop:`1px solid ${T.border}`,paddingTop:'1.25rem'}}>
                    {col.type==='numeric'&&(<>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(100px,1fr))',gap:'0.75rem',marginBottom:'1rem'}}>
                        {[['Min',col.min,T.accent2],['Max',col.max,T.pink],['Mean',col.mean,T.green],['Median',col.median,T.amber],['Std Dev',col.std,'#a5b4fc']].map(([l,v,c]:any)=>(
                          <div key={l} style={{background:`${c}11`,borderRadius:10,padding:'0.75rem',border:`1px solid ${c}22`}}>
                            <p style={{margin:0,fontSize:'0.65rem',color:T.muted}}>{l}</p>
                            <p style={{margin:'4px 0 0',fontSize:'1.1rem',fontWeight:800,color:c}}>{v}</p>
                          </div>
                        ))}
                      </div>
                      <ResponsiveContainer width="100%" height={180}>
                        <AreaChart data={col.histogram}>
                          <defs><linearGradient id={`g${idx}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={CC[idx%CC.length]} stopOpacity={0.4}/><stop offset="95%" stopColor={CC[idx%CC.length]} stopOpacity={0}/></linearGradient></defs>
                          <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false}/>
                          <XAxis dataKey="range" stroke={T.dimmed} fontSize={8} angle={-25} textAnchor="end" height={45}/>
                          <YAxis stroke={T.dimmed} fontSize={10}/>
                          <Tooltip content={<TT/>}/>
                          <Area type="monotone" dataKey="count" stroke={CC[idx%CC.length]} fill={`url(#g${idx})`} strokeWidth={2}/>
                        </AreaChart>
                      </ResponsiveContainer>
                    </>)}

                    {(col.type==='categorical'||isDateCol)&&(useTable?(
                      <RawTable data={col.topValues||[]} colName={col.name} uniqueCount={uniq}/>
                    ):(
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
                        <ResponsiveContainer width="100%" height={Math.max(200,(col.topValues?.length||8)*26)}>
                          <BarChart data={col.topValues} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke={T.border} horizontal={false}/>
                            <XAxis type="number" stroke={T.dimmed} fontSize={10}/>
                            <YAxis type="category" dataKey="name" stroke={T.dimmed} fontSize={10} width={150}/>
                            <Tooltip content={<TT/>}/>
                            <Bar dataKey="value" radius={[0,5,5,0]}>{col.topValues?.map((_:any,i:number)=><Cell key={i} fill={CC[i%CC.length]}/>)}</Bar>
                          </BarChart>
                        </ResponsiveContainer>
                        <ResponsiveContainer width="100%" height={220}>
                          <PieChart><Pie data={col.topValues?.slice(0,8)} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={3}>
                            {col.topValues?.slice(0,8).map((_:any,i:number)=><Cell key={i} fill={CC[i%CC.length]}/>)}
                          </Pie><Tooltip content={<TT/>}/><Legend formatter={(v:any)=><span style={{color:T.muted,fontSize:'0.7rem'}}>{v}</span>}/></PieChart>
                        </ResponsiveContainer>
                      </div>
                    ))}

                    <ColInsight col={col}/>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {/* Relation Panel Modal */}
      {showRelation&&<RelationPanel columns={columns} dsId={dsId} onClose={()=>setShowRelation(false)}/>}

      <ChatPanel isOpen={chatOpen} onClose={()=>setChatOpen(false)} ctx={dsData} dtype="dataset" did={dsId}/>
    </div>
  );
}

/* ── MAIN PAGE ── */
type MV='form'|'upload';
type FS='analysis'|'report';

export default function AnalyticsPage(){
  const [view,setView]=useState<MV|null>(null);
  const [fsub,setFsub]=useState<FS>('analysis');
  const [forms,setForms]=useState<any[]>([]);
  const [datasets,setDatasets]=useState<any[]>([]);
  const [selForm,setSelForm]=useState('');
  const [selDs,setSelDs]=useState('');
  const [formData,setFormData]=useState<any>(null);
  const [dsData,setDsData]=useState<any>(null);
  const [loading,setLoading]=useState(false);

  useEffect(()=>{
    fetch('/api/forms').then(r=>r.json()).then(d=>{const a=Array.isArray(d)?d:(d.forms||[]);setForms(a);if(a.length)setSelForm(a[0].id);}).catch(()=>{});
    fetch('/api/datasets').then(r=>r.json()).then(d=>{const a=Array.isArray(d)?d:[];setDatasets(a);if(a.length)setSelDs(a[0].id);}).catch(()=>{});
  },[]);

  const loadForm=async(id:string)=>{if(!id)return;setLoading(true);setFormData(null);try{const r=await fetch(`/api/analytics/questions?formId=${id}`);setFormData(await r.json());}catch{}setLoading(false);};
  const loadDs=async(id:string)=>{if(!id)return;setLoading(true);setDsData(null);try{const r=await fetch(`/api/datasets/${id}/analytics`);setDsData(await r.json());}catch{}setLoading(false);};

  if(!view)return(
    <div style={{padding:'2rem',maxWidth:900,margin:'0 auto'}}>
      <div style={{marginBottom:'2.5rem'}}>
        <h1 style={{fontSize:'1.8rem',fontWeight:900,color:T.text,margin:0}}>Analytics</h1>
        <p style={{color:T.muted,margin:'6px 0 0'}}>Select a data source to begin AI-powered analysis</p>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:'1.5rem'}}>
        {[
          {type:'form' as MV,title:'Form Analytics',desc:'Analyze form responses with smart charts and AI insights',icon:ClipboardList,grad:'linear-gradient(135deg,#0f1f3d,#1a1040)',bord:`${T.accent}33`,ibg:`linear-gradient(135deg,${T.accent},${T.accent2})`,chips:[{l:'Analysis',c:T.accent},{l:'Report',c:T.accent2}]},
          {type:'upload' as MV,title:'Upload File',desc:'Deep-dive into datasets with column stats, relation analysis & AI',icon:Upload,grad:'linear-gradient(135deg,#0f2d1f,#1a2a10)',bord:`${T.green}33`,ibg:`linear-gradient(135deg,${T.green},${T.cyan})`,chips:[{l:'Dataset Analytics',c:T.green},{l:'Relation Analysis',c:T.accent2},{l:'AI Copilot',c:T.cyan}]},
        ].map(({type,title,desc,icon:Icon,grad,bord,ibg,chips})=>(
          <button key={type} onClick={()=>setView(type)} style={{background:grad,border:`1px solid ${bord}`,borderRadius:20,padding:'2rem',cursor:'pointer',textAlign:'left',transition:'all 0.2s'}}
            onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.transform='translateY(-3px)';(e.currentTarget as HTMLElement).style.boxShadow='0 12px 40px rgba(0,0,0,0.3)';}}
            onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.transform='none';(e.currentTarget as HTMLElement).style.boxShadow='none';}}>
            <div style={{width:52,height:52,borderRadius:14,background:ibg,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:'1.25rem'}}><Icon size={24} color="#fff"/></div>
            <h3 style={{margin:'0 0 8px',fontSize:'1.1rem',fontWeight:800,color:T.text}}>{title}</h3>
            <p style={{margin:'0 0 1.25rem',fontSize:'0.85rem',color:T.muted,lineHeight:1.6}}>{desc}</p>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>{chips.map(({l,c})=><Chip key={l} label={l} color={c}/>)}</div>
          </button>
        ))}
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if(view==='form')return(
    <div style={{padding:'1.5rem',maxWidth:1300,margin:'0 auto'}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:'1.5rem',flexWrap:'wrap'}}>
        <button onClick={()=>{setView(null);setFormData(null);}} style={{background:'none',border:'none',color:T.muted,cursor:'pointer',fontSize:'0.875rem',padding:0}}>Analytics</button>
        <ChevronRight size={14} color={T.dimmed}/><span style={{color:T.text,fontSize:'0.875rem',fontWeight:600}}>Form</span>
        {formData&&<><ChevronRight size={14} color={T.dimmed}/><span style={{color:T.accent,fontSize:'0.875rem',fontWeight:600}}>{formData.formTitle}</span></>}
      </div>
      <div style={{display:'flex',gap:6,marginBottom:'1.5rem'}}>
        {[{id:'analysis',label:'Analysis',icon:BarChart2},{id:'report',label:'Report',icon:FileText}].map(t=>{
          const Icon=t.icon;const act=fsub===t.id;
          return<button key={t.id} onClick={()=>setFsub(t.id as FS)} style={{display:'flex',alignItems:'center',gap:7,padding:'9px 20px',borderRadius:10,border:`1px solid ${act?T.accent:T.border}`,background:act?`${T.accent}18`:'none',color:act?T.accent:T.muted,cursor:'pointer',fontWeight:act?700:500,fontSize:'0.875rem',transition:'all 0.15s'}}><Icon size={15}/> {t.label}</button>;
        })}
      </div>
      <Card style={{marginBottom:'1.5rem',display:'flex',alignItems:'center',gap:'1rem',flexWrap:'wrap'}}>
        <ClipboardList size={16} color={T.muted}/>
        <select value={selForm} onChange={e=>{setSelForm(e.target.value);setFormData(null);}} style={{flex:1,minWidth:200,maxWidth:400,padding:'10px 14px',background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,color:T.text,fontSize:'0.875rem'}}>
          {forms.length===0?<option>No forms yet</option>:forms.map((f:any)=><option key={f.id} value={f.id}>{f.title}</option>)}
        </select>
        <button onClick={()=>loadForm(selForm)} disabled={!selForm||loading} style={{display:'flex',alignItems:'center',gap:7,padding:'10px 22px',background:`linear-gradient(135deg,${T.accent},${T.accent2})`,border:'none',borderRadius:10,color:'#fff',fontWeight:700,fontSize:'0.875rem',cursor:loading||!selForm?'not-allowed':'pointer',opacity:loading?0.6:1}}>
          {loading?<Loader2 size={15} style={{animation:'spin 1s linear infinite'}}/>:<RefreshCw size={15}/>} Load
        </button>
      </Card>
      {loading&&<Card style={{textAlign:'center',padding:'4rem'}}><Loader2 size={36} color={T.accent} style={{animation:'spin 1s linear infinite',marginBottom:12}}/><p style={{color:T.muted,margin:0}}>Loading analytics…</p></Card>}
      {!loading&&!formData&&<Card style={{textAlign:'center',padding:'4rem'}}><ClipboardList size={44} color={T.dimmed} style={{marginBottom:12}}/><p style={{color:T.muted,margin:0}}>Select a form and click Load</p></Card>}
      {!loading&&formData&&fsub==='analysis'&&<FormAnalysis formData={formData} formId={selForm}/>}
      {!loading&&formData&&fsub==='report'&&<Card style={{textAlign:'center',padding:'3rem'}}><FileText size={44} color={T.dimmed} style={{marginBottom:12}}/><p style={{color:T.muted}}>Switch to Analysis tab to view charts and insights</p></Card>}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return(
    <div style={{padding:'1.5rem',maxWidth:1300,margin:'0 auto'}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:'1.5rem'}}>
        <button onClick={()=>{setView(null);setDsData(null);}} style={{background:'none',border:'none',color:T.muted,cursor:'pointer',fontSize:'0.875rem',padding:0}}>Analytics</button>
        <ChevronRight size={14} color={T.dimmed}/><span style={{color:T.text,fontSize:'0.875rem',fontWeight:600}}>Upload File</span>
        {dsData&&<><ChevronRight size={14} color={T.dimmed}/><span style={{color:T.green,fontSize:'0.875rem',fontWeight:600}}>{dsData.filename}</span></>}
      </div>
      <Card style={{marginBottom:'1.5rem',display:'flex',alignItems:'center',gap:'1rem',flexWrap:'wrap'}}>
        <Database size={16} color={T.muted}/>
        <select value={selDs} onChange={e=>{setSelDs(e.target.value);setDsData(null);}} style={{flex:1,minWidth:200,maxWidth:400,padding:'10px 14px',background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,color:T.text,fontSize:'0.875rem'}}>
          {datasets.length===0?<option>No datasets uploaded</option>:datasets.map((d:any)=><option key={d.id} value={d.id}>{d.filename}</option>)}
        </select>
        <button onClick={()=>loadDs(selDs)} disabled={!selDs||loading} style={{display:'flex',alignItems:'center',gap:7,padding:'10px 22px',background:`linear-gradient(135deg,${T.green},${T.cyan})`,border:'none',borderRadius:10,color:'#fff',fontWeight:700,fontSize:'0.875rem',cursor:loading||!selDs?'not-allowed':'pointer',opacity:loading?0.6:1}}>
          {loading?<Loader2 size={15} style={{animation:'spin 1s linear infinite'}}/>:<RefreshCw size={15}/>} Load
        </button>
      </Card>
      {loading&&<Card style={{textAlign:'center',padding:'4rem'}}><Loader2 size={36} color={T.green} style={{animation:'spin 1s linear infinite',marginBottom:12}}/><p style={{color:T.muted,margin:0}}>Analyzing dataset…</p></Card>}
      {!loading&&!dsData&&<Card style={{textAlign:'center',padding:'4rem'}}><Upload size={44} color={T.dimmed} style={{marginBottom:12}}/><p style={{color:T.muted,margin:0}}>Select a dataset and click Load</p></Card>}
      {!loading&&dsData&&<DatasetAnalysis dsData={dsData} dsId={selDs}/>}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

