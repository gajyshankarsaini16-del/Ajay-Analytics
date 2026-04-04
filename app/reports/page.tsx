'use client';

import { useState, useRef } from 'react';
import { 
  FileText, TrendingUp, BarChart2, DollarSign, 
  CheckCircle, PieChart, Info, Download, X, Loader2, ArrowRight, BrainCircuit, Sparkles
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import styles from './Reports.module.css';

const REPORT_TYPES = [
  { id: 'project', title: 'Project Report', desc: 'General executive summary of all data collections.', icon: <FileText size={24} /> },
  { id: 'feasibility', title: 'Feasibility Report', desc: 'In-depth analysis of data health and decision viability.', icon: <Info size={24} /> },
  { id: 'progress', title: 'Progress Report', desc: 'Timeline-based data growth and collection velocity metrics.', icon: <TrendingUp size={24} /> },
  { id: 'research', title: 'Research/Analysis Report', desc: 'Detailed participant demographics and source diversification.', icon: <BarChart2 size={24} /> },
  { id: 'final', title: 'Final Project Report', desc: 'Comprehensive end-of-lifecycle data wrap-up and summary.', icon: <CheckCircle size={24} /> },
  { id: 'financial', title: 'Financial Report', desc: 'Automatic detection and aggregation of monetary fields.', icon: <DollarSign size={24} /> },
  { id: 'evaluation', title: 'Evaluation Report', desc: 'Performance metrics and field-level accuracy benchmarks.', icon: <PieChart size={24} /> },
  { id: 'conclusion', title: 'Conclusion & Suggestions', desc: 'Smart suggestions based on data gaps and trends.', icon: <ArrowRight size={24} /> }
];

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  // AI States
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const reportRef = useRef<HTMLDivElement>(null);

  const generateReport = async (type: string) => {
    setSelectedReport(type);
    setLoading(true);
    setAiSummary(null); // Reset AI on new report
    try {
      const res = await fetch(`/api/reports/generate?type=${type}`);
      if (!res.ok) throw new Error("Failed to generate report");
      const data = await res.json();
      setReportData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const generateAiReport = async () => {
    if (!reportData) return;
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'report', context: { title: reportData.title, metrics: reportData.metrics, baseSummary: reportData.summary } })
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setAiSummary(json.analysis);
    } catch (e: any) {
      alert("AI Error: " + e.message);
    } finally {
      setAiLoading(false);
    }
  };

  const exportPDF = async () => {
    if (!reportRef.current) return;
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: '#09090b' // zinc-950
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`DataCore-${selectedReport}-report.pdf`);
    } catch (e) {
      console.error('PDF generation failed', e);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className="page-title">Specialized Reports</h1>
        <p className="page-subtitle">Select a template to generate professional data-driven reports in seconds.</p>
      </div>

      <div className={styles.reportGrid}>
        {REPORT_TYPES.map(report => (
          <div key={report.id} className={`${styles.reportCard} glass-panel`} onClick={() => generateReport(report.id)}>
            <div className={styles.iconWrapper}>{report.icon}</div>
            <h3>{report.title}</h3>
            <p>{report.desc}</p>
            <button className={`${styles.generateBtn} btn-secondary btn-sm`}>
              Generate Report
            </button>
          </div>
        ))}
      </div>

      {selectedReport && (
        <div className={styles.previewOverlay}>
          <div className={styles.previewContent}>
            <div className={styles.previewHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <FileText size={20} color="var(--primary-color)" />
                <span style={{ fontWeight: 600 }}>Report Template Preview</span>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                {!loading && reportData && (
                  <>
                    <button 
                      className="btn-secondary btn-sm" 
                      onClick={generateAiReport} 
                      disabled={aiLoading || aiSummary !== null} 
                      style={{ borderColor: 'var(--primary-color)', color: 'var(--primary-color)' }}
                    >
                      {aiLoading ? <Loader2 size={16} className="spin" /> : <BrainCircuit size={16} />}
                      {aiSummary ? 'AI Complete' : 'AI Analysis'}
                    </button>
                    <button className="btn-primary btn-sm" onClick={exportPDF}>
                      <Download size={16} /> Export PDF
                    </button>
                  </>
                )}
                <button className={styles.closeBtn} onClick={() => { setSelectedReport(null); setReportData(null); setAiSummary(null); }}>
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className={styles.previewBody}>
              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginTop: '100px' }}>
                  <Loader2 size={40} className="spin" color="var(--primary-color)" />
                  <p style={{ color: 'var(--text-secondary)' }}>Analyzing data engines and generating specialized metrics...</p>
                </div>
              ) : reportData && (
                <div ref={reportRef} style={{ background: 'var(--bg-color)', width: '100%', padding: '2rem' }}>
                  <div className={styles.reportTitle} style={{ marginBottom: '1rem' }}>{reportData.title}</div>
                  <div className={styles.reportMeta} style={{ marginBottom: '2rem' }}>
                    <span><strong>Generated:</strong> {new Date(reportData.generatedAt).toLocaleString()}</span>
                    <span><strong>Project:</strong> DataCore Intelligence Platform</span>
                  </div>

                  {aiSummary && (
                    <div className={styles.summarySection} style={{ background: 'rgba(99, 102, 241, 0.05)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(99, 102, 241, 0.2)', marginBottom: '2rem' }}>
                      <h4 style={{ color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                        <Sparkles size={16} /> AI Executive Synthesis
                      </h4>
                      <div style={{ color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap', fontSize: '1.05rem' }}>
                        {aiSummary}
                      </div>
                    </div>
                  )}

                  <div className={styles.summarySection}>
                    <h4>System Summary</h4>
                    <p style={{ color: 'var(--text-primary)', fontSize: '1.1rem', lineHeight: 1.6 }}>
                      {reportData.summary}
                    </p>
                  </div>

                  <div className={styles.summarySection}>
                    <h4>Key Performance Metrics</h4>
                    <div className={styles.metricsGrid}>
                      {reportData.metrics.map((m: any, idx: number) => (
                        <div key={idx} className={styles.metricItem}>
                          <span className={styles.metricLabel}>{m.label}</span>
                          <span className={styles.metricValue}>{m.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className={styles.summarySection}>
                    <h4>Detailed Analytics visualization</h4>
                    <div className={styles.placeholder}>
                      Dynamic Chart Visualization (Included in PDF Export)
                    </div>
                  </div>

                  <div className={styles.reportFooter}>
                    <span>DataCore Professional Reporting Standard v1.2</span>
                    <span>Page 1 of 1</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
