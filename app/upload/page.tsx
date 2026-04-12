'use client';

import { useState, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import {
  Upload as UploadIcon, FileUp, CheckCircle, AlertTriangle,
  Loader2, FileText, ChevronLeft, ChevronRight, BarChart2,
  BrainCircuit, Database, Eye, Hash, Type, Calendar,
  Phone, X, Zap, ArrowRight, RefreshCw
} from 'lucide-react';
import styles from './Upload.module.css';
import Link from 'next/link';

const PAGE_SIZE = 20;

function excelSerialToDate(serial: number): string {
  const utcMs = (serial - 25569) * 86400 * 1000;
  const d = new Date(utcMs);
  if (isNaN(d.getTime())) return String(serial);
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const min = String(d.getUTCMinutes()).padStart(2, '0');
  const ss = String(d.getUTCSeconds()).padStart(2, '0');
  if (hh !== '00' || min !== '00' || ss !== '00') return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;
  return `${dd}/${mm}/${yyyy}`;
}
function isPhoneColumn(col: string) {
  const l = col.toLowerCase();
  return l.includes('phone') || l.includes('mobile') || l.includes('contact') || l.includes('tel') || l.includes('whatsapp') || l.includes('no.');
}
function isTimestampColumn(col: string) {
  const l = col.toLowerCase();
  return l.includes('timestamp') || l.includes('date') || l.includes('time') || l.includes('created') || l.includes('submitted');
}
function isExcelSerial(val: any) {
  const n = Number(val);
  return !isNaN(n) && n > 40000 && n < 60000;
}
function processValue(col: string, val: any): string {
  if (val === null || val === undefined || val === '') return '';
  if (isPhoneColumn(col)) return String(val).trim();
  if (isTimestampColumn(col) && typeof val === 'number' && isExcelSerial(val)) return excelSerialToDate(val);
  if (typeof val === 'number' && isExcelSerial(val)) return excelSerialToDate(val);
  return typeof val === 'object' ? JSON.stringify(val) : String(val).trim();
}
function processRows(rawRows: any[]): any[] {
  if (!rawRows.length) return rawRows;
  const cols = Object.keys(rawRows[0]);
  return rawRows.map(row => {
    const newRow: Record<string, string> = {};
    cols.forEach(col => { newRow[col] = processValue(col, row[col]); });
    return newRow;
  });
}

interface ColProfile {
  name: string;
  type: 'numeric' | 'categorical' | 'date' | 'phone' | 'text';
  filled: number; missing: number; unique: number;
  topValues: { v: string; c: number }[];
  min?: number; max?: number; mean?: number;
  quality: number;
}

function profileColumns(rows: any[], cols: string[]): ColProfile[] {
  return cols.map(col => {
    const vals = rows.map(r => r[col]).filter(v => v !== '' && v !== null && v !== undefined);
    const missing = rows.length - vals.length;
    const unique = new Set(vals).size;
    const numVals = vals.map(Number).filter(n => !isNaN(n));
    const isDate = isTimestampColumn(col);
    const isPhone = isPhoneColumn(col);
    const isNumeric = !isDate && !isPhone && numVals.length > vals.length * 0.8 && numVals.length > 0;
    const freq: Record<string, number> = {};
    vals.forEach(v => { const k = String(v).slice(0, 40); freq[k] = (freq[k] || 0) + 1; });
    const topValues = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([v, c]) => ({ v, c }));
    let type: ColProfile['type'] = 'text';
    if (isDate) type = 'date';
    else if (isPhone) type = 'phone';
    else if (isNumeric) type = 'numeric';
    else if (unique <= Math.min(20, rows.length * 0.5)) type = 'categorical';
    const quality = Math.round((vals.length / Math.max(rows.length, 1)) * 100);
    const profile: ColProfile = { name: col, type, filled: vals.length, missing, unique, topValues, quality };
    if (isNumeric) {
      profile.min = Math.min(...numVals);
      profile.max = Math.max(...numVals);
      profile.mean = Math.round((numVals.reduce((a, b) => a + b, 0) / numVals.length) * 100) / 100;
    }
    return profile;
  });
}

function generateLocalInsights(profiles: ColProfile[], rowCount: number, filename: string): string[] {
  const insights: string[] = [];
  const numCols = profiles.filter(p => p.type === 'numeric');
  const catCols = profiles.filter(p => p.type === 'categorical');
  const missingCols = profiles.filter(p => p.missing > 0);
  insights.push(`Dataset "${filename}" mein ${rowCount.toLocaleString()} rows aur ${profiles.length} columns hain.`);
  if (missingCols.length > 0) {
    const worst = [...missingCols].sort((a, b) => b.missing - a.missing)[0];
    insights.push(`\u26A0\uFE0F ${missingCols.length} column(s) mein missing values — "${worst.name}" mein ${worst.missing} missing (${Math.round(worst.missing / rowCount * 100)}%).`);
  } else {
    insights.push(`\u2705 Dataset complete hai — koi missing values nahi.`);
  }
  if (numCols.length > 0) insights.push(`\uD83D\uDCCA ${numCols.length} numeric column(s): ${numCols.map(c => c.name).join(', ')} — regression/correlation ready.`);
  if (catCols.length > 0 && catCols[0].topValues[0]) insights.push(`\uD83C\uDFF7\uFE0F "${catCols[0].name}" mein top value: "${catCols[0].topValues[0].v}" (${catCols[0].topValues[0].c} baar).`);
  const lowQ = profiles.filter(p => p.quality < 70);
  if (lowQ.length > 0) insights.push(`\uD83D\uDD34 ${lowQ.length} column(s) ki quality 70% se kam — data cleaning recommended.`);
  return insights;
}

const colTypeColor: Record<string, string> = { numeric: 'rgba(16,185,129,0.15)', categorical: 'rgba(99,102,241,0.15)', date: 'rgba(245,158,11,0.15)', phone: 'rgba(6,182,212,0.15)', text: 'rgba(161,161,170,0.1)' };
const colTypeTxt: Record<string, string> = { numeric: '#10b981', categorical: '#a5b4fc', date: '#f59e0b', phone: '#06b6d4', text: '#71717a' };
const colTypeIcon: Record<string, any> = { numeric: Hash, categorical: BarChart2, date: Calendar, phone: Phone, text: Type };
const gradients = ['linear-gradient(90deg,#6366f1,#a855f7)', 'linear-gradient(90deg,#10b981,#06b6d4)', 'linear-gradient(90deg,#f59e0b,#ec4899)', 'linear-gradient(90deg,#8b5cf6,#6366f1)', 'linear-gradient(90deg,#06b6d4,#3b82f6)', 'linear-gradient(90deg,#ec4899,#f43f5e)'];

export default function UploadPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [allRows, setAllRows] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [profiles, setProfiles] = useState<ColProfile[]>([]);
  const [localInsights, setLocalInsights] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [savedId, setSavedId] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'profile' | 'table'>('profile');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);

  const runAI = async (rows: any[], cols: string[], fname: string) => {
    setAiLoading(true);
    try {
      const context = {
        filename: fname, rowCount: rows.length, columnCount: cols.length,
        columns: cols.map(c => ({ name: c, sampleValues: rows.slice(0, 5).map(r => r[c]).filter(Boolean) })),
        sampleRows: rows.slice(0, 10),
      };
      const res = await fetch('/api/ai/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'dataset', context }) });
      const d = await res.json();
      if (d.analysis) setAiAnalysis(d.analysis);
    } catch { } finally { setAiLoading(false); }
  };

  const processFile = async (sel: File) => {
    setFile(sel); setSavedId(null); setMessage({ text: '', type: '' });
    setPage(0); setAiAnalysis(null); setProfiles([]); setLocalInsights([]); setActiveTab(null); setViewMode('profile');
    try {
      let rawRows: any[] = [];
      if (sel.name.endsWith('.csv')) {
        await new Promise<void>((resolve, reject) => {
          Papa.parse(sel, { header: true, skipEmptyLines: true, dynamicTyping: false, complete: (r: any) => { rawRows = r.data; resolve(); }, error: (e: any) => reject(new Error(e.message)) });
        });
      } else if (/\.(xlsx|xls)$/i.test(sel.name)) {
        const buf = await sel.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array', cellDates: false, raw: true });
        rawRows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '', raw: true });
      } else { setMessage({ text: 'Unsupported format.', type: 'error' }); return; }
      if (!rawRows.length) { setMessage({ text: 'File is empty.', type: 'error' }); return; }
      const processed = processRows(rawRows);
      const cols = Object.keys(processed[0]);
      setAllRows(processed); setColumns(cols);
      const profs = profileColumns(processed, cols);
      setProfiles(profs); setActiveTab(cols[0]);
      setLocalInsights(generateLocalInsights(profs, processed.length, sel.name));
      runAI(processed, cols, sel.name);
    } catch (err: any) { setMessage({ text: `Parse error: ${err.message}`, type: 'error' }); }
  };

  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]); }, []);

  const handleUpload = async () => {
    if (!file || !allRows.length) return;
    setIsUploading(true); setMessage({ text: 'Saving...', type: 'info' });
    try {
      const res = await fetch('/api/datasets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename: file.name, data: allRows }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Upload failed');
      setSavedId(json.id);
      setMessage({ text: `"${file.name}" saved! (${allRows.length} rows, ${columns.length} columns)`, type: 'success' });
    } catch (err: any) { setMessage({ text: err.message, type: 'error' }); } finally { setIsUploading(false); }
  };

  const reset = () => { setFile(null); setAllRows([]); setColumns([]); setSavedId(null); setMessage({ text: '', type: '' }); setProfiles([]); setLocalInsights([]); setAiAnalysis(null); };

  const totalPages = Math.ceil(allRows.length / PAGE_SIZE);
  const visibleRows = allRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const activeProfile = profiles.find(p => p.name === activeTab);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Upload Dataset</h1>
          <p className="page-subtitle">CSV · XLSX · XLS — AI instant intelligence ke saath</p>
        </div>
        {file && (
          <button onClick={reset} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', color: '#f87171', fontSize: '0.82rem', cursor: 'pointer' }}>
            <X size={14} /> New File
          </button>
        )}
      </div>

      {/* Drop zone */}
      {!file && (
        <div className={`${styles.dropzone} ${isDragging ? styles.dragging : ''} glass-panel`}
          onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}>
          <input ref={fileRef} type="file" className={styles.hiddenInput} accept=".csv,.xlsx,.xls" onChange={e => { if (e.target.files?.[0]) processFile(e.target.files[0]); }} />
          <div className={styles.dropContent}>
            <div className={styles.iconCircle}><FileUp size={40} className={styles.uploadIcon} /></div>
            <h3>Drag &amp; drop your file here</h3>
            <p>ya click karke browse karo</p>
            <div style={{ display: 'flex', gap: '8px', marginTop: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              {['CSV', 'XLSX', 'XLS'].map(f => (
                <span key={f} style={{ padding: '4px 14px', fontSize: '0.75rem', borderRadius: '999px', background: 'rgba(99,102,241,0.1)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.2)' }}>{f}</span>
              ))}
            </div>
            <div style={{ marginTop: '1.25rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              {[{ icon: <BrainCircuit size={13} />, text: 'AI Auto-Analysis' }, { icon: <Eye size={13} />, text: 'Column Profiling' }, { icon: <CheckCircle size={13} />, text: 'Smart Type Detection' }].map(({ icon, text }) => (
                <div key={text} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>
                  <span style={{ color: '#10b981' }}>{icon}</span>{text}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Message */}
      {message.text && (
        <div className={`${styles.messageCard} ${styles[message.type]}`}>
          {message.type === 'success' ? <CheckCircle size={18} /> : message.type === 'error' ? <AlertTriangle size={18} /> : <Loader2 size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Post-save CTAs */}
      {savedId && (
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Link href="/analytics" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: 'linear-gradient(135deg,#6366f1,#a855f7)', borderRadius: '12px', color: '#fff', fontWeight: 600, fontSize: '0.875rem' }}>
            <BarChart2 size={16} /> Analytics mein Dekho <ArrowRight size={14} />
          </Link>
          <button onClick={reset} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>
            <RefreshCw size={14} /> Upload Another
          </button>
        </div>
      )}

      {/* Main content */}
      {file && allRows.length > 0 && (
        <>
          {/* File info bar */}
          <div className={`glass-panel`} style={{ padding: '1.25rem 1.5rem', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: 44, height: 44, borderRadius: '10px', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={20} color="#a5b4fc" />
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.95rem' }}>{file.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                    {allRows.length.toLocaleString()} rows · {columns.length} cols · {(file.size / 1024).toFixed(1)} KB
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                {[
                  { label: 'Rows', value: allRows.length.toLocaleString(), color: '#10b981' },
                  { label: 'Columns', value: columns.length, color: '#6366f1' },
                  { label: 'Numeric', value: profiles.filter(p => p.type === 'numeric').length, color: '#f59e0b' },
                  { label: 'Missing', value: profiles.filter(p => p.missing > 0).length > 0 ? `${profiles.filter(p => p.missing > 0).length} cols` : 'None', color: profiles.filter(p => p.missing > 0).length > 0 ? '#ef4444' : '#10b981' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 700, color }}>{value}</div>
                  </div>
                ))}
                {!savedId && (
                  <button onClick={handleUpload} disabled={isUploading} style={{
                    display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
                    background: isUploading ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg,#6366f1,#a855f7)',
                    border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 600, fontSize: '0.875rem', cursor: isUploading ? 'not-allowed' : 'pointer'
                  }}>
                    {isUploading ? <><Loader2 size={16} className={styles.spinner} /> Saving...</> : <><UploadIcon size={16} /> Save Dataset</>}
                  </button>
                )}
              </div>
            </div>
            {columns.some(c => isTimestampColumn(c) || isPhoneColumn(c)) && (
              <div style={{ marginTop: '1rem', padding: '8px 14px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.18)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#10b981' }}>
                <CheckCircle size={13} />
                Smart fixes applied: {[columns.some(c => isTimestampColumn(c)) ? 'Excel dates converted' : '', columns.some(c => isPhoneColumn(c)) ? 'Phone numbers preserved' : ''].filter(Boolean).join(' · ')}
              </div>
            )}
          </div>

          {/* Instant intelligence */}
          {localInsights.length > 0 && (
            <div style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.18)', borderRadius: '14px', padding: '1.25rem 1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.85rem' }}>
                <Zap size={15} color="#a5b4fc" />
                <span style={{ color: '#a5b4fc', fontWeight: 600, fontSize: '0.875rem' }}>Instant Data Intelligence</span>
                <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>— file se parse kiya</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {localInsights.map((ins, i) => (
                  <div key={i} style={{ fontSize: '0.83rem', color: 'rgba(255,255,255,0.75)', display: 'flex', gap: '8px', lineHeight: 1.5 }}>
                    <span style={{ color: '#6366f1', flexShrink: 0 }}>→</span>{ins}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Deep Analysis */}
          <div style={{ background: 'rgba(168,85,247,0.05)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: '14px', padding: '1.25rem 1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
              <BrainCircuit size={15} color="#c084fc" />
              <span style={{ color: '#c084fc', fontWeight: 600, fontSize: '0.875rem' }}>AI Deep Analysis</span>
              {aiLoading && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)' }}>
                  <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> analyzing...
                </span>
              )}
            </div>
            {aiLoading && !aiAnalysis ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {['Dataset overview generate ho raha hai...', 'Statistical patterns dhundh raha hai...', 'Recommendations prepare ho rahi hain...'].map((t, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)' }}>
                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(192,132,252,0.5)', flexShrink: 0 }} />{t}
                  </div>
                ))}
              </div>
            ) : aiAnalysis ? (
              <div style={{ fontSize: '0.84rem', color: 'rgba(255,255,255,0.8)', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{aiAnalysis}</div>
            ) : (
              <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.3)' }}>AI analysis unavailable. API key check karo.</p>
            )}
          </div>

          {/* View toggle */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>View:</span>
            {[{ id: 'profile', label: 'Column Profiles', icon: <BarChart2 size={13} /> }, { id: 'table', label: 'Raw Data', icon: <Database size={13} /> }].map(({ id, label, icon }) => (
              <button key={id} onClick={() => setViewMode(id as any)} style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', border: '1px solid',
                borderColor: viewMode === id ? '#6366f1' : 'rgba(255,255,255,0.08)',
                background: viewMode === id ? 'rgba(99,102,241,0.15)' : 'transparent',
                color: viewMode === id ? '#a5b4fc' : 'rgba(255,255,255,0.45)',
                fontSize: '0.8rem', fontWeight: viewMode === id ? 600 : 400, cursor: 'pointer'
              }}>{icon} {label}</button>
            ))}
          </div>

          {/* Column Profiles */}
          {viewMode === 'profile' && profiles.length > 0 && (
            <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '16px' }}>
              <h4 style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Eye size={15} color="#a5b4fc" /> Column Intelligence
              </h4>
              {/* Column tabs */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                {profiles.map(p => {
                  const Icon = colTypeIcon[p.type] || Type;
                  const isActive = activeTab === p.name;
                  return (
                    <button key={p.name} onClick={() => setActiveTab(p.name)} style={{
                      display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', border: '1px solid',
                      borderColor: isActive ? colTypeTxt[p.type] : 'rgba(255,255,255,0.07)',
                      background: isActive ? colTypeColor[p.type] : 'transparent',
                      color: isActive ? colTypeTxt[p.type] : 'rgba(255,255,255,0.45)',
                      fontSize: '0.78rem', fontWeight: isActive ? 600 : 400, cursor: 'pointer', transition: 'all 0.15s'
                    }}>
                      <Icon size={11} /> {p.name}
                      {p.missing > 0 && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />}
                    </button>
                  );
                })}
              </div>

              {/* Active profile detail */}
              {activeProfile && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: '1.25rem' }}>
                  {/* Left: stats */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ padding: '4px 12px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700, background: colTypeColor[activeProfile.type], color: colTypeTxt[activeProfile.type], border: `1px solid ${colTypeTxt[activeProfile.type]}33` }}>
                        {activeProfile.type.toUpperCase()}
                      </span>
                      <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)' }}>"{activeProfile.name}"</span>
                    </div>
                    {/* Quality */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>Data Quality</span>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: activeProfile.quality >= 90 ? '#10b981' : activeProfile.quality >= 70 ? '#f59e0b' : '#ef4444' }}>{activeProfile.quality}%</span>
                      </div>
                      <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 3, width: `${activeProfile.quality}%`, background: activeProfile.quality >= 90 ? '#10b981' : activeProfile.quality >= 70 ? '#f59e0b' : '#ef4444', transition: 'width 0.6s' }} />
                      </div>
                    </div>
                    {/* Stat grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      {[
                        { label: 'Filled', value: activeProfile.filled.toLocaleString(), color: '#10b981' },
                        { label: 'Missing', value: activeProfile.missing, color: activeProfile.missing > 0 ? '#ef4444' : 'rgba(255,255,255,0.4)' },
                        { label: 'Unique', value: activeProfile.unique.toLocaleString(), color: '#6366f1' },
                        { label: 'Fill Rate', value: `${activeProfile.quality}%`, color: activeProfile.quality >= 80 ? '#10b981' : '#f59e0b' },
                        ...(activeProfile.type === 'numeric' ? [
                          { label: 'Min', value: activeProfile.min, color: '#06b6d4' },
                          { label: 'Max', value: activeProfile.max, color: '#ec4899' },
                          { label: 'Mean', value: activeProfile.mean, color: '#f59e0b' },
                        ] : []),
                      ].map(({ label, value, color }) => (
                        <div key={label} style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px' }}>
                          <div style={{ fontSize: '0.63rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                          <div style={{ fontSize: '1.1rem', fontWeight: 700, color, marginTop: '2px' }}>{value ?? '—'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Right: top values */}
                  <div>
                    <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Top Values</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {activeProfile.topValues.slice(0, 6).map(({ v, c }, i) => {
                        const pct = Math.round((c / allRows.length) * 100);
                        return (
                          <div key={i}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '170px' }} title={v}>{v || '(empty)'}</span>
                              <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', flexShrink: 0, marginLeft: '8px' }}>{c} ({pct}%)</span>
                            </div>
                            <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                              <div style={{ height: '100%', borderRadius: 2, width: `${pct}%`, background: gradients[i % 6], transition: 'width 0.6s' }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Raw table */}
          {viewMode === 'table' && (
            <div className={`${styles.previewCard} glass-panel`}>
              <h5 style={{ marginBottom: '1rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem', fontWeight: 500 }}>
                Rows {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, allRows.length)} of {allRows.length.toLocaleString()}
              </h5>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.7rem', minWidth: '36px' }}>#</th>
                      {columns.map(col => <th key={col} style={{ color: colTypeTxt[profiles.find(p => p.name === col)?.type || 'text'] }}>{col}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((row, i) => (
                      <tr key={i}>
                        <td style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.72rem' }}>{page * PAGE_SIZE + i + 1}</td>
                        {columns.map(col => <td key={col} title={String(row[col] ?? '')}>{String(row[col] ?? '')}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginTop: '1rem' }}>
                  <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', padding: '6px 14px', cursor: page === 0 ? 'not-allowed' : 'pointer', opacity: page === 0 ? 0.4 : 1 }}><ChevronLeft size={16} /></button>
                  <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)' }}>Page {page + 1} / {totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', padding: '6px 14px', cursor: page === totalPages - 1 ? 'not-allowed' : 'pointer', opacity: page === totalPages - 1 ? 0.4 : 1 }}><ChevronRight size={16} /></button>
                </div>
              )}
            </div>
          )}
        </>
      )}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
