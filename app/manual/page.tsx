'use client';

import { useState, useEffect } from 'react';
import { Loader2, Zap, Save, Camera } from 'lucide-react';
import styles from './ManualEntry.module.css';
import ManualScanner from './ManualScanner';

export default function ManualEntryPage() {
  const [forms, setForms] = useState<any[]>([]);
  const [selectedFormId, setSelectedFormId] = useState('');
  const [form, setForm] = useState<any>(null);
  const [showScanner, setShowScanner] = useState(false);
  
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    fetch('/api/forms')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setForms(data);
        } else {
          setForms([]);
        }
      })
      .catch(() => setForms([]));
  }, []);


  useEffect(() => {
    if (!selectedFormId) {
      setForm(null);
      return;
    }
    fetch(`/api/forms/${selectedFormId}`)
      .then(res => res.json())
      .then(data => {
        setForm(data);
        resetForm(data);
      });
  }, [selectedFormId]);

  const resetForm = (targetForm = form) => {
    if (!targetForm) return;
    const initialData: Record<string, any> = {};
    targetForm.fields.forEach((field: any) => {
      if (field.type === 'checkbox') initialData[field.id] = false;
      else if (field.type === 'multiple_choice') initialData[field.id] = [];
      else initialData[field.id] = '';
    });
    setFormData(initialData);
  };

  const handleScanSuccess = (id: string) => {
    setSelectedFormId(id);
    setShowScanner(false);
  };

  const handleChange = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ text: '', type: '' });
    
    const submitData: Record<string, any> = {};
    form.fields.forEach((field: any) => {
      submitData[field.label] = formData[field.id];
    });

    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          formId: form.id, 
          data: submitData,
          source: 'manual' 
        })
      });
      
      if (!res.ok) throw new Error('Failed to submit');
      
      setMessage({ text: 'Entry saved! Ready for next.', type: 'success' });
      resetForm();
      
      // Auto clear message after 2s
      setTimeout(() => setMessage({ text: '', type: '' }), 2000);
      
      // Focus first input for rapid entry
      const firstInput = document.querySelector('form input') as HTMLElement;
      if (firstInput) firstInput.focus();
      
    } catch (err: any) {
      setMessage({ text: err.message || 'Saving failed', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className="page-title">Manual Data Entry</h1>
          <p className="page-subtitle">Rapidly input data from paper forms or physical sources.</p>
        </div>
        
        <div className={styles.controls}>
          <button 
            className="btn-secondary" 
            onClick={() => setShowScanner(true)}
            style={{ marginRight: '1rem' }}
          >
            <Camera size={18} /> Scan QR
          </button>

          <select 
            className={styles.formSelect}
            value={selectedFormId} 
            onChange={e => setSelectedFormId(e.target.value)}
          >
            <option value="" disabled>Select a form to begin</option>
            {forms.map(f => (
              <option key={f.id} value={f.id}>{f.title}</option>
            ))}
          </select>
        </div>
      </div>

      {showScanner && (
        <ManualScanner 
          onScanSuccess={handleScanSuccess} 
          onClose={() => setShowScanner(false)} 
        />
      )}

      {!selectedFormId ? (
        <div className={`${styles.emptyState} glass-panel`}>
          <Zap size={48} className={styles.emptyIcon} />
          <h3>Select a Form</h3>
          <p>Choose a form from the dropdown above to start rapid data entry.</p>
        </div>
      ) : form ? (
        <div className={`${styles.entryArea} glass-panel`}>
          <div className={styles.entryHeader}>
            <h3>{form.title}</h3>
            {message.text && (
              <span className={`${styles.badge} ${styles[message.type]}`}>
                {message.text}
              </span>
            )}
          </div>
          
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.grid}>
              {form.fields.map((field: any) => {
                const options = field.options ? JSON.parse(field.options) : [];
                return (
                  <div key={field.id} className={styles.fieldGroup}>
                    <label className={styles.label}>
                      {field.label} {field.required && <span className={styles.required}>*</span>}
                    </label>

                    {['text', 'email', 'phone', 'date'].includes(field.type) && (
                      <input 
                        className={styles.input}
                        type={field.type === 'phone' ? 'tel' : field.type} 
                        required={field.required}
                        value={formData[field.id]}
                        onChange={e => handleChange(field.id, e.target.value)}
                        autoFocus={form.fields[0].id === field.id}
                      />
                    )}

                    {field.type === 'dropdown' && (
                      <select 
                        className={styles.input}
                        required={field.required}
                        value={formData[field.id]}
                        onChange={e => handleChange(field.id, e.target.value)}
                      >
                        <option value="" disabled>Select...</option>
                        {options.map((opt: string) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    )}
                    
                    {/* Simplified UI for rapid entry for other types could go here */}
                  </div>
                );
              })}
            </div>
            
            <div className={styles.footer}>
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? <Loader2 className={styles.spin} size={18} /> : <Save size={18} />}
                {submitting ? 'Saving...' : 'Save & Next  (Enter)'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => resetForm()} disabled={submitting}>
                Clear
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className={styles.center}><Loader2 className={styles.spin} size={40} /></div>
      )}
    </div>
  );
}
