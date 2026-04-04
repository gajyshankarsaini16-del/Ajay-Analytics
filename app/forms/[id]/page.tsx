import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink, QrCode, ClipboardList, Settings, CheckCircle } from 'lucide-react';
import QRCodeGenerator from './QRCodeGenerator';
import styles from './FormView.module.css';

export const dynamic = 'force-dynamic';

export default async function FormView({ params }: { params: { id: string } }) {
  const form = await prisma.form.findUnique({
    where: { id: params.id },
    include: {
      fields: { orderBy: { order: 'asc' } },
      _count: { select: { submissions: true } }
    }
  });

  if (!form) notFound();

  const formPath = `/f/${form.id}`;

  return (
    <div className={styles.container}>
      <div className={styles.navigation}>
        <Link href="/forms" className={styles.backLink}>
          <ArrowLeft size={16} /> Back to Forms
        </Link>
      </div>

      <div className={styles.header}>
        <div className={styles.titleArea}>
          <div className={styles.iconCircle}>
            <CheckCircle size={32} />
          </div>
          <div>
            <h1 className="page-title">{form.title}</h1>
            <p className={styles.subtitle}>
              Created on {form.createdAt.toLocaleDateString()} • {form._count.submissions} Responses
            </p>
          </div>
        </div>
        <div className={styles.actions}>
          <Link href={`/f/${form.id}`} target="_blank" className="btn-secondary">
            <ExternalLink size={18} /> View Form
          </Link>
          <Link href={`/responses?formId=${form.id}`} className="btn-primary">
            <ClipboardList size={18} /> View Responses
          </Link>
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.mainColumn}>
          <div className={`${styles.card} glass-panel`}>
            <h3>Form Details</h3>
            {form.description && (
              <p className={styles.description}>{form.description}</p>
            )}
            
            <div className={styles.fieldsPreview}>
              <h4>Fields ({form.fields.length})</h4>
              <ul className={styles.fieldList}>
                {form.fields.map((field: any) => (
                  <li key={field.id} className={styles.fieldItem}>
                    <div className={styles.fieldMeta}>
                      <span className={styles.fieldLabel}>{field.label} {field.required && <span className={styles.required}>*</span>}</span>
                      <span className={styles.fieldType}>{field.type}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className={styles.sideColumn}>
          <div className={`${styles.card} glass-panel`}>
            <h3>Share this Form</h3>
            <p className={styles.shareText}>Share this link with your users to collect responses.</p>
            
            <div className={styles.linkBox}>
              <QRCodeGenerator formPath={formPath} />
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
