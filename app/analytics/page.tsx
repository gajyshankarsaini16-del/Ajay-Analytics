'use client';

import { useState, useEffect, useRef } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis
} from 'recharts';
import {
  ClipboardList, Upload, ChevronRight, BarChart2, FileText,
  Loader2, Sparkles, RefreshCw, TrendingUp, TrendingDown,
  AlertCircle, CheckCircle, ChevronDown, ChevronUp, Send,
  Bot, User, X, MessageSquare, Lightbulb, Target, Database,
  Activity, Zap, ArrowUpRight, ArrowDownRight, Filter,
  Download, Table2
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
const UNIQUE_LIMIT = 8; // Only use chart if ≤8 unique values, else always show full table

/* ── Tiny components ── */
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
  const PS=50; // Show 50 per page
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
        <span style={{fontSize:'0.75rem',color:T.muted}}>{filtered.length} results · Page {pg+1}/{pages} · {PS} per page</span>
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
    fetch('/api/ai/analyze',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({type:'column_insight',context:{name:col.name,type:col.type,...(col.type==='numeric'?{min:col.min,max:col.max,mean:col.mean,median:col.median,std:col.std}:{uniqueCount:col.uniqueCount,topValues:col.topValues?.slice(0,10),missing:col.missing})}})})
    .then(r=>r.json()).then(d=>{
      if(d.analysis){
        // Parse into bullet points
        const raw=d.analysis;
        const lines=raw.split('\n').map((l:string)=>l.trim()).filter((l:string)=>l.length>0);
        const pts:string[]=[];
        lines.forEach((line:string)=>{
          // Already a bullet
          if(line.match(/^[-•*]\s+/)||line.match(/^\d+\.\s+/)){
            pts.push(line.replace(/^[-•*\d.]+\s*/,'').replace(/\*\*/g,'').trim());
          } else if(line.match(/^##|^#/)){
            // Skip headers
          } else {
            // Split long sentences into bullets
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
            <li key={i} style={{fontSize:'0.82rem',color:'rgba(241,245,249,0.82)',lineHeight:1.55,paddingLeft:'0.2rem'}}>
              {b}
            </li>
          ))}
        </ul>
      )}
      {!load&&bullets.length===0&&<p style={{margin:0,fontSize:'0.82rem',color:'rgba(241,245,249,0.4)',paddingLeft:'0.25rem'}}>No insight available.</p>}
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

/* ── Download PDF — white background, professional ── */
async function dlReport(title:string,insights:string[],el:HTMLElement|null){
  const h2c=(await import('html2canvas')).default;
  const {default:jsPDF}=await import('jspdf');
  const pdf=new jsPDF('p','mm','a4');
  const pw=pdf.internal.pageSize.getWidth();
  const ph=pdf.internal.pageSize.getHeight();
  const m=15; let y=m;

  // ── White background throughout ──
  pdf.setFillColor(255,255,255); pdf.rect(0,0,pw,ph,'F');

  // ── Header bar ──
  pdf.setFillColor(37,99,235); pdf.roundedRect(0,0,pw,26,0,0,'F');
  pdf.setTextColor(255,255,255); pdf.setFontSize(14); pdf.setFont('helvetica','bold');
  pdf.text('Analytics Report',m,17);
  pdf.setFontSize(8); pdf.setFont('helvetica','normal');
  pdf.text(new Date().toLocaleDateString('en-IN',{dateStyle:'long'}),pw-m,17,{align:'right'});
  y=36;

  // ── Report title ──
  pdf.setTextColor(15,23,42); pdf.setFontSize(18); pdf.setFont('helvetica','bold');
  pdf.text(title,m,y); y+=4;
  pdf.setDrawColor(37,99,235); pdf.setLineWidth(0.8); pdf.line(m,y,pw-m,y); y+=10;

  // ── AI Insights section ──
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

  // ── Charts section ──
  if(el){
    // New page if needed
    if(y>ph-80){pdf.addPage();pdf.setFillColor(255,255,255);pdf.rect(0,0,pw,ph,'F');y=m;}
    pdf.setDrawColor(229,231,235); pdf.setLineWidth(0.3); pdf.line(m,y,pw-m,y); y+=7;
    pdf.setTextColor(15,23,42); pdf.setFontSize(12); pdf.setFont('helvetica','bold');
    pdf.text('📊 Charts & Visualizations',m,y); y+=8;

    const canvas=await h2c(el,{scale:2,backgroundColor:'#ffffff',useCORS:true,logging:false,
      onclone:(doc:Document)=>{
        // Make cloned element white bg for export
        const all=doc.querySelectorAll('*');
        all.forEach((el:any)=>{
          const s=window.getComputedStyle(el);
          if(s.background.includes('rgba(255,255,255,0.0')||s.background.includes('#0a0e1a')||s.background.includes('#111827')||s.background.includes('#151e2d')){
            el.style.background='#ffffff';
            el.style.color='#1e293b';
          }
        });
      }
    });
    const imgData=canvas.toDataURL('image/png');
    const imgW=pw-m*2;
    const imgH=(canvas.height*imgW)/canvas.width;
    let pos=0;
    while(pos<imgH){
      if(pos>0){pdf.addPage();pdf.setFillColor(255,255,255);pdf.rect(0,0,pw,ph,'F');y=m;}
      const sliceH=Math.min(imgH-pos,ph-y-m);
      pdf.addImage(imgData,'PNG',m,y,imgW,imgH,undefined,'FAST',0);
      pos+=sliceH+m; y=m;
      break; // single page image — let jsPDF handle overflow
    }
  }

  // ── Footer ──
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
  useEffect(()=>{setMounted(true);},[]);

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
      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'1rem'}}>
        <div><h2 style={{margin:0,fontSize:'1.3rem',fontWeight:800,color:T.text}}>{formTitle}</h2><p style={{margin:'4px 0 0',fontSize:'0.82rem',color:T.muted}}>Form Analysis Dashboard</p></div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={genInsights} disabled={insLoad} style={{display:'flex',alignItems:'center',gap:7,padding:'9px 18px',background:insLoad?T.card:`linear-gradient(135deg,${T.accent},${T.accent2})`,border:`1px solid ${insLoad?T.border:'transparent'}`,borderRadius:10,color:'#fff',cursor:insLoad?'not-allowed':'pointer',fontSize:'0.82rem',fontWeight:700}}>
            {insLoad?<Loader2 size={14} style={{animation:'spin 1s linear infinite'}}/>:<Zap size={14}/>}{insLoad?'Analyzing…':insights.length?'Refresh Insights':'Generate AI Insights'}
          </button>
          <button onClick={()=>setChatOpen(true)} style={{display:'flex',alignItems:'center',gap:7,padding:'9px 18px',background:`${T.cyan}18`,border:`1px solid ${T.cyan}44`,borderRadius:10,color:T.cyan,cursor:'pointer',fontSize:'0.82rem',fontWeight:700}}><MessageSquare size={14}/> Ask AI</button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:'1rem'}}>
        <KPI label="Total Responses" value={totalSubmissions} icon={Activity} color={T.accent}/>
        <KPI label="Questions" value={questions.length} icon={ClipboardList} color={T.accent2}/>
        <KPI label="Completion Rate" value={`${cr}%`} icon={Target} color={T.green} delta={cr>=70?12:-8}/>
        <KPI label="Most Active" value={topQ?.totalAnswers||0} icon={BarChart2} color={T.amber}/>
      </div>

      {/* Global insights + download */}
      <InsightsBox insights={insights} loading={insLoad} onDownload={handleDl} downloading={downloading}/>

      {/* Charts capture area */}
      <div ref={chartsRef}>
        {/* Overview */}
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

        {/* Per-question */}
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
                        <XAxis dataKey="name" stroke={T.dimmed} fontSize={10}/>
                        <YAxis stroke={T.dimmed} fontSize={10} allowDecimals={false}/>
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

                {/* Per-question insight */}
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
  const chartsRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{setMounted(true);},[]);

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
  const badge=(type:string)=>({numeric:{bg:'#10b98122',color:T.green,label:'123'},categorical:{bg:'#f59e0b22',color:T.amber,label:'ABC'},timestamp:{bg:'#6366f122',color:'#a5b4fc',label:'📅'},phone:{bg:'#f59e0b22',color:T.amber,label:'📞'},email:{bg:'#06b6d422',color:T.cyan,label:'✉️'}}[type]||{bg:'#f59e0b22',color:T.amber,label:'ABC'});

  return(
    <div style={{display:'flex',flexDirection:'column',gap:'1.5rem'}}>
      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'1rem'}}>
        <div><h2 style={{margin:0,fontSize:'1.3rem',fontWeight:800,color:T.text}}>{filename}</h2><p style={{margin:'4px 0 0',fontSize:'0.82rem',color:T.muted}}>Dataset Analysis Dashboard</p></div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <button onClick={genInsights} disabled={insLoad} style={{display:'flex',alignItems:'center',gap:7,padding:'9px 18px',background:insLoad?T.card:`linear-gradient(135deg,${T.accent},${T.accent2})`,border:`1px solid ${insLoad?T.border:'transparent'}`,borderRadius:10,color:'#fff',cursor:insLoad?'not-allowed':'pointer',fontSize:'0.82rem',fontWeight:700}}>
            {insLoad?<Loader2 size={14} style={{animation:'spin 1s linear infinite'}}/>:<Zap size={14}/>}{insLoad?'Analyzing…':insights.length?'Refresh Insights':'Generate AI Insights'}
          </button>
          <button onClick={handleDl} disabled={downloading} style={{display:'flex',alignItems:'center',gap:7,padding:'9px 18px',background:downloading?T.card:`${T.green}18`,border:`1px solid ${downloading?T.border:T.green+'66'}`,borderRadius:10,color:downloading?T.muted:T.green,cursor:downloading?'not-allowed':'pointer',fontSize:'0.82rem',fontWeight:700}}>
            {downloading?<Loader2 size={14} style={{animation:'spin 1s linear infinite'}}/>:<Download size={14}/>}{downloading?'Exporting…':'Download Report'}
          </button>
          <button onClick={()=>setChatOpen(true)} style={{display:'flex',alignItems:'center',gap:7,padding:'9px 18px',background:`${T.cyan}18`,border:`1px solid ${T.cyan}44`,borderRadius:10,color:T.cyan,cursor:'pointer',fontSize:'0.82rem',fontWeight:700}}><MessageSquare size={14}/> Ask AI</button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:'1rem'}}>
        <KPI label="Total Rows" value={rowCount?.toLocaleString()} icon={Database} color={T.accent}/>
        <KPI label="Columns" value={columnCount} icon={Filter} color={T.accent2}/>
        <KPI label="Data Quality" value={`${dq}%`} icon={CheckCircle} color={dq>=80?T.green:T.amber} delta={dq>=80?5:-10}/>
        <KPI label="Numeric Cols" value={numCols.length} icon={Activity} color={T.cyan}/>
      </div>

      {/* Insights */}
      <InsightsBox insights={insights} loading={insLoad} onDownload={handleDl} downloading={downloading}/>

      {/* Charts */}
      <div ref={chartsRef}>
        {/* Overview */}
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

        {/* Column cards */}
        <div style={{display:'flex',flexDirection:'column',gap:'0.75rem'}}>
          <p style={{margin:'0 0 0.5rem',fontSize:'0.82rem',fontWeight:700,color:T.muted,textTransform:'uppercase',letterSpacing:'0.08em'}}>Column Details</p>
          {columns.map((col:any,idx:number)=>{
            const isExp=expanded===col.name;
            const b=badge(col.type);
            const uniq=col.uniqueCount||0;
            const useTable=col.type==='categorical'&&uniq>UNIQUE_LIMIT;
            return(
              <Card key={col.name} style={{padding:'1rem 1.25rem'}}>
                <button onClick={()=>setExpanded(isExp?null:col.name)} style={{width:'100%',background:'none',border:'none',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',padding:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:12,minWidth:0}}>
                    <span style={{fontSize:'0.65rem',padding:'3px 9px',borderRadius:8,fontWeight:700,background:b.bg,color:b.color,flexShrink:0}}>{b.label}</span>
                    <span style={{color:T.text,fontWeight:700,fontSize:'0.95rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{col.name}</span>
                    <Chip label={col.type} color={b.color}/>
                    {useTable&&<Chip label=">20 unique → Table" color={T.amber}/>}
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:12,flexShrink:0,marginLeft:'1rem'}}>
                    <span style={{fontSize:'0.78rem',color:T.muted}}>{col.type==='numeric'?`avg: ${col.mean} · ${col.min}–${col.max}`:`${col.uniqueCount} unique`}</span>
                    {isExp?<ChevronUp size={15} color={T.dimmed}/>:<ChevronDown size={15} color={T.dimmed}/>}
                  </div>
                </button>

                {/* Always show insight for first 3 collapsed cols */}
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

                    {col.type==='categorical'&&(useTable?(
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

                    {/* Column insight on expand */}
                    <ColInsight col={col}/>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
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

  const SPIN=`<style>@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}</style>`;

  /* Landing */
  if(!view)return(
    <div style={{padding:'2rem',maxWidth:900,margin:'0 auto'}}>
      <div style={{marginBottom:'2.5rem'}}>
        <h1 style={{fontSize:'1.8rem',fontWeight:900,color:T.text,margin:0}}>Analytics</h1>
        <p style={{color:T.muted,margin:'6px 0 0'}}>Select a data source to begin AI-powered analysis</p>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:'1.5rem'}}>
        {[
          {type:'form' as MV,title:'Form Analytics',desc:'Analyze form responses with smart charts and AI insights',icon:ClipboardList,grad:'linear-gradient(135deg,#0f1f3d,#1a1040)',bord:`${T.accent}33`,ibg:`linear-gradient(135deg,${T.accent},${T.accent2})`,chips:[{l:'Analysis',c:T.accent},{l:'Report',c:T.accent2}]},
          {type:'upload' as MV,title:'Upload File',desc:'Deep-dive into datasets with column stats and AI analysis',icon:Upload,grad:'linear-gradient(135deg,#0f2d1f,#1a2a10)',bord:`${T.green}33`,ibg:`linear-gradient(135deg,${T.green},${T.cyan})`,chips:[{l:'Dataset Analytics',c:T.green},{l:'AI Copilot',c:T.cyan}]},
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

  /* Form view */
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

  /* Upload view */
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
