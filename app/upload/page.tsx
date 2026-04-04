'use client';

import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { Upload as UploadIcon, FileUp, CheckCircle, AlertTriangle, Loader2, FileText } from 'lucide-react';
import styles from './Upload.module.css';

export default function UploadPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [dataPreview, setDataPreview] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setMessage({ text: '', type: '' });
    
    try {
      if (selectedFile.name.endsWith('.csv')) {
        Papa.parse(selectedFile, {
          header: true,
          complete: (results: any) => {
            setDataPreview(results.data.slice(0, 5) as any[]);
          },
          error: (error: any) => {
            setMessage({ text: `CSV Parse Error: ${error.message}`, type: 'error' });
          }
        });
      } else if (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls')) {
        const buffer = await selectedFile.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);
        setDataPreview(json.slice(0, 5));
      } else {
        setMessage({ text: 'Unsupported file format. Please upload CSV or Excel.', type: 'error' });
      }
    } catch (_err) {
      setMessage({ text: 'Failed to process file locally.', type: 'error' });
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setMessage({ text: 'Parsing and uploading entirely...', type: 'info' });

    try {
      let finalData: any[] = [];
      
      if (file.name.endsWith('.csv')) {
        const text = await file.text();
        const parsed = Papa.parse(text, { header: true });
        finalData = parsed.data;
      } else {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        finalData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
      }

      const res = await fetch('/api/datasets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          data: finalData
        })
      });

      if (!res.ok) throw new Error('Failed to upload to server');
      
      setMessage({ text: 'Dataset uploaded and saved successfully!', type: 'success' });
      setFile(null);
      setDataPreview([]);
    } catch (err: any) {
      setMessage({ text: err.message || 'Upload failed', type: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className="page-title">Upload Data</h1>
      <p className="page-subtitle">Upload your Excel or CSV files to automatically generate analytics dashboards.</p>

      <div 
        className={`${styles.dropzone} ${isDragging ? styles.dragging : ''} glass-panel`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById('fileUpload')?.click()}
      >
        <input 
          type="file" 
          id="fileUpload" 
          className={styles.hiddenInput} 
          accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
          onChange={handleFileChange}
        />
        <div className={styles.dropContent}>
          <div className={styles.iconCircle}>
            <FileUp size={40} className={styles.uploadIcon} />
          </div>
          <h3>Drag and drop your file here</h3>
          <p>or click to browse from your computer</p>
          <span className={styles.formats}>Supported formats: .CSV, .XLSX, .XLS</span>
        </div>
      </div>

      {message.text && (
        <div className={`${styles.messageCard} ${styles[message.type]}`}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
          <span>{message.text}</span>
        </div>
      )}

      {file && dataPreview.length > 0 && (
        <div className={`${styles.previewCard} glass-panel`}>
          <div className={styles.previewHeader}>
            <div className={styles.fileInfo}>
              <div className={styles.fileIcon}>
                <FileText size={20} />
              </div>
              <div>
                <h4>{file.name}</h4>
                <span>{(file.size / 1024).toFixed(2)} KB</span>
              </div>
            </div>
            <button 
              className="btn-primary" 
              onClick={handleUpload}
              disabled={isUploading}
            >
              {isUploading ? <Loader2 className={styles.spinner} size={18} /> : <UploadIcon size={18} />}
              {isUploading ? 'Uploading...' : 'Save Dataset'}
            </button>
          </div>

          <div className={styles.tableWrapper}>
            <h5>Data Preview (First 5 rows)</h5>
            <table className={styles.table}>
              <thead>
                <tr>
                  {Object.keys(dataPreview[0]).map(key => (
                    <th key={key}>{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataPreview.map((row, i) => (
                  <tr key={i}>
                    {Object.values(row).map((val: any, j) => (
                      <td key={j}>{typeof val === 'object' ? JSON.stringify(val) : String(val)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
