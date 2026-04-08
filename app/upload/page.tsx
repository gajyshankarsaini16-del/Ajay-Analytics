'use client';

import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import {
  Upload as UploadIcon, FileUp, CheckCircle, AlertTriangle,
  Loader2, FileText, ChevronLeft, ChevronRight, BarChart2
} from 'lucide-react';
import styles from './Upload.module.css';
import Link from 'next/link';

const PAGE_SIZE = 20;

/* ── Excel serial date → DD/MM/YYYY HH:MM:SS ── */
function excelSerialToDate(serial: number): string {
  // Excel epoch starts 1 Jan 1900 (with a Lotus 1-2-3 leap-year bug, so offset by 2 days)
  const utcDays  = serial - 25569; // 25569 = days from 1900-01-01 to 1970-01-01
  const utcMs    = utcDays * 86400 * 1000;
  const d        = new Date(utcMs);
  if (isNaN(d.getTime())) return String(serial);

  const dd   = String(d.getUTCDate()).padStart(2, '0');
  const mm   = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  const hh   = String(d.getUTCHours()).padStart(2, '0');
  const min  = String(d.getUTCMinutes()).padStart(2, '0');
  const ss   = String(d.getUTCSeconds()).padStart(2, '0');

  // If time component is meaningful (not midnight) show full datetime
  if (hh !== '00' || min !== '00' || ss !== '00') {
    return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;
  }
  return `${dd}/${mm}/${yyyy}`;
}

/* ── Detect if a column is likely a phone number ── */
function isPhoneColumn(colName: string): boolean {
  const lower = colName.toLowerCase();
  return lower.includes('phone') || lower.includes('mobile') || lower.includes('contact')
    || lower.includes('tel') || lower.includes('whatsapp') || lower.includes('no.');
}

/* ── Detect if a column is likely a timestamp/date ── */
function isTimestampColumn(colName: string): boolean {
  const lower = colName.toLowerCase();
  return lower.includes('timestamp') || lower.includes('date') || lower.includes('time')
    || lower.includes('created') || lower.includes('submitted');
}

/* ── Detect if a value is an Excel serial date (roughly 40000–60000 range) ── */
function isExcelSerial(val: any): boolean {
  const n = Number(val);
  return !isNaN(n) && n > 40000 && n < 60000;
}

/* ── Smart column value processor ── */
function processValue(col: string, val: any): string {
  if (val === null || val === undefined || val === '') return '';

  // Phone columns → always string, preserve leading zeros & country codes
  if (isPhoneColumn(col)) {
    return String(val).trim();
  }

  // Timestamp columns with Excel serial → convert to readable date
  if (isTimestampColumn(col) && typeof val === 'number' && isExcelSerial(val)) {
    return excelSerialToDate(val);
  }

  // Any numeric value that looks like an Excel serial date
  if (typeof val === 'number' && isExcelSerial(val)) {
    return excelSerialToDate(val);
  }

  return typeof val === 'object' ? JSON.stringify(val) : String(val).trim();
}

/* ── Process all rows — apply smart conversions ── */
function processRows(rawRows: any[]): any[] {
  if (!rawRows.length) return rawRows;
  const cols = Object.keys(rawRows[0]);

  return rawRows.map(row => {
    const newRow: Record<string, string> = {};
    cols.forEach(col => {
      newRow[col] = processValue(col, row[col]);
    });
    return newRow;
  });
}

export default function UploadPage() {
  const [isDragging, setIsDragging]   = useState(false);
  const [file, setFile]               = useState<File | null>(null);
  const [allRows, setAllRows]         = useState<any[]>([]);
  const [columns, setColumns]         = useState<string[]>([]);
  const [page, setPage]               = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage]         = useState({ text: '', type: '' });
  const [savedId, setSavedId]         = useState<string | null>(null);

  const handleDragOver  = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true);  }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);

  const processFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setSavedId(null);
    setMessage({ text: '', type: '' });
    setPage(0);

    try {
      let rawRows: any[] = [];

      if (selectedFile.name.endsWith('.csv')) {
        await new Promise<void>((resolve, reject) => {
          Papa.parse(selectedFile, {
            header: true,
            skipEmptyLines: true,
            // Keep everything as string in CSV — no auto type conversion
            dynamicTyping: false,
            complete: (r: any) => { rawRows = r.data; resolve(); },
            error:    (e: any) => reject(new Error(e.message)),
          });
        });
      } else if (/\.(xlsx|xls)$/i.test(selectedFile.name)) {
        const buf = await selectedFile.arrayBuffer();
        const wb  = XLSX.read(buf, {
          type: 'array',
          cellDates: false,   // Keep as raw serial numbers so we can convert ourselves
          cellText: false,
          raw: false,
        });
        const ws = wb.Sheets[wb.SheetNames[0]];

        // sheet_to_json with raw:false gives formatted strings for dates,
        // but phone numbers may still be numeric — we handle in processRows()
        rawRows = XLSX.utils.sheet_to_json(ws, {
          defval: '',
          raw: true,          // raw values so we detect serial dates
        });
      } else {
        setMessage({ text: 'Unsupported format. Please upload CSV, XLSX or XLS.', type: 'error' });
        return;
      }

      if (rawRows.length === 0) {
        setMessage({ text: 'File is empty.', type: 'error' });
        return;
      }

      // Apply smart conversions
      const processed = processRows(rawRows);
      setAllRows(processed);
      setColumns(Object.keys(processed[0]));
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
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ filename: file.name, data: allRows }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Upload failed');
      setSavedId(json.id);
      setMessage({
        text: `"${file.name}" saved! (${allRows.length} rows, ${columns.length} columns)`,
        type: 'success'
      });
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
      <p className="page-subtitle">
        Upload Excel or CSV files — timestamps auto-convert, phone numbers stay as text.
      </p>

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
                <span>
                  {allRows.length.toLocaleString()} rows · {columns.length} columns ·{' '}
                  {(file.size / 1024).toFixed(1)} KB
                </span>
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

          {/* Column tags */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '0.75rem 0' }}>
            {columns.map(col => (
              <span key={col} style={{
                fontSize: '0.72rem', padding: '2px 10px',
                background: isPhoneColumn(col)
                  ? 'rgba(16,185,129,0.15)'
                  : isTimestampColumn(col)
                  ? 'rgba(245,158,11,0.15)'
                  : 'rgba(99,102,241,0.15)',
                color: isPhoneColumn(col) ? '#10b981' : isTimestampColumn(col) ? '#f59e0b' : '#a5b4fc',
                borderRadius: '999px',
                border: `1px solid ${isPhoneColumn(col) ? 'rgba(16,185,129,0.3)' : isTimestampColumn(col) ? 'rgba(245,158,11,0.3)' : 'rgba(99,102,241,0.3)'}`
              }}>
                {col}
                {isPhoneColumn(col)    ? ' 📞' : ''}
                {isTimestampColumn(col) ? ' 📅' : ''}
              </span>
            ))}
          </div>

          {/* Smart fix notice */}
          {columns.some(c => isTimestampColumn(c) || isPhoneColumn(c)) && (
            <div style={{
              padding: '10px 14px', marginBottom: '0.75rem',
              background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
              borderRadius: '10px', fontSize: '0.82rem', color: '#10b981',
              display: 'flex', gap: '8px', alignItems: 'center'
            }}>
              <CheckCircle size={14} />
              Smart fixes applied: {[
                columns.some(c => isTimestampColumn(c)) ? 'Excel dates → DD/MM/YYYY HH:MM:SS' : '',
                columns.some(c => isPhoneColumn(c))     ? 'Phone numbers → text format' : '',
              ].filter(Boolean).join(' · ')}
            </div>
          )}

          {/* Data Table */}
          <div className={styles.tableWrapper}>
            <h5>
              Rows {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, allRows.length)} of{' '}
              {allRows.length.toLocaleString()}
            </h5>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', minWidth: '36px' }}>#</th>
                  {columns.map(col => (
                    <th key={col} style={{
                      color: isPhoneColumn(col) ? '#10b981' : isTimestampColumn(col) ? '#f59e0b' : undefined
                    }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row, i) => (
                  <tr key={i}>
                    <td style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>
                      {page * PAGE_SIZE + i + 1}
                    </td>
                    {columns.map(col => (
                      <td key={col} style={{
                        maxWidth: '200px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        title: String(row[col] ?? ''),
                      }}>
                        {String(row[col] ?? '')}
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
