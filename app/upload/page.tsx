'use client';

import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import {
  Upload as UploadIcon, FileUp, CheckCircle, AlertTriangle,
  Loader2, FileText, ChevronLeft, ChevronRight, BarChart2,
  Sparkles, Wand2, RefreshCw
} from 'lucide-react';
import styles from './Upload.module.css';
import Link from 'next/link';

const PAGE_SIZE = 20;

export default function UploadPage() {
  const [isDragging, setIsDragging]   = useState(false);
  const [file, setFile]               = useState<File | null>(null);
  const [allRows, setAllRows]         = useState<any[]>([]);
  const [columns, setColumns]         = useState<string[]>([]);
  const [page, setPage]               = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage]         = useState({ text: '', type: '' });
  const [savedId, setSavedId]         = useState<string | null>(null);

  // Cleaning states
  const [isCleaning, setIsCleaning]   = useState(false);
  const [cleanReport, setCleanReport] = useState<string[]>([]);
  const [cleanDone, setCleanDone]     = useState(false);
  const [cleanedRows, setCleanedRows] = useState(0);

  const handleDragOver  = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true);  }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);

  const processFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setSavedId(null); setCleanReport([]); setCleanDone(false);
    setMessage({ text: '', type: '' }); setPage(0);

    try {
      let rows: any[] = [];
      if (selectedFile.name.endsWith('.csv')) {
        await new Promise<void>((res, rej) => {
          Papa.parse(selectedFile, {
            header: true, skipEmptyLines: true,
            complete: (r: any) => { rows = r.data; res(); },
            error:   (e: any) => rej(new Error(e.message)),
          });
        });
      } else if (/\.(xlsx|xls)$/i.test(selectedFile.name)) {
        const buf = await selectedFile.arrayBuffer();
        const wb  = XLSX.read(buf, { type: 'array' });
        rows      = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      } else {
        setMessage({ text: 'Unsupported format. CSV, XLSX, XLS only.', type: 'error' });
        return;
      }
      if (rows.length === 0) { setMessage({ text: 'File is empty.', type: 'error' }); return; }
      setAllRows(rows);
      setColumns(Object.keys(rows[0]));
    } catch (err: any) {
      setMessage({ text: `Parse error: ${err.message}`, type: 'error' });
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) processFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file || allRows.length === 0) return;
    setIsUploading(true);
    setMessage({ text: 'Saving dataset...', type: 'info' });

    try {
      const res  = await fetch('/api/datasets', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, data: allRows }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Upload failed');
      setSavedId(json.id);
      setMessage({ text: `"${file.name}" saved! (${allRows.length} rows, ${columns.length} columns)`, type: 'success' });

      // Auto-trigger cleaning
      triggerCleaning(json.id);
    } catch (err: any) {
      setMessage({ text: err.message || 'Upload failed', type: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  const triggerCleaning = async (id: string) => {
    setIsCleaning(true);
    setCleanReport(['⏳ Auto-cleaning in progress...']);
    try {
      const res  = await fetch('/api/datasets/clean', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datasetId: id })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Cleaning failed');
      setCleanReport(json.report || []);
      setCleanedRows(json.cleanedRows);
      setCleanDone(true);
    } catch (err: any) {
      setCleanReport([`❌ Cleaning error: ${err.message}`]);
    } finally {
      setIsCleaning(false);
    }
  };

  const totalPages  = Math.ceil(allRows.length / PAGE_SIZE);
  const visibleRows = allRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className={styles.container}>
      <h1 className="page-title">Upload Data</h1>
      <p className="page-subtitle">
        Upload CSV or Excel — data auto-cleans on save, phir deep analysis available hoti hai.
      </p>

      {!file && (
        <div
          className={`${styles.dropzone} ${isDragging ? styles.dragging : ''} glass-panel`}
          onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
          onClick={() => document.getElementById('fileUpload')?.click()}
        >
          <input type="file" id="fileUpload" className={styles.hiddenInput}
            accept=".csv,.xlsx,.xls" onChange={handleFileChange} />
          <div className={styles.dropContent}>
            <div className={styles.iconCircle}><FileUp size={40} className={styles.uploadIcon} /></div>
            <h3>Drag &amp; drop your file here</h3>
            <p>or click to browse</p>
            <span className={styles.formats}>CSV · XLSX · XLS</span>
          </div>
        </div>
      )}

      {message.text && (
        <div className={`${styles.messageCard} ${styles[message.type]}`}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Auto-clean report */}
      {(isCleaning || cleanReport.length > 0) && (
        <div style={{
          background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)',
          borderRadius: '12px', padding: '1.25rem', marginBottom: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
            {isCleaning
              ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', color: '#10b981' }} />
              : <Wand2 size={16} style={{ color: '#10b981' }} />}
            <span style={{ color: '#10b981', fontWeight: 600, fontSize: '0.9rem' }}>
              {isCleaning ? 'Auto-cleaning...' : '✅ Auto-cleaning complete!'}
            </span>
            {cleanDone && (
              <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', marginLeft: 'auto' }}>
                {cleanedRows.toLocaleString()} clean rows ready
              </span>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {cleanReport.map((line, i) => (
              <p key={i} style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>
                {line}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Post-save actions */}
      {savedId && (
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <Link href={`/analytics`}
            className="btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <BarChart2 size={18} /> View Analytics
          </Link>
          <Link href={`/datasets/${savedId}/deep`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '10px 18px', background: 'rgba(99,102,241,0.15)',
              border: '1px solid #6366f1', borderRadius: '8px', color: '#a5b4fc',
              textDecoration: 'none', fontWeight: 600, fontSize: '0.875rem' }}>
            <Sparkles size={18} /> Deep Analysis
          </Link>
          <button className="btn-secondary"
            onClick={() => { setFile(null); setAllRows([]); setColumns([]); setSavedId(null); setMessage({ text: '', type: '' }); setCleanReport([]); setCleanDone(false); }}>
            Upload Another
          </button>
        </div>
      )}

      {/* Preview table */}
      {file && allRows.length > 0 && (
        <div className={`${styles.previewCard} glass-panel`}>
          <div className={styles.previewHeader}>
            <div className={styles.fileInfo}>
              <div className={styles.fileIcon}><FileText size={20} /></div>
              <div>
                <h4>{file.name}</h4>
                <span>{allRows.length.toLocaleString()} rows · {columns.length} columns · {(file.size / 1024).toFixed(1)} KB</span>
              </div>
            </div>
            {!savedId && (
              <button className="btn-primary" onClick={handleUpload} disabled={isUploading}>
                {isUploading
                  ? <><Loader2 className={styles.spinner} size={18} /> Saving...</>
                  : <><UploadIcon size={18} /> Save &amp; Auto-Clean</>}
              </button>
            )}
          </div>

          {/* Column pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '0.75rem 0' }}>
            {columns.map(col => (
              <span key={col} style={{
                fontSize: '0.72rem', padding: '2px 10px',
                background: 'rgba(99,102,241,0.15)', color: '#a5b4fc',
                borderRadius: '999px', border: '1px solid rgba(99,102,241,0.3)'
              }}>{col}</span>
            ))}
          </div>

          <div className={styles.tableWrapper}>
            <h5>Rows {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, allRows.length)} of {allRows.length.toLocaleString()}</h5>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', minWidth: '36px' }}>#</th>
                  {columns.map(col => <th key={col}>{col}</th>)}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row, i) => (
                  <tr key={i}>
                    <td style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>{page * PAGE_SIZE + i + 1}</td>
                    {columns.map(col => (
                      <td key={col}>
                        {typeof row[col] === 'object' ? JSON.stringify(row[col]) : String(row[col] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginTop: '1rem' }}>
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: '#fff',
                  borderRadius: '6px', padding: '6px 14px', cursor: page === 0 ? 'not-allowed' : 'pointer',
                  opacity: page === 0 ? 0.4 : 1, display: 'flex', alignItems: 'center' }}>
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>
                Page {page + 1} / {totalPages}
              </span>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
                style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: '#fff',
                  borderRadius: '6px', padding: '6px 14px', cursor: page === totalPages - 1 ? 'not-allowed' : 'pointer',
                  opacity: page === totalPages - 1 ? 0.4 : 1, display: 'flex', alignItems: 'center' }}>
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
