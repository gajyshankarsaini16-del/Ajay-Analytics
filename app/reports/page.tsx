'use client';

import { useState, useEffect, useRef } from 'react';
import {
  FileText, BarChart2, Globe, Loader2, BrainCircuit,
  Sparkles, Download, Filter, Calendar, Database,
  ClipboardList, RefreshCw, X, BookOpen, Target,
  AlertTriangle, CheckCircle, ArrowRight, List
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const TABS = [
  { id: 'dataset', label: 'Dataset Report',  icon: <Database size={16} />,      desc: 'Deep analysis of uploaded files' },
  { id: 'form',    label: 'Form Report',      icon: <ClipboardList size={16} />, desc: 'Form response analysis' },
  { id: 'overall', label: 'Executive Report', icon: <Globe size={16} />,         desc: 'Platform-wide executive summary' },
];

const Section = ({ title, icon, children, accentColor = '#6366f1' }: any) => (
  <div style={{ marginBottom: '2rem' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem',
      borderBottom: `2px solid ${accentColor}`, paddingBottom: '0.5rem' }}>
      <span style={{ color: accentColor }}>{icon}</span>
      <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {title}
      </h3>
    </div>
    {children}
  </div>
);

const MetricCard = ({ label, value, color = '#6366f1' }: any) => (
  <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '1rem',
    borderLeft: `3px solid ${color}` }}>
    <p style={{ margin: 0, fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
    <p style={{ margin: '4px 0 0', fontSize: '1.4rem', fontWeight: 700, color }}>{value}</p>
  </div>
);

const COLORS = ['#6366f1','#10b981','#f59e0b','#ec4899','#8b5cf6','#06b6d4'];

const GLOSSARY_TERMS: Record<string, string> = {
  'Completion Rate': 'Percentage of fields filled out vs total expected, indicating form quality.',
  'Row Count': 'Total number of data entries in a dataset.',
  'Categorical Column': 'A column containing text labels or categories rather than numbers.',
  'Numeric Column': 'A column containing quantifiable numerical values.',
  'Pearson Correlation': 'A statistical measure (−1 to +1) indicating strength/direction of linear relationship.',
  'MoM Growth': 'Month-over-Month percentage change in a metric compared to the previous month.',
  'KPI': 'Key Performance Indicator — a measurable value showing how effectively objectives are being achieved.',
  'Executive Summary': 'A brief overview of the entire report for senior stakeholders.',
  'Data Quality Index': 'A score representing completeness, accuracy, and consistency of the data.',
};

export default function ReportsPage() {
  const [activeTab, setActiveTab]     = useState('dataset');
  const [datasets, setDatasets]       = useState<any[]>([]);
  const [forms, setForms]             = useState<any[]>([]);
  const [selectedDataset, setSelectedDataset] = useState('');
  const [selectedForm, setSelectedForm]       = useState('');
  const [dateFrom, setDateFrom]       = useState('');
  const [dateTo, setDateTo]           = useState('');
  const [report, setReport]           = useState<any>(null);
  const [loading, setLoading]         = useState(false);
  const [aiLoading, setAiLoading]     = useState(false);
  const [aiAnalysis, setAiAnalysis]   = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState('all');
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/datasets').then(r => r.json()).then(d => {
      setDatasets(Array.isArray(d) ? d : []);
      if (d.length) setSelectedDataset(d[0].id);
    }).catch(() => {});
    fetch('/api/forms').then(r => r.json()).then(d => {
      const arr = Array.isArray(d) ? d : (d.forms || []);
      setForms(arr);
      if (arr.length) setSelectedForm(arr[0].id);
    }).catch(() => {});
  }, []);

  const generateReport = async () => {
    setLoading(true); setReport(null); setAiAnalysis(null);
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
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const generateAI = async () => {
    if (!report) return;
    setAiLoading(true);
    try {
      const type = activeTab === 'dataset' ? 'dataset' : activeTab === 'form' ? 'form_report' : 'overall_report';
      const res  = await fetch('/api/ai/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, context: report.context }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setAiAnalysis(json.analysis);
    } catch (e: any) {
      alert('AI Error: ' + e.message);
    } finally {
      setAiLoading(false);
    }
  };

  const exportPDF = async () => {
    if (!reportRef.current) return;
    const canvas = await html2canvas(reportRef.current, { scale: 2, backgroundColor: '#09090b' });
    const img    = canvas.toDataURL('image/png');
    const pdf    = new jsPDF('p', 'mm', 'a4');
    const w      = pdf.internal.pageSize.getWidth();
    const h      = pdf.internal.pageSize.getHeight();
    const imgH   = (canvas.height * w) / canvas.width;
    let position = 0;
    if (imgH <= h) {
      pdf.addImage(img, 'PNG', 0, 0, w, imgH);
    } else {
      // Multi-page PDF
      while (position < imgH) {
        pdf.addImage(img, 'PNG', 0, -position, w, imgH);
        position += h;
        if (position < imgH) pdf.addPage();
      }
    }
    const name = report?.title?.replace(/[^a-z0-9]/gi,'_') || 'report';
    pdf.save(`${name}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const card = (extra?: any) => ({
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px', padding: '1.5rem', ...extra
  });

  /* Build action points from AI text */
  const extractActionPoints = (text: string): string[] => {
    if (!text) return [];
    const lines = text.split('\n').filter(l => l.trim().startsWith('-') || l.trim().match(/^\d+\./));
    return lines.slice(0, 5).map(l => l.replace(/^[-\d.]+\s*/, '').replace(/\*\*/g, '').trim()).filter(Boolean);
  };

  /* Parse AI sections */
  const parseAISections = (text: string) => {
    if (!text) return {};
    const sections: Record<string, string> = {};
    const lines = text.split('\n');
    let current = 'intro';
    lines.forEach(line => {
      if (line.match(/^#+\s/) || line.match(/^\*\*/)) {
        current = line.replace(/[#*]/g, '').trim().toLowerCase();
        sections[current] = '';
      } else {
        sections[current] = (sections[current] || '') + line + '\n';
      }
    });
    return sections;
  };

  const actionPoints = extractActionPoints(aiAnalysis || '');
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  const SECTION_TABS = [
    { id: 'all',           label: 'Full Report' },
    { id: 'executive',     label: 'Executive Summary' },
    { id: 'methodology',   label: 'Methodology' },
    { id: 'findings',      label: 'Key Findings' },
    { id: 'actions',       label: 'Action Points' },
    { id: 'limitations',   label: 'Limitations' },
    { id: 'glossary',      label: 'Glossary' },
  ];

  const show = (id: string) => activeSection === 'all' || activeSection === id;

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#fff', margin: 0 }}>Professional Reports</h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', margin: '4px 0 0' }}>
          Executive-grade reports with methodology, findings, action points & glossary
        </p>
      </div>

      {/* Report Type Tabs */}
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

      {/* Filters */}
      <div style={{ ...card(), marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', color: 'rgba(255,255,255,0.7)' }}>
          <Filter size={16} /> <strong>Report Configuration</strong>
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {activeTab === 'dataset' && (
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>Dataset</label>
              <select value={selectedDataset} onChange={e => setSelectedDataset(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '0.875rem' }}>
                {datasets.length === 0 ? <option>No datasets uploaded</option>
                  : datasets.map(d => <option key={d.id} value={d.id}>{d.filename}</option>)}
              </select>
            </div>
          )}
          {activeTab === 'form' && (
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>Form</label>
              <select value={selectedForm} onChange={e => setSelectedForm(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '0.875rem' }}>
                {forms.length === 0 ? <option>No forms created</option>
                  : forms.map(f => <option key={f.id} value={f.id}>{f.title}</option>)}
              </select>
            </div>
          )}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>
              <Calendar size={12} style={{ display: 'inline', marginRight: '4px' }} />From
            </label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              style={{ padding: '10px 12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '0.875rem' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>
              <Calendar size={12} style={{ display: 'inline', marginRight: '4px' }} />To
            </label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              style={{ padding: '10px 12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '0.875rem' }} />
          </div>
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); }}
              style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)',
                borderRadius: '8px', padding: '10px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <X size={14} /> Clear
            </button>
          )}
          <button onClick={generateReport} disabled={loading}
            style={{ padding: '10px 24px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              border: 'none', borderRadius: '8px', color: '#fff', cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', opacity: loading ? 0.7 : 1, fontSize: '0.875rem' }}>
            {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <BarChart2 size={16} />}
            Generate Report
          </button>
        </div>
      </div>

      {loading && (
        <div style={{ ...card(), display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '4rem' }}>
          <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: '#6366f1' }} />
          <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0 }}>Building your professional report...</p>
        </div>
      )}

      {report && !loading && (
        <div>
          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <button onClick={generateAI} disabled={aiLoading}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
                background: 'rgba(99,102,241,0.15)', border: '1px solid #6366f1',
                borderRadius: '8px', color: '#a5b4fc', cursor: aiLoading ? 'not-allowed' : 'pointer',
                fontWeight: 600, fontSize: '0.875rem', opacity: aiLoading ? 0.7 : 1 }}>
              {aiLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <BrainCircuit size={16} />}
              {aiAnalysis ? 'Regenerate AI Analysis' : 'Generate AI Analysis'}
            </button>
            <button onClick={exportPDF}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
                background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none',
                borderRadius: '8px', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}>
              <Download size={16} /> Export PDF
            </button>
          </div>

          {/* Section Filter */}
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            {SECTION_TABS.map(t => (
              <button key={t.id} onClick={() => setActiveSection(t.id)}
                style={{ padding: '6px 14px', border: '1px solid',
                  borderColor: activeSection === t.id ? '#6366f1' : 'rgba(255,255,255,0.1)',
                  background: activeSection === t.id ? 'rgba(99,102,241,0.2)' : 'none',
                  color: activeSection === t.id ? '#a5b4fc' : 'rgba(255,255,255,0.5)',
                  borderRadius: '20px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: activeSection===t.id ? 600 : 400 }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* REPORT CONTENT */}
          <div ref={reportRef} style={{ ...card() }}>

            {/* ── TITLE PAGE ── */}
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px', fontWeight: 700 }}>
                    DataCore Intelligence Platform
                  </div>
                  <h2 style={{ color: '#fff', margin: '0 0 8px', fontSize: '1.6rem', fontWeight: 700 }}>{report.title}</h2>
                  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)' }}>
                      📅 Generated: {today}
                    </span>
                    <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)' }}>
                      🔍 Scope: {report.filters || 'All time'}
                    </span>
                    <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)' }}>
                      🤖 AI: {aiAnalysis ? 'Included' : 'Not generated'}
                    </span>
                  </div>
                </div>
                <div style={{ padding: '12px 20px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '10px', textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: '0.7rem', color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Report Type</p>
                  <p style={{ margin: '4px 0 0', fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
                    {activeTab === 'dataset' ? 'Dataset Analysis' : activeTab === 'form' ? 'Form Report' : 'Executive Report'}
                  </p>
                </div>
              </div>
            </div>

            {/* ── 1. EXECUTIVE SUMMARY ── */}
            {show('executive') && (
              <Section title="Executive Summary" icon={<Target size={16} />} accentColor="#6366f1">
                <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: '10px', padding: '1.25rem', lineHeight: 1.8 }}>
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.85)', fontSize: '0.95rem' }}>{report.summary}</p>
                </div>
                {aiAnalysis && (
                  <div style={{ marginTop: '1rem', background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.1)', borderRadius: '10px', padding: '1.25rem' }}>
                    <p style={{ margin: '0 0 8px', fontSize: '0.75rem', color: '#a5b4fc', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      <Sparkles size={11} style={{ display: 'inline', marginRight: '4px' }} /> AI Executive Summary
                    </p>
                    <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', lineHeight: 1.8 }}>
                      {aiAnalysis.split('\n').slice(0, 4).join('\n')}
                    </p>
                  </div>
                )}
              </Section>
            )}

            {/* ── 2. KEY METRICS ── */}
            {show('findings') && report.metrics?.length > 0 && (
              <Section title="Key Metrics & KPIs" icon={<BarChart2 size={16} />} accentColor="#10b981">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '1rem' }}>
                  {report.metrics.map((m: any, i: number) => (
                    <MetricCard key={i} label={m.label} value={m.value} color={COLORS[i % COLORS.length]} />
                  ))}
                </div>
              </Section>
            )}

            {/* ── 3. METHODOLOGY ── */}
            {show('methodology') && (
              <Section title="Methodology" icon={<BookOpen size={16} />} accentColor="#f59e0b">
                <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.9rem', lineHeight: 1.8 }}>
                  <p style={{ margin: '0 0 0.75rem' }}>
                    This report was generated using the <strong style={{ color: '#f59e0b' }}>DataCore Intelligence Platform</strong> with the following approach:
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {[
                      activeTab === 'dataset'
                        ? 'CSV/Excel dataset uploaded and parsed; each column classified as numeric or categorical via heuristic type detection (≥75% parseable values → numeric).'
                        : activeTab === 'form'
                        ? 'Form submission data extracted from database; each field analysed for response frequency, distribution, and completion rate.'
                        : 'Aggregated data from all forms and datasets; submissions grouped by date and source for trend analysis.',
                      'Statistical measures computed: min, max, mean, median, standard deviation for numeric columns; frequency distributions for categorical columns.',
                      'AI analysis generated using Claude (Anthropic) — prompts designed to surface actionable insights, anomalies, and strategic recommendations.',
                      `Date range applied: ${report.filters || 'All available data (no date filter)'}`,
                      'PDF export rendered via html2canvas + jsPDF at 2× pixel density for print-quality output.',
                    ].map((step, i) => (
                      <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                        <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: '0.85rem', minWidth: '18px', marginTop: '2px' }}>{i+1}.</span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Section>
            )}

            {/* ── 4. KEY FINDINGS ── */}
            {show('findings') && report.details?.length > 0 && (
              <Section title="Key Findings — Data Table" icon={<List size={16} />} accentColor="#8b5cf6">
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        {Object.keys(report.details[0]).map(k => (
                          <th key={k} style={{ padding: '10px 14px', textAlign: 'left', color: 'rgba(255,255,255,0.45)',
                            borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: '0.72rem',
                            textTransform: 'uppercase', letterSpacing: '0.06em', background: 'rgba(255,255,255,0.02)' }}>{k}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {report.details.map((row: any, i: number) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          {Object.values(row).map((v: any, j) => (
                            <td key={j} style={{ padding: '10px 14px', color: j === 0 ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.65)', fontWeight: j === 0 ? 600 : 400 }}>
                              {String(v)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>
            )}

            {/* ── 5. AI FULL ANALYSIS ── */}
            {show('findings') && aiAnalysis && (
              <Section title="AI-Generated Analysis" icon={<Sparkles size={16} />} accentColor="#06b6d4">
                <div style={{ background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.15)', borderRadius: '10px', padding: '1.25rem' }}>
                  <div style={{ color: 'rgba(255,255,255,0.82)', lineHeight: 1.85, whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>
                    {aiAnalysis}
                  </div>
                </div>
              </Section>
            )}

            {/* ── 6. ACTION POINTS ── */}
            {show('actions') && (
              <Section title="Action Points & Recommendations" icon={<ArrowRight size={16} />} accentColor="#10b981">
                {actionPoints.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {actionPoints.map((point, i) => (
                      <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start',
                        padding: '12px 16px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '10px' }}>
                        <span style={{ background: '#10b981', color: '#fff', width: '22px', height: '22px',
                          borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.72rem', fontWeight: 700, flexShrink: 0, marginTop: '1px' }}>{i+1}</span>
                        <p style={{ margin: 0, color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem', lineHeight: 1.6 }}>{point}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '1.5rem', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '10px', color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>
                    {aiAnalysis
                      ? 'Generate AI Analysis above to extract specific action points from your data.'
                      : 'Based on the data metrics:\n• Review low-response fields and improve field labels.\n• Monitor trends over 30-day windows to detect pattern shifts.\n• Ensure data completeness above 90% for reliable analysis.'}
                  </div>
                )}

                {/* Next Steps */}
                <div style={{ marginTop: '1rem', padding: '1rem 1.25rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px' }}>
                  <p style={{ margin: '0 0 8px', fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Suggested Next Steps</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    {[
                      'Schedule monthly review meetings',
                      'Set KPI threshold alerts',
                      'Share report with stakeholders',
                      'Cross-validate with additional data sources',
                    ].map((step, i) => (
                      <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'center', color: 'rgba(255,255,255,0.65)', fontSize: '0.85rem' }}>
                        <CheckCircle size={13} color="#10b981" /> {step}
                      </div>
                    ))}
                  </div>
                </div>
              </Section>
            )}

            {/* ── 7. LIMITATIONS ── */}
            {show('limitations') && (
              <Section title="Limitations & Caveats" icon={<AlertTriangle size={16} />} accentColor="#f59e0b">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {[
                    'This analysis is based on data available at report generation time. New data added after this date is not reflected.',
                    activeTab === 'dataset'
                      ? 'Dataset analysis assumes consistent column structure across all rows. Irregular data formats may affect accuracy of statistics.'
                      : activeTab === 'form'
                      ? 'Form completion rate is estimated based on answered vs total fields. Branching logic or optional fields may skew this figure.'
                      : 'Platform-wide report aggregates data from multiple sources which may have different collection methodologies.',
                    'AI-generated insights (Claude) are probabilistic in nature. Verify critical business decisions with domain experts.',
                    'Correlation analysis (if shown) does not imply causation between variables.',
                    `Date filter applied: ${report.filters || 'None — all data included'}. Results may vary significantly with different date ranges.`,
                  ].map((lim, i) => (
                    <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start',
                      padding: '10px 14px', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.12)', borderRadius: '8px' }}>
                      <AlertTriangle size={14} color="#f59e0b" style={{ marginTop: '2px', flexShrink: 0 }} />
                      <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', lineHeight: 1.6 }}>{lim}</p>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* ── 8. GLOSSARY ── */}
            {show('glossary') && (
              <Section title="Glossary of Terms" icon={<BookOpen size={16} />} accentColor="#ec4899">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '0.75rem' }}>
                  {Object.entries(GLOSSARY_TERMS).map(([term, def]) => (
                    <div key={term} style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px' }}>
                      <p style={{ margin: '0 0 4px', fontSize: '0.82rem', fontWeight: 700, color: '#ec4899' }}>{term}</p>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>{def}</p>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* ── FOOTER ── */}
            <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.07)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>DataCore Intelligence Platform</span>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>
                {today} · Powered by Claude AI (Anthropic)
              </span>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>Confidential</span>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
