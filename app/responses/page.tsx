'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, Download, Table as TableIcon } from 'lucide-react';
import * as XLSX from 'xlsx';
import styles from './Responses.module.css';

function ResponsesContent() {
  const searchParams = useSearchParams();
  const initialFormId = searchParams?.get('formId') || '';
  
  const [forms, setForms] = useState<any[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string>(initialFormId);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/forms')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setForms(data);
          if (data.length > 0 && !selectedFormId) {
            setSelectedFormId(data[0].id);
          }
        } else {
          console.error("Failed to load forms:", data);
          setForms([]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setForms([]);
        setLoading(false);
      });
  }, [selectedFormId]);


  useEffect(() => {
    if (!selectedFormId) return;
    setLoading(true);
    fetch(`/api/submissions/${selectedFormId}`)
      .then(res => res.json())
      .then(data => {
        setSubmissions(data);
        setLoading(false);
      });
  }, [selectedFormId]);

  const handleExport = () => {
    if (submissions.length === 0) return;
    
    const dataToExport = submissions.map(sub => {
      const parsedData = JSON.parse(sub.data);
      return {
        'Submitted At': new Date(sub.submittedAt).toLocaleString(),
        ...parsedData
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Responses");
    XLSX.writeFile(workbook, `Responses_${selectedFormId}.xlsx`);
  };

  if (loading && forms.length === 0) {
    return <div className={styles.center}><Loader2 className={styles.spin} size={40} /></div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className="page-title">Form Responses</h1>
          <p className="page-subtitle">View and export data collected from your forms.</p>
        </div>
        
        <div className={styles.controls}>
          <select 
            className={styles.formSelect}
            value={selectedFormId} 
            onChange={e => setSelectedFormId(e.target.value)}
          >
            <option value="" disabled>Select a form</option>
            {forms.map(f => (
              <option key={f.id} value={f.id}>{f.title}</option>
            ))}
          </select>

          <button className="btn-secondary" onClick={handleExport} disabled={submissions.length === 0}>
            <Download size={18} /> Export Excel
          </button>
        </div>
      </div>

      <div className={`${styles.tableCard} glass-panel`}>
        {loading ? (
          <div className={styles.center} style={{ height: '300px' }}>
            <Loader2 className={styles.spin} size={32} />
          </div>
        ) : submissions.length === 0 ? (
          <div className={styles.emptyState}>
            <TableIcon size={48} className={styles.emptyIcon} />
            <h3>No responses yet</h3>
            <p>Share your form to start collecting data.</p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Submitted At</th>
                  {Object.keys(JSON.parse(submissions[0].data)).map(key => (
                    <th key={key}>{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {submissions.map(sub => {
                  const data = JSON.parse(sub.data);
                  return (
                    <tr key={sub.id}>
                      <td className={styles.dateCell}>{new Date(sub.submittedAt).toLocaleString()}</td>
                      {Object.keys(data).map(key => (
                        <td key={`${sub.id}-${key}`}>
                          {Array.isArray(data[key]) ? data[key].join(', ') : String(data[key] || '')}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResponsesPage() {
  return (
    <Suspense fallback={<div className={styles.center}><Loader2 className={styles.spin} size={40} /></div>}>
      <ResponsesContent />
    </Suspense>
  );
}
