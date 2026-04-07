'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  BarChart3, Upload, FileText, MessageSquare, 
  Keyboard, Layers, ClipboardList, Menu, X, LogOut
} from 'lucide-react';
import styles from './Sidebar.module.css';

const navItems = [
  { href: '/',          label: 'Dashboard',    icon: Layers },
  { href: '/upload',    label: 'Upload Data',  icon: Upload },
  { href: '/forms',     label: 'Form Builder', icon: FileText },
  { href: '/responses', label: 'Responses',    icon: MessageSquare },
  { href: '/manual',    label: 'Manual Entry', icon: Keyboard },
  { href: '/analytics', label: 'Analytics',    icon: BarChart3 },
  { href: '/reports',   label: 'Reports',      icon: ClipboardList },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => setIsOpen(!isOpen);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <>
      <button className={styles.mobileToggle} onClick={toggleSidebar}>
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {isOpen && <div className={styles.overlay} onClick={toggleSidebar} />}

      <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
        <div className={styles.header}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}></div>
            <h2>DataCore</h2>
          </div>
        </div>
        
        <nav className={styles.nav}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                onClick={() => setIsOpen(false)}
              >
                <Icon size={20} className={styles.icon} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className={styles.footer}>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              width: '100%', padding: '10px 14px',
              background: 'rgba(244,63,94,0.08)',
              border: '1px solid rgba(244,63,94,0.2)',
              borderRadius: '10px', color: '#fb7185',
              cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600,
              marginBottom: '0.75rem', transition: 'all 0.2s',
            }}
          >
            <LogOut size={16} /> Logout
          </button>
          <p>Personal Workspace</p>
        </div>
      </aside>
    </>
  );
}
