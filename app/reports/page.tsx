'use client';

import { useState, useEffect, useRef } from 'react';
import {
  FileText, BarChart2, Globe, Loader2, BrainCircuit,
  Sparkles, Download, Filter, Calendar, Database,
  ClipboardList, BookOpen, Target, AlertTriangle,
  CheckCircle, ArrowRight, List, X, Info, TrendingUp
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const TABS = [
  { id: 'dataset', label: 'Dataset Report',   icon: <Database size={16} />,      desc: 'Deep analysis of uploaded files' },
  { id: 'form',    label: 'Form Report',       icon: <ClipboardList size={16} />, desc: 'Form response analysis' },
  { id: 'overall', label: 'Executive Report',  icon: <Globe size={16} />,         desc: 'Platform-wide executive summary' },
];

const SECTION_TABS = [
  { id: 'all',          label: 'Full Report',       icon: <FileText size={13} /> },
  { id: 'executive',    label: 'Executive Summary', icon: <Target size={13} /> },
  { id: 'methodology',  label: 'Methodology',       icon: <BookOpen size={13} /> },
  { id: 'findings',     label: 'Key Findings',      icon: <BarChart2 size={13} /> },
  { id: 'actions',      label: 'Action Points',     icon: <CheckCircle size={13} /> },
  { id: 'limitations',  label: 'Limitations',       icon: <AlertTriangle size={13} /> },
  { id: 'glossary',     label: 'Glossary',          icon: <List size={13} /> },
];

const GLOSSARY: Record<string, string> = {
  'Completion Rate':     'Percentage of form fields filled vs total expected fields.',
  'Row Count':           'Total number of data records in a dataset.',
  'Categorical Column':  'Column containing text labels or categories (not numbers).',
  'Numeric Column':      'Column containing quantifiable numerical values.',
  'Mean':                'Average value — sum of all values divided by count.',
  'Median':              'Middle value when data is sorted in order.',
  'Std Dev':             'Standard Deviation — measures spread/variability in data.',
  'Missing Values':      'Fields with no data entered, indicating potential data quality issues.',
  'MoM Growth':          'Month-over-Month change % compared to previous month.',
  'KPI':                 'Key Performance Indicator — measurable value tracking objectives.',
  'Executive Summary':   'High-level overview for senior stakeholders.',
  'Pearson Correlation': 'Statistical measure (−1 to +1) of linear relationship strength.',
  'Response Rate':       'Percentage of people who answered a particular question.',
  'Data Quality Score':  'Percentage of non-missing values across all columns.',
  'Frequency Distribution': 'Count of how often each unique value appears in a column.',
};

const COLORS = ['#6366f1','#10b981','#f59e0b','#ec4899','#8b5cf6','#06b6d4'];

export default function ReportsPage() {
  const [activeTab, setActiveTab]         = useState('dataset');
  const [sectionTab, setSectionTab]       = useState('all');
  const [datasets, setDatasets]           = useState<any[]>([]);
  const [forms, setForms]                 = useState<any[]>([]);
  const [selectedDataset, setSelectedDataset] = useState('');
  const [selectedForm, setSelectedForm]   = useState('');
  const [dateFrom, setDateFrom]           = useState('');
  const [dateTo, setDateTo]               = useState('');
  const [report, setReport]               = useState<any>(null);
  const [loading, setLoading]             = useState(false);
  const [aiLoading, setAiLoading]         = useState(false);
  const [aiAnalysis, setAiAnalysis]       = useState<string | null>(null);
  const [actionPoints, setActionPoints]   = useState<string[]>([]);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/datasets').then(r => r.json()).then(d => {
      const arr = Array.isArray(d) ? d : [];
      setDatasets(arr);
      if (arr.length) setSelectedDataset(arr[0].id);
    }).catch(() => {});
    fetch('/api/forms').then(r => r.json()).then(d => {
      const arr = Array.isArray(d) ? d : (d.forms || []);
      setForms(arr);
      if (arr.length) setSelectedForm(arr[0].id);
    }).catch(() => {});
  }, []);

  const generateReport = async () => {
    setLoading(true); setReport(null); setAiAnalysis(null); setActionPoints([]); setSectionTab('all');
    try {
      let url = `/api/reports/generate-v2?type=${activeTab}`;
      if (activeTab === 'dataset' && selectedDataset) url += `&datasetId=${selectedDataset}`;
      if (activeTab === 'form'    && selectedForm)    url += `&formId=${selectedForm}`;
      if (dateFrom) url += `&from=${dateFrom}`;
      if (dateTo)   url += `&to=${dateTo}`;
      const res  = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setReport(data);
    } catch (e: any) { alert('Error: ' + e.message); }
    finally { setLoading(false); }
  };

  const generateAI = async () => {
    if (!report) return;
    setAiLoading(true);
    try {
      const type = activeTab === 'dataset' ? 'dataset'
                 : activeTab === 'form'    ? 'form_report'
                 :                           'overall_report';
      const res  = await fetch('/api/ai/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, context: report.context }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setAiAnalysis(json.analysis);

      // Extract action points from AI text
      const lines = json.analysis.split('\n');
      const actions = lines
        .filter((l: string) => /^\d+\.|^-\s|^•/.test(l.trim()) && l.length > 20)
        .slice(0, 6)
        .map((l: string) => l.replace(/^\d+\.|^-\s|^•/, '').trim());
      setActionPoints(actions);
    } catch (e: any) { alert('AI Error: ' + e.message); }
    finally { setAiLoading(false); }
  };

  const exportPDF = async () => {
    if (!reportRef.current) return;
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, backgroundColor: '#09090b' });
      const img    = canvas.toDataURL('image/png');
      const pdf    = new jsPDF('p', 'mm', 'a4');
      const w      = pdf.internal.pageSize.getWidth();
      const h      = pdf.internal.pageSize.getHeight();
      const imgH   = (canvas.height * w) / canvas.width;
      let y = 0;
      while (y < imgH) {
        if (y > 0) pdf.addPage();
        pdf.addImage(img, 'PNG', 0, -y, w, imgH);
        y += h;
      }
      pdf.save(`DataCore-${activeTab}-report-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (e) { console.error('PDF failed', e); }
  };

  const s = (color = '#6366f1') => ({
    background: `rgba(${color === '#6366f1' ? '99,102,241' : color === '#10b981' ? '16,185,129' : '245,158,11'},0.06)`,
    border: `1px solid ${color}33`,
    borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem',
  });

  const show = (id: string) => sectionTab === 'all' || sectionTab === id;

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', boxSizing: 'border-box' }}>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#fff', margin: 0 }}>Smart Reports</h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', margin: '4px 0 0', fontSize: '0.875rem' }}>
          Professional AI-generated reports with full analytics breakdown
        </p>
      </div>

      {/* Report type tabs */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => { setActiveTab(t.id); setReport(null); setAiAnalysis(null); }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
              borderRadius: '10px', border: '1px solid',
              borderColor: activeTab === t.id ? '#6366f1' : 'rgba(255,255,255,0.1)',
              background: activeTab === t.id ? 'rgba(99,102,241,0.15)' : 'none',
              color: activeTab === t.id ? '#a5b4fc' : 'rgba(255,255,255,0.6)',
              cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Filter Panel */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '14px', padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem',
          color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>
          <Filter size={14} /> <b>Filters</b>
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>

          {activeTab === 'dataset' && (
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ display: 'block', fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginBottom: '5px' }}>Dataset</label>
              <select value={selectedDataset} onChange={e => setSelectedDataset(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '0.875rem' }}>
                {datasets.length === 0 ? <option>No datasets</option>
                  : datasets.map(d => <option key={d.id} value={d.id}>{d.filename}</option>)}
              </select>
            </div>
          )}

          {activeTab === 'form' && (
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ display: 'block', fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginBottom: '5px' }}>Form</label>
              <select value={selectedForm} onChange={e => setSelectedForm(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '0.875rem' }}>
                {forms.length === 0 ? <option>No forms</option>
                  : forms.map(f => <option key={f.id} value={f.id}>{f.title}</option>)}
              </select>
            </div>
          )}

          {['form','overall'].includes(activeTab) && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginBottom: '5px' }}>
                  <Calendar size={11} style={{ display: 'inline', marginRight: '3px' }} />From
                </label>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                  style={{ padding: '9px 12px', background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '0.875rem' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginBottom: '5px' }}>
                  <Calendar size={11} style={{ display: 'inline', marginRight: '3px' }} />To
                </label>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                  style={{ padding: '9px 12px', background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '0.875rem' }} />
              </div>
              {(dateFrom || dateTo) && (
                <button onClick={() => { setDateFrom(''); setDateTo(''); }}
                  style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)',
                    borderRadius: '8px', padding: '9px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}>
                  <X size={13} /> Clear
                </button>
              )}
            </>
          )}

          <button onClick={generateReport} disabled={loading}
            style={{ padding: '9px 22px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              border: 'none', borderRadius: '8px', color: '#fff', cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px',
              opacity: loading ? 0.7 : 1, fontSize: '0.875rem' }}>
            {loading ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <BarChart2 size={15} />}
            Generate Report
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '14px', padding: '4rem', textAlign: 'center' }}>
          <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: '#6366f1', marginBottom: '1rem' }} />
          <p style={{ color: 'rgba(255,255,255,0.5)' }}>Generating comprehensive report...</p>
        </div>
      )}

      {/* Report Output */}
      {report && !loading && (
        <div>
          {/* Action bar */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={generateAI} disabled={aiLoading || !!aiAnalysis}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 18px',
                background: aiAnalysis ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.15)',
                border: `1px solid ${aiAnalysis ? '#10b981' : '#6366f1'}`,
                borderRadius: '8px', color: aiAnalysis ? '#10b981' : '#a5b4fc',
                cursor: aiLoading ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '0.875rem',
                opacity: aiLoading ? 0.7 : 1 }}>
              {aiLoading ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <BrainCircuit size={15} />}
              {aiAnalysis ? 'AI Done ✓' : 'Generate AI Analysis'}
            </button>
            <button onClick={exportPDF}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 18px',
                background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none',
                borderRadius: '8px', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}>
              <Download size={15} /> Export PDF
            </button>
          </div>

          {/* Section filter tabs */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '1rem', flexWrap: 'wrap',
            borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: '0' }}>
            {SECTION_TABS.map(t => (
              <button key={t.id} onClick={() => setSectionTab(t.id)}
                style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 14px',
                  background: 'none', border: 'none',
                  borderBottom: sectionTab === t.id ? '2px solid #6366f1' : '2px solid transparent',
                  color: sectionTab === t.id ? '#a5b4fc' : 'rgba(255,255,255,0.4)',
                  cursor: 'pointer', fontSize: '0.78rem', fontWeight: sectionTab === t.id ? 600 : 400,
                  marginBottom: '-1px' }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* Report Content */}
          <div ref={reportRef} style={{ background: '#09090b', borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>

            {/* Title Page */}
            {show('all') && (
              <div style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.2),rgba(139,92,246,0.15))',
                borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '2.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.5rem' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px',
                        background: 'linear-gradient(135deg,#6366f1,#a855f7)', flexShrink: 0 }} />
                      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        DataCore Intelligence Platform
                      </span>
                    </div>
                    <h1 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.5rem', lineHeight: 1.2 }}>
                      {report.title}
                    </h1>
                    {report.purpose && (
                      <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.875rem', margin: 0 }}>{report.purpose}</p>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.8 }}>
                    <div><b style={{ color: 'rgba(255,255,255,0.6)' }}>Generated:</b> {new Date(report.generatedAt).toLocaleString()}</div>
                    <div><b style={{ color: 'rgba(255,255,255,0.6)' }}>Author:</b> {report.author}</div>
                    {report.filters && <div><b style={{ color: 'rgba(255,255,255,0.6)' }}>Scope:</b> {report.filters}</div>}
                    <div style={{ marginTop: '0.5rem', padding: '4px 10px', background: 'rgba(99,102,241,0.2)',
                      borderRadius: '20px', fontSize: '0.7rem', color: '#a5b4fc', display: 'inline-block' }}>
                      CONFIDENTIAL
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div style={{ padding: '2rem' }}>

              {/* Executive Summary */}
              {show('executive') && (
                <div style={{ marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem',
                    borderBottom: '2px solid #6366f1', paddingBottom: '0.5rem' }}>
                    <Target size={16} color="#6366f1" />
                    <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#fff',
                      textTransform: 'uppercase', letterSpacing: '0.08em' }}>Executive Summary</h3>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.8)', lineHeight: 1.8, fontSize: '0.9rem', margin: '0 0 1.25rem' }}>
                    {report.summary}
                  </p>

                  {/* KPI Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '0.75rem' }}>
                    {report.metrics?.map((m: any, i: number) => (
                      <div key={i} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px',
                        padding: '0.9rem', borderLeft: `3px solid ${m.color || COLORS[i % COLORS.length]}` }}>
                        <p style={{ margin: 0, fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)',
                          textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m.label}</p>
                        <p style={{ margin: '4px 0 0', fontSize: '1.25rem', fontWeight: 700,
                          color: m.color || COLORS[i % COLORS.length] }}>{m.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Executive Synthesis */}
              {aiAnalysis && show('executive') && (
                <div style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)',
                  borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem' }}>
                  <h4 style={{ color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: '8px',
                    marginBottom: '1rem', margin: '0 0 1rem' }}>
                    <Sparkles size={15} /> Gemini/Claude AI Executive Analysis
                  </h4>
                  <div style={{ color: 'rgba(255,255,255,0.82)', lineHeight: 1.8,
                    whiteSpace: 'pre-wrap', fontSize: '0.875rem' }}>
                    {aiAnalysis}
                  </div>
                </div>
              )}

              {/* Methodology */}
              {show('methodology') && report.methodology && (
                <div style={{ marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem',
                    borderBottom: '2px solid #10b981', paddingBottom: '0.5rem' }}>
                    <BookOpen size={16} color="#10b981" />
                    <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#fff',
                      textTransform: 'uppercase', letterSpacing: '0.08em' }}>Methodology</h3>
                  </div>
                  <div style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)',
                    borderRadius: '10px', padding: '1.25rem' }}>
                    <p style={{ color: 'rgba(255,255,255,0.75)', lineHeight: 1.8, fontSize: '0.875rem', margin: 0 }}>
                      {report.methodology}
                    </p>
                    <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {['Statistical Analysis', 'Frequency Distribution', 'Trend Computation', 'Data Quality Assessment'].map(tag => (
                        <span key={tag} style={{ padding: '3px 10px', background: 'rgba(16,185,129,0.15)',
                          border: '1px solid rgba(16,185,129,0.3)', borderRadius: '20px',
                          color: '#10b981', fontSize: '0.72rem', fontWeight: 500 }}>{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Key Findings / Data Table */}
              {show('findings') && report.details?.length > 0 && (
                <div style={{ marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem',
                    borderBottom: '2px solid #f59e0b', paddingBottom: '0.5rem' }}>
                    <BarChart2 size={16} color="#f59e0b" />
                    <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#fff',
                      textTransform: 'uppercase', letterSpacing: '0.08em' }}>Key Findings</h3>
                  </div>
                  <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                      <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                          {Object.keys(report.details[0]).map(k => (
                            <th key={k} style={{ padding: '10px 14px', textAlign: 'left',
                              color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem',
                              textTransform: 'uppercase', letterSpacing: '0.06em',
                              borderBottom: '1px solid rgba(255,255,255,0.08)', whiteSpace: 'nowrap' }}>{k}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {report.details.map((row: any, i: number) => (
                          <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)',
                            background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                            {Object.values(row).map((v: any, j) => (
                              <td key={j} style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.75)', maxWidth: '200px',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {typeof v === 'object' && v !== null
                                  ? (Array.isArray(v) ? v.map((x:any)=>`${x.value||x.name}: ${x.count}`).join(', ') : JSON.stringify(v))
                                  : String(v ?? '-')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Monthly Trend (Form only) */}
              {show('findings') && report.monthlyTrend?.length > 0 && (
                <div style={{ marginBottom: '2rem' }}>
                  <h4 style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginBottom: '0.75rem',
                    display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <TrendingUp size={14} /> Monthly Response Trend
                  </h4>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {report.monthlyTrend.map((m: any, i: number) => (
                      <div key={i} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '8px',
                        padding: '0.75rem 1rem', minWidth: '80px', textAlign: 'center' }}>
                        <p style={{ margin: 0, fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>{m.month}</p>
                        <p style={{ margin: '2px 0 0', fontSize: '1.1rem', fontWeight: 700, color: '#6366f1' }}>{m.count}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Points */}
              {show('actions') && (
                <div style={{ marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem',
                    borderBottom: '2px solid #10b981', paddingBottom: '0.5rem' }}>
                    <CheckCircle size={16} color="#10b981" />
                    <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#fff',
                      textTransform: 'uppercase', letterSpacing: '0.08em' }}>Action Points & Recommendations</h3>
                  </div>
                  {actionPoints.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {actionPoints.map((ap, i) => (
                        <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start',
                          background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)',
                          borderRadius: '10px', padding: '0.9rem' }}>
                          <span style={{ background: '#10b981', color: '#000', borderRadius: '50%',
                            width: '22px', height: '22px', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontSize: '0.72rem', fontWeight: 800, flexShrink: 0 }}>
                            {i + 1}
                          </span>
                          <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                            {ap}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px',
                      padding: '1.5rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem' }}>
                      {aiAnalysis
                        ? 'Action points extracted from AI analysis above.'
                        : 'Click "Generate AI Analysis" to get specific action points.'}
                    </div>
                  )}
                </div>
              )}

              {/* Limitations */}
              {show('limitations') && report.limitations?.length > 0 && (
                <div style={{ marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem',
                    borderBottom: '2px solid #f59e0b', paddingBottom: '0.5rem' }}>
                    <AlertTriangle size={16} color="#f59e0b" />
                    <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#fff',
                      textTransform: 'uppercase', letterSpacing: '0.08em' }}>Limitations & Caveats</h3>
                  </div>
                  <div style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)',
                    borderRadius: '10px', padding: '1.25rem' }}>
                    {report.limitations.map((l: string, i: number) => (
                      <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start',
                        marginBottom: i < report.limitations.length - 1 ? '0.75rem' : 0 }}>
                        <Info size={14} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', lineHeight: 1.6 }}>{l}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Glossary */}
              {show('glossary') && (
                <div style={{ marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem',
                    borderBottom: '2px solid #8b5cf6', paddingBottom: '0.5rem' }}>
                    <List size={16} color="#8b5cf6" />
                    <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#fff',
                      textTransform: 'uppercase', letterSpacing: '0.08em' }}>Glossary of Terms</h3>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: '0.6rem' }}>
                    {Object.entries(GLOSSARY).map(([term, def]) => (
                      <div key={term} style={{ background: 'rgba(139,92,246,0.05)',
                        border: '1px solid rgba(139,92,246,0.12)', borderRadius: '8px', padding: '0.75rem' }}>
                        <p style={{ margin: '0 0 3px', fontWeight: 700, color: '#a5b4fc', fontSize: '0.82rem' }}>{term}</p>
                        <p style={{ margin: 0, color: 'rgba(255,255,255,0.6)', fontSize: '0.78rem', lineHeight: 1.5 }}>{def}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer */}
              {show('all') && (
                <div style={{ marginTop: '2rem', paddingTop: '1rem',
                  borderTop: '1px solid rgba(255,255,255,0.07)',
                  display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem',
                  color: 'rgba(255,255,255,0.25)', fontSize: '0.72rem' }}>
                  <span>DataCore Intelligence Platform — Confidential Report</span>
                  <span>Generated: {new Date(report.generatedAt).toLocaleString()}</span>
                  <span>Powered by AI Analytics</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
