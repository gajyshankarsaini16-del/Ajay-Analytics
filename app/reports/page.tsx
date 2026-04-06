'use client';

import { useState, useEffect, useRef } from 'react';
import {
  FileText, BarChart2, Globe, Loader2, BrainCircuit,
  Sparkles, Download, Filter, Calendar, Database, ClipboardList, RefreshCw, X
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const TABS = [
  { id: 'dataset',  label: 'Dataset Reports',  icon: <Database size={16} />,      desc: 'AI analysis of uploaded files' },
  { id: 'form',     label: 'Form Reports',      icon: <ClipboardList size={16} />, desc: 'AI analysis of form responses' },
  { id: 'overall',  label: 'Overall Report',    icon: <Globe size={16} />,         desc: 'Platform-wide executive summary' },
];

export default function ReportsPage() {
  const [activeTab, setActiveTab]         = useState('dataset');
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
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/datasets').then(r => r.json()).then(d => {
      setDatasets(Array.isArray(d) ? d : []);
      if (d.length > 0) setSelectedDataset(d[0].id);
    }).catch(() => {});

    fetch('/api/forms').then(r => r.json()).then(d => {
      const arr = Array.isArray(d) ? d : (d.forms || []);
      setForms(arr);
      if (arr.length > 0) setSelectedForm(arr[0].id);
    }).catch(() => {});
  }, []);

  const generateReport = async () => {
    setLoading(true);
    setReport(null);
    setAiAnalysis(null);

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
      const type = activeTab === 'dataset' ? 'dataset'
                 : activeTab === 'form'    ? 'form_report'
                 :                           'overall_report';
      const res  = await fetch('/api/ai/analyze', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ type, context: report.context }),
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
    pdf.addImage(img, 'PNG', 0, 0, w, (canvas.height * w) / canvas.width);
    pdf.save(`DataCore-${activeTab}-report-${Date.now()}.pdf`);
  };

  const card = (style?: any) => ({
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px',
    padding: '1.5rem',
    ...style,
  });

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#fff', margin: 0 }}>Smart Reports</h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', margin: '4px 0 0' }}>
          AI-generated reports — by dataset, form, or platform-wide
        </p>
      </div>

      {/* Tabs */}
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
      <div style={{ ...card(), marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', color: 'rgba(255,255,255,0.7)' }}>
          <Filter size={16} /> <strong>Filters</strong>
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>

          {/* Dataset/Form selector */}
          {activeTab === 'dataset' && (
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>
                Select Dataset
              </label>
              <select value={selectedDataset} onChange={e => setSelectedDataset(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '0.875rem' }}>
                {datasets.length === 0
                  ? <option>No datasets uploaded</option>
                  : datasets.map(d => <option key={d.id} value={d.id}>{d.filename}</option>)}
              </select>
            </div>
          )}

          {activeTab === 'form' && (
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>
                Select Form
              </label>
              <select value={selectedForm} onChange={e => setSelectedForm(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '0.875rem' }}>
                {forms.length === 0
                  ? <option>No forms created</option>
                  : forms.map(f => <option key={f.id} value={f.id}>{f.title}</option>)}
              </select>
            </div>
          )}

          {/* Date range */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>
              <Calendar size={12} style={{ display: 'inline', marginRight: '4px' }} />From Date
            </label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              style={{ padding: '10px 12px', background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '0.875rem' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>
              <Calendar size={12} style={{ display: 'inline', marginRight: '4px' }} />To Date
            </label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              style={{ padding: '10px 12px', background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '0.875rem' }} />
          </div>

          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); }}
              style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)',
                borderRadius: '8px', padding: '10px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <X size={14} /> Clear
            </button>
          )}

          {/* Generate button */}
          <button onClick={generateReport} disabled={loading}
            style={{ padding: '10px 24px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              border: 'none', borderRadius: '8px', color: '#fff', cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px',
              opacity: loading ? 0.7 : 1, fontSize: '0.875rem' }}>
            {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <BarChart2 size={16} />}
            Generate Report
          </button>
        </div>
      </div>

      {/* Report Output */}
      {loading && (
        <div style={{ ...card(), display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '4rem' }}>
          <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: '#6366f1' }} />
          <p style={{ color: 'rgba(255,255,255,0.5)' }}>Generating report...</p>
        </div>
      )}

      {report && !loading && (
        <div>
          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <button onClick={generateAI} disabled={aiLoading || !!aiAnalysis}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
                background: 'rgba(99,102,241,0.15)', border: '1px solid #6366f1',
                borderRadius: '8px', color: '#a5b4fc', cursor: aiLoading ? 'not-allowed' : 'pointer',
                fontWeight: 600, fontSize: '0.875rem', opacity: aiLoading ? 0.7 : 1 }}>
              {aiLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <BrainCircuit size={16} />}
              {aiAnalysis ? 'AI Done ✓' : 'Generate AI Analysis'}
            </button>
            <button onClick={exportPDF}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
                background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none',
                borderRadius: '8px', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}>
              <Download size={16} /> Export PDF
            </button>
          </div>

          {/* Report content */}
          <div ref={reportRef} style={{ ...card() }}>
            {/* Report title */}
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <h2 style={{ color: '#fff', margin: 0, fontSize: '1.4rem' }}>{report.title}</h2>
              <p style={{ color: 'rgba(255,255,255,0.4)', margin: '4px 0 0', fontSize: '0.8rem' }}>
                Generated: {new Date(report.generatedAt).toLocaleString()}
                {report.filters && ` · Filters: ${report.filters}`}
              </p>
            </div>

            {/* AI Analysis */}
            {aiAnalysis && (
              <div style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)',
                borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
                <h3 style={{ color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', margin: '0 0 1rem' }}>
                  <Sparkles size={16} /> Gemini AI Analysis
                </h3>
                <div style={{ color: 'rgba(255,255,255,0.85)', lineHeight: 1.8, whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>
                  {aiAnalysis}
                </div>
              </div>
            )}

            {/* KPI metrics */}
            {report.metrics?.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', textTransform: 'uppercase',
                  letterSpacing: '0.08em', marginBottom: '1rem' }}>Key Metrics</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
                  {report.metrics.map((m: any, i: number) => (
                    <div key={i} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '1rem' }}>
                      <p style={{ margin: 0, fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>{m.label}</p>
                      <p style={{ margin: '4px 0 0', fontSize: '1.4rem', fontWeight: 700, color: '#a5b4fc' }}>{m.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Summary */}
            {report.summary && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', textTransform: 'uppercase',
                  letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Summary</h3>
                <p style={{ color: 'rgba(255,255,255,0.8)', lineHeight: 1.7, margin: 0 }}>{report.summary}</p>
              </div>
            )}

            {/* Details table */}
            {report.details?.length > 0 && (
              <div>
                <h3 style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', textTransform: 'uppercase',
                  letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Details</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        {Object.keys(report.details[0]).map(k => (
                          <th key={k} style={{ padding: '8px 12px', textAlign: 'left', color: 'rgba(255,255,255,0.4)',
                            borderBottom: '1px solid rgba(255,255,255,0.07)', fontSize: '0.75rem', textTransform: 'uppercase' }}>{k}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {report.details.map((row: any, i: number) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          {Object.values(row).map((v: any, j) => (
                            <td key={j} style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.75)' }}>{String(v)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Footer */}
            <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.07)',
              display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>
              <span>DataCore Intelligence Platform</span>
              <span>Powered by Gemini AI</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
