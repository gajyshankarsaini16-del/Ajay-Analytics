import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Plus, FileText, Calendar, Inbox } from 'lucide-react';
import styles from './Forms.module.css';

export const dynamic = 'force-dynamic';

export default async function FormsList() {
  const forms = await prisma.form.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { submissions: true }
      }
    }
  });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className="page-title">Forms</h1>
          <p className="page-subtitle">Create and manage your data collection forms.</p>
        </div>
        <Link href="/forms/new" className="btn-primary">
          <Plus size={20} /> Create New Form
        </Link>
      </div>

      <div className={styles.formGrid}>
        {forms.length === 0 ? (
          <div className={`${styles.emptyState} glass-panel`}>
            <div className={styles.emptyIcon}>
              <Inbox size={48} />
            </div>
            <h3>No forms yet</h3>
            <p>Create your first form to start collecting data securely.</p>
            <Link href="/forms/new" className="btn-primary" style={{ marginTop: '1rem' }}>
              <Plus size={20} /> Create Form
            </Link>
          </div>
        ) : (
          forms.map(form => (
            <Link href={`/forms/${form.id}`} key={form.id} className={`${styles.formCard} glass-panel`}>
              <div className={styles.cardHeader}>
                <div className={styles.cardIcon}>
                  <FileText size={24} />
                </div>
                <h3>{form.title}</h3>
              </div>
              
              {form.description && (
                <p className={styles.description}>{form.description}</p>
              )}
              
              <div className={styles.cardFooter}>
                <div className={styles.stat}>
                  <Inbox size={14} />
                  <span>{form._count.submissions} responses</span>
                </div>
                <div className={styles.stat}>
                  <Calendar size={14} />
                  <span>{form.createdAt.toLocaleDateString()}</span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
