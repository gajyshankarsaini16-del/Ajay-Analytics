'use client';

import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { Upload as UploadIcon, FileUp, CheckCircle, AlertTriangle, Loader2, FileText, ChevronLeft, ChevronRight, BarChart2 } from 'lucide-react';
import styles from './Upload.module.css';
import Link from 'next/link';

const PAGE_SIZE = 20;

export default function UploadPage() {
  const [isDragging, setIsDragging]     = useState(false);
  const [file, setFile]                 = useState<File | null>(null);
  const [allRows, setAllRows]           = useState<any[]>([]);
  const [columns, setColumns]           = useState<string[]>([]);
  const [page, setPage]                 = useState(0);
  const [isUploading, setIsUploading]   = useState(false);
  const [message, setMessage]           = useState({ text: '', type: '' });
  const [savedId, setSavedId]           = useState<string | null>(null);

  const handleDragOver  = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true);  }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);

  const processFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setSavedId(null);
    setMessage({ text: '', type: '' });
    setPage(0);

    try {
      let rows: any[] = [];

      if (selectedFile.name.endsWith('.csv')) {
        await new Promise<void>((resolve, reject) => {
          Papa.parse(selectedFile, {
            header: true,
            skipEmptyLines: true,
            complete: (r: any) => { rows = r.data; resolve(); },
            error:    (e: any) => reject(new Error(e.message)),
          });
        });
      } else if (/\.(xlsx|xls)$/i.test(selectedFile.name)) {
        const buf = await selectedFile.arrayBuffer();
        const wb  = XLSX.read(buf, { type: 'array' });
        const ws  = wb.Sheets[wb.SheetNames[0]];
        rows      = XLSX.utils.sheet_to_json(ws);
      } else {
        setMessage({ text: 'Unsupported format. Please upload CSV, XLSX or XLS.', type: 'error' });
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, data: allRows }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Upload failed');
      setSavedId(json.id);
      setMessage({ text: `"${file.name}" saved! (${allRows.length} rows, ${columns.length} columns)`, type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.message || 'Upload failed', type: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  const totalPages  = Math.ceil(allRows.length / PAGE_SIZE);
  const visibleRows = allRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className={styles.container}>
      <h1 className="page-title">Upload Data</h1>
      <p className="page-subtitle">Upload Excel or CSV files — preview the full data, then save to generate analytics.</p>

      {!file && (
        <div
          className={`${styles.dropzone} ${isDragging ? styles.dragging : ''} glass-panel`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById('fileUpload')?.click()}
        >
          <input type="file" id="fileUpload" className={styles.hiddenInput}
            accept=".csv,.xlsx,.xls" onChange={handleFileChange} />
          <div className={styles.dropContent}>
            <div className={styles.iconCircle}><FileUp size={40} className={styles.uploadIcon} /></div>
            <h3>Drag &amp; drop your file here</h3>
            <p>or click to browse from your computer</p>
            <span className={styles.formats}>Supported: CSV · XLSX · XLS</span>
          </div>
        </div>
      )}

      {message.text && (
        <div className={`${styles.messageCard} ${styles[message.type]}`}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
          <span>{message.text}</span>
        </div>
      )}

      {savedId && (
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <Link href={`/datasets/${savedId}`}
            className="btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <BarChart2 size={18} /> View Analytics
          </Link>
          <button className="btn-secondary"
            onClick={() => { setFile(null); setAllRows([]); setColumns([]); setSavedId(null); setMessage({ text: '', type: '' }); }}>
            Upload Another File
          </button>
        </div>
      )}

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
                  : <><UploadIcon size={18} /> Save Dataset</>}
              </button>
            )}
          </div>

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
            <h5>
              Rows {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, allRows.length)} of {allRows.length.toLocaleString()}
            </h5>
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
                    <td style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>
                      {page * PAGE_SIZE + i + 1}
                    </td>
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
    </div>
  );
}
