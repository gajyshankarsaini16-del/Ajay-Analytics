'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  BarChart3, 
  Upload, 
  FileText, 
  MessageSquare, 
  Keyboard, 
  Layers,
  ClipboardList,
  Menu,
  X
} from 'lucide-react';
import styles from './Sidebar.module.css';

const navItems = [
  { href: '/', label: 'Dashboard', icon: Layers },
  { href: '/upload', label: 'Upload Data', icon: Upload },
  { href: '/forms', label: 'Form Builder', icon: FileText },
  { href: '/responses', label: 'Responses', icon: MessageSquare },
  { href: '/manual', label: 'Manual Entry', icon: Keyboard },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/reports', label: 'Reports', icon: ClipboardList },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => setIsOpen(!isOpen);

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

        <div className={styles.footer}><button onClick={async()=>{await fetch("/api/auth/logout",{method:"POST"});window.location.href="/login"}} style={{display:"flex",alignItems:"center",gap:"8px",width:"100%",padding:"10px 12px",background:"rgba(244,63,94,0.1)",border:"1px solid rgba(244,63,94,0.2)",borderRadius:"8px",color:"#fb7185",cursor:"pointer",fontSize:"0.85rem",fontWeight:600}}>Logout</button><p>Personal Workspace</p>
          <p>Personal Workspace</p>
        </div>
      </aside>
    </>
  );
}
