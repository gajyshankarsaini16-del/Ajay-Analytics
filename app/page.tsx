'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { FileText, MessageSquare, UploadCloud, ArrowRight, Loader2, AlertCircle, RefreshCw, Layers } from 'lucide-react';
import styles from './page.module.css';

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchAnalytics = async (isManual = false) => {
    if (isManual) setLoading(true);
    try {
      const res = await fetch('/api/analytics');
      if (!res.ok) throw new Error('Failed to load dashboard data');
      const json = await res.json();
      setData(json);
      setLastUpdated(new Date());
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    fetchAnalytics();

    // Set up polling every 30 seconds for "real-time" feel
    const interval = setInterval(() => {
      fetchAnalytics();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return <div className={styles.center}><Loader2 size={40} className={styles.spin} /></div>;
  }

  if (error && !data) {
    return (
      <div className={styles.center}>
        <div className={styles.errorCard}>
          <AlertCircle size={48} color="var(--danger-color)" />
          <h3>Error Loading Dashboard</h3>
          <p>{error}</p>
          <button onClick={() => fetchAnalytics(true)} className="btn-secondary" style={{ marginTop: '1rem' }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="page-title">Welcome to DataCore</h1>
            <p className="page-subtitle">Here's an overview of your data collection and analytics.</p>
          </div>
          <div className={styles.statusBadge}>
            <div className={styles.livePulse}></div>
            <span>Live • Updated {lastUpdated.toLocaleTimeString()}</span>
            <button onClick={() => fetchAnalytics(true)} className={styles.refreshBtn} title="Refresh Now">
              <RefreshCw size={14} className={loading ? styles.spin : ''} />
            </button>
          </div>
        </div>
      </header>

      <div className={styles.kpiGrid}>
        <div className={`${styles.kpiCard} glass-panel`}>
          <div className={styles.kpiIcon} style={{ background: 'var(--accent-gradient)', color: '#fff', boxShadow: 'var(--shadow-glow)' }}>
            <FileText size={24} />
          </div>
          <div>
            <h3>Total Forms</h3>
            <p className={styles.kpiValue}>{data?.kpis?.totalForms ?? 0}</p>
          </div>
        </div>

        <div className={`${styles.kpiCard} glass-panel`}>
          <div className={styles.kpiIcon} style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', boxShadow: '0 0 15px rgba(16, 185, 129, 0.4)' }}>
            <Layers size={24} />
          </div>
          <div>
            <h3>Total Data Rows</h3>
            <p className={styles.kpiValue}>{data?.kpis?.totalRows ?? 0}</p>
          </div>
        </div>

        <div className={`${styles.kpiCard} glass-panel`}>
          <div className={styles.kpiIcon} style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', boxShadow: '0 0 15px rgba(245, 158, 11, 0.4)' }}>
            <UploadCloud size={24} />
          </div>
          <div>
            <h3>Uploaded Datasets</h3>
            <p className={styles.kpiValue}>{data?.kpis?.totalDatasets ?? 0}</p>
          </div>
        </div>
      </div>

      <div className={styles.mainGrid}>
        <div className={`${styles.chartCard} glass-panel`}>
          <h3>Data Ingestion Trends (Real-time)</h3>
          <div className={styles.chartWrapper}>
            {isMounted && (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data?.chartData || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis dataKey="date" stroke="#D1D5DB" tick={{fill: '#9CA3AF'}} axisLine={false} tickLine={false} />
                  <YAxis stroke="#D1D5DB" tick={{fill: '#9CA3AF'}} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '10px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', color: '#111827' }}
                    itemStyle={{ color: '#111827', fontWeight: 600 }}
                    labelStyle={{ color: '#6B7280', fontSize: '0.78rem' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="events" 
                    stroke="#2563EB" 
                    strokeWidth={3}
                    activeDot={{ r: 8 }}
                    animationDuration={300}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className={`${styles.recentCard} glass-panel`}>
          <div className={styles.recentHeader}>
            <h3>Recent Forms</h3>
            <Link href="/forms" className={styles.viewAll}>View All</Link>
          </div>
          <div className={styles.recentList}>
            {(data?.recentForms || []).map((form: any) => (
              <Link href={`/forms/${form.id}`} key={form.id} className={styles.recentItem}>
                <div className={styles.recentItemInfo}>
                  <h4>{form.title}</h4>
                  <span>{form._count?.submissions ?? 0} responses</span>
                </div>
                <ArrowRight size={16} className={styles.recentArrow} />
              </Link>
            ))}
            {(!data?.recentForms || data.recentForms.length === 0) && (
              <p className={styles.emptyText}>No forms created yet.</p>
            )}
          </div>
        </div>

        <div className={`${styles.recentCard} glass-panel`}>
          <div className={styles.recentHeader}>
            <h3>Quick Reports</h3>
            <Link href="/reports" className={styles.viewAll}>All Reports</Link>
          </div>
          <div className={styles.recentList}>
            <Link href="/reports" className={styles.recentItem}>
              <div className={styles.recentItemInfo}>
                <h4>Project Report</h4>
                <span>Executive summary of all data</span>
              </div>
              <ArrowRight size={16} className={styles.recentArrow} />
            </Link>
            <Link href="/reports" className={styles.recentItem}>
              <div className={styles.recentItemInfo}>
                <h4>Financial Report</h4>
                <span>Monetary logic & revenue</span>
              </div>
              <ArrowRight size={16} className={styles.recentArrow} />
            </Link>
            <Link href="/reports" className={styles.recentItem}>
              <div className={styles.recentItemInfo}>
                <h4>Quality Metrics Report</h4>
                <span>Health score analytics</span>
              </div>
              <ArrowRight size={16} className={styles.recentArrow} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
