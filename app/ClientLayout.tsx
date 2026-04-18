'use client';

import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import layoutStyles from './Layout.module.css';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const isPublicForm = pathname?.startsWith('/f/');
  const isLoginPage  = pathname === '/login';

  if (!mounted) {
    return (
      <main style={{ minHeight: '100vh', background: '#0f172a' }}></main>
    );
  }

  // No sidebar for public form and login page
  if (isPublicForm || isLoginPage) {
    return (
      <main style={{ minHeight: '100vh', overflowY: 'auto' }}>
        {children as React.ReactNode}
      </main>
    );
  }

  return (
    <div className={layoutStyles.layout}>
      <Sidebar />
      <main className={layoutStyles.main}>
        <div className={layoutStyles.contentWrapper}>
          {children as React.ReactNode}
        </div>
      </main>
    </div>
  );
}
