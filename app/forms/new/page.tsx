'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, Save, Trash2, GripVertical, ChevronDown, 
  Type, CheckSquare, List, Star, Calendar, Phone, Mail, Settings 
} from 'lucide-react';
import styles from './FormBuilder.module.css';

const FIELD_TYPES = [
  { id: 'text', label: 'Short Text', icon: Type },
  { id: 'dropdown', label: 'Dropdown', icon: ChevronDown },
  { id: 'multiple_choice', label: 'Multiple Choice', icon: List },
  { id: 'checkbox', label: 'Checkboxes', icon: CheckSquare },
  { id: 'rating', label: 'Rating', icon: Star },
  { id: 'date', label: 'Date', icon: Calendar },
  { id: 'phone', label: 'Phone Number', icon: Phone },
  { id: 'email', label: 'Email Address', icon: Mail },
];

export default function FormBuilder() {
  const router = useRouter();
  const [title, setTitle] = useState('Untitled Form');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showFieldTypes, setShowFieldTypes] = useState(false);

  const addField = (type: string) => {
    setFields([...fields, { 
      id: Math.random().toString(36).substring(7),
      type, 
      label: `New ${FIELD_TYPES.find(f => f.id === type)?.label}`, 
      required: false,
      options: ['dropdown', 'multiple_choice', 'checkbox'].includes(type) ? ['Option 1'] : null,
      logic: null,
      validation: null,
      showAdvanced: false
    }]);
    setShowFieldTypes(false);
  };

  const removeField = (index: number) => {
    const newFields = [...fields];
    newFields.splice(index, 1);
    setFields(newFields);
  };

  const updateField = (index: number, key: string, value: any) => {
    const newFields = [...fields];
    newFields[index][key] = value;
    setFields(newFields);
  };

  const updateLogic = (index: number, logic: any) => {
    const newFields = [...fields];
    newFields[index].logic = logic ? JSON.stringify(logic) : null;
    setFields(newFields);
  };

  const updateValidation = (index: number, validation: any) => {
    const newFields = [...fields];
    newFields[index].validation = validation ? JSON.stringify(validation) : null;
    setFields(newFields);
  };

  const addOption = (fieldIndex: number) => {
    const newFields = [...fields];
    const currentOptions = newFields[fieldIndex].options || [];
    newFields[fieldIndex].options = [...currentOptions, `Option ${currentOptions.length + 1}`];
    setFields(newFields);
  };

  const updateOption = (fieldIndex: number, optionIndex: number, value: string) => {
    const newFields = [...fields];
    newFields[fieldIndex].options[optionIndex] = value;
    setFields(newFields);
  };

  const removeOption = (fieldIndex: number, optionIndex: number) => {
    const newFields = [...fields];
    newFields[fieldIndex].options.splice(optionIndex, 1);
    setFields(newFields);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      alert('Please enter a form title');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, fields })
      });

      if (!res.ok) throw new Error('Failed to save form');
      
      const savedForm = await res.json();
      router.push(`/forms/${savedForm.id}`);
    } catch (error) {
      console.error(error);
      alert('Error saving form');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className="page-title">Build Advanced Form</h1>
        <button className="btn-primary" onClick={handleSave} disabled={isSaving}>
          <Save size={18} /> {isSaving ? 'Saving...' : 'Save Form'}
        </button>
      </div>

      <div className={styles.builderLayout}>
        <div className={styles.mainCanvas}>
          <div className={`${styles.formHeaderCard} glass-panel`}>
            <input 
              type="text" 
              className={styles.titleInput}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Form Title"
            />
            <textarea 
              className={styles.descriptionInput}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Form Description (optional)"
              rows={2}
            />
          </div>

          <div className={styles.fieldsList}>
            {fields.map((field, index) => (
              <div key={field.id} className={`${styles.fieldCard} glass-panel`}>
                <div className={styles.dragHandle}>
                  <GripVertical size={20} />
                </div>
                <div className={styles.fieldContent}>
                  <div className={styles.fieldHeader}>
                    <input 
                      type="text" 
                      className={styles.fieldLabelInput}
                      value={field.label}
                      onChange={e => updateField(index, 'label', e.target.value)}
                    />
                    <div className={styles.fieldTypeBadge}>
                      {FIELD_TYPES.find(f => f.id === field.type)?.label}
                    </div>
                  </div>

                  {field.options && (
                    <div className={styles.optionsList}>
                      {field.options.map((opt: string, optIndex: number) => (
                        <div key={optIndex} className={styles.optionRow}>
                          <div className={styles.optionDot}></div>
                          <input 
                            type="text" 
                            className={styles.optionInput}
                            value={opt}
                            onChange={e => updateOption(index, optIndex, e.target.value)}
                          />
                          {field.options.length > 1 && (
                            <button onClick={() => removeOption(index, optIndex)} className={styles.deleteOptionBtn}>
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                      <button onClick={() => addOption(index)} className={styles.addOptionBtn}>
                        <Plus size={16} /> Add Option
                      </button>
                    </div>
                  )}

                  {field.showAdvanced && (
                    <div className={styles.advancedSettings}>
                      <div className={styles.settingsGroup}>
                        <label>Conditional Logic</label>
                        <select 
                          value={field.logic ? JSON.parse(field.logic).action : ''}
                          onChange={e => updateLogic(index, e.target.value ? { action: e.target.value, conditions: [] } : null)}
                        >
                          <option value="">No Logic</option>
                          <option value="show">Show if...</option>
                          <option value="hide">Hide if...</option>
                        </select>
                      </div>
                      <div className={styles.settingsGroup}>
                        <label>Validation Pattern (Regex)</label>
                        <input 
                          type="text"
                          placeholder="e.g. ^\d{10}$"
                          value={field.validation ? JSON.parse(field.validation).pattern : ''}
                          onChange={e => updateValidation(index, { pattern: e.target.value })}
                        />
                      </div>
                    </div>
                  )}

                  <div className={styles.fieldFooter}>
                    <div className={styles.footerLeft}>
                      <label className={styles.toggleWrapper}>
                        <input 
                          type="checkbox" 
                          checked={field.required}
                          onChange={e => updateField(index, 'required', e.target.checked)}
                        />
                        <span className={styles.toggleText}>Required</span>
                      </label>
                      <button 
                        className={`${styles.settingsBtn} ${field.showAdvanced ? styles.settingsActive : ''}`}
                        onClick={() => updateField(index, 'showAdvanced', !field.showAdvanced)}
                      >
                        <Settings size={16} /> Advanced
                      </button>
                    </div>
                    <button onClick={() => removeField(index)} className={styles.deleteFieldBtn}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className={`${styles.addFieldCard} glass-panel`}>
             {!showFieldTypes ? (
               <button className={styles.addFieldTrigger} onClick={() => setShowFieldTypes(true)}>
                 <Plus size={24} /> Add New Field
               </button>
             ) : (
               <div className={styles.fieldTypesGrid}>
                 {FIELD_TYPES.map(type => (
                   <button 
                     key={type.id} 
                     className={styles.fieldTypeBtn}
                     onClick={() => addField(type.id)}
                   >
                     <type.icon size={20} />
                     <span>{type.label}</span>
                   </button>
                 ))}
                 <button className={styles.cancelBtn} onClick={() => setShowFieldTypes(false)}>Cancel</button>
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
