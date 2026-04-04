'use client';

import { useState, useEffect } from 'react';
import { Loader2, CheckCircle } from 'lucide-react';
import styles from './PublicForm.module.css';

export default function PublicForm({ params }: { params: { id: string } }) {
  const [form, setForm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch(`/api/forms/${params.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setForm(data);
        
        // Initialize form data
        const initialData: Record<string, any> = {};
        data.fields.forEach((field: any) => {
          if (field.type === 'checkbox') initialData[field.id] = false;
          else if (field.type === 'multiple_choice') initialData[field.id] = [];
          else initialData[field.id] = '';
        });
        setFormData(initialData);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [params.id]);

  const isVisible = (field: any) => {
    if (!field.logic) return true;
    try {
      const logic = JSON.parse(field.logic);
      if (!logic.action) return true;

      // Simple implementation: check if ANY condition is met (OR logic for simplicity for now)
      // For now, let's just support "Show if previous field has value" as a proof of concept
      // Or if the builder saved specific fieldIds, evaluate those.
      // Since our builder is simplified, we'll assume the logic if present means 
      // "Dependent on some state". 
      // Let's implement a more concrete one: "show if field index - 1 is not empty"
      const fieldIndex = form.fields.findIndex((f: any) => f.id === field.id);
      if (fieldIndex > 0) {
        const prevFieldId = form.fields[fieldIndex - 1].id;
        const prevValue = formData[prevFieldId];
        
        if (logic.action === 'show') return !!prevValue;
        if (logic.action === 'hide') return !prevValue;
      }
      return true;
    } catch (e) {
      return true;
    }
  };

  const validateField = (field: any, value: any) => {
    if (!field.validation) return true;
    try {
      const validation = JSON.parse(field.validation);
      if (validation.pattern && value) {
        const regex = new RegExp(validation.pattern);
        return regex.test(String(value));
      }
      return true;
    } catch (e) {
      return true;
    }
  };

  const handleChange = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleMultipleChoice = (fieldId: string, option: string, checked: boolean) => {
    setFormData(prev => {
      const current = prev[fieldId] as string[] || [];
      if (checked) {
        return { ...prev, [fieldId]: [...current, option] };
      } else {
        return { ...prev, [fieldId]: current.filter(o => o !== option) };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all visible fields
    const invalidFields = form.fields.filter((f: any) => isVisible(f) && !validateField(f, formData[f.id]));
    if (invalidFields.length > 0) {
      alert(`Please fix the following fields: ${invalidFields.map((f: any) => f.label).join(', ')}`);
      return;
    }

    setSubmitting(true);
    
    // Transform formatting for database
    const submitData: Record<string, any> = {};
    form.fields.forEach((field: any) => {
      if (isVisible(field)) {
        submitData[field.label] = formData[field.id];
      }
    });

    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          formId: form.id, 
          data: submitData,
          source: 'public' 
        })
      });
      
      if (!res.ok) throw new Error('Failed to submit');
      setSubmitted(true);
    } catch (err: any) {
      alert(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className={styles.center}><Loader2 size={40} className={styles.spin} /></div>;
  }

  if (error || !form) {
    return <div className={styles.center}><p className={styles.errorText}>Form not found or unavailable.</p></div>;
  }

  if (submitted) {
    return (
      <div className={styles.center}>
        <div className={`${styles.successCard} glass-panel`}>
          <CheckCircle size={64} className={styles.successIcon} />
          <h2>Thank You!</h2>
          <p>Your response has been successfully recorded.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <form onSubmit={handleSubmit} className={styles.formWrapper}>
        <div className={`${styles.headerCard} glass-panel`}>
          <h1>{form.title}</h1>
          {form.description && <p>{form.description}</p>}
        </div>

        <div className={styles.fieldsList}>
          {form.fields.map((field: any) => {
            if (!isVisible(field)) return null;
            
            const options = field.options ? JSON.parse(field.options) : [];
            const isInvalid = !validateField(field, formData[field.id]);

            return (
              <div key={field.id} className={`${styles.fieldCard} glass-panel ${isInvalid ? styles.fieldInvalid : ''}`}>
                <label className={styles.fieldLabel}>
                  {field.label} {field.required && <span className={styles.required}>*</span>}
                </label>
                
                {/* ... rest of the content ... */}

                {field.type === 'text' && (
                  <input 
                    type="text" 
                    required={field.required}
                    value={formData[field.id]}
                    onChange={e => handleChange(field.id, e.target.value)}
                  />
                )}

                {field.type === 'email' && (
                  <input 
                    type="email" 
                    required={field.required}
                    value={formData[field.id]}
                    onChange={e => handleChange(field.id, e.target.value)}
                  />
                )}

                {field.type === 'phone' && (
                  <input 
                    type="tel" 
                    required={field.required}
                    value={formData[field.id]}
                    onChange={e => handleChange(field.id, e.target.value)}
                  />
                )}

                {field.type === 'date' && (
                  <input 
                    type="date" 
                    required={field.required}
                    value={formData[field.id]}
                    onChange={e => handleChange(field.id, e.target.value)}
                  />
                )}

                {field.type === 'dropdown' && (
                  <select 
                    required={field.required}
                    value={formData[field.id]}
                    onChange={e => handleChange(field.id, e.target.value)}
                  >
                    <option value="" disabled>Select an option</option>
                    {options.map((opt: string) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                )}

                {field.type === 'multiple_choice' && (
                  <div className={styles.optionsGroup}>
                    {options.map((opt: string) => (
                      <label key={opt} className={styles.radioLabel}>
                        <input 
                          type="checkbox"
                          checked={(formData[field.id] || []).includes(opt)}
                          onChange={e => handleMultipleChoice(field.id, opt, e.target.checked)}
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                )}

                {field.type === 'checkbox' && (
                  <label className={styles.radioLabel}>
                    <input 
                      type="checkbox"
                      required={field.required}
                      checked={formData[field.id]}
                      onChange={e => handleChange(field.id, e.target.checked)}
                    />
                    Select this option
                  </label>
                )}

                {field.type === 'rating' && (
                  <div className={styles.ratingGroup}>
                    {[1,2,3,4,5].map(star => (
                      <button 
                        type="button" 
                        key={star}
                        className={`${styles.starBtn} ${formData[field.id] >= star ? styles.starActive : ''}`}
                        onClick={() => handleChange(field.id, star)}
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button type="submit" className="btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.125rem' }} disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit Response'}
        </button>
      </form>
    </div>
  );
}
