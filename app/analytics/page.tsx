'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { Download, Loader2, Filter, AlertCircle, RefreshCw, Layers, BrainCircuit, Sparkles } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import styles from './Analytics.module.css';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [insights, setInsights] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const reportRef = useRef<HTMLDivElement>(null);

  // New states for Questions Analytics
  const [questionForms, setQuestionForms] = useState<any[]>([]);
  const [selectedFormId, setSelectedFormId] = useState('');
  const [questionAnalytics, setQuestionAnalytics] = useState<any>(null);

  // New states for AI AI
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const fetchAnalytics = async (isManual = false) => {
    if (isManual) setLoading(true);
    try {
      const [analyticsRes, insightsRes, explorerRes] = await Promise.all([
        fetch('/api/analytics'),
        fetch('/api/analytics/insights'),
        fetch('/api/analytics/explorer')
      ]);

      if (!analyticsRes.ok || !insightsRes.ok || !explorerRes.ok) throw new Error('Failed to load analytics data');
      
      const [analyticsJson, insightsJson, explorerJson] = await Promise.all([
        analyticsRes.json(),
        insightsRes.json(),
        explorerRes.json()
      ]);

      setData(analyticsJson);
      setInsights(insightsJson);
      setRecords(explorerJson);
      setLastUpdated(new Date());
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchFormsList = async () => {
    try {
      const res = await fetch('/api/analytics/questions');
      const json = await res.json();
      setQuestionForms(json.forms || []);
      if (json.forms?.length > 0) setSelectedFormId(json.forms[0].id);
    } catch (err) {
      console.error("Failed to load forms list for analytics", err);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    fetchAnalytics();
    fetchFormsList();

    const interval = setInterval(() => {
      fetchAnalytics();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Fetch specific form questions when selectedFormId changes
  useEffect(() => {
    if (selectedFormId && activeTab === 'questions') {
      fetch('/api/analytics/questions?formId=' + selectedFormId)
        .then(res => res.json())
        .then(json => setQuestionAnalytics(json))
        .catch(err => console.error("Failed to load questions", err));
    }
  }, [selectedFormId, activeTab]);

  const generateAiInsights = async () => {
    setAiLoading(true);
    try {
      // We pass the global analytics plus the insights object
      const contextData = {
        kpis: data?.kpis,
        healthScore: insights?.healthScore,
        fieldAnalysis: insights?.fieldAnalysis,
        sourceBreakdown: data?.sourceBreakdown
      };

      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'analytics', context: contextData })
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      
      setAiAnalysis(json.analysis);
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
        backgroundColor: '#09090b' // Zinc 950 match
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('datacore-analytics-report.pdf');
    } catch (e) {
      console.error('PDF generation failed', e);
    }
  };

  const filteredRecords = records.filter(r => {
    const matchesSearch = JSON.stringify(r.data).toLowerCase().includes(searchTerm.toLowerCase()) || 
                          r.source.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSource = sourceFilter === 'all' || r.type === sourceFilter;
    return matchesSearch && matchesSource;
  });

  if (loading && !data) {
    return <div className={styles.center}><Loader2 size={40} className={styles.spin} /></div>;
  }

  const renderDashboard = () => (
    <div className={styles.chartsGrid}>
      <div className={`${styles.chartCard} glass-panel`}>
        <h3>Global Submission Trends</h3>
        <div className={styles.chartWrapper}>
          {isMounted && (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data?.chartData || []}>
                <XAxis dataKey="date" stroke="#a1a1aa" />
                <YAxis stroke="#a1a1aa" />
                <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: 'rgba(255,255,255,0.1)' }} />
                <Bar dataKey="submissions" fill="var(--primary-color)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className={`${styles.chartCard} glass-panel`}>
        <h3>Data Source Mix</h3>
        <div className={styles.chartWrapper}>
          {isMounted && (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={data?.sourceBreakdown || []} innerRadius={60} outerRadius={100} dataKey="value">
                  {(data?.sourceBreakdown || []).map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: 'rgba(255,255,255,0.1)' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* AI Insights Card at the bottom of the dashboard */}
      <div className={`${styles.intelligenceSection} glass-panel`} style={{ gridColumn: '1 / -1' }}>
        <div className={styles.intelligenceHeader} style={{ display: 'flex', justifyContent: 'space-between' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BrainCircuit size={18} color="var(--primary-color)" /> Cross-Source Insights
          </h3>
          <div className={styles.healthMeter}>
            <span>Global Health:</span>
            <div className={styles.progressTrack}>
              <div 
                className={styles.progressFill} 
                style={{ width: `${insights?.healthScore ?? 0}%`, background: '#10b981' }}
              />
            </div>
            <span className={styles.healthValue}>{insights?.healthScore ?? 0}%</span>
          </div>
        </div>

        <div className={styles.insightsContent} style={{ marginTop: '1rem' }}>
           {!aiAnalysis ? (
             <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                <Sparkles size={32} color="var(--primary-color)" style={{ marginBottom: '1rem' }} />
                <h4>Gemini AI Executive Summary</h4>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                  Harness Google Gemini to automatically synthesize all metric anomalies, form health states, and data mixes into an actionable executive summary.
                </p>
                <button onClick={generateAiInsights} disabled={aiLoading} className="btn-primary" style={{ background: 'var(--accent-gradient)' }}>
                   {aiLoading ? <Loader2 size={16} className={styles.spin} /> : <BrainCircuit size={16} />}
                   {aiLoading ? 'Analyzing Platform...' : 'Generate AI Report'}
                </button>
             </div>
           ) : (
             <div style={{ padding: '1.5rem', background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '12px' }}>
               <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-color)', marginBottom: '1rem' }}>
                 <Sparkles size={16} /> Gemini AI Analysis
               </h4>
               <div style={{ lineHeight: '1.7', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                 {aiAnalysis}
               </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );

  const renderExplorer = () => (
    <div className={`${styles.explorerArea} glass-panel`}>
      <div className={styles.explorerHeader}>
        <input 
          type="text" 
          placeholder="Search records, emails, or names..." 
          className={styles.searchInput}
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        <div className={styles.sourceFilters}>
          {['all', 'public', 'manual', 'upload'].map(f => (
            <button 
              key={f}
              className={`${styles.filterBtn} ${sourceFilter === f ? styles.filterActive : ''}`}
              onClick={() => setSourceFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Source</th>
            <th>Type</th>
            <th>Data Preview</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {filteredRecords.map(r => (
            <tr key={r.id}>
              <td>{r.source}</td>
              <td><span className={`${styles.statusTag} ${styles['status_'+r.type]}`}>{r.type}</span></td>
              <td>{Object.entries(r.data).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(', ')}...</td>
              <td>{new Date(r.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderQuality = () => (
    <div className={`${styles.chartCard} glass-panel`}>
      <h3>Field-Level Quality Analysis</h3>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Percentage of records where the field is completed correctly.</p>
      <div className={styles.qualityList}>
        {insights?.fieldAnalysis?.map((f: any) => (
          <div key={f.label} className={styles.qualityItem}>
            <div className={styles.qualityMeta}>
              <span>{f.label}</span>
              <span>{f.rate}%</span>
            </div>
            <div className={styles.qualityBarContainer}>
              <div 
                className={`${styles.qualityBar} ${f.rate < 50 ? styles.lowQuality : ''}`} 
                style={{ width: `${f.rate}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderQuestions = () => (
    <div>
      <div className={`${styles.filterBox} glass-panel`} style={{ marginBottom: '1.5rem', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Select Form to Analyze</h3>
        <select 
          value={selectedFormId} 
          onChange={e => setSelectedFormId(e.target.value)}
          className={styles.searchInput}
          style={{ width: '100%', maxWidth: '400px', background: 'var(--surface-color)', padding: '0.75rem' }}
        >
          {questionForms.map(f => (
            <option key={f.id} value={f.id}>{f.title}</option>
          ))}
        </select>
        {questionAnalytics && (
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '0.875rem' }}>
            Analyzing {questionAnalytics.totalSubmissions} submissions for "{questionAnalytics.formTitle}"
          </p>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        {questionAnalytics?.questions?.map((q: any) => (
          <div key={q.fieldId} className={`${styles.chartCard} glass-panel`}>
            <h3 style={{ marginBottom: '0.25rem', fontSize: '1.1rem' }}>{q.label}</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.8rem' }}>
              Type: {q.type} | Total Answers: {q.totalAnswers}
            </p>
            
            {q.chartData && q.chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                {(q.type === 'dropdown' || q.type === 'multiple_choice' || q.type === 'checkbox') ? (
                  <PieChart>
                      <Pie data={q.chartData} innerRadius={50} outerRadius={80} dataKey="value">
                        {q.chartData.map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: 'rgba(255,255,255,0.1)' }} />
                      <Legend />
                  </PieChart>
                ) : (
                  <BarChart data={q.chartData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.05} />
                      <XAxis dataKey="name" stroke="#a1a1aa" fontSize={11} interval={0} angle={-30} textAnchor="end" height={60} />
                      <YAxis stroke="#a1a1aa" fontSize={11} allowDecimals={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: 'rgba(255,255,255,0.1)' }} />
                      <Bar dataKey="value" fill="url(#colorUv)" radius={[4, 4, 0, 0]}>
                        {(q.chartData.map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        )))}
                      </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                No significant data to chart.
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className="page-title">Advanced Data Intelligence</h1>
          <p className="page-subtitle">Granular insights, field quality metrics, AI Analysis and unified data exploration.</p>
        </div>
        
        <div className={styles.actions}>
          <div className={styles.statusBadge}>
            <div className={styles.livePulse}></div>
            <span>Live • Updated {lastUpdated.toLocaleTimeString()}</span>
            <button onClick={() => fetchAnalytics(true)} className={styles.refreshBtn}>
              <RefreshCw size={14} className={loading ? styles.spin : ''} />
            </button>
          </div>
          <button className="btn-primary" onClick={exportPDF}><Download size={18} /> Export PDF</button>
        </div>
      </div>

      <div className={styles.tabs}>
        <button className={`${styles.tabBtn} ${activeTab === 'dashboard' ? styles.activeTab : ''}`} onClick={() => setActiveTab('dashboard')}>Dashboard</button>
        <button className={`${styles.tabBtn} ${activeTab === 'questions' ? styles.activeTab : ''}`} onClick={() => setActiveTab('questions')}>Per-Question Form Stats</button>
        <button className={`${styles.tabBtn} ${activeTab === 'explorer' ? styles.activeTab : ''}`} onClick={() => setActiveTab('explorer')}>Data Explorer</button>
        <button className={`${styles.tabBtn} ${activeTab === 'quality' ? styles.activeTab : ''}`} onClick={() => setActiveTab('quality')}>Quality Metrics</button>
      </div>

      <div ref={reportRef} className={styles.reportContainer} style={{ minHeight: '500px' }}>
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'questions' && renderQuestions()}
        {activeTab === 'explorer' && renderExplorer()}
        {activeTab === 'quality' && renderQuality()}
      </div>
    </div>
  );
}
